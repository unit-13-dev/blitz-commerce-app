'use client';

import { WorkflowCanvas } from '@/app/components/workflow/WorkflowCanvas';

export default function WorkflowsPage() {
  const handleSave = (nodes: any[], edges: any[]) => {
    console.log('Saving workflow:', { nodes, edges });
    // TODO: Implement API call to save workflow
    alert('Workflow saved! (Check console for details)');
  };

  return (
    <div className="h-screen w-full">
      <WorkflowCanvas onSave={handleSave} />
    </div>
  );
}

