'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData } from '@/app/lib/types/workflow';

export function GenAIIntentNode(props: NodeProps) {
  const nodeData = (props.data || {}) as NodeData;
  const selected = props.selected;
  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-linear-to-br from-purple-500 to-indigo-600 text-white min-w-[200px] ${
        selected ? 'ring-2 ring-purple-300 ring-offset-2' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <h3 className="font-bold text-sm">GenAI Intent Layer</h3>
      </div>
      
      <p className="text-xs text-purple-100 mb-3">
        Analyzes user input and detects intent
      </p>
      
      {nodeData.genAIConfig && (
        <div className="text-xs bg-white/10 rounded px-2 py-1 mb-2">
          <div>Model: {nodeData.genAIConfig.model || 'gpt-4'}</div>
          {nodeData.genAIConfig.temperature && (
            <div>Temp: {nodeData.genAIConfig.temperature}</div>
          )}
        </div>
      )}
      
      {!nodeData.isConfigured && (
        <div className="text-xs bg-yellow-500/20 rounded px-2 py-1 text-yellow-100">
          ⚠️ Configuration needed
        </div>
      )}
      
      {/* Single output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="intent-output"
        className="bg-purple-300 w-3 h-3"
        style={{ bottom: -6 }}
      />
    </div>
  );
}

