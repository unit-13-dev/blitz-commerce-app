'use client';

import { ModuleType } from '@/app/lib/types/workflow';

interface ModulePaletteProps {
  onAddNode: (nodeType: string, moduleType?: string) => void;
}

const moduleTypes: { type: ModuleType; label: string; icon: string }[] = [
  { type: 'tracking', label: 'Order Tracking', icon: '📦' },
  { type: 'cancellation', label: 'Order Cancellation', icon: '❌' },
  { type: 'faq', label: 'FAQ Assistant', icon: '💬' },
  { type: 'refund', label: 'Refund Processing', icon: '💰' },
];

export function ModulePalette({ onAddNode }: ModulePaletteProps) {
  return (
    <div className="hidden">
      <button onClick={() => onAddNode('module', moduleTypes[0].type)}>Add</button>
    </div>
  );
}

