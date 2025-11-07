import { getSupabaseAdmin } from '../supabase/admin';

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
  nodes: unknown;
  edges: unknown;
}

export async function saveWorkflow({
  workflowId,
  businessId,
  name = 'Primary Workflow',
  description = null,
  nodes,
  edges,
}: SaveWorkflowInput): Promise<WorkflowRecord> {
  const supabase = getSupabaseAdmin();
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
