import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import { listWorkflowsForBusiness, loadWorkflowWithConfigurations } from '@/app/lib/db/workflows';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get all businesses (for demo purposes - in production, this would be restricted)
    // For now, we'll get all businesses that have workflows
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });

    if (businessesError) {
      throw new Error(`Failed to fetch businesses: ${businessesError.message}`);
    }

    // For each business, check if it has a workflow and GenAI node
    const businessesWithWorkflows = await Promise.all(
      (businesses || []).map(async (business) => {
        try {
          const workflows = await listWorkflowsForBusiness(business.id);
          const workflow = workflows[0] || null;

          let hasWorkflow = false;
          let hasGenAINode = false;
          let workflowId: string | null = null;

          if (workflow) {
            hasWorkflow = true;
            workflowId = workflow.id;
            
            // Load workflow with configurations to check GenAI node
            try {
              const { nodes } = await loadWorkflowWithConfigurations(workflow.id);
              const genAINode = nodes.find((node) => node.type === 'genai-intent');
              // Check if GenAI node is fully configured (has API key and model)
              hasGenAINode = !!genAINode && 
                            !!genAINode.isConfigured && 
                            !!genAINode.genAIConfig?.apiKey && 
                            !!genAINode.genAIConfig?.model;
            } catch (error) {
              // If loading configurations fails, assume no GenAI node
              hasGenAINode = false;
            }
          }

          return {
            id: business.id,
            name: business.name,
            workflowId,
            hasWorkflow,
            hasGenAINode,
          };
        } catch (error) {
          return {
            id: business.id,
            name: business.name,
            workflowId: null,
            hasWorkflow: false,
            hasGenAINode: false,
          };
        }
      })
    );

    return NextResponse.json({ businesses: businessesWithWorkflows });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

