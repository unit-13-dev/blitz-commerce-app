'use client';

import React, { useState } from 'react';
import { Node } from '@xyflow/react';
import { NodeData, APIConfig, ModuleType, IntentType } from '@/app/lib/types/workflow';

interface NodeConfigPanelProps {
  node: Node;
  allNodes?: Node[];
  onUpdate: (nodeId: string, updates: Partial<NodeData>) => void;
  onClose: () => void;
}

const panelClass =
  'w-80 overflow-y-auto border-l border-gray-200 bg-white p-5 text-slate-900';
const headingClass = 'text-lg font-semibold text-slate-900';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500';
const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-0 transition';
const buttonPrimaryClass =
  'w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-black';
const buttonSecondaryClass = 'text-slate-600 transition hover:text-slate-900';

export function NodeConfigPanel({ node, allNodes = [], onUpdate, onClose }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<NodeData>(node.data);
  const [newApiName, setNewApiName] = useState('');

  const handleSave = () => {
    onUpdate(node.id, { ...config, isConfigured: true });
    onClose();
  };

  if (node.type === 'genai-intent') {
    return (
      <div className={panelClass}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className={headingClass}>GenAI Intent Configuration</h2>
          <button onClick={onClose} className={buttonSecondaryClass} aria-label="Close configuration panel">
            ✕
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <div>
            <label className={labelClass}>Model</label>
            <select
              value={config.genAIConfig?.model || 'gpt-4'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  genAIConfig: { ...config.genAIConfig, model: e.target.value },
                })
              }
              className={inputClass}
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Temperature (0-1)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.genAIConfig?.temperature || 0.3}
              onChange={(e) =>
                setConfig({
                  ...config,
                  genAIConfig: {
                    ...config.genAIConfig,
                    temperature: parseFloat(e.target.value),
                  },
                })
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>System Prompt</label>
            <textarea
              value={config.genAIConfig?.systemPrompt || ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  genAIConfig: {
                    ...config.genAIConfig,
                    systemPrompt: e.target.value,
                  },
                })
              }
              rows={4}
              className={`${inputClass} min-h-[120px]`}
              placeholder="You are an intent classifier for an e-commerce chatbot..."
            />
          </div>

          <button onClick={handleSave} className={buttonPrimaryClass}>
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  if (node.type === 'router') {
    const intentMappings: Record<IntentType, string> = (config.routerConfig?.intentMappings || {}) as Record<IntentType, string>;

    return (
      <div className={panelClass}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className={headingClass}>Router Configuration</h2>
          <button onClick={onClose} className={buttonSecondaryClass} aria-label="Close configuration panel">
            ✕
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
            Map each intent to the module that should receive it. Add module nodes to the canvas to see them here.
          </p>

          {(['TRACK_SHIPMENT', 'CANCEL_ORDER', 'REQUEST_REFUND', 'MODIFY_ORDER', 'GENERIC_QUERY'] as IntentType[]).map((intent) => {
            const availableModules = allNodes.filter((n) => n.type === 'module');
            const currentMapping = intentMappings[intent] || '';

            return (
              <div key={intent} className="space-y-2">
                <label className={labelClass}>{intent.replace('_', ' ')}</label>
                {availableModules.length > 0 ? (
                  <select
                    value={currentMapping}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        routerConfig: {
                          ...config.routerConfig,
                          intentMappings: {
                            ...intentMappings,
                            [intent]: e.target.value,
                          },
                        },
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">Select module...</option>
                    {availableModules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {(module.data.label || module.data.moduleType || module.id) as string}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      value={intentMappings[intent] || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          routerConfig: {
                            ...config.routerConfig,
                            intentMappings: {
                              ...intentMappings,
                              [intent]: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="Enter module node ID"
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">
                      No module nodes detected. Add a module node and reconnect it to the router.
                    </p>
                  </>
                )}
              </div>
            );
          })}

          <button onClick={handleSave} className={buttonPrimaryClass}>
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  if (node.type === 'module') {
    const moduleType = config.moduleType || 'tracking';
    const apiConfigs = config.moduleConfig?.apiConfigs || {};

    const addAPI = () => {
      const trimmed = newApiName.trim();
      if (!trimmed) return;

      const updatedConfigs = {
        ...apiConfigs,
        [trimmed]: {
          name: trimmed,
          baseUrl: '',
          method: 'GET' as const,
        },
      };

      setConfig({
        ...config,
        moduleConfig: {
          ...config.moduleConfig,
          moduleType,
          apiConfigs: updatedConfigs,
        },
      });
      setNewApiName('');
    };

    const updateAPI = (apiName: string, updates: Partial<APIConfig>) => {
      const updatedConfigs = {
        ...apiConfigs,
        [apiName]: { ...apiConfigs[apiName], ...updates },
      };

      setConfig({
        ...config,
        moduleConfig: {
          ...config.moduleConfig,
          moduleType,
          apiConfigs: updatedConfigs,
        },
      });
    };

    const deleteAPI = (apiName: string) => {
      const updatedConfigs = { ...apiConfigs };
      delete updatedConfigs[apiName];

      setConfig({
        ...config,
        moduleConfig: {
          ...config.moduleConfig,
          moduleType,
          apiConfigs: updatedConfigs,
        },
      });
    };

    const getRequiredAPIs = (type: ModuleType): string[] => {
      switch (type) {
        case 'tracking':
          return ['Get Orders API', 'Get Tracking Details API'];
        case 'cancellation':
          return ['Get Order API', 'Cancel Order API'];
        case 'refund':
          return ['Get Order API', 'Process Refund API'];
        case 'modify-order':
          return ['Get Order API', 'Update Order API'];
        default:
          return [];
      }
    };

    const requiredAPIs = getRequiredAPIs(moduleType);

    return (
      <div className={panelClass}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className={headingClass}>{config.label || 'Module Configuration'}</h2>
          <button onClick={onClose} className={buttonSecondaryClass} aria-label="Close configuration panel">
            ✕
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <div>
            <label className={labelClass}>Module Label</label>
            <input
              type="text"
              value={config.label || ''}
              onChange={(e) => setConfig({ ...config, label: e.target.value })}
              placeholder={moduleType.replace('-', ' ')}
              className={inputClass}
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Required APIs
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {requiredAPIs.map((api) => {
                const configured = Boolean(apiConfigs[api]);
                return (
                  <li key={api} className="flex items-center gap-2">
                    <span className={configured ? 'text-emerald-400' : 'text-slate-600'}>
                      {configured ? '●' : '○'}
                    </span>
                    {api}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-4">
            {Object.entries(apiConfigs).map(([apiName, apiConfig]) => (
              <div key={apiName} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{apiName}</span>
                  <button
                    onClick={() => deleteAPI(apiName)}
                    className="text-xs text-rose-400 transition hover:text-rose-300"
                  >
                    Delete
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Base URL</label>
                    <input
                      type="text"
                      value={apiConfig.baseUrl}
                      onChange={(e) => updateAPI(apiName, { baseUrl: e.target.value })}
                      placeholder="https://api.example.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Method</label>
                    <select
                      value={apiConfig.method || 'GET'}
                      onChange={(e) => updateAPI(apiName, { method: e.target.value as APIConfig['method'] })}
                      className={inputClass}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>API Key</label>
                    <input
                      type="password"
                      value={apiConfig.apiKey || ''}
                      onChange={(e) => updateAPI(apiName, { apiKey: e.target.value })}
                      placeholder="*****"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Timeout (ms)</label>
                    <input
                      type="number"
                      value={apiConfig.timeout || 10000}
                      onChange={(e) => updateAPI(apiName, { timeout: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newApiName}
                onChange={(e) => setNewApiName(e.target.value)}
                placeholder="Add API alias"
                className={inputClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAPI();
                  }
                }}
              />
              <button
                onClick={addAPI}
                className="rounded-lg border border-indigo-400 px-3 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/10"
              >
                Add
              </button>
            </div>
          </div>

          <button onClick={handleSave} className={buttonPrimaryClass}>
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  if (node.type === 'response') {
    return (
      <div className={panelClass}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className={headingClass}>Response Configuration</h2>
          <button onClick={onClose} className={buttonSecondaryClass} aria-label="Close configuration panel">
            ✕
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <div>
            <label className={labelClass}>Response Type</label>
            <select
              value={config.responseType || 'text'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  responseType: e.target.value as 'text' | 'structured' | 'ui-component',
                })
              }
              className={inputClass}
            >
              <option value="text">Text</option>
              <option value="structured">Structured Data</option>
              <option value="ui-component">UI Component</option>
            </select>
          </div>

          <button onClick={handleSave} className={buttonPrimaryClass}>
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  return null;
}

