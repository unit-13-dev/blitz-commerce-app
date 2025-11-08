import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { getOrCreateChatSession, saveChatMessage, getChatHistory } from '@/app/lib/db/chat';
import { getWorkflowGenAINode } from '@/app/lib/nodes/utils/workflow-loader';
import { loadWorkflowWithConfigurations } from '@/app/lib/db/workflows';
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

    // Load complete workflow with all nodes and configurations
    const { nodes, edges } = await loadWorkflowWithConfigurations(workflow.id);

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

      // Format final response based on response type and method
      let responseContent: string;
      let responseData: Record<string, unknown> | undefined;

      if (workflowResult.method === 'MODULE_TO_FRONTEND') {
        // UI component response - return as structured data
        responseData = workflowResult.finalResponse as Record<string, unknown>;
        responseContent = JSON.stringify(responseData, null, 2); // For display in chat history
      } else {
        // Text response from GenAI
        responseContent = typeof workflowResult.finalResponse === 'string' 
          ? workflowResult.finalResponse 
          : JSON.stringify(workflowResult.finalResponse, null, 2);
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
        response: workflowResult.method === 'MODULE_TO_FRONTEND' ? undefined : responseContent,
        data: workflowResult.method === 'MODULE_TO_FRONTEND' 
          ? (workflowResult.finalResponse as Record<string, unknown>) // UI component data
          : (workflowResult.extractedData || {}), // Extracted data for GenAI responses
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
      
      // The getWorkflowGenAINode function checks:
      // 1. GenAI node exists
      // 2. is_configured flag is true in database
      // 3. API key and model are present (decrypted)
      // 4. Model is supported
      // Note: API key is NOT tested here (only when saving configuration)
      // If API key is invalid, it will fail during chat execution
      return Response.json({
        status: 'success',
        message: 'Chat API is ready. GenAI node is configured.',
        timestamp: new Date().toISOString(),
        businessId: targetBusinessId,
        workflowId: workflowGenAI.workflow.id,
      });
    } catch (error) {
      // Workflow or GenAI node is not configured, or decryption failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Chat API GET] Failed to load GenAI node:', error);
      
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
