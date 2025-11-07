'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData } from '@/app/lib/types/workflow';

export function ResponseNode(props: NodeProps) {
  const nodeData = (props.data || {}) as NodeData;
  const selected = props.selected;
  const responseType = nodeData.responseType || 'text';

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-linear-to-br from-gray-600 to-gray-800 text-white min-w-[200px] ${
        selected ? 'ring-2 ring-gray-300 ring-offset-2' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-white rounded-full" />
        <h3 className="font-bold text-sm">Response</h3>
      </div>
      
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="response-input"
        className="bg-gray-300 w-3 h-3"
        style={{ top: -6 }}
      />
      
      <p className="text-xs text-gray-200 mb-2">
        Formats and returns response
      </p>
      
      <div className="text-xs bg-white/10 rounded px-2 py-1">
        Type: {responseType}
      </div>
      
      {nodeData.responseConfig && (
        <div className="text-xs bg-white/10 rounded px-2 py-1 mt-2">
          Config: {Object.keys(nodeData.responseConfig).length} settings
        </div>
      )}
    </div>
  );
}

