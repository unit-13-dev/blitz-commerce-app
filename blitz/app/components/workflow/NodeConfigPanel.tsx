'use client';

import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { NodeData, APIConfig, ModuleType, IntentType, GenAIConfig, RouterConfig, ModuleConfig } from '@/app/lib/types/workflow';

interface NodeConfigPanelProps {
  node: Node;
  allNodes?: Node[];
  nodeConfig?: {
    genAIConfig?: GenAIConfig;
    routerConfig?: RouterConfig;
    moduleConfig?: ModuleConfig;
    responseConfig?: {
      responseType?: 'text' | 'structured' | 'ui-component';
      config?: Record<string, unknown>;
    };
    isConfigured?: boolean;
  };
  workflowId?: string;
  onUpdate: (nodeId: string, config: {
    genAIConfig?: GenAIConfig;
    routerConfig?: RouterConfig;
    moduleConfig?: ModuleConfig;
    responseConfig?: {
      responseType?: 'text' | 'structured' | 'ui-component';
      config?: Record<string, unknown>;
    };
  }, isConfigured: boolean) => Promise<void>;
  onDelete?: (nodeId: string) => void;
  onClose: () => void;
}

const panelClass =
  'fixed right-0 top-0 h-full w-96 overflow-y-auto border-l border-gray-200 bg-white p-6 text-slate-900 shadow-xl z-50';
const headingClass = 'text-lg font-semibold text-slate-900';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500';
const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-0 transition';
const buttonPrimaryClass =
  'w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-black';
const buttonSecondaryClass = 'text-slate-600 transition hover:text-slate-900';

const routerIntents: IntentType[] = ['TRACK_SHIPMENT', 'CANCEL_ORDER', 'FAQ_SUPPORT'];

export function NodeConfigPanel({ node, allNodes = [], nodeConfig, workflowId, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
  // GenAI config state - initialize from nodeConfig or use defaults
  const [genAIConfig, setGenAIConfig] = useState<GenAIConfig>(() => {
    if (nodeConfig?.genAIConfig) {
      return {
        model: nodeConfig.genAIConfig.model || '',
        // Don't show the actual API key for security - user needs to re-enter if they want to change it
        apiKey: '',
      };
    }
    return {
      model: '',
      apiKey: '',
    };
  });
  
  // Track if API key was already configured (for display purposes)
  const [hasExistingApiKey] = useState(() => !!nodeConfig?.genAIConfig?.apiKey);
  
  // Router config state
  const [routerConfig, setRouterConfig] = useState<RouterConfig>(() => 
    nodeConfig?.routerConfig || {
      intentMappings: {} as Record<IntentType, string>,
    }
  );
  
  // Module config state
  const [moduleConfig, setModuleConfig] = useState<ModuleConfig>(() =>
    nodeConfig?.moduleConfig || {
      moduleType: (node.data as NodeData).moduleType || 'tracking',
      apiConfigs: {},
    }
  );
  
  // Response config state
  const [responseConfig, setResponseConfig] = useState<{
    responseType?: 'text' | 'structured' | 'ui-component';
    config?: Record<string, unknown>;
  }>(() =>
    nodeConfig?.responseConfig || {
      responseType: 'text',
    }
  );
  
  const [newApiName, setNewApiName] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Update state when nodeConfig changes (e.g., when switching between nodes)
  useEffect(() => {
    if (nodeConfig) {
      if (nodeConfig?.genAIConfig) {
        setGenAIConfig((prev) => ({
          model: nodeConfig.genAIConfig?.model || '',
          // Don't restore API key from config for security - user must re-enter
          // Only preserve if user is currently typing
          apiKey: prev.apiKey || '',
        }));
      }
      if (nodeConfig.routerConfig) {
        setRouterConfig(nodeConfig.routerConfig);
      }
      if (nodeConfig.moduleConfig) {
        setModuleConfig(nodeConfig.moduleConfig);
      }
      if (nodeConfig.responseConfig) {
        setResponseConfig(nodeConfig.responseConfig);
      }
    } else {
      // Reset to defaults if no config exists
      if (node.type === 'genai-intent') {
        setGenAIConfig({
          model: '',
          apiKey: '',
        });
      }
    }
  }, [nodeConfig, node.type]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let configToSave: any = {};
      let isConfigured = false;

      if (node.type === 'genai-intent') {
        // If API key is empty but we have an existing config, keep the existing key
        let finalGenAIConfig: GenAIConfig = {
          model: genAIConfig.model,
          apiKey: genAIConfig.apiKey || nodeConfig?.genAIConfig?.apiKey || '',
        };
        // Only save if both model and API key are present
        if (!finalGenAIConfig.model || !finalGenAIConfig.apiKey) {
          throw new Error('Both model and API key are required');
        }
        configToSave = { genAIConfig: finalGenAIConfig };
        // Consider configured if we have an API key (either new or existing) and a model
        isConfigured = !!(finalGenAIConfig.apiKey && finalGenAIConfig.model);
      } else if (node.type === 'router') {
        configToSave = { routerConfig };
        isConfigured = Object.keys(routerConfig.intentMappings || {}).length > 0;
      } else if (node.type === 'module') {
        configToSave = { moduleConfig };
        isConfigured = Object.keys(moduleConfig.apiConfigs || {}).length > 0;
      } else if (node.type === 'response') {
        configToSave = { responseConfig };
        isConfigured = true;
      }

      await onUpdate(node.id, configToSave, isConfigured);
      onClose();
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestGenAI = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Ensure we have workflowId and nodeId
      if (!workflowId || !node.id) {
        setTestResult({
          success: false,
          message: 'Workflow ID or Node ID is missing. Please save the workflow first.',
        });
        setIsTesting(false);
        return;
      }

      // Ensure we have a model selected
      if (!genAIConfig.model) {
        setTestResult({
          success: false,
          message: 'Please select a model before testing.',
        });
        setIsTesting(false);
        return;
      }

      // Call API endpoint to test GenAI configuration
      // The API will load the config from DB (with decrypted API key) and merge with any new values
      const response = await fetch('/api/nodes/test-genai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId,
          nodeId: node.id,
          testMessage: 'Hello, where is my order?',
          // Only send new API key if user is entering one (not if using existing)
          newApiKey: genAIConfig.apiKey || undefined,
          // Send new model if selected
          newModel: genAIConfig.model || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setTestResult({
          success: false,
          message: data.error || data.errors?.join(', ') || 'Test failed',
        });
        return;
      }

      setTestResult({
        success: true,
        message: `Test successful! Detected intent: ${data.result.intent}, Method: ${data.result.method}`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (node.type === 'genai-intent') {

    return (
      <div 
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className={headingClass}>GenAI Intent Configuration</h2>
          <button 
            onClick={onClose} 
            className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" 
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <p className="font-medium">ℹ️ Configuration Info</p>
            <p className="mt-1">Enter your API key (Perplexity or Google Gemini) to enable intent detection. The API key will be encrypted and stored securely.</p>
          </div>

          <div>
            <label className={labelClass}>API Key *</label>
            {hasExistingApiKey && !genAIConfig.apiKey && (
              <div className="mb-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                <div className="font-medium">✓ API key is already configured</div>
                <div className="mt-1">Enter a new API key below to update it, or leave empty to keep the existing key.</div>
              </div>
            )}
            <input
              type="password"
              value={genAIConfig.apiKey || ''}
              onChange={(e) =>
                setGenAIConfig({ ...genAIConfig, apiKey: e.target.value })
              }
              placeholder={hasExistingApiKey ? "Leave empty to keep existing key, or enter new key" : "pplx-... or AIza... (from Google AI Studio)"}
              className={inputClass}
              required={!hasExistingApiKey}
            />
            <p className="mt-1 text-xs text-gray-500">
              Your API key. For Perplexity, keys start with &quot;pplx-&quot;. For Google Gemini, get your key from <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>. {hasExistingApiKey ? 'Leave empty to keep existing key.' : 'Required for intent detection.'}
            </p>
          </div>

          <div>
            <label className={labelClass}>Model</label>
            <select
              value={genAIConfig.model || ''}
              onChange={(e) =>
                setGenAIConfig({ ...genAIConfig, model: e.target.value })
              }
              className={inputClass}
            >
              <option value="">Select a model</option>
              <optgroup label="Perplexity Models">
                <option value="sonar-pro">Perplexity Sonar Pro</option>
              </optgroup>
              <optgroup label="Google Gemini Models">
                <option value="gemini-pro">Gemini Pro</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </optgroup>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select the AI model for intent detection. Perplexity models use keys starting with &quot;pplx-&quot;, Gemini models use keys from Google AI Studio.
            </p>
          </div>

          {/* Test Button */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleTestGenAI}
              disabled={isTesting || (!genAIConfig.apiKey && !hasExistingApiKey) || !genAIConfig.model}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {isTesting ? 'Testing...' : 'Test Configuration'}
            </button>
            {testResult && (
              <div
                className={`rounded-md px-3 py-2 text-xs ${
                  testResult.success
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {testResult.success ? '✓' : '✗'} {testResult.message}
              </div>
            )}
          </div>

          <button 
            onClick={handleSave} 
            disabled={isSaving || (!genAIConfig.apiKey && !hasExistingApiKey) || !genAIConfig.model}
            className={`${buttonPrimaryClass} ${isSaving || (!genAIConfig.apiKey && !hasExistingApiKey) || !genAIConfig.model ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Save configuration'}
          </button>
          {!genAIConfig.apiKey && !hasExistingApiKey && (
            <p className="text-xs text-red-600">API key is required</p>
          )}
          {!genAIConfig.model && (
            <p className="text-xs text-red-600">Model selection is required</p>
          )}
        </div>
      </div>
    );
  }

  if (node.type === 'router') {

    return (
      <div 
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className={headingClass}>Router Configuration</h2>
          <button 
            onClick={onClose} 
            className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" 
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Map each detected intent to the module that should handle it. Modules must be on the canvas before
            they appear in the list.
          </p>

          {routerIntents.map((intent) => {
            const availableModules = allNodes.filter((n) => n.type === 'module');
            const currentMapping = routerConfig.intentMappings?.[intent] || '';

            return (
              <div key={intent} className="space-y-2">
                <label className={labelClass}>{intent.replace('_', ' ')}</label>
                {availableModules.length > 0 ? (
                  <select
                    value={currentMapping}
                    onChange={(e) =>
                      setRouterConfig({
                        ...routerConfig,
                        intentMappings: {
                          ...routerConfig.intentMappings,
                          [intent]: e.target.value,
                        } as Record<IntentType, string>,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">Select module...</option>
                    {availableModules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {(module.data.label || (module.data as NodeData).moduleType || module.id) as string}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      value={currentMapping}
                      onChange={(e) =>
                        setRouterConfig({
                          ...routerConfig,
                          intentMappings: {
                            ...routerConfig.intentMappings,
                            [intent]: e.target.value,
                          } as Record<IntentType, string>,
                        })
                      }
                      placeholder="Module node ID"
                      className={inputClass}
                    />
                    <p className="text-xs text-gray-500">
                      No modules found. Add a module node to the canvas first.
                    </p>
                  </>
                )}
              </div>
            );
          })}

          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={`${buttonPrimaryClass} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Save configuration'}
          </button>
        </div>
      </div>
    );
  }

  if (node.type === 'module') {
    const moduleType = (node.data as NodeData).moduleType || 'tracking';
    const apiConfigs = moduleConfig.apiConfigs || {};

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

      setModuleConfig({
        ...moduleConfig,
        moduleType,
        apiConfigs: updatedConfigs,
      });
      setNewApiName('');
    };

    const updateAPI = (apiName: string, updates: Partial<APIConfig>) => {
      const updatedConfigs = {
        ...apiConfigs,
        [apiName]: { ...apiConfigs[apiName], ...updates },
      };

      setModuleConfig({
        ...moduleConfig,
        moduleType,
        apiConfigs: updatedConfigs,
      });
    };

    const deleteAPI = (apiName: string) => {
      const updatedConfigs = { ...apiConfigs };
      delete updatedConfigs[apiName];

      setModuleConfig({
        ...moduleConfig,
        moduleType,
        apiConfigs: updatedConfigs,
      });
    };

    const moduleDescriptions: Record<ModuleType, string[]> = {
      tracking: ['Fetch shipment status', 'Surface tracking milestones to the user'],
      cancellation: ['Validate cancellation policy', 'Trigger downstream cancellation flows'],
      faq: ['Answer catalog / policy questions', 'Guide users with quick replies'],
      refund: ['Initiate refunds with PSP', 'Escalate manual reviews when required'],
    };

    const requiredAPIsMap: Record<ModuleType, string[]> = {
      tracking: ['Orders API (GET shipping status)', 'Shipment details API'],
      cancellation: ['Order lookup API', 'Cancellation trigger API'],
      faq: ['Knowledge base API'],
      refund: ['Refund initiation API', 'Refund status API'],
    };

    const requiredAPIs = requiredAPIsMap[moduleType];

    const handleDeleteModule = () => {
      if (onDelete) {
        onDelete(node.id);
      }
    };

    return (
      <div 
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className={headingClass}>Module Configuration</h2>
          <button 
            onClick={onClose} 
            className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" 
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <div>
            <label className={labelClass}>Module Label</label>
            <input
              type="text"
              value={(node.data as NodeData).label || ''}
              onChange={(e) => {
                // Update node data in React Flow - this will trigger persistWorkflow
                // We update the node's data directly, which will be saved to react_flow_state
                const updatedData = { ...node.data, label: e.target.value };
                // Note: This needs to be handled by parent component
                // For now, we'll just update the local node data
              }}
              placeholder="Custom name"
              className={inputClass}
              readOnly
            />
            <p className="mt-1 text-xs text-gray-500">
              Label is stored in workflow state. Edit via node properties.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Module Purpose</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-600">
              {moduleDescriptions[moduleType].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Required APIs</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-600">
              {requiredAPIs.map((api) => {
                const configured = Boolean(apiConfigs[api]);
                return (
                  <li key={api} className={configured ? 'text-emerald-600' : 'text-gray-600'}>
                    {configured ? '✓ ' : ''}
                    {api}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-4">
            {Object.entries(apiConfigs).map(([apiName, apiConfig]) => (
              <div key={apiName} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{apiName}</span>
                  <button
                    onClick={() => deleteAPI(apiName)}
                    className="text-xs font-medium text-rose-600 transition hover:text-rose-700"
                  >
                    Remove
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
                      placeholder="••••••"
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
                type="button"
                className="rounded-md border border-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className={`${buttonPrimaryClass} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? 'Saving...' : 'Save configuration'}
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteModule}
                className="w-full rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                Remove module
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (node.type === 'response') {
    return (
      <div 
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className={headingClass}>Response Configuration</h2>
          <button 
            onClick={onClose} 
            className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" 
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <div>
            <label className={labelClass}>Response Type</label>
            <select
              value={responseConfig.responseType || 'text'}
              onChange={(e) =>
                setResponseConfig({
                  ...responseConfig,
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

          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={`${buttonPrimaryClass} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Save configuration'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

