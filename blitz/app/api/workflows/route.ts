import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { listWorkflowsForBusiness, saveWorkflow } from '@/app/lib/db/workflows';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const { business } = await ensureBusinessForUser(user);
  const workflows = await listWorkflowsForBusiness(business.id);

  return NextResponse.json({
    business,
    workflows,
  });
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

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const { business } = await ensureBusinessForUser(user);

  try {
    const workflow = await saveWorkflow({
      workflowId: payload.workflowId,
      businessId: business.id,
      name: payload.name,
      description: payload.description,
      nodes: payload.nodes,
      edges: payload.edges,
    });

    return NextResponse.json({ workflow }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save workflow' },
      { status: 500 }
    );
  }
}
