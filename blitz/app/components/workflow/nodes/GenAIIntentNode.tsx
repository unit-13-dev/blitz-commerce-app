'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData } from '@/app/lib/types/workflow';

export function GenAIIntentNode(props: NodeProps) {
  const nodeData = (props.data || {}) as NodeData;
  const selected = props.selected;
  return (
    <div
      className={`min-w-[220px] rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 shadow ${
        selected ? 'ring-2 ring-indigo-300' : ''
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-900">GenAI Intent Layer</h3>
      </div>

      <p className="mb-3 text-xs text-slate-600">
        Understands customer intent and sends it into the automation router.
      </p>

      {nodeData.genAIConfig && (
        <div className="mb-2 rounded bg-white px-2 py-1 text-xs text-slate-700">
          <div>Model: {nodeData.genAIConfig.model || 'gpt-4'}</div>
          {nodeData.genAIConfig.temperature !== undefined && (
            <div>Temp: {nodeData.genAIConfig.temperature}</div>
          )}
        </div>
      )}

      {!nodeData.isConfigured && (
        <div className="rounded bg-amber-200/70 px-2 py-1 text-xs text-amber-800">
          Configure intent detector
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="intent-output"
        className="h-2.5 w-2.5 bg-indigo-500"
        style={{ right: -6 }}
      />
    </div>
  );
}

