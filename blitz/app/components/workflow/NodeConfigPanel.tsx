'use client';

import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { NodeData, APIConfig, ModuleType, IntentType } from '@/app/lib/types/workflow';

interface NodeConfigPanelProps {
  node: Node;
  allNodes?: Node[];
  onUpdate: (nodeId: string, updates: Partial<NodeData>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, allNodes = [], onUpdate, onClose }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<NodeData>(node.data);

  useEffect(() => {
    setConfig(node.data);
  }, [node]);

  const handleSave = () => {
    onUpdate(node.id, { ...config, isConfigured: true });
    onClose();
  };

  // GenAI Intent Node Configuration
  if (node.type === 'genai-intent') {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">GenAI Intent Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              value={config.genAIConfig?.model || 'gpt-4'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  genAIConfig: { ...config.genAIConfig, model: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature (0-1)
            </label>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Prompt
            </label>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="You are an intent classifier for an e-commerce chatbot..."
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  // Router Node Configuration
  if (node.type === 'router') {
    const intentMappings: Record<IntentType, string> = (config.routerConfig?.intentMappings || {}) as Record<IntentType, string>;

    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Router Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Map each intent to a module node. Select from available modules below.
          </p>

          {(['TRACK_SHIPMENT', 'CANCEL_ORDER', 'REQUEST_REFUND', 'MODIFY_ORDER', 'GENERIC_QUERY'] as IntentType[]).map(
            (intent) => {
              const availableModules = allNodes.filter(n => n.type === 'module');
              const currentMapping = intentMappings[intent] || '';
              
              return (
                <div key={intent}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {intent.replace('_', ' ')}
                  </label>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        No modules found. Add module nodes first, then configure routing.
                      </p>
                    </>
                  )}
                </div>
              );
            }
          )}

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> You can find module node IDs by clicking on module nodes. 
              The ID is shown in the node or you can inspect the workflow structure.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  // Module Node Configuration
  if (node.type === 'module') {
    const moduleType = config.moduleType || 'tracking';
    const apiConfigs = config.moduleConfig?.apiConfigs || {};
    const [newApiName, setNewApiName] = useState('');
    const [editingApi, setEditingApi] = useState<string | null>(null);

    const addAPI = () => {
      if (newApiName.trim()) {
        const updatedConfigs = {
          ...apiConfigs,
          [newApiName]: {
            name: newApiName,
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
        setEditingApi(newApiName);
        setNewApiName('');
      }
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

    // Get required APIs based on module type
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
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">
            {config.label || moduleType} Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module Label
            </label>
            <input
              type="text"
              value={config.label || ''}
              onChange={(e) => setConfig({ ...config, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Custom module name"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Required APIs
            </h3>
            <ul className="text-xs text-gray-600 space-y-1 mb-3">
              {requiredAPIs.map((api) => (
                <li key={api} className="flex items-center gap-2">
                  <span className={apiConfigs[api] ? 'text-green-600' : 'text-red-600'}>
                    {apiConfigs[api] ? '✓' : '○'}
                  </span>
                  {api}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              API Configurations
            </h3>

            {Object.entries(apiConfigs).map(([apiName, apiConfig]) => (
              <div
                key={apiName}
                className="mb-3 p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-gray-800">{apiName}</span>
                  <button
                    onClick={() => deleteAPI(apiName)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Delete
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Base URL</label>
                    <input
                      type="text"
                      value={apiConfig.baseUrl}
                      onChange={(e) =>
                        updateAPI(apiName, { baseUrl: e.target.value })
                      }
                      placeholder="https://api.example.com"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Method</label>
                    <select
                      value={apiConfig.method || 'GET'}
                      onChange={(e) =>
                        updateAPI(apiName, {
                          method: e.target.value as APIConfig['method'],
                        })
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">API Key</label>
                    <input
                      type="password"
                      value={apiConfig.apiKey || ''}
                      onChange={(e) =>
                        updateAPI(apiName, { apiKey: e.target.value })
                      }
                      placeholder="Enter API key"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Timeout (ms)</label>
                    <input
                      type="number"
                      value={apiConfig.timeout || 10000}
                      onChange={(e) =>
                        updateAPI(apiName, { timeout: parseInt(e.target.value) })
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={newApiName}
                onChange={(e) => setNewApiName(e.target.value)}
                placeholder="API name"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                onKeyPress={(e) => e.key === 'Enter' && addAPI()}
              />
              <button
                onClick={addAPI}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Add API
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  // Response Node Configuration
  if (node.type === 'response') {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Response Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Response Type
            </label>
            <select
              value={config.responseType || 'text'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  responseType: e.target.value as 'text' | 'structured' | 'ui-component',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="text">Text</option>
              <option value="structured">Structured Data</option>
              <option value="ui-component">UI Component</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  return null;
}

