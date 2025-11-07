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
    <div className="w-64 overflow-y-auto border-r border-slate-800 bg-slate-950/80 p-4 text-slate-100">
      <h2 className="mb-4 text-lg font-bold text-white">Node Palette</h2>

      <div className="space-y-3">
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-400">Core Nodes</h3>
          <button
            onClick={() => onAddNode('genai-intent')}
            className="w-full rounded-lg bg-linear-to-r from-purple-500 to-indigo-600 p-3 text-left text-white shadow-md transition-all hover:from-purple-600 hover:to-indigo-700"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <div className="font-semibold">GenAI Intent</div>
                <div className="text-xs text-purple-100">Intent detection</div>
              </div>
            </div>
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={() => onAddNode('router')}
            className="w-full rounded-lg bg-linear-to-r from-blue-500 to-cyan-600 p-3 text-left text-white shadow-md transition-all hover:from-blue-600 hover:to-cyan-700"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🔀</span>
              <div>
                <div className="font-semibold">Router</div>
                <div className="text-xs text-blue-100">Route to modules</div>
              </div>
            </div>
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={() => onAddNode('response')}
            className="w-full rounded-lg bg-linear-to-r from-slate-600 to-slate-800 p-3 text-left text-white shadow-md transition-all hover:from-slate-700 hover:to-slate-900"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <div>
                <div className="font-semibold">Response</div>
                <div className="text-xs text-slate-200">Format output</div>
              </div>
            </div>
          </button>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-400">Modules</h3>
          <div className="space-y-2">
            {moduleTypes.map((module) => (
              <button
                key={module.type}
                onClick={() => onAddNode('module', module.type)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-left transition hover:border-indigo-400 hover:bg-slate-900 shadow"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{module.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{module.label}</div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{module.type}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
        <strong className="text-slate-100">Tip:</strong> Click a node to configure it. Connect nodes by dragging from handles.
      </div>
    </div>
  );
}

