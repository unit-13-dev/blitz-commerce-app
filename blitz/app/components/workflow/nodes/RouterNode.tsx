'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData, IntentType } from '@/app/lib/types/workflow';

export function RouterNode(props: NodeProps) {
  const nodeData = (props.data || {}) as NodeData;
  const selected = props.selected;
  const routerConfig = nodeData.routerConfig;
  const intentMappings = (routerConfig?.intentMappings || {}) as Record<IntentType, string>;
  
  const intentTypes: IntentType[] = [
    'TRACK_SHIPMENT',
    'CANCEL_ORDER',
    'REQUEST_REFUND',
    'MODIFY_ORDER',
    'GENERIC_QUERY'
  ];

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-linear-to-br from-blue-500 to-cyan-600 text-white min-w-[220px] ${
        selected ? 'ring-2 ring-blue-300 ring-offset-2' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-white rounded-full" />
        <h3 className="font-bold text-sm">Router/Orchestrator</h3>
      </div>
      
      <p className="text-xs text-blue-100 mb-3">
        Routes intent to appropriate module
      </p>
      
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="intent-input"
        className="bg-blue-300 w-3 h-3"
        style={{ top: -6 }}
      />
      
      {/* Output handles for each intent type */}
      <div className="space-y-1 mt-2">
        {intentTypes.map((intent, index) => {
          const isMapped = intentMappings[intent];
          const handleId = `output-${intent.toLowerCase()}`;
          
          return (
            <div key={intent} className="relative">
              <div className="flex items-center justify-between text-xs bg-white/10 rounded px-2 py-1">
                <span className="truncate">{intent.replace('_', ' ')}</span>
                {isMapped ? (
                  <span className="text-green-300">✓</span>
                ) : (
                  <span className="text-yellow-300">⚠</span>
                )}
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={handleId}
                className="bg-cyan-300 w-2.5 h-2.5"
                style={{ 
                  right: -5,
                  top: `${20 + index * 28}px`
                }}
              />
            </div>
          );
        })}
      </div>
      
      {!nodeData.isConfigured && (
        <div className="text-xs bg-yellow-500/20 rounded px-2 py-1 mt-2 text-yellow-100">
          ⚠️ Configure intent mappings
        </div>
      )}
    </div>
  );
}

