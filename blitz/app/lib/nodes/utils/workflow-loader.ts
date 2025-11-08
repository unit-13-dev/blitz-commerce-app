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

  // Check if GenAI node is configured (check database is_configured flag)
  if (!genAINode.isConfigured) {
    throw new Error('GenAI Intent node is not configured. Please configure the node in the workflow builder with an API key and model.');
  }

  // Validate GenAI config has API key (decrypted)
  if (!genAINode.genAIConfig?.apiKey || genAINode.genAIConfig.apiKey.trim().length === 0) {
    console.error('[getWorkflowGenAINode] GenAI API key is missing or empty after decryption');
    throw new Error('GenAI Intent node API key is missing or could not be decrypted. Please check your API_ENCRYPTION_KEY environment variable and reconfigure your API key.');
  }
  
  // Validate GenAI config has model
  if (!genAINode.genAIConfig?.model || genAINode.genAIConfig.model.trim().length === 0) {
    throw new Error('GenAI Intent node model is missing. Please select a model in the GenAI node settings.');
  }

  // Validate supported models
  const supportedModels = ['sonar-pro', 'sonar', 'sonar-pro-online', 'sonar-pro-chat', 'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  if (!supportedModels.includes(genAINode.genAIConfig.model)) {
    throw new Error(`Unsupported model: "${genAINode.genAIConfig.model}". Supported models are: ${supportedModels.join(', ')}. Please update your GenAI node configuration.`);
  }

  // Log configuration status for debugging
  console.log('[getWorkflowGenAINode] GenAI node configuration loaded:', {
    nodeId: genAINode.id,
    isConfigured: genAINode.isConfigured,
    model: genAINode.genAIConfig.model,
    apiKeyLength: genAINode.genAIConfig.apiKey.length,
    apiKeyPrefix: genAINode.genAIConfig.apiKey.substring(0, 10) + '...',
  });

  // Note: We don't test the API key here because:
  // 1. API key testing is expensive (makes an API call)
  // 2. API key testing is done when saving the configuration
  // 3. If the API key is invalid, it will fail during chat execution, which is acceptable
  // 4. The is_configured flag in the database is the source of truth

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

