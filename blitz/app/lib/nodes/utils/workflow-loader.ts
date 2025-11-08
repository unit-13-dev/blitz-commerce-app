import { listWorkflowsForBusiness, loadWorkflowWithConfigurations } from '@/app/lib/db/workflows';
import { WorkflowNodeWithConfig } from '@/app/lib/types/workflow';
import { WorkflowRecord } from '@/app/lib/db/workflows';
import { testAPIKey } from './api-key-validator';

export interface WorkflowGenAINode {
  workflow: WorkflowRecord;
  genAINode: WorkflowNodeWithConfig | null;
  nodes: WorkflowNodeWithConfig[];
}

/**
 * Loads the business's workflow and extracts the GenAI node with its configuration
 */
export async function getWorkflowGenAINode(businessId: string): Promise<WorkflowGenAINode> {
  const workflows = await listWorkflowsForBusiness(businessId);

  if (workflows.length === 0) {
    throw new Error('No workflow found for this business. Please create a workflow first.');
  }

  // Get the primary workflow (first one)
  const workflow = workflows[0];

  // Load workflow with configurations
  const { nodes, edges } = await loadWorkflowWithConfigurations(workflow.id);

  // Find the GenAI node
  const genAINode = nodes.find((node) => node.type === 'genai-intent') || null;

  if (!genAINode) {
    throw new Error('GenAI Intent node not found in workflow. Please add and configure a GenAI Intent node.');
  }

  // Check if GenAI node is configured
  if (!genAINode.isConfigured) {
    throw new Error('GenAI Intent node is not configured. Please configure the node in the workflow builder with an API key.');
  }

  // Validate GenAI config has API key
  if (!genAINode.genAIConfig?.apiKey) {
    throw new Error('GenAI Intent node API key is missing. Please configure your API key (Perplexity or Google Gemini) in the GenAI node settings.');
  }
  
  // Validate GenAI config has model
  if (!genAINode.genAIConfig?.model) {
    throw new Error('GenAI Intent node model is missing. Please select a model in the GenAI node settings.');
  }

  // Validate supported models
  const supportedModels = ['sonar-pro', 'sonar', 'sonar-pro-online', 'sonar-pro-chat', 'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  if (!supportedModels.includes(genAINode.genAIConfig.model)) {
    throw new Error(`Unsupported model: "${genAINode.genAIConfig.model}". Supported models are: ${supportedModels.join(', ')}. Please update your GenAI node configuration.`);
  }

  // Test the API key to ensure it actually works
  // Note: This is async validation, so we test it here
  // If the API key is invalid, we should mark the node as not configured
  try {
    const apiKeyTest = await testAPIKey(genAINode.genAIConfig);
    if (!apiKeyTest.valid) {
      // API key is invalid - mark node as not configured in database
      // Import here to avoid circular dependencies
      const { saveNodeConfiguration, loadNodeConfigurations } = await import('@/app/lib/db/node-configurations');
      const configurations = await loadNodeConfigurations(workflow.id);
      const nodeConfig = configurations[genAINode.id];
      
      if (nodeConfig) {
        // Update to mark as not configured
        await saveNodeConfiguration(
          workflow.id,
          genAINode.id,
          'genai-intent',
          nodeConfig,
          false
        );
      }
      
      throw new Error(apiKeyTest.error || 'API key is invalid or not working. Please update your API key in the workflow builder.');
    }
  } catch (error) {
    // If testAPIKey throws an error, check if it's our validation error
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    // Re-throw other errors
    throw new Error(`Failed to validate API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    workflow,
    genAINode,
    nodes,
  };
}

/**
 * Lists all businesses with their workflows (for demo purposes)
 */
export async function listBusinessesWithWorkflows(): Promise<Array<{
  id: string;
  name: string;
  workflowId: string | null;
  hasWorkflow: boolean;
  hasGenAINode: boolean;
}>> {
  // This will need to query all businesses
  // For now, we'll create an API route for this
  // This is a placeholder function
  return [];
}

