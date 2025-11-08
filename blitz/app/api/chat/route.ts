import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { getOrCreateChatSession, saveChatMessage, getChatHistory } from '@/app/lib/db/chat';
import { getWorkflowGenAINode } from '@/app/lib/nodes/utils/workflow-loader';
import { loadWorkflowWithConfigurations, listWorkflowsForBusiness } from '@/app/lib/db/workflows';
import { WorkflowExecutionEngine } from '@/app/lib/nodes/utils/workflow-executor';
import { ExecutionContext } from '@/app/lib/nodes/types/execution';

export type CommunicationMethod = 'FRONTEND_TO_BLITZ' | 'MODULE_TO_FRONTEND' | 'GENAI_TO_FRONTEND';

export type ChatResponse = {
  method: CommunicationMethod;
  intent?: 'general_query' | 'cancellation' | 'order_query' | 'refund_query';
  response?: string;
  data?: Record<string, unknown>;
  error?: string;
  debug?: {
    businessId: string;
    workflowId: string;
    nodeId?: string;
    executionId?: string;
    executionPath?: string[];
    totalExecutionTime?: number;
    errors?: Array<{ code: string; message: string; details?: Record<string, unknown>; timestamp: number }>;
    errorCode?: string;
  };
};

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: 'Unauthorized', method: 'FRONTEND_TO_BLITZ' as CommunicationMethod },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, businessId: requestedBusinessId } = body;

    if (!message || typeof message !== 'string') {
      return Response.json(
        { error: 'Message is required', method: 'FRONTEND_TO_BLITZ' as CommunicationMethod },
        { status: 400 }
      );
    }

    // Get or create business for user
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const { user, business: userBusiness } = await ensureBusinessForUser(clerkUser);

    // Use requested business ID if provided (for demo), otherwise use user's business
    const targetBusinessId = requestedBusinessId || userBusiness.id;

    // Load workflow and GenAI node for the target business
    let workflowGenAI;
    try {
      console.log('[Chat API] Loading workflow for business:', targetBusinessId);
      workflowGenAI = await getWorkflowGenAINode(targetBusinessId);
      console.log('[Chat API] Workflow loaded successfully:', {
        workflowId: workflowGenAI.workflow.id,
        hasGenAINode: !!workflowGenAI.genAINode,
        genAINodeId: workflowGenAI.genAINode?.id,
        hasApiKey: !!workflowGenAI.genAINode?.genAIConfig?.apiKey,
        hasModel: !!workflowGenAI.genAINode?.genAIConfig?.model,
        model: workflowGenAI.genAINode?.genAIConfig?.model,
        apiKeyLength: workflowGenAI.genAINode?.genAIConfig?.apiKey?.length || 0,
      });
    } catch (error) {
      console.error('[Chat API] Failed to load workflow:', {
        businessId: targetBusinessId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Failed to load workflow',
          method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
          debug: {
            businessId: targetBusinessId,
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        { status: 400 }
      );
    }

    const { workflow, genAINode } = workflowGenAI;

    if (!genAINode) {
      console.error('[Chat API] GenAI node not found after loading workflow');
      return Response.json(
        {
          error: 'GenAI Intent node not found in workflow. Please add and configure a GenAI Intent node.',
          method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
        },
        { status: 400 }
      );
    }

    // Verify GenAI config one more time before execution
    if (!genAINode.genAIConfig) {
      console.error('[Chat API] GenAI config is missing from node:', genAINode.id);
      return Response.json(
        {
          error: 'GenAI node configuration is missing. Please configure the node in the workflow builder.',
          method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
        },
        { status: 400 }
      );
    }

    if (!genAINode.genAIConfig.apiKey || genAINode.genAIConfig.apiKey.trim().length === 0) {
      console.error('[Chat API] GenAI API key is missing or empty:', {
        nodeId: genAINode.id,
        hasApiKey: !!genAINode.genAIConfig.apiKey,
        apiKeyType: typeof genAINode.genAIConfig.apiKey,
      });
      return Response.json(
        {
          error: 'GenAI API key is missing. Please configure your API key in the workflow builder.',
          method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
        },
        { status: 400 }
      );
    }

    if (!genAINode.genAIConfig.model || genAINode.genAIConfig.model.trim().length === 0) {
      console.error('[Chat API] GenAI model is missing or empty:', {
        nodeId: genAINode.id,
        hasModel: !!genAINode.genAIConfig.model,
        modelType: typeof genAINode.genAIConfig.model,
      });
      return Response.json(
        {
          error: 'GenAI model is missing. Please select a model in the workflow builder.',
          method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
        },
        { status: 400 }
      );
    }

    // Get or create chat session
    const chatSession = await getOrCreateChatSession(user.id, targetBusinessId);

    // Get chat history BEFORE saving the current message (to avoid duplication)
    // This gives us the conversation context up to this point
    const history = await getChatHistory(chatSession.id);
    
    // Format conversation history for AI SDK
    // Filter out any invalid messages and ensure proper format
    const conversationHistory = history
      .filter((msg) => msg.content && msg.content.trim().length > 0)
      .map((msg) => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content.trim(),
      }));

    // Save user message AFTER getting history (so it doesn't duplicate)
    await saveChatMessage(chatSession.id, 'user', message);

    // Load complete workflow with all nodes and configurations
    // Note: We already loaded this in getWorkflowGenAINode, but we need it again for the execution engine
    // The nodes from workflowGenAI might be sufficient, but let's reload to ensure we have the latest
    const { nodes, edges } = await loadWorkflowWithConfigurations(workflow.id);

    // Verify GenAI node is in the loaded nodes
    const genAINodeInWorkflow = nodes.find((node) => node.type === 'genai-intent');
    if (!genAINodeInWorkflow) {
      console.error('[Chat API] GenAI node not found in workflow nodes after reload');
      return Response.json(
        {
          error: 'GenAI Intent node not found in workflow. Please ensure the node exists in the workflow.',
          method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
        },
        { status: 400 }
      );
    }

    // Verify the GenAI node has config
    if (!genAINodeInWorkflow.genAIConfig) {
      console.error('[Chat API] GenAI node in workflow missing config:', genAINodeInWorkflow.id);
      return Response.json(
        {
          error: 'GenAI node configuration is missing. Please configure the node in the workflow builder.',
          method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
        },
        { status: 400 }
      );
    }

    console.log('[Chat API] Workflow nodes loaded:', {
      nodeCount: nodes.length,
      nodeTypes: nodes.map(n => n.type),
      genAINodeId: genAINodeInWorkflow.id,
      genAINodeHasConfig: !!genAINodeInWorkflow.genAIConfig,
      genAINodeHasApiKey: !!genAINodeInWorkflow.genAIConfig?.apiKey,
      genAINodeHasModel: !!genAINodeInWorkflow.genAIConfig?.model,
    });

    // Create execution context
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const executionContext: ExecutionContext = {
      businessId: targetBusinessId,
      userId: user.id,
      workflowId: workflow.id,
      chatSessionId: chatSession.id,
      conversationHistory,
      originalMessage: message,
      executionId,
      startTime: Date.now(),
    };

    // Execute workflow using WorkflowExecutionEngine
    let workflowResult;
    try {
      console.log('[Chat API] Starting workflow execution:', {
        executionId,
        workflowId: workflow.id,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        businessId: targetBusinessId,
      });

      const engine = new WorkflowExecutionEngine(nodes, edges, executionContext);
      workflowResult = await engine.execute();

      console.log('[Chat API] Workflow execution completed:', {
        executionId,
        success: workflowResult.success,
        totalExecutionTime: workflowResult.totalExecutionTime,
        executionPath: workflowResult.executionPath,
        method: workflowResult.method,
      });

      if (!workflowResult.success) {
        console.error('[Chat API] Workflow execution failed:', {
          executionId,
          errors: workflowResult.errors,
          executionPath: workflowResult.executionPath,
        });

        // Return error response
        return Response.json(
          {
            error: workflowResult.errors?.[0]?.message || 'Workflow execution failed',
            method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
            debug: {
              businessId: targetBusinessId,
              workflowId: workflow.id,
              executionId,
              errors: workflowResult.errors,
            },
          },
          { status: 500 }
        );
      }

      // Format final response based on response type
      let responseContent: string;
      if (typeof workflowResult.finalResponse === 'string') {
        responseContent = workflowResult.finalResponse;
      } else {
        // For structured/UI component responses, format as JSON string for display
        responseContent = JSON.stringify(workflowResult.finalResponse, null, 2);
      }

      // Save assistant response
      await saveChatMessage(
        chatSession.id,
        'assistant',
        responseContent,
        workflowResult.intent || null,
        workflowResult.extractedData || null
      );

      // Log for debugging
      console.log('[Chat API] Workflow execution successful:', {
        executionId,
        intent: workflowResult.intent,
        method: workflowResult.method,
        responseType: workflowResult.responseType,
        totalExecutionTime: workflowResult.totalExecutionTime,
        executionPath: workflowResult.executionPath,
      });

      // Prepare response
      const response: ChatResponse = {
        method: workflowResult.method as CommunicationMethod,
        intent: workflowResult.intent,
        response: responseContent,
        data: workflowResult.extractedData || workflowResult.finalResponse as Record<string, unknown>,
        debug: {
          businessId: targetBusinessId,
          workflowId: workflow.id,
          executionId,
          executionPath: workflowResult.executionPath,
          totalExecutionTime: workflowResult.totalExecutionTime,
        },
      };

      return Response.json(response);
    } catch (error) {
      console.error('[Chat API] Workflow execution error:', error);
      
      // Check if it's an execution error
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        const execError = error as { code: string; message: string; details?: Record<string, unknown> };
        return Response.json(
          {
            error: execError.message || 'Workflow execution failed',
            method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
            debug: {
              businessId: targetBusinessId,
              workflowId: workflow.id,
              executionId,
              errorCode: execError.code,
            },
          },
          { status: 400 }
        );
      }

      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Failed to process message',
          method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
          debug: {
            businessId: targetBusinessId,
            workflowId: workflow.id,
            executionId,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Chat API] Unexpected error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
      },
      { status: 500 }
    );
  }
}

// Test endpoint - tests the API key for the selected business workflow
// This endpoint is called when the "Test API" button is pressed
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        {
          status: 'error',
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get businessId from query parameters
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return Response.json(
        {
          status: 'error',
          error: 'businessId is required',
        },
        { status: 400 }
      );
    }

    // Get or create business for user
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const { business: userBusiness } = await ensureBusinessForUser(clerkUser);

    // Use requested business ID if provided (for demo), otherwise use user's business
    const targetBusinessId = businessId || userBusiness.id;

    // Load workflow and check if GenAI node exists and is configured
    try {
      const workflows = await listWorkflowsForBusiness(targetBusinessId);
      
      if (workflows.length === 0) {
        return Response.json(
          {
            status: 'error',
            error: 'No workflow found for this business. Please create a workflow first.',
          },
          { status: 400 }
        );
      }

      const workflow = workflows[0];
      
      // Load workflow with configurations (API keys are automatically decrypted using API_ENCRYPTION_KEY)
      const { nodes } = await loadWorkflowWithConfigurations(workflow.id);
      const genAINode = nodes.find((node) => node.type === 'genai-intent');

      if (!genAINode) {
        return Response.json(
          {
            status: 'error',
            error: 'GenAI Intent node not found in workflow. Please add and configure a GenAI Intent node.',
          },
          { status: 400 }
        );
      }

      // Check if API key and model exist (don't check isConfigured flag)
      // The isConfigured flag might be false if API key test failed during save, but we still want to test it
      if (!genAINode.genAIConfig) {
        return Response.json(
          {
            status: 'error',
            error: 'GenAI Intent node configuration is missing. Please configure the node in the workflow builder with an API key and model.',
          },
          { status: 400 }
        );
      }

      if (!genAINode.genAIConfig.apiKey || typeof genAINode.genAIConfig.apiKey !== 'string' || genAINode.genAIConfig.apiKey.trim().length === 0) {
        return Response.json(
          {
            status: 'error',
            error: 'GenAI Intent node API key is missing or invalid. Please configure your API key (Perplexity or Google Gemini) in the GenAI node settings.',
          },
          { status: 400 }
        );
      }

      if (!genAINode.genAIConfig.model || typeof genAINode.genAIConfig.model !== 'string' || genAINode.genAIConfig.model.trim().length === 0) {
        return Response.json(
          {
            status: 'error',
            error: 'GenAI Intent node model is missing. Please select a model in the GenAI node settings.',
          },
          { status: 400 }
        );
      }

      // Validate supported models
      const supportedModels = ['sonar-pro', 'sonar', 'sonar-pro-online', 'sonar-pro-chat', 'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
      if (!supportedModels.includes(genAINode.genAIConfig.model)) {
        return Response.json(
          {
            status: 'error',
            error: `Unsupported model: "${genAINode.genAIConfig.model}". Supported models are: ${supportedModels.join(', ')}. Please update your GenAI node configuration.`,
          },
          { status: 400 }
        );
      }

      // Now test the API key by making an actual API call
      // The API key is already decrypted from the database using API_ENCRYPTION_KEY
      const { testAPIKey } = await import('@/app/lib/nodes/utils/api-key-validator');
      const apiKeyTest = await testAPIKey(genAINode.genAIConfig);

      if (!apiKeyTest.valid) {
        // API key test failed - mark as not configured
        const { saveNodeConfiguration, loadNodeConfigurations } = await import('@/app/lib/db/node-configurations');
        const configurations = await loadNodeConfigurations(workflow.id);
        const nodeConfig = configurations[genAINode.id];
        
        if (nodeConfig) {
          await saveNodeConfiguration(
            workflow.id,
            genAINode.id,
            'genai-intent',
            nodeConfig,
            false // Mark as not configured
          );
        }

        return Response.json(
          {
            status: 'error',
            error: apiKeyTest.error || 'API key is invalid or not working. Please update your API key in the workflow builder.',
          },
          { status: 400 }
        );
      }

      // API key is valid and working
      return Response.json({
        status: 'success',
        message: 'Chat API is ready. GenAI node is configured and API key is valid.',
        timestamp: new Date().toISOString(),
        businessId: targetBusinessId,
        workflowId: workflow.id,
      });
    } catch (error) {
      // Workflow or GenAI node is not configured, or API key test failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return Response.json(
        {
          status: 'error',
          error: errorMessage,
          message: 'Chat API is not ready. ' + errorMessage,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Chat API] GET endpoint error:', error);
    return Response.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
