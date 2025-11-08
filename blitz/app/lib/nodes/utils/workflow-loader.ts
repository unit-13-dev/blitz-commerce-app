import { listWorkflowsForBusiness, loadWorkflowWithConfigurations } from '@/app/lib/db/workflows';
import { WorkflowNodeWithConfig } from '@/app/lib/types/workflow';
import { WorkflowRecord } from '@/app/lib/db/workflows';

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

