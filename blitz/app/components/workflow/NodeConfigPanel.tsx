'use client';

import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { NodeData, APIConfig, ModuleType, IntentType, GenAIConfig, RouterConfig, ModuleConfig } from '@/app/lib/types/workflow';
import { genaiNodeConfig, getGroupedOptions, getModelLabel } from '@/app/lib/nodes/configs/genai-node.config';

interface NodeConfigPanelProps {
  node: Node;
  allNodes?: Node[];
  nodeConfig?: {
    genAIConfig?: GenAIConfig;
    routerConfig?: RouterConfig;
    moduleConfig?: ModuleConfig;
    isConfigured?: boolean;
  };
  workflowId?: string;
  onUpdate: (nodeId: string, config: {
    genAIConfig?: GenAIConfig;
    routerConfig?: RouterConfig;
    moduleConfig?: ModuleConfig;
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
  
  const [newApiName, setNewApiName] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit mode state for GenAI config
  const [isEditingGenAI, setIsEditingGenAI] = useState(false);
  // Store original config when entering edit mode
  const [originalGenAIConfig, setOriginalGenAIConfig] = useState<GenAIConfig | null>(null);

  // Update state when nodeConfig changes (e.g., when switching between nodes)
  useEffect(() => {
    if (nodeConfig) {
      if (nodeConfig?.genAIConfig && node.type === 'genai-intent') {
        setGenAIConfig((prev) => {
          // Only update if we're not in edit mode (to preserve user input)
          if (isEditingGenAI) {
            return prev;
          }
          return {
            model: nodeConfig.genAIConfig?.model || '',
            // Don't restore API key from config for security - user must re-enter
            apiKey: '',
          };
        });
      }
      if (nodeConfig.routerConfig) {
        setRouterConfig(nodeConfig.routerConfig);
      }
      if (nodeConfig.moduleConfig) {
        setModuleConfig(nodeConfig.moduleConfig);
      }
    } else {
      // Reset to defaults if no config exists
      if (node.type === 'genai-intent' && !isEditingGenAI) {
        setGenAIConfig(genaiNodeConfig.getDefaultConfig());
      }
    }
  }, [nodeConfig, node.type, isEditingGenAI]);
  
  // Reset edit mode when switching nodes (separate effect to avoid conflicts)
  useEffect(() => {
    setIsEditingGenAI(false);
    setOriginalGenAIConfig(null);
    setTestResult(null);
  }, [node.id]);

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null); // Clear any previous test results
    try {
      let configToSave: any = {};
      let isConfigured = false;

      if (node.type === 'genai-intent') {
        // Use config definition for validation and configuration check
        const config = genaiNodeConfig;
        
        // If API key is empty but we have an existing config, keep the existing key
        let finalGenAIConfig: GenAIConfig = {
          model: genAIConfig.model || '',
          apiKey: genAIConfig.apiKey || nodeConfig?.genAIConfig?.apiKey || '',
        };
        
        // Validate using config definition (pass hasExistingApiKey to allow empty API key if existing one is present)
        const validation = config.validate(finalGenAIConfig, hasExistingApiKey);
        if (!validation.valid) {
          setTestResult({
            success: false,
            message: validation.errors.join(', '),
          });
          return;
        }
        
        configToSave = { genAIConfig: finalGenAIConfig };
        // Use config definition to determine if configured
        // Note: The API will test the API key and only mark as configured if it's valid
        isConfigured = config.isConfigured(finalGenAIConfig, hasExistingApiKey);
      } else if (node.type === 'router') {
        configToSave = { routerConfig };
        isConfigured = Object.keys(routerConfig.intentMappings || {}).length > 0;
      } else if (node.type === 'module') {
        configToSave = { moduleConfig };
        isConfigured = Object.keys(moduleConfig.apiConfigs || {}).length > 0;
      }

      await onUpdate(node.id, configToSave, isConfigured);
      // Only close if save was successful (no error thrown)
      onClose();
    } catch (error) {
      console.error('Failed to save configuration:', error);
      // Check if it's an API key validation error
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      if (errorMessage.includes('API key') || errorMessage.includes('invalid') || errorMessage.includes('unauthorized')) {
        // Show error in test result area instead of alert
        setTestResult({
          success: false,
          message: errorMessage,
        });
      } else {
        // For other errors, show alert
        alert(errorMessage);
      }
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

      // In view mode, use the config from DB (no need to send new values)
      // In edit mode, send new values if provided
      const isInEditMode = node.type === 'genai-intent' && isEditingGenAI;
      
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
          // Only send new API key if in edit mode and user is entering one
          newApiKey: isInEditMode ? (genAIConfig.apiKey || undefined) : undefined,
          // Only send new model if in edit mode and selected
          newModel: isInEditMode ? (genAIConfig.model || undefined) : undefined,
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
    const config = genaiNodeConfig;
    // Check if node is actually configured (has saved config in DB)
    const nodeIsConfigured = !!nodeConfig?.genAIConfig?.apiKey && !!nodeConfig?.genAIConfig?.model;
    const currentModel = nodeConfig?.genAIConfig?.model || '';
    
    // Determine if we should show view mode or edit mode
    // Show edit mode if: not configured yet OR explicitly in edit mode
    const shouldShowEditMode = !nodeIsConfigured || isEditingGenAI;

    // Handle entering edit mode
    const handleEditClick = () => {
      // Store current config as original
      setOriginalGenAIConfig({
        model: nodeConfig?.genAIConfig?.model || '',
        apiKey: '', // Don't store actual API key
      });
      setIsEditingGenAI(true);
      // Reset local state to current config
      setGenAIConfig({
        model: nodeConfig?.genAIConfig?.model || '',
        apiKey: '', // Start with empty API key
      });
      setTestResult(null); // Clear test results
    };

    // Handle canceling edit mode
    const handleCancelEdit = () => {
      setIsEditingGenAI(false);
      // Restore to original config
      if (originalGenAIConfig) {
        setGenAIConfig(originalGenAIConfig);
      } else if (nodeConfig?.genAIConfig) {
        setGenAIConfig({
          model: nodeConfig.genAIConfig.model || '',
          apiKey: '',
        });
      } else {
        setGenAIConfig(config.getDefaultConfig());
      }
      setOriginalGenAIConfig(null);
      setTestResult(null);
    };

    // Handle save - exit edit mode after saving
    const handleSaveAndExit = async () => {
      await handleSave();
      setIsEditingGenAI(false);
      setOriginalGenAIConfig(null);
    };

    return (
      <div 
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className={headingClass}>{config.title}</h2>
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
          {/* Render info sections */}
          {config.sections.map((section, idx) => {
            const bgColor = 
              section.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
              section.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
              section.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              'bg-red-50 border-red-200 text-red-800';
            
            const icon = 
              section.type === 'info' ? 'ℹ️' :
              section.type === 'warning' ? '⚠️' :
              section.type === 'success' ? '✓' :
              '✗';

            return (
              <div key={idx} className={`rounded-lg border px-3 py-2 text-xs ${bgColor}`}>
                <p className="font-medium">{icon} {section.title}</p>
                {section.description && (
                  <p className="mt-1">{section.description}</p>
                )}
              </div>
            );
          })}

          {/* Render fields from config */}
          {config.fields.map((field) => {
            const fieldValue = genAIConfig[field.name] as string | undefined;
            const isApiKeyField = field.name === 'apiKey';
            const isModelField = field.name === 'model';
            
            // In view mode: show masked API key and read-only model
            // In edit mode: show editable fields
            if (!shouldShowEditMode) {
              // VIEW MODE
              if (isApiKeyField && hasExistingApiKey) {
                // Show masked API key
                return (
                  <div key={field.name}>
                    <label className={labelClass}>
                      {field.label} {field.required && '*'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value="****"
                        readOnly
                        className={`${inputClass} bg-gray-50 cursor-not-allowed`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      API key is configured and encrypted. Click &quot;Edit Config&quot; to update.
                    </p>
                  </div>
                );
              } else if (isModelField && currentModel) {
                // Show read-only model
                return (
                  <div key={field.name}>
                    <label className={labelClass}>
                      {field.label} {field.required && '*'}
                    </label>
                    <input
                      type="text"
                      value={getModelLabel(currentModel)}
                      readOnly
                      className={`${inputClass} bg-gray-50 cursor-not-allowed`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {field.description}
                    </p>
                  </div>
                );
              } else {
                // Not configured yet - show empty state
                return null;
              }
            } else {
              // EDIT MODE
              const showExistingKeyNotice = isApiKeyField && hasExistingApiKey && !genAIConfig.apiKey;

              return (
                <div key={field.name}>
                  <label className={labelClass}>
                    {field.label} {field.required && '*'}
                  </label>
                  
                  {/* Show existing API key notice */}
                  {showExistingKeyNotice && (
                    <div className="mb-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                      <div className="font-medium">✓ API key is already configured</div>
                      <div className="mt-1">Enter a new API key below to update it, or leave empty to keep the existing key.</div>
                    </div>
                  )}

                  {/* Render input based on field type */}
                  {field.type === 'password' || field.type === 'text' ? (
                    <input
                      type={field.type}
                      value={fieldValue || ''}
                      onChange={(e) => {
                        setGenAIConfig({ ...genAIConfig, [field.name]: e.target.value });
                      }}
                      placeholder={
                        isApiKeyField && hasExistingApiKey
                          ? "Leave empty to keep existing key, or enter new key"
                          : field.placeholder
                      }
                      className={inputClass}
                      required={field.required && !(isApiKeyField && hasExistingApiKey)}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={fieldValue || ''}
                      onChange={(e) => {
                        setGenAIConfig({ ...genAIConfig, [field.name]: e.target.value });
                      }}
                      className={inputClass}
                    >
                      {field.options && (() => {
                        const grouped = getGroupedOptions(field);
                        const groups = Object.keys(grouped).filter(g => g !== '');
                        
                        return (
                          <>
                            {grouped[''] && grouped[''].map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            {groups.map((groupName) => (
                              <optgroup key={groupName} label={groupName}>
                                {grouped[groupName].map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </>
                        );
                      })()}
                    </select>
                  ) : null}

                  {/* Field description/help text */}
                  {(field.description || field.helpText) && (
                    <p className="mt-1 text-xs text-gray-500">
                      {field.description}
                      {isApiKeyField && (
                        <>
                          {' '}For Perplexity, keys start with &quot;pplx-&quot;. For Google Gemini, get your key from{' '}
                          <a 
                            href="https://aistudio.google.com/api-keys" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline"
                          >
                            Google AI Studio
                          </a>.
                          {hasExistingApiKey && ' Leave empty to keep existing key.'}
                        </>
                      )}
                    </p>
                  )}

                  {/* Field validation errors - only show in edit mode */}
                  {field.validation?.custom && fieldValue && (
                    (() => {
                      const error = field.validation.custom(fieldValue);
                      return error ? (
                        <p className="mt-1 text-xs text-red-600">{error}</p>
                      ) : null;
                    })()
                  )}
                </div>
              );
            }
          })}

          {/* VIEW MODE: Test Button and Edit Config Button */}
          {!shouldShowEditMode && nodeIsConfigured && (
            <>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleTestGenAI}
                  disabled={isTesting}
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
                onClick={handleEditClick}
                className="w-full rounded-md border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Edit Config
              </button>
            </>
          )}

          {/* EDIT MODE: Save and Cancel Buttons */}
          {shouldShowEditMode && (
            <>
              {/* Validation errors */}
              {(() => {
                const validation = config.validate(genAIConfig, hasExistingApiKey);
                return !validation.valid && validation.errors.length > 0 ? (
                  <div className="space-y-1">
                    {validation.errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-red-600">{error}</p>
                    ))}
                  </div>
                ) : null;
              })()}

              <div className="flex gap-2">
                <button 
                  onClick={handleCancelEdit}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveAndExit}
                  disabled={isSaving || (() => {
                    const validation = config.validate(genAIConfig, hasExistingApiKey);
                    return !validation.valid;
                  })()}
                  className={`flex-1 ${buttonPrimaryClass} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? 'Saving...' : 'Save configuration'}
                </button>
              </div>
            </>
          )}

          {/* NEW CONFIG: Show save button if not configured yet */}
          {!shouldShowEditMode && !nodeIsConfigured && (
            <>
              {/* Validation errors */}
              {(() => {
                const validation = config.validate(genAIConfig, hasExistingApiKey);
                return !validation.valid && validation.errors.length > 0 ? (
                  <div className="space-y-1">
                    {validation.errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-red-600">{error}</p>
                    ))}
                  </div>
                ) : null;
              })()}

              <button 
                onClick={handleSave}
                disabled={isSaving || (() => {
                  const validation = config.validate(genAIConfig, hasExistingApiKey);
                  return !validation.valid;
                })()}
                className={`${buttonPrimaryClass} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? 'Saving...' : 'Save configuration'}
              </button>
            </>
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

  return null;
}

