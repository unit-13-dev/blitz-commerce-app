'use client';

import { ModuleType } from '@/app/lib/types/workflow';
import { useEffect } from 'react';

export type AddableNode =
  | {
      type: 'module';
      moduleType: ModuleType;
      label: string;
      description: string;
      disabled: boolean;
    };

interface NodeAddModalProps {
  open: boolean;
  nodes: AddableNode[];
  onClose: () => void;
  onSelect: (node: AddableNode) => void;
}

export function NodeAddModal({ open, nodes, onClose, onSelect }: NodeAddModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add automation node</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Each node is unique. Once it lives on the canvas it disappears from this list.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {nodes.map((item) => (
            <button
              key={item.moduleType}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  onSelect(item);
                }
              }}
              className={`flex h-full flex-col rounded-xl border p-4 text-left transition ${
                item.disabled
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-900 hover:shadow'
              }`}
            >
              <span className="text-sm font-semibold">{item.label}</span>
              <span className="mt-2 text-xs text-gray-500">{item.description}</span>
              {item.disabled && (
                <span className="mt-3 inline-flex items-center rounded bg-gray-200 px-2 py-1 text-[10px] uppercase tracking-wide text-gray-500">
                  Added
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
