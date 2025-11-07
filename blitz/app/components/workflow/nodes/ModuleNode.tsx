'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData, ModuleType } from '@/app/lib/types/workflow';

const moduleColors: Record<ModuleType, { bg: string; border: string; text: string }> = {
  tracking: {
    bg: 'from-green-500 to-emerald-600',
    border: 'ring-green-300',
    text: 'text-green-100'
  },
  cancellation: {
    bg: 'from-orange-500 to-red-600',
    border: 'ring-orange-300',
    text: 'text-orange-100'
  },
  refund: {
    bg: 'from-pink-500 to-rose-600',
    border: 'ring-pink-300',
    text: 'text-pink-100'
  },
  'modify-order': {
    bg: 'from-teal-500 to-cyan-600',
    border: 'ring-teal-300',
    text: 'text-teal-100'
  }
};

const moduleLabels: Record<ModuleType, string> = {
  tracking: 'Shipment Tracking',
  cancellation: 'Order Cancellation',
  refund: 'Refund Processing',
  'modify-order': 'Order Modification'
};

export function ModuleNode(props: NodeProps) {
  const nodeData = (props.data || {}) as NodeData;
  const selected = props.selected;
  const id = props.id;
  const moduleType = nodeData.moduleType || 'tracking';
  const colors = moduleColors[moduleType];
  const label = nodeData.label || moduleLabels[moduleType];
  const moduleConfig = nodeData.moduleConfig;
  const apiConfigs = moduleConfig?.apiConfigs || {};
  const apiCount = Object.keys(apiConfigs).length;

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br ${colors.bg} text-white min-w-[200px] ${
        selected ? `ring-2 ${colors.border} ring-offset-2` : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-white rounded-full" />
        <h3 className="font-bold text-sm">{label}</h3>
      </div>
      <div className="text-xs text-white/70 mb-1 font-mono">
        ID: {id}
      </div>
      
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="module-input"
        className="!bg-white !w-3 !h-3"
        style={{ top: -6 }}
      />
      
      <div className="text-xs space-y-1 mb-2">
        <div className={`${colors.text} bg-white/10 rounded px-2 py-1`}>
          Type: {moduleType}
        </div>
        
        {apiCount > 0 ? (
          <div className={`${colors.text} bg-white/10 rounded px-2 py-1`}>
            APIs: {apiCount} configured
          </div>
        ) : (
          <div className="bg-yellow-500/20 rounded px-2 py-1 text-yellow-100">
            ⚠️ No APIs configured
          </div>
        )}
      </div>
      
      {!nodeData.isConfigured && (
        <div className="text-xs bg-yellow-500/20 rounded px-2 py-1 text-yellow-100">
          ⚠️ Configuration needed
        </div>
      )}
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="module-output"
        className="!bg-white !w-3 !h-3"
        style={{ bottom: -6 }}
      />
    </div>
  );
}

