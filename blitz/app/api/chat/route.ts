import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { getOrCreateChatSession, saveChatMessage, getChatHistory } from '@/app/lib/db/chat';
import { getWorkflowGenAINode } from '@/app/lib/nodes/utils/workflow-loader';
import { GenAINodeExecutor } from '@/app/lib/nodes/executors';
import { ExecutionContext } from '@/app/lib/nodes/types/execution';

export type CommunicationMethod = 'USER_TO_BLITZ' | 'MODULE_TO_FRONTEND' | 'GENAI_TO_FRONTEND';

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
        { error: 'Unauthorized', method: 'USER_TO_BLITZ' as CommunicationMethod },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, businessId: requestedBusinessId } = body;

    if (!message || typeof message !== 'string') {
      return Response.json(
        { error: 'Message is required', method: 'USER_TO_BLITZ' as CommunicationMethod },
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
          method: 'USER_TO_BLITZ' as CommunicationMethod,
        },
        { status: 400 }
      );
    }

    const { workflow, genAINode } = workflowGenAI;

    if (!genAINode) {
      return Response.json(
        {
          error: 'GenAI Intent node not found in workflow. Please add and configure a GenAI Intent node.',
          method: 'USER_TO_BLITZ' as CommunicationMethod,
        },
        { status: 400 }
      );
    }

    // Get or create chat session
    const chatSession = await getOrCreateChatSession(user.id, targetBusinessId);

    // Save user message
    await saveChatMessage(chatSession.id, 'user', message);

    // Get chat history for context
    const history = await getChatHistory(chatSession.id);
    const conversationHistory = history.map((msg) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
    }));

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
      const nodeData = {
        genAIConfig: genAINode.genAIConfig,
      };
      
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
            method: 'USER_TO_BLITZ' as CommunicationMethod,
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
          method: 'USER_TO_BLITZ' as CommunicationMethod,
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
        method: 'USER_TO_BLITZ' as CommunicationMethod,
      },
      { status: 500 }
    );
  }
}

// Test endpoint for debugging
export async function GET() {
  try {
    return Response.json({
      status: 'success',
      message: 'Chat API is available',
      timestamp: new Date().toISOString(),
    });
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
