import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { WorkflowCanvas } from '@/app/components/workflow/WorkflowCanvas';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { listWorkflowsForBusiness } from '@/app/lib/db/workflows';
import { WorkflowEdge, WorkflowNode } from '@/app/lib/types/workflow';

export default async function WorkflowsPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { business } = await ensureBusinessForUser(user);
  const workflows = await listWorkflowsForBusiness(business.id);
  const primaryWorkflow = workflows[0] ?? null;

  const nodes = (primaryWorkflow?.react_flow_state?.nodes ?? []) as WorkflowNode[];
  const edges = (primaryWorkflow?.react_flow_state?.edges ?? []) as WorkflowEdge[];

  return (
    <div className="h-screen w-full">
      <WorkflowCanvas
        workflowId={primaryWorkflow?.id}
        initialNodes={Array.isArray(nodes) ? nodes : []}
        initialEdges={Array.isArray(edges) ? edges : []}
      />
    </div>
  );
}

