'use client';

import { useState, useEffect } from 'react';
import type { GenAIConfig } from '@/app/lib/types/workflow';

interface GenAIConfigProps {
  nodeConfig?: {
    genAIConfig?: GenAIConfig;
    isConfigured?: boolean;
  };
  workflowId?: string;
  nodeId: string;
  onSave: (config: { genAIConfig: GenAIConfig }, isConfigured: boolean) => Promise<void>;
  onClose: () => void;
}

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500';
const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-0 transition';
const buttonPrimaryClass =
  'w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-black';

export function GenAIConfig({ nodeConfig, workflowId, nodeId, onSave, onClose }: GenAIConfigProps) {
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

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Update state when nodeConfig changes
  useEffect(() => {
    if (nodeConfig?.genAIConfig) {
      setGenAIConfig({
        model: nodeConfig.genAIConfig.model || '',
        apiKey: '',
      });
    } else {
      setGenAIConfig({
        model: '',
        apiKey: '',
      });
    }
  }, [nodeConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If API key is empty but we have an existing config, keep the existing key
      let finalGenAIConfig: GenAIConfig = {
        model: genAIConfig.model,
        apiKey: genAIConfig.apiKey || nodeConfig?.genAIConfig?.apiKey || '',
      };
      // Only save if both model and API key are present
      if (!finalGenAIConfig.model || !finalGenAIConfig.apiKey) {
        throw new Error('Both model and API key are required');
      }
      // Consider configured if we have an API key (either new or existing) and a model
      const isConfigured = !!(finalGenAIConfig.apiKey && finalGenAIConfig.model);
      await onSave({ genAIConfig: finalGenAIConfig }, isConfigured);
    } catch (error) {
      console.error('Failed to save GenAI configuration:', error);
      alert(error instanceof Error ? error.message : 'Failed to save configuration');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestGenAI = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Ensure we have workflowId and nodeId
      if (!workflowId || !nodeId) {
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
          nodeId,
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

  return (
    <div className="space-y-5 text-sm">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <p className="font-medium">ℹ️ Configuration Info</p>
        <p className="mt-1">
          Enter your API key (Perplexity or Google Gemini) to enable intent detection. The API key will be encrypted and
          stored securely.
        </p>
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
          onChange={(e) => setGenAIConfig({ ...genAIConfig, apiKey: e.target.value })}
          placeholder={
            hasExistingApiKey ? 'Leave empty to keep existing key, or enter new key' : 'pplx-... or AIza... (from Google AI Studio)'
          }
          className={inputClass}
          required={!hasExistingApiKey}
        />
        <p className="mt-1 text-xs text-gray-500">
          Your API key. For Perplexity, keys start with &quot;pplx-&quot;. For Google Gemini, get your key from{' '}
          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Google AI Studio
          </a>
          . {hasExistingApiKey ? 'Leave empty to keep existing key.' : 'Required for intent detection.'}
        </p>
      </div>

      <div>
        <label className={labelClass}>Model</label>
        <select
          value={genAIConfig.model || ''}
          onChange={(e) => setGenAIConfig({ ...genAIConfig, model: e.target.value })}
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
          Select the AI model for intent detection. Perplexity models use keys starting with &quot;pplx-&quot;, Gemini
          models use keys from Google AI Studio.
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
              testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {testResult.success ? '✓' : '✗'} {testResult.message}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving || (!genAIConfig.apiKey && !hasExistingApiKey) || !genAIConfig.model}
        className={`${buttonPrimaryClass} ${
          isSaving || (!genAIConfig.apiKey && !hasExistingApiKey) || !genAIConfig.model
            ? 'opacity-50 cursor-not-allowed'
            : ''
        }`}
      >
        {isSaving ? 'Saving...' : 'Save configuration'}
      </button>
      {!genAIConfig.apiKey && !hasExistingApiKey && (
        <p className="text-xs text-red-600">API key is required</p>
      )}
      {!genAIConfig.model && <p className="text-xs text-red-600">Model selection is required</p>}
    </div>
  );
}

