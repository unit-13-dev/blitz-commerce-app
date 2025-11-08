import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { listWorkflowsForBusiness } from '@/app/lib/db/workflows';
import { saveNodeConfiguration, deleteNodeConfiguration } from '@/app/lib/db/node-configurations';
import { NodeType, NodeConfigurationData } from '@/app/lib/types/workflow';
import { testAPIKey } from '@/app/lib/nodes/utils/api-key-validator';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);

    if (!payload || !payload.workflowId || !payload.nodeId || !payload.nodeType || !payload.config) {
      return NextResponse.json(
        { error: 'Invalid payload. Expected workflowId, nodeId, nodeType, config, and isConfigured.' },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const { business } = await ensureBusinessForUser(user);

    // Verify workflow belongs to business
    const workflows = await listWorkflowsForBusiness(business.id);
    const workflow = workflows.find((w) => w.id === payload.workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found or does not belong to your business.' },
        { status: 404 }
      );
    }

    // Validate node type
    const nodeType = payload.nodeType as NodeType;
    if (!['genai-intent', 'router', 'module'].includes(nodeType)) {
      return NextResponse.json(
        { error: 'Invalid node type.' },
        { status: 400 }
      );
    }

    // Determine isConfigured based on node type
    // For GenAI nodes, isConfigured is ALWAYS determined by API key validation test
    // For other nodes, use the payload value
    let isConfigured = payload.isConfigured ?? false;
    
    if (nodeType === 'genai-intent') {
      const config = payload.config as NodeConfigurationData;
      
      // Validate required fields
      if (!config.genAIConfig?.apiKey) {
        return NextResponse.json(
          { error: 'API key is required for GenAI node.' },
          { status: 400 }
        );
      }
      if (!config.genAIConfig.model) {
        return NextResponse.json(
          { error: 'Model is required for GenAI node.' },
          { status: 400 }
        );
      }
      const supportedModels = ['sonar-pro', 'sonar', 'sonar-pro-online', 'sonar-pro-chat', 'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
      if (!supportedModels.includes(config.genAIConfig.model)) {
        return NextResponse.json(
          { error: `Unsupported model: "${config.genAIConfig.model}". Supported models are: ${supportedModels.join(', ')}.` },
          { status: 400 }
        );
      }

      // IMPORTANT: For GenAI nodes, isConfigured is ALWAYS determined by API key validation
      // We ignore the frontend's isConfigured value and test the API key instead
      console.log('[Save Node Config] GenAI node detected - testing API key to determine isConfigured status...');
      console.log('[Save Node Config] Model:', config.genAIConfig.model);
      console.log('[Save Node Config] API key prefix:', config.genAIConfig.apiKey.substring(0, 10) + '...');
      
      // Test the API key to determine if node is configured
      // This is the ONLY way to determine isConfigured for GenAI nodes
      const apiKeyTest = await testAPIKey(config.genAIConfig);
      
      if (!apiKeyTest.valid) {
        // API key test failed - node is NOT configured
        console.log('[Save Node Config] API key test FAILED - marking is_configured = false');
        console.log('[Save Node Config] Error:', apiKeyTest.error);
        
        // Save the configuration anyway (so user can edit it), but mark as not configured
        const nodeConfig = await saveNodeConfiguration(
          payload.workflowId,
          payload.nodeId,
          nodeType,
          payload.config as NodeConfigurationData,
          false // is_configured = false because API key is invalid
        );
        
        console.log('[Save Node Config] Configuration saved with is_configured = false');
        console.log('[Save Node Config] Saved node config is_configured value:', nodeConfig.is_configured);
        
        // Return error but also return the saved config so UI can update
        return NextResponse.json(
          { 
            nodeConfig,
            error: apiKeyTest.error || 'API key validation failed',
            apiKeyInvalid: true,
          },
          { status: 400 }
        );
      }
      
      // API key test PASSED - node IS configured
      console.log('[Save Node Config] API key test PASSED - marking is_configured = true');
      isConfigured = true; // This will be saved to the database
    }

    // Save node configuration with isConfigured flag
    console.log(`[Save Node Config] Saving configuration for node ${payload.nodeId} (${nodeType}) with isConfigured = ${isConfigured}`);
    
    const nodeConfig = await saveNodeConfiguration(
      payload.workflowId,
      payload.nodeId,
      nodeType,
      payload.config as NodeConfigurationData,
      isConfigured // This will be saved to the is_configured column in the database
    );

    // Verify that is_configured was saved correctly
    console.log(`[Save Node Config] Configuration saved successfully`);
    console.log(`[Save Node Config] Saved is_configured value in DB: ${nodeConfig.is_configured}`);
    console.log(`[Save Node Config] Expected is_configured value: ${isConfigured}`);
    
    if (nodeConfig.is_configured !== isConfigured) {
      console.error(`[Save Node Config] WARNING: is_configured mismatch! Expected ${isConfigured}, but got ${nodeConfig.is_configured}`);
    } else {
      console.log(`[Save Node Config] ✓ is_configured value matches expected value`);
    }

    return NextResponse.json({ nodeConfig }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/workflows/node-config] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save node configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    const nodeId = searchParams.get('nodeId');

    if (!workflowId || !nodeId) {
      return NextResponse.json(
        { error: 'Missing workflowId or nodeId query parameters.' },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const { business } = await ensureBusinessForUser(user);

    // Verify workflow belongs to business
    const workflows = await listWorkflowsForBusiness(business.id);
    const workflow = workflows.find((w) => w.id === workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found or does not belong to your business.' },
        { status: 404 }
      );
    }

    // Delete node configuration
    await deleteNodeConfiguration(workflowId, nodeId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/workflows/node-config] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete node configuration' },
      { status: 500 }
    );
  }
}

