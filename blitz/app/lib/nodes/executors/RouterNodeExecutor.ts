import { RouterConfig, IntentType } from '@/app/lib/types/workflow';
import { 
  GenAIExecutionResult, 
  RouterExecutionResult, 
  NodeExecutionData, 
  ExecutionContext,
  ExecutionError 
} from '../types/execution';
import { mapGenAIIntentToRouterIntent } from '../utils/intent-mapper';

/**
 * Router Node Executor
 * Routes GenAI detected intents to appropriate module nodes
 */
export class RouterNodeExecutor {
  /**
   * Executes the router node
   * Maps GenAI intent to Router intent and finds target module
   */
  async execute(
    genAIResult: GenAIExecutionResult,
    routerConfig: RouterConfig,
    executionData: NodeExecutionData,
    context: ExecutionContext
  ): Promise<RouterExecutionResult> {
    console.log('[RouterNodeExecutor] Starting execution:', {
      genAIIntent: genAIResult.intent,
      routerConfigIntentMappings: Object.keys(routerConfig.intentMappings),
    });

    // Map GenAI intent to Router intent
    const mappedIntent = mapGenAIIntentToRouterIntent(genAIResult.intent);
    
    console.log('[RouterNodeExecutor] Mapped intent:', {
      genAIIntent: genAIResult.intent,
      mappedIntent,
    });

    // If no mapped intent (general_query), return null
    if (!mappedIntent) {
      console.log('[RouterNodeExecutor] No router intent mapped (general query), returning null');
      return {
        mappedIntent: null,
        targetModuleId: null,
        routingData: {},
        nodeId: '', // Will be set by workflow executor
        executionTime: 0,
      };
    }

    // Find target module from intent mappings
    const targetModuleId = routerConfig.intentMappings[mappedIntent];
    
    if (!targetModuleId) {
      console.warn('[RouterNodeExecutor] No module mapped for intent:', {
        mappedIntent,
        availableMappings: Object.keys(routerConfig.intentMappings),
      });

      // Try default module if available
      if (routerConfig.defaultModule) {
        console.log('[RouterNodeExecutor] Using default module:', routerConfig.defaultModule);
        return {
          mappedIntent,
          targetModuleId: routerConfig.defaultModule,
          routingData: this.buildRoutingData(genAIResult, executionData),
          nodeId: '', // Will be set by workflow executor
          executionTime: 0,
        };
      }

      // No module found - return null
      console.log('[RouterNodeExecutor] No module found for intent, returning null');
      return {
        mappedIntent,
        targetModuleId: null,
        routingData: {},
        nodeId: '', // Will be set by workflow executor
        executionTime: 0,
      };
    }

    // Build routing data to pass to module
    const routingData = this.buildRoutingData(genAIResult, executionData);

    console.log('[RouterNodeExecutor] Routing to module:', {
      mappedIntent,
      targetModuleId,
      routingDataKeys: Object.keys(routingData),
    });

    return {
      mappedIntent,
      targetModuleId,
      routingData,
      nodeId: '', // Will be set by workflow executor
      executionTime: 0,
    };
  }

  /**
   * Builds routing data to pass to the target module
   * Combines GenAI extracted data with execution context
   */
  private buildRoutingData(
    genAIResult: GenAIExecutionResult,
    executionData: NodeExecutionData
  ): Record<string, unknown> {
    const routingData: Record<string, unknown> = {
      // GenAI extracted data
      ...(genAIResult.extractedData || {}),
      
      // Original message
      originalMessage: executionData.originalMessage,
      
      // Intent information
      intent: genAIResult.intent,
      
      // GenAI response (for context)
      genAIResponse: genAIResult.response,
      
      // User context
      userId: executionData.executionContext.userId,
      businessId: executionData.executionContext.businessId,
    };

    console.log('[RouterNodeExecutor] Built routing data:', {
      keys: Object.keys(routingData),
      extractedDataKeys: genAIResult.extractedData ? Object.keys(genAIResult.extractedData) : [],
    });

    return routingData;
  }

  /**
   * Validates router configuration
   */
  validateConfig(routerConfig: RouterConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!routerConfig.intentMappings) {
      errors.push('Intent mappings are required');
    }

    // Check if intent mappings are valid
    const validIntents: IntentType[] = ['TRACK_SHIPMENT', 'CANCEL_ORDER', 'FAQ_SUPPORT'];
    for (const intent of Object.keys(routerConfig.intentMappings || {}) as IntentType[]) {
      if (!validIntents.includes(intent)) {
        errors.push(`Invalid intent in mappings: ${intent}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

