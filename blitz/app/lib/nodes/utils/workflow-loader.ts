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

  // Validate GenAI config exists
  if (!genAINode.genAIConfig) {
    throw new Error('GenAI Intent node configuration is missing. Please configure the node in the workflow builder with an API key and model.');
  }

  // Validate GenAI config has API key (check if it exists and is not empty)
  // Note: API key is encrypted in DB, but after decryption it should be a non-empty string
  if (!genAINode.genAIConfig.apiKey || typeof genAINode.genAIConfig.apiKey !== 'string' || genAINode.genAIConfig.apiKey.trim().length === 0) {
    throw new Error('GenAI Intent node API key is missing or invalid. Please configure your API key (Perplexity or Google Gemini) in the GenAI node settings.');
  }
  
  // Validate GenAI config has model
  if (!genAINode.genAIConfig.model || typeof genAINode.genAIConfig.model !== 'string' || genAINode.genAIConfig.model.trim().length === 0) {
    throw new Error('GenAI Intent node model is missing. Please select a model in the GenAI node settings.');
  }

  // Validate supported models
  const supportedModels = ['sonar-pro', 'sonar', 'sonar-pro-online', 'sonar-pro-chat', 'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  if (!supportedModels.includes(genAINode.genAIConfig.model)) {
    throw new Error(`Unsupported model: "${genAINode.genAIConfig.model}". Supported models are: ${supportedModels.join(', ')}. Please update your GenAI node configuration.`);
  }

  // Note: We DO NOT check isConfigured flag here
  // We only check if API key and model exist in the configuration
  // The isConfigured flag might be false if API key test failed during save, but we still want to try using it
  // API key testing should only happen when explicitly requested (e.g., Test API button)
  // This function is used by the chat POST endpoint, which will attempt to use the API key
  // If the API key is invalid, the GenAI executor will throw an error which will be handled properly

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

