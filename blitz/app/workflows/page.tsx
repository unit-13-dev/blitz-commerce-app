import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { WorkflowCanvas } from '@/app/components/workflow/WorkflowCanvas';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { loadWorkflowWithConfigurations, ensureWorkflowForBusiness } from '@/app/lib/db/workflows';
import { WorkflowEdge, WorkflowNode } from '@/app/lib/types/workflow';

export default async function WorkflowsPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  try {
    const { business } = await ensureBusinessForUser(user);
    
    // Ensure a workflow exists for this business (creates one with default nodes if it doesn't exist)
    const workflow = await ensureWorkflowForBusiness(business.id);

    // Load workflow with configurations
    const { nodes: nodesWithConfig, edges } = await loadWorkflowWithConfigurations(workflow.id);

    // Convert to WorkflowNode format (without configs for React Flow)
    // But include isConfigured flag for UI display
    const nodes: WorkflowNode[] = nodesWithConfig.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        isConfigured: node.isConfigured ?? false, // Include config status for UI
      },
    }));

    return (
      <div className="h-screen w-full">
        <WorkflowCanvas
          workflowId={workflow.id}
          initialNodes={nodes}
          initialEdges={edges}
          initialNodeConfigs={nodesWithConfig.reduce((acc, node) => {
            acc[node.id] = {
              genAIConfig: node.genAIConfig,
              routerConfig: node.routerConfig,
              moduleConfig: node.moduleConfig,
              responseConfig: node.responseConfig,
              isConfigured: node.isConfigured,
            };
            return acc;
          }, {} as Record<string, any>)}
        />
      </div>
    );
  } catch (error) {
    console.error('[WorkflowsPage] Error loading workflow:', error);
    
    // Return error page with helpful message
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="mb-4 text-xl font-semibold text-red-900">Database Connection Error</h1>
          <p className="mb-4 text-sm text-red-800">
            {error instanceof Error ? error.message : 'Failed to connect to the database.'}
          </p>
          <div className="rounded-md bg-white p-4 text-xs text-gray-700">
            <p className="mb-2 font-semibold">Troubleshooting steps:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Check that your Supabase environment variables are set correctly</li>
              <li>Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local</li>
              <li>Ensure your Supabase project is running and accessible</li>
              <li>Check your network connection</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}

