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
            
            // Check if GenAI node is configured by directly querying the database
            // This is more reliable than loading and decrypting (which might fail)
            try {
              // First, check if GenAI node exists in workflow
              const { nodes: workflowNodes } = await loadWorkflowWithConfigurations(workflow.id);
              const genAINode = workflowNodes.find((node) => node.type === 'genai-intent');
              
              if (!genAINode) {
                hasGenAINode = false;
                console.log(`[Businesses API] Business ${business.id} - No GenAI node found in workflow`);
              } else {
                // Directly query the database to check is_configured flag
                // This is the source of truth - if the database says it's configured, we trust it
                const { workflowHasConfiguredGenAI } = await import('@/app/lib/db/node-configurations');
                const isConfiguredInDB = await workflowHasConfiguredGenAI(workflow.id);
                
                // The database is_configured flag is the source of truth
                // If it's true, the node is considered configured
                // (Decryption errors will surface when trying to use the node, not here)
                hasGenAINode = isConfiguredInDB;
                
                // Also try to verify we can decrypt (for logging/debugging purposes only)
                // This doesn't affect hasGenAINode, but helps debug issues
                let canDecrypt = false;
                let decryptError: Error | null = null;
                try {
                  const { nodes } = await loadWorkflowWithConfigurations(workflow.id);
                  const loadedGenAINode = nodes.find((node) => node.type === 'genai-intent' && node.id === genAINode.id);
                  
                  if (loadedGenAINode && 
                      loadedGenAINode.genAIConfig?.apiKey && 
                      loadedGenAINode.genAIConfig?.model &&
                      loadedGenAINode.genAIConfig.apiKey.trim().length > 0 &&
                      loadedGenAINode.genAIConfig.model.trim().length > 0) {
                    canDecrypt = true;
                  }
                } catch (error) {
                  decryptError = error instanceof Error ? error : new Error(String(error));
                  console.warn(`[Businesses API] Warning: Database says GenAI is configured for business ${business.id}, but decryption failed. This will cause issues when using the chat API.`, decryptError.message);
                }
                
                // Log for debugging
                console.log(`[Businesses API] Business ${business.id} - GenAI node check:`, {
                  nodeId: genAINode.id,
                  isConfiguredInDB,
                  canDecrypt,
                  hasGenAINode,
                  decryptError: decryptError?.message || null,
                  note: hasGenAINode 
                    ? (canDecrypt 
                        ? 'GenAI node is configured and decryptable' 
                        : 'GenAI node is configured in DB but decryption failed - check API_ENCRYPTION_KEY')
                    : 'Database says not configured',
                });
              }
            } catch (error) {
              // If loading configurations fails, log error but don't fail completely
              console.error(`[Businesses API] Failed to check GenAI configuration for business ${business.id}:`, error);
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

