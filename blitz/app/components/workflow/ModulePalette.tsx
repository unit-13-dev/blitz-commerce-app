'use client';

import { ModuleType } from '@/app/lib/types/workflow';

interface ModulePaletteProps {
  onAddNode: (nodeType: string, moduleType?: string) => void;
}

const moduleTypes: { type: ModuleType; label: string; icon: string }[] = [
  { type: 'tracking', label: 'Shipment Tracking', icon: '📦' },
  { type: 'cancellation', label: 'Order Cancellation', icon: '❌' },
  { type: 'refund', label: 'Refund Processing', icon: '💰' },
  { type: 'modify-order', label: 'Order Modification', icon: '✏️' },
];

export function ModulePalette({ onAddNode }: ModulePaletteProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4 text-gray-800">Node Palette</h2>
      
      <div className="space-y-3">
        {/* GenAI Intent Node */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Core Nodes</h3>
          <button
            onClick={() => onAddNode('genai-intent')}
            className="w-full p-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div className="text-left">
                <div className="font-semibold">GenAI Intent</div>
                <div className="text-xs text-purple-100">Intent detection</div>
              </div>
            </div>
          </button>
        </div>

        {/* Router Node */}
        <div className="mb-6">
          <button
            onClick={() => onAddNode('router')}
            className="w-full p-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🔀</span>
              <div className="text-left">
                <div className="font-semibold">Router</div>
                <div className="text-xs text-blue-100">Route to modules</div>
              </div>
            </div>
          </button>
        </div>

        {/* Response Node */}
        <div className="mb-6">
          <button
            onClick={() => onAddNode('response')}
            className="w-full p-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <div className="text-left">
                <div className="font-semibold">Response</div>
                <div className="text-xs text-gray-200">Format output</div>
              </div>
            </div>
          </button>
        </div>

        {/* Module Nodes */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Modules</h3>
          <div className="space-y-2">
            {moduleTypes.map((module) => (
              <button
                key={module.type}
                onClick={() => onAddNode('module', module.type)}
                className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{module.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">
                      {module.label}
                    </div>
                    <div className="text-xs text-gray-500">{module.type}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>Tip:</strong> Click a node to configure it. Connect nodes by dragging from handles.
        </p>
      </div>
    </div>
  );
}

