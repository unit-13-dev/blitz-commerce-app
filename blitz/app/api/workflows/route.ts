import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { listWorkflowsForBusiness, saveWorkflow, loadWorkflowWithConfigurations } from '@/app/lib/db/workflows';
import { WorkflowNode, WorkflowEdge } from '@/app/lib/types/workflow';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const { business } = await ensureBusinessForUser(user);
    const workflows = await listWorkflowsForBusiness(business.id);

    // Load configurations for each workflow
    const workflowsWithConfigs = await Promise.all(
      workflows.map(async (workflow) => {
        try {
          const { nodes, edges } = await loadWorkflowWithConfigurations(workflow.id);
          return {
            ...workflow,
            nodes,
            edges,
          };
        } catch (error) {
          console.error(`Failed to load configurations for workflow ${workflow.id}:`, error);
          return workflow;
        }
      })
    );

    return NextResponse.json({
      business,
      workflows: workflowsWithConfigs,
    });
  } catch (error) {
    console.error('[GET /api/workflows] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    return NextResponse.json(
      { error: 'Invalid payload. Expected nodes and edges arrays.' },
      { status: 400 }
    );
  }

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const { business } = await ensureBusinessForUser(user);

    // Validate nodes array contains WorkflowNode structure
    const nodes = payload.nodes as WorkflowNode[];
    const edges = payload.edges as WorkflowEdge[];

    // Save workflow (only basic node info, no configs)
    const workflow = await saveWorkflow({
      workflowId: payload.workflowId,
      businessId: business.id,
      name: payload.name,
      description: payload.description,
      nodes,
      edges,
    });

    return NextResponse.json({ workflow }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/workflows] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save workflow' },
      { status: 500 }
    );
  }
}
