'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData, ModuleType } from '@/app/lib/types/workflow';

const moduleStyles: Record<ModuleType, { bg: string; border: string }> = {
  tracking: {
    bg: 'bg-blue-100 border-blue-300',
    border: 'border-blue-300',
  },
  cancellation: {
    bg: 'bg-rose-100 border-rose-300',
    border: 'border-rose-300',
  },
  faq: {
    bg: 'bg-amber-100 border-amber-300',
    border: 'border-amber-300',
  },
  refund: {
    bg: 'bg-emerald-100 border-emerald-300',
    border: 'border-emerald-300',
  },
};

const moduleLabels: Record<ModuleType, string> = {
  tracking: 'Order Tracking',
  cancellation: 'Order Cancellation',
  faq: 'FAQ Assistant',
  refund: 'Refund Processing',
};

export function ModuleNode(props: NodeProps) {
  const nodeData = (props.data || {}) as NodeData;
  const selected = props.selected;
  const id = props.id;
  const moduleType = (nodeData.moduleType || 'tracking') as ModuleType;
  const styles = moduleStyles[moduleType];
  const label = nodeData.label || moduleLabels[moduleType];
  // Note: moduleConfig is stored separately in the database, not in nodeData
  // The API count will be shown from the configured status
  const isConfigured = nodeData.isConfigured || false;

  return (
    <div
      className={`min-w-[220px] rounded-xl border ${styles.border} ${styles.bg} px-4 py-3 shadow ${
        selected ? 'ring-2 ring-slate-400' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{moduleType}</span>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="module-input"
        className="h-2.5 w-2.5 bg-slate-500"
        style={{ left: -6 }}
      />

      <div className="space-y-1 text-xs text-slate-700">
        <div className="rounded bg-white/60 px-2 py-1 font-mono text-[10px] uppercase text-slate-500">
          ID: {id}
        </div>
        {!isConfigured && (
          <div className="rounded bg-amber-200/70 px-2 py-1 text-amber-800">
            Configure module details
          </div>
        )}
        {isConfigured && (
          <div className="rounded bg-green-200/70 px-2 py-1 text-green-800">
            ✓ Configured
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="module-output"
        className="h-2.5 w-2.5 bg-slate-500"
        style={{ right: -6 }}
      />
    </div>
  );
}

