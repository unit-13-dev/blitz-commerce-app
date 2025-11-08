import { WorkflowNodeWithConfig, WorkflowEdge, IntentType, GenAIIntent } from '@/app/lib/types/workflow';
import { 
  ExecutionContext, 
  NodeExecutionData, 
  WorkflowExecutionResult, 
  ExecutionError,
  GenAIExecutionResult,
  RouterExecutionResult,
  ModuleExecutionResult,
  ResponseExecutionResult
} from '../types/execution';
import { GenAINodeExecutor } from '../executors/GenAINodeExecutor';
import { RouterNodeExecutor } from '../executors/RouterNodeExecutor';
import { ModuleNodeExecutor } from '../executors/ModuleNodeExecutor';
import { ResponseNodeExecutor } from '../executors/ResponseNodeExecutor';

/**
 * Workflow Execution Engine
 * Executes workflow nodes sequentially based on edges
 * Passes full context (original message + all previous results) between nodes
 */
export class WorkflowExecutionEngine {
  private nodes: WorkflowNodeWithConfig[];
  private edges: WorkflowEdge[];
  private context: ExecutionContext;
  private executionData: NodeExecutionData;
  private executionPath: string[] = [];
  private errors: ExecutionError[] = [];
  private startTime: number;

  constructor(
    nodes: WorkflowNodeWithConfig[],
    edges: WorkflowEdge[],
    context: ExecutionContext
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.context = context;
    this.startTime = Date.now();
    
    // Initialize execution data with full context
    this.executionData = {
      originalMessage: context.originalMessage,
      accumulatedData: {},
      executionContext: context,
    };

    console.log('[WorkflowExecutionEngine] Initialized:', {
      executionId: context.executionId,
      workflowId: context.workflowId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      originalMessage: context.originalMessage,
    });
  }

  /**
   * Executes the workflow starting from the GenAI node
   */
  async execute(): Promise<WorkflowExecutionResult> {
    try {
      console.log('[WorkflowExecutionEngine] Starting execution...');

      // Step 1: Find and execute GenAI node
      const genAINode = this.findNodeByType('genai-intent');
      if (!genAINode) {
        console.error('[WorkflowExecutionEngine] GenAI node not found in workflow nodes:', {
          nodeCount: this.nodes.length,
          nodeTypes: this.nodes.map(n => n.type),
          nodeIds: this.nodes.map(n => n.id),
        });
        throw this.createError('GENAI_NODE_NOT_FOUND', 'GenAI Intent node not found in workflow');
      }

      console.log('[WorkflowExecutionEngine] Found GenAI node:', {
        nodeId: genAINode.id,
        hasGenAIConfig: !!genAINode.genAIConfig,
        hasApiKey: !!genAINode.genAIConfig?.apiKey,
        hasModel: !!genAINode.genAIConfig?.model,
        model: genAINode.genAIConfig?.model,
        apiKeyLength: genAINode.genAIConfig?.apiKey?.length || 0,
      });
      
      const genAIResult = await this.executeGenAINode(genAINode);
      this.executionData.genAIResult = genAIResult;
      this.executionPath.push(genAINode.id);
      this.executionData.accumulatedData = {
        ...this.executionData.accumulatedData,
        intent: genAIResult.intent,
        extractedData: genAIResult.extractedData,
      };

      // If GenAI returns general_query, return directly to frontend
      if (genAIResult.method === 'GENAI_TO_FRONTEND') {
        console.log('[WorkflowExecutionEngine] General query detected, returning directly to frontend');
        return this.createSuccessResult({
          finalResponse: genAIResult.response,
          responseType: 'text',
          method: 'GENAI_TO_FRONTEND',
          intent: genAIResult.intent,
          extractedData: genAIResult.extractedData,
        });
      }

      // Step 2: Find and execute Router node
      const routerNode = this.findNodeByType('router');
      if (!routerNode) {
        throw this.createError('ROUTER_NODE_NOT_FOUND', 'Router node not found in workflow');
      }

      console.log('[WorkflowExecutionEngine] Found Router node:', routerNode.id);
      
      // Ensure router has a default config if missing
      if (!routerNode.routerConfig) {
        console.log('[WorkflowExecutionEngine] Router node has no config, using default empty config');
        routerNode.routerConfig = {
          intentMappings: {} as Record<IntentType, string>,
        };
      }
      
      const routerResult = await this.executeRouterNode(routerNode);
      this.executionData.routerResult = routerResult;
      this.executionPath.push(routerNode.id);
      this.executionData.accumulatedData = {
        ...this.executionData.accumulatedData,
        mappedIntent: routerResult.mappedIntent,
        targetModuleId: routerResult.targetModuleId,
      };

      // If no target module, return GenAI response
      if (!routerResult.targetModuleId) {
        console.log('[WorkflowExecutionEngine] No target module found, returning GenAI response');
        return this.createSuccessResult({
          finalResponse: genAIResult.response,
          responseType: 'text',
          method: 'GENAI_TO_FRONTEND',
          intent: genAIResult.intent,
          extractedData: genAIResult.extractedData,
        });
      }

      // Step 3: Find and execute Module node
      const moduleNode = this.findNodeById(routerResult.targetModuleId);
      if (!moduleNode || moduleNode.type !== 'module') {
        throw this.createError(
          'MODULE_NODE_NOT_FOUND',
          `Module node "${routerResult.targetModuleId}" not found in workflow`,
          { targetModuleId: routerResult.targetModuleId }
        );
      }

      console.log('[WorkflowExecutionEngine] Found Module node:', moduleNode.id);
      const moduleResult = await this.executeModuleNode(moduleNode);
      this.executionData.moduleResult = moduleResult;
      this.executionPath.push(moduleNode.id);
      this.executionData.accumulatedData = {
        ...this.executionData.accumulatedData,
        moduleData: moduleResult.data,
      };

      if (!moduleResult.success) {
        throw this.createError(
          'MODULE_EXECUTION_FAILED',
          `Module execution failed: ${moduleResult.error}`,
          { moduleId: moduleNode.id, error: moduleResult.error }
        );
      }

      // Step 4: Format module response using GenAI
      // If module returns MODULE_TO_FRONTEND, it means module returns UI component directly (no GenAI formatting)
      // If module returns GENAI_TO_FRONTEND, format the JSON response using GenAI
      let finalResponse: string | Record<string, unknown>;
      let responseType: 'text' | 'structured' | 'ui-component';
      let finalMethod: 'GENAI_TO_FRONTEND' | 'FRONTEND_TO_BLITZ' | 'MODULE_TO_FRONTEND';

      if (moduleResult.method === 'MODULE_TO_FRONTEND') {
        // Module returns UI component directly - no GenAI formatting needed
        console.log('[WorkflowExecutionEngine] Module returns UI component directly, skipping GenAI formatting');
        finalResponse = moduleResult.data || {};
        responseType = 'ui-component';
        finalMethod = 'MODULE_TO_FRONTEND';
      } else {
        // Module returns GENAI_TO_FRONTEND - format JSON response using GenAI
        console.log('[WorkflowExecutionEngine] Formatting module response using GenAI');
        const formattedGenAIResult = await this.formatModuleResponseWithGenAI(genAINode, moduleResult);
        
        // Update execution data with formatted result
        this.executionData.genAIResult = {
          ...genAIResult,
          response: formattedGenAIResult.response, // Override with formatted response
        };

        finalResponse = formattedGenAIResult.response;
        responseType = 'text';
        finalMethod = 'GENAI_TO_FRONTEND';
      }

      // Return final result
      return this.createSuccessResult({
        finalResponse,
        responseType,
        method: finalMethod,
        intent: genAIResult.intent,
        extractedData: genAIResult.extractedData,
        moduleResult,
      });

    } catch (error) {
      console.error('[WorkflowExecutionEngine] Execution failed:', error);
      
      const executionError = error instanceof Error 
        ? this.createError('WORKFLOW_EXECUTION_ERROR', error.message)
        : error as ExecutionError;

      this.errors.push(executionError);

      return {
        success: false,
        finalResponse: executionError.message,
        responseType: 'text',
        method: 'GENAI_TO_FRONTEND',
        nodeResults: {
          genAI: this.executionData.genAIResult,
          router: this.executionData.routerResult,
          module: this.executionData.moduleResult,
        },
        totalExecutionTime: Date.now() - this.startTime,
        executionPath: this.executionPath,
        errors: this.errors,
        debug: {
          executionId: this.context.executionId,
          workflowId: this.context.workflowId,
          businessId: this.context.businessId,
          userId: this.context.userId,
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Executes GenAI node
   */
  private async executeGenAINode(node: WorkflowNodeWithConfig): Promise<GenAIExecutionResult> {
    const startTime = Date.now();
    console.log('[WorkflowExecutionEngine] Executing GenAI node:', node.id);

    try {
      if (!node.genAIConfig) {
        console.error('[WorkflowExecutionEngine] GenAI config missing from node:', {
          nodeId: node.id,
          nodeType: node.type,
          hasGenAIConfig: false,
        });
        throw this.createError('GENAI_CONFIG_MISSING', 'GenAI configuration is missing', { nodeId: node.id });
      }

      // Validate API key and model before creating executor
      if (!node.genAIConfig.apiKey || node.genAIConfig.apiKey.trim().length === 0) {
        console.error('[WorkflowExecutionEngine] GenAI API key is missing or empty:', {
          nodeId: node.id,
          hasApiKey: !!node.genAIConfig.apiKey,
          apiKeyType: typeof node.genAIConfig.apiKey,
        });
        throw this.createError('GENAI_API_KEY_MISSING', 'GenAI API key is missing or empty', { nodeId: node.id });
      }

      if (!node.genAIConfig.model || node.genAIConfig.model.trim().length === 0) {
        console.error('[WorkflowExecutionEngine] GenAI model is missing or empty:', {
          nodeId: node.id,
          hasModel: !!node.genAIConfig.model,
          modelType: typeof node.genAIConfig.model,
        });
        throw this.createError('GENAI_MODEL_MISSING', 'GenAI model is missing or empty', { nodeId: node.id });
      }

      console.log('[WorkflowExecutionEngine] Creating GenAI executor:', {
        nodeId: node.id,
        model: node.genAIConfig.model,
        apiKeyLength: node.genAIConfig.apiKey.length,
        originalMessageLength: this.context.originalMessage.length,
        conversationHistoryLength: this.context.conversationHistory.length,
      });

      const executor = new GenAINodeExecutor({ genAIConfig: node.genAIConfig });
      const result = await executor.execute(this.context.originalMessage, this.context);

      const executionTime = Date.now() - startTime;
      console.log('[WorkflowExecutionEngine] GenAI node executed successfully:', {
        nodeId: node.id,
        intent: result.intent,
        method: result.method,
        executionTime,
      });

      const resultWithMetadata = {
        ...result,
        nodeId: node.id,
        executionTime,
      };
      
      console.log('[WorkflowExecutionEngine] GenAI node executed successfully:', {
        nodeId: node.id,
        intent: resultWithMetadata.intent,
        method: resultWithMetadata.method,
        executionTime,
      });
      
      return resultWithMetadata;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('[WorkflowExecutionEngine] GenAI node execution failed:', {
        nodeId: node.id,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      });

      throw this.createError(
        'GENAI_EXECUTION_FAILED',
        `GenAI node execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { nodeId: node.id, executionTime }
      );
    }
  }

  /**
   * Executes Router node
   */
  private async executeRouterNode(node: WorkflowNodeWithConfig): Promise<RouterExecutionResult> {
    const startTime = Date.now();
    console.log('[WorkflowExecutionEngine] Executing Router node:', node.id);

    try {
      if (!this.executionData.genAIResult) {
        throw this.createError('GENAI_RESULT_MISSING', 'GenAI result is required for Router execution', { nodeId: node.id });
      }

      // Router config should always exist (set to default if missing)
      if (!node.routerConfig) {
        node.routerConfig = {
          intentMappings: {} as Record<IntentType, string>,
        };
      }

      const executor = new RouterNodeExecutor();
      const result = await executor.execute(
        this.executionData.genAIResult,
        node.routerConfig, // Now guaranteed to be defined
        this.executionData,
        this.context
      );

      const executionTime = Date.now() - startTime;
      const resultWithMetadata = {
        ...result,
        nodeId: node.id,
        executionTime,
      };
      
      console.log('[WorkflowExecutionEngine] Router node executed successfully:', {
        nodeId: node.id,
        mappedIntent: resultWithMetadata.mappedIntent,
        targetModuleId: resultWithMetadata.targetModuleId,
        executionTime,
      });

      return resultWithMetadata;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('[WorkflowExecutionEngine] Router node execution failed:', {
        nodeId: node.id,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      });

      throw this.createError(
        'ROUTER_EXECUTION_FAILED',
        `Router node execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { nodeId: node.id, executionTime }
      );
    }
  }

  /**
   * Executes Module node
   */
  private async executeModuleNode(node: WorkflowNodeWithConfig): Promise<ModuleExecutionResult> {
    const startTime = Date.now();
    console.log('[WorkflowExecutionEngine] Executing Module node:', node.id);

    try {
      if (!this.executionData.routerResult) {
        throw this.createError('ROUTER_RESULT_MISSING', 'Router result is required for Module execution', { nodeId: node.id });
      }

      if (!node.moduleConfig) {
        throw this.createError('MODULE_CONFIG_MISSING', 'Module configuration is missing', { nodeId: node.id });
      }

      const executor = new ModuleNodeExecutor();
      const result = await executor.execute(
        node.moduleConfig,
        this.executionData,
        this.context
      );

      const executionTime = Date.now() - startTime;
      const resultWithMetadata = {
        ...result,
        nodeId: node.id,
        executionTime,
      };
      
      console.log('[WorkflowExecutionEngine] Module node executed successfully:', {
        nodeId: node.id,
        success: resultWithMetadata.success,
        executionTime,
      });

      return resultWithMetadata;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('[WorkflowExecutionEngine] Module node execution failed:', {
        nodeId: node.id,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      });

      throw this.createError(
        'MODULE_EXECUTION_FAILED',
        `Module node execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { nodeId: node.id, executionTime }
      );
    }
  }

  /**
   * Formats module response using GenAI
   */
  private async formatModuleResponseWithGenAI(
    genAINode: WorkflowNodeWithConfig,
    moduleResult: ModuleExecutionResult
  ): Promise<GenAIExecutionResult> {
    const startTime = Date.now();
    console.log('[WorkflowExecutionEngine] Formatting module response with GenAI');

    try {
      if (!genAINode.genAIConfig) {
        throw this.createError('GENAI_CONFIG_MISSING', 'GenAI configuration is missing for response formatting', { nodeId: genAINode.id });
      }

      if (!this.executionData.moduleResult) {
        throw this.createError('MODULE_RESULT_MISSING', 'Module result is required for response formatting', { nodeId: genAINode.id });
      }

      const executor = new GenAINodeExecutor({ genAIConfig: genAINode.genAIConfig });
      const result = await executor.formatModuleResponse(
        moduleResult,
        this.executionData,
        this.context
      );

      const executionTime = Date.now() - startTime;
      console.log('[WorkflowExecutionEngine] Module response formatted successfully:', {
        nodeId: genAINode.id,
        formattedResponseLength: result.response.length,
        executionTime,
      });

      return {
        ...result,
        nodeId: genAINode.id,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('[WorkflowExecutionEngine] Response formatting failed:', {
        nodeId: genAINode.id,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      });

      // If formatting fails, return module data as fallback
      console.log('[WorkflowExecutionEngine] Falling back to module data as response');
      return {
        intent: this.executionData.genAIResult?.intent || 'general_query',
        response: JSON.stringify(this.executionData.moduleResult?.data || {}, null, 2),
        extractedData: this.executionData.genAIResult?.extractedData,
        method: 'GENAI_TO_FRONTEND',
        nodeId: genAINode.id,
        executionTime,
      };
    }
  }

  /**
   * Finds a node by type
   */
  private findNodeByType(type: string): WorkflowNodeWithConfig | undefined {
    return this.nodes.find((node) => node.type === type);
  }

  /**
   * Finds a node by ID
   */
  private findNodeById(nodeId: string): WorkflowNodeWithConfig | undefined {
    return this.nodes.find((node) => node.id === nodeId);
  }

  /**
   * Creates an execution error
   */
  private createError(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): ExecutionError {
    return {
      code,
      message,
      details,
      timestamp: Date.now(),
    };
  }

  /**
   * Creates a success result
   */
  private createSuccessResult(partial: {
    finalResponse: string | Record<string, unknown>;
    responseType: 'text' | 'structured' | 'ui-component';
    method: 'GENAI_TO_FRONTEND' | 'FRONTEND_TO_BLITZ' | 'MODULE_TO_FRONTEND';
    intent?: GenAIIntent;
    extractedData?: Record<string, unknown>;
    moduleResult?: ModuleExecutionResult;
  }): WorkflowExecutionResult {
    return {
      success: true,
      ...partial,
        nodeResults: {
          genAI: this.executionData.genAIResult,
          router: this.executionData.routerResult,
          module: this.executionData.moduleResult,
        },
      totalExecutionTime: Date.now() - this.startTime,
      executionPath: this.executionPath,
      errors: this.errors.length > 0 ? this.errors : undefined,
      debug: {
        executionId: this.context.executionId,
        workflowId: this.context.workflowId,
        businessId: this.context.businessId,
        userId: this.context.userId,
        timestamp: Date.now(),
      },
    };
  }
}

