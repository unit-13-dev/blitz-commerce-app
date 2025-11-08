import { getSupabaseAdmin } from '../supabase/admin';
import { WorkflowNode, WorkflowEdge, NodeType } from '../types/workflow';
import { loadNodeConfigurations } from './node-configurations';
import { WorkflowNodeWithConfig } from '../types/workflow';

export type WorkflowRecord = {
  id: string;
  name: string;
  description: string | null;
  react_flow_state: {
    nodes: unknown;
    edges: unknown;
  } | null;
  business_id: string;
  created_at: string;
  updated_at: string;
};

export async function listWorkflowsForBusiness(businessId: string): Promise<WorkflowRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch workflows: ${error.message}`);
  }

  return (data ?? []) as WorkflowRecord[];
}

interface SaveWorkflowInput {
  workflowId?: string;
  businessId: string;
  name?: string;
  description?: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/**
 * Saves workflow - only saves react_flow_state (basic node info)
 * Node configurations should be saved separately using saveNodeConfiguration
 */
export async function saveWorkflow({
  workflowId,
  businessId,
  name = 'Primary Workflow',
  description = null,
  nodes,
  edges,
}: SaveWorkflowInput): Promise<WorkflowRecord> {
  const supabase = getSupabaseAdmin();
  
  // Only save basic node info (position, id, type, basic data) - no configs
  const reactFlowState = {
    nodes,
    edges,
  };

  if (workflowId) {
    const { data, error } = await supabase
      .from('workflows')
      .update({
        name,
        description,
        react_flow_state: reactFlowState,
      })
      .eq('id', workflowId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update workflow: ${error?.message ?? 'unknown error'}`);
    }

    return data as WorkflowRecord;
  }

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      name,
      description,
      react_flow_state: reactFlowState,
      business_id: businessId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create workflow: ${error?.message ?? 'unknown error'}`);
  }

  return data as WorkflowRecord;
}

/**
 * Ensures a workflow exists for a business. Creates one with default core nodes if it doesn't exist.
 * This is called automatically when a business is created or when accessing the workflows page.
 */
export async function ensureWorkflowForBusiness(businessId: string): Promise<WorkflowRecord> {
  const existingWorkflows = await listWorkflowsForBusiness(businessId);

  if (existingWorkflows.length > 0) {
    return existingWorkflows[0];
  }

  // Create workflow with default core nodes (GenAI, Router, Response)
  // These nodes are always present and track their positions in react_flow_state
  const defaultNodes: WorkflowNode[] = [
    {
      id: 'genai-node',
      type: 'genai-intent',
      position: { x: 200, y: 200 },
      data: {
        // Basic data only, no configs
        // Node configurations are stored separately in node_configurations table
      },
    },
    {
      id: 'router-node',
      type: 'router',
      position: { x: 600, y: 200 },
      data: {
        // Basic data only, no configs
      },
    },
    {
      id: 'response-node',
      type: 'response',
      position: { x: 1000, y: 200 },
      data: {
        responseType: 'text',
      },
    },
  ];

  const defaultEdges: WorkflowEdge[] = [];

  return await saveWorkflow({
    businessId,
    name: 'Primary Workflow',
    description: null,
    nodes: defaultNodes,
    edges: defaultEdges,
  });
}

/**
 * Loads workflow with node configurations merged
 */
export async function loadWorkflowWithConfigurations(
  workflowId: string
): Promise<{
  workflow: WorkflowRecord;
  nodes: WorkflowNodeWithConfig[];
  edges: WorkflowEdge[];
}> {
  const supabase = getSupabaseAdmin();

  // Load workflow
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (workflowError || !workflow) {
    throw new Error(`Failed to load workflow: ${workflowError?.message ?? 'workflow not found'}`);
  }

  // Load node configurations
  const configurations = await loadNodeConfigurations(workflowId);

  // Parse react_flow_state
  const reactFlowState = workflow.react_flow_state as {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } | null;

  if (!reactFlowState) {
    return {
      workflow: workflow as WorkflowRecord,
      nodes: [],
      edges: [],
    };
  }

  // Merge nodes with their configurations
  const nodesWithConfig: WorkflowNodeWithConfig[] = (reactFlowState.nodes || []).map((node) => {
    const config = configurations[node.id];
    if (!config) {
      return {
        ...node,
        isConfigured: false,
      };
    }

    return {
      ...node,
      genAIConfig: config.genAIConfig,
      routerConfig: config.routerConfig,
      moduleConfig: config.moduleConfig,
      responseConfig: config.responseConfig,
      isConfigured: config.isConfigured,
    };
  });

  return {
    workflow: workflow as WorkflowRecord,
    nodes: nodesWithConfig,
    edges: reactFlowState.edges || [],
  };
}
