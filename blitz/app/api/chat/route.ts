import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { getOrCreateChatSession, saveChatMessage, getChatHistory } from '@/app/lib/db/chat';
import { getWorkflowGenAINode } from '@/app/lib/nodes/utils/workflow-loader';
import { GenAINodeExecutor } from '@/app/lib/nodes/executors';
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
    nodeId: string;
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
      workflowGenAI = await getWorkflowGenAINode(targetBusinessId);
    } catch (error) {
      console.error('[Chat API] Failed to load workflow:', error);
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Failed to load workflow',
          method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
        },
        { status: 400 }
      );
    }

    const { workflow, genAINode } = workflowGenAI;

    if (!genAINode) {
      return Response.json(
        {
          error: 'GenAI Intent node not found in workflow. Please add and configure a GenAI Intent node.',
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

    // Create execution context
    const executionContext: ExecutionContext = {
      businessId: targetBusinessId,
      userId: user.id,
      workflowId: workflow.id,
      chatSessionId: chatSession.id,
      conversationHistory,
    };

    // Execute GenAI node
    let executionResult;
    try {
      // Create NodeData from WorkflowNodeWithConfig
      // The genAIConfig already has the decrypted API key from the database
      const nodeData = {
        genAIConfig: genAINode.genAIConfig,
      };
      
      // Log for debugging (without exposing the actual API key)
      console.log('[Chat API] Executing GenAI node:', {
        businessId: targetBusinessId,
        workflowId: workflow.id,
        nodeId: genAINode.id,
        model: genAINode.genAIConfig?.model,
        hasApiKey: !!genAINode.genAIConfig?.apiKey,
        apiKeyPrefix: genAINode.genAIConfig?.apiKey ? genAINode.genAIConfig.apiKey.substring(0, Math.min(10, genAINode.genAIConfig.apiKey.length)) + '...' : 'none',
        conversationHistoryLength: conversationHistory.length,
        messageLength: message.length,
      });
      
      // Log conversation history structure
      if (conversationHistory.length > 0) {
        console.log('[Chat API] Conversation history roles:', conversationHistory.map((m) => m.role));
      }
      
      const executor = new GenAINodeExecutor(nodeData);
      executionResult = await executor.execute(message, executionContext);
    } catch (error) {
      console.error('[Chat API] GenAI execution error:', error);
      
      // Check if it's a configuration error
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        const execError = error as { code: string; message: string; details?: Record<string, unknown> };
        return Response.json(
          {
            error: execError.message || 'GenAI node execution failed',
            method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
            debug: {
              businessId: targetBusinessId,
              workflowId: workflow.id,
              nodeId: genAINode.id,
            },
          },
          { status: 400 }
        );
      }

      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Failed to process message',
          method: 'FRONTEND_TO_BLITZ' as CommunicationMethod,
        },
        { status: 500 }
      );
    }

    // Save assistant response
    await saveChatMessage(
      chatSession.id,
      'assistant',
      executionResult.response,
      executionResult.intent,
      executionResult.extractedData || null
    );

    // Log for debugging
    console.log('[Chat API] Execution successful:', {
      intent: executionResult.intent,
      method: executionResult.method,
      hasExtractedData: !!executionResult.extractedData,
      businessId: targetBusinessId,
      workflowId: workflow.id,
    });

    // Prepare response
    const response: ChatResponse = {
      method: executionResult.method,
      intent: executionResult.intent,
      response: executionResult.response,
      data: executionResult.extractedData,
      debug: {
        businessId: targetBusinessId,
        workflowId: workflow.id,
        nodeId: genAINode.id,
      },
    };

    return Response.json(response);
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

// Test endpoint for debugging - checks if the business workflow has a configured GenAI node
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

    // Load workflow and GenAI node for the target business
    try {
      const workflowGenAI = await getWorkflowGenAINode(targetBusinessId);
      
      // The getWorkflowGenAINode function now tests the API key, so if we get here,
      // it means the API key is valid and working
      return Response.json({
        status: 'success',
        message: 'Chat API is ready. GenAI node is configured and API key is valid.',
        timestamp: new Date().toISOString(),
        businessId: targetBusinessId,
        workflowId: workflowGenAI.workflow.id,
      });
    } catch (error) {
      // Workflow or GenAI node is not configured, or API key is invalid
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
    return Response.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
