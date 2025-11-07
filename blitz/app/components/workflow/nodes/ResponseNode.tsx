'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData } from '@/app/lib/types/workflow';

export function ResponseNode(props: NodeProps) {
  const nodeData = (props.data || {}) as NodeData;
  const selected = props.selected;
  const responseType = nodeData.responseType || 'text';

  return (
    <div
      className={`min-w-[200px] rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 shadow ${
        selected ? 'ring-2 ring-slate-400' : ''
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-slate-600" />
        <h3 className="text-sm font-semibold text-slate-900">Response Formatter</h3>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="response-input"
        className="h-2.5 w-2.5 bg-slate-500"
        style={{ left: -6 }}
      />

      <p className="mb-2 text-xs text-slate-600">
        Shapes module output before the user sees it.
      </p>

      <div className="rounded bg-white px-2 py-1 text-xs text-slate-700">Type: {responseType}</div>

      {nodeData.responseConfig && (
        <div className="mt-2 rounded bg-white px-2 py-1 text-xs text-slate-700">
          Config keys: {Object.keys(nodeData.responseConfig).length}
        </div>
      )}
    </div>
  );
}

