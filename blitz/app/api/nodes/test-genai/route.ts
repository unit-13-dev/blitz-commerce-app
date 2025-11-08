import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { GenAINodeExecutor } from '@/app/lib/nodes/executors';
import { NodeData, GenAIConfig } from '@/app/lib/types/workflow';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { listWorkflowsForBusiness } from '@/app/lib/db/workflows';
import { loadNodeConfigurations } from '@/app/lib/db/node-configurations';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workflowId, nodeId, testMessage, newApiKey, newModel } = body;

    if (!workflowId || !nodeId) {
      return NextResponse.json(
        { error: 'workflowId and nodeId are required' },
        { status: 400 }
      );
    }

    try {
      // Verify user has access to this workflow
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      const { business } = await ensureBusinessForUser(user);
      
      const workflows = await listWorkflowsForBusiness(business.id);
      const workflow = workflows.find((w) => w.id === workflowId);
      
      if (!workflow) {
        return NextResponse.json(
          { error: 'Workflow not found or access denied' },
          { status: 403 }
        );
      }

      // Load node configuration from database (this includes the decrypted API key)
      const configurations = await loadNodeConfigurations(workflowId);
      const nodeConfig = configurations[nodeId];

      if (!nodeConfig || !nodeConfig.genAIConfig) {
        return NextResponse.json(
          { 
            success: false,
            error: 'GenAI node configuration not found. Please save the configuration first.' 
          },
          { status: 400 }
        );
      }

      // Merge with any new values from the frontend (if user is updating)
      const mergedConfig: GenAIConfig = {
        ...nodeConfig.genAIConfig,
        // Use new API key if provided, otherwise use the decrypted one from DB
        apiKey: newApiKey || nodeConfig.genAIConfig.apiKey || '',
        // Use new model if provided, otherwise use the one from DB
        model: newModel || nodeConfig.genAIConfig.model || '',
      };

      // Validate we have both API key and model
      if (!mergedConfig.apiKey) {
        return NextResponse.json(
          { 
            success: false,
            error: 'API key is required. Please configure your API key in the GenAI node settings.' 
          },
          { status: 400 }
        );
      }

      if (!mergedConfig.model) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Model is required. Please select a model in the GenAI node settings.' 
          },
          { status: 400 }
        );
      }

      // Create NodeData with the merged config
      const nodeData: NodeData & { genAIConfig: GenAIConfig } = {
        genAIConfig: mergedConfig,
      };

      // Create executor and test
      const executor = new GenAINodeExecutor(nodeData);
      
      // Validate configuration
      const validation = executor.validateConfig();
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Configuration invalid',
            errors: validation.errors,
          },
          { status: 400 }
        );
      }

      // Test with provided message or default
      const result = await executor.test(testMessage || 'Hello, where is my order?');

      return NextResponse.json({
        success: true,
        result: {
          intent: result.intent,
          method: result.method,
          response: result.response.substring(0, 500) + (result.response.length > 500 ? '...' : ''),
          hasExtractedData: !!result.extractedData,
        },
      });
    } catch (error) {
      console.error('[Test GenAI] Execution error:', error);
      
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        return NextResponse.json(
          {
            success: false,
            error: (error as { message: string }).message,
            code: (error as { code: string }).code,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Test failed',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Test GenAI] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
