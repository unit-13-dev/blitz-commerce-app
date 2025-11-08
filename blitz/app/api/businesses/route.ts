import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import { listWorkflowsForBusiness } from '@/app/lib/db/workflows';

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
            
            // Query node_configurations table directly to check for configured GenAI node
            // IMPORTANT: We check BOTH the database column is_configured AND the config_data structure
            // This handles cases where data might be stored incorrectly
            try {
              const { data: allGenAINodes, error: queryError } = await supabase
                .from('node_configurations')
                .select('is_configured, config_data, node_id')
                .eq('workflow_id', workflow.id)
                .eq('node_type', 'genai-intent');

              if (queryError) {
                console.error('[Businesses API] Error querying node_configurations:', {
                  workflowId: workflow.id,
                  error: queryError,
                });
                hasGenAINode = false;
              } else if (allGenAINodes && allGenAINodes.length > 0) {
                // Log all found nodes for debugging
                console.log('[Businesses API] Found GenAI nodes:', {
                  workflowId: workflow.id,
                  nodeCount: allGenAINodes.length,
                  nodes: allGenAINodes.map(n => ({
                    nodeId: n.node_id,
                    isConfigured: n.is_configured,
                    configDataType: typeof n.config_data,
                    configDataIsObject: typeof n.config_data === 'object',
                  })),
                });
                
                // Check each GenAI node to see if any are properly configured
                for (const node of allGenAINodes) {
                  try {
                    const configData = node.config_data;
                    
                    // Handle different data types
                    let parsedConfigData: Record<string, unknown>;
                    if (typeof configData === 'string') {
                      try {
                        parsedConfigData = JSON.parse(configData);
                      } catch {
                        console.error('[Businesses API] Failed to parse config_data as JSON:', node.node_id);
                        continue;
                      }
                    } else if (typeof configData === 'object' && configData !== null) {
                      parsedConfigData = configData as Record<string, unknown>;
                    } else {
                      console.error('[Businesses API] Invalid config_data type:', {
                        nodeId: node.node_id,
                        type: typeof configData,
                      });
                      continue;
                    }
                    
                    // Check if config_data has genAIConfig
                    if (parsedConfigData.genAIConfig && typeof parsedConfigData.genAIConfig === 'object') {
                      const genAIConfigObj = parsedConfigData.genAIConfig as Record<string, unknown>;
                      
                      // Check if apiKey and model exist
                      const hasApiKey = genAIConfigObj.apiKey && 
                                        typeof genAIConfigObj.apiKey === 'string' &&
                                        genAIConfigObj.apiKey.trim().length > 0;
                      const hasModel = genAIConfigObj.model &&
                                       typeof genAIConfigObj.model === 'string' &&
                                       genAIConfigObj.model.trim().length > 0;
                      
                      // Check if configured - either database column OR config_data flag (for backwards compatibility)
                      // OR if it has API key and model (consider it configured even if flag is false)
                      const isConfiguredInDB = node.is_configured === true;
                      const isConfiguredInData = parsedConfigData.isConfigured === true || 
                                                 parsedConfigData.is_configured === true;
                      
                      // If node has API key and model, consider it configured
                      // (The API key test might have failed during save, but the key is still there)
                      const hasRequiredData = hasApiKey && hasModel;
                      const isActuallyConfigured = isConfiguredInDB || isConfiguredInData || hasRequiredData;
                      
                      console.log('[Businesses API] Checking GenAI node:', {
                        workflowId: workflow.id,
                        nodeId: node.node_id,
                        hasApiKey,
                        hasModel,
                        hasRequiredData,
                        isConfiguredInDB,
                        isConfiguredInData,
                        isActuallyConfigured,
                        model: genAIConfigObj.model,
                        apiKeyLength: hasApiKey ? (genAIConfigObj.apiKey as string).length : 0,
                      });
                      
                      // Node is configured if it has API key and model
                      // We consider it configured even if the API key test failed during save
                      // The actual API key validity will be tested when the chat API is called
                      if (hasApiKey && hasModel) {
                        hasGenAINode = true;
                        console.log('[Businesses API] ✓ GenAI node is properly configured:', {
                          workflowId: workflow.id,
                          nodeId: node.node_id,
                          model: genAIConfigObj.model,
                          isConfiguredFlag: isConfiguredInDB || isConfiguredInData,
                          note: 'Node has API key and model - considered configured for frontend display',
                        });
                        break; // Found a configured node, no need to check others
                      }
                    } else {
                      console.log('[Businesses API] GenAI node missing genAIConfig:', {
                        workflowId: workflow.id,
                        nodeId: node.node_id,
                        configDataKeys: Object.keys(parsedConfigData),
                        hasGenAIConfig: !!parsedConfigData.genAIConfig,
                      });
                    }
                  } catch (nodeError) {
                    console.error('[Businesses API] Error processing node:', {
                      workflowId: workflow.id,
                      nodeId: node.node_id,
                      error: nodeError instanceof Error ? nodeError.message : String(nodeError),
                    });
                  }
                }
                
                if (!hasGenAINode) {
                  console.log('[Businesses API] GenAI nodes found but none are properly configured:', {
                    workflowId: workflow.id,
                    nodeCount: allGenAINodes.length,
                    nodes: allGenAINodes.map(n => ({
                      nodeId: n.node_id,
                      isConfigured: n.is_configured,
                      hasConfigData: !!n.config_data,
                      configDataKeys: n.config_data && typeof n.config_data === 'object' 
                        ? Object.keys(n.config_data as Record<string, unknown>)
                        : [],
                    })),
                  });
                }
              } else {
                // No GenAI node configuration found in database
                console.log('[Businesses API] No GenAI node found in node_configurations:', {
                  workflowId: workflow.id,
                });
                hasGenAINode = false;
              }
            } catch (error) {
              console.error('[Businesses API] Exception querying node_configurations:', {
                workflowId: workflow.id,
                error: error instanceof Error ? error.message : String(error),
              });
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

