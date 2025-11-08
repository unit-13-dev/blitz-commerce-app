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
    if (!['genai-intent', 'router', 'module', 'response'].includes(nodeType)) {
      return NextResponse.json(
        { error: 'Invalid node type.' },
        { status: 400 }
      );
    }

    // Validate GenAI config if it's a GenAI node
    let isConfigured = payload.isConfigured ?? false;
    
    if (nodeType === 'genai-intent') {
      const config = payload.config as NodeConfigurationData;
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

      // Test the API key if user is trying to save/configure
      // Always test the API key when saving to ensure it's valid
      if (config.genAIConfig) {
        console.log('[Save Node Config] Testing API key before saving...');
        const apiKeyTest = await testAPIKey(config.genAIConfig);
        
        if (!apiKeyTest.valid) {
          // API key test failed - save config but don't mark as configured
          isConfigured = false;
          
          // Save the configuration anyway (so user can edit it), but mark as not configured
          const nodeConfig = await saveNodeConfiguration(
            payload.workflowId,
            payload.nodeId,
            nodeType,
            payload.config as NodeConfigurationData,
            false // Not configured because API key is invalid
          );
          
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
        
        console.log('[Save Node Config] API key test passed, marking as configured');
        // API key is valid - mark as configured
        isConfigured = true;
      } else {
        // No API key provided
        isConfigured = false;
      }
    }

    // Save node configuration
    const nodeConfig = await saveNodeConfiguration(
      payload.workflowId,
      payload.nodeId,
      nodeType,
      payload.config as NodeConfigurationData,
      isConfigured
    );

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

