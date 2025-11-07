'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData, IntentType } from '@/app/lib/types/workflow';

const routerIntents: IntentType[] = ['TRACK_SHIPMENT', 'CANCEL_ORDER', 'FAQ_SUPPORT'];

export function RouterNode(props: NodeProps) {
  const nodeData = (props.data || {}) as NodeData;
  const selected = props.selected;
  const routerConfig = nodeData.routerConfig;
  const intentMappings = (routerConfig?.intentMappings || {}) as Record<IntentType, string>;

  return (
    <div
      className={`min-w-[260px] rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 shadow ${
        selected ? 'ring-2 ring-slate-400' : ''
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-slate-700" />
        <h3 className="text-sm font-semibold text-slate-900">Router / Orchestrator</h3>
      </div>

      <p className="mb-3 text-xs text-slate-600">
        Routes each detected intent into its automation module and handles responses.
      </p>

      <Handle
        type="target"
        position={Position.Left}
        id="intent-input"
        className="h-2.5 w-2.5 bg-slate-500"
        style={{ left: -6, top: '50%' }}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="router-output"
        className="h-2.5 w-2.5 bg-slate-500"
        style={{ right: -6, top: '50%' }}
      />

      <div className="space-y-1">
        {routerIntents.map((intent) => {
          const isMapped = Boolean(intentMappings[intent]);
          return (
            <div key={intent} className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs text-slate-700">
              <span>{intent.replace('_', ' ')}</span>
              <span className={isMapped ? 'text-emerald-600' : 'text-amber-500'}>
                {isMapped ? 'Linked' : 'Unlinked'}
              </span>
            </div>
          );
        })}
      </div>

      {!nodeData.isConfigured && (
        <div className="mt-3 rounded bg-amber-200/70 px-2 py-1 text-xs text-amber-800">
          Configure intent mappings
        </div>
      )}
    </div>
  );
}

