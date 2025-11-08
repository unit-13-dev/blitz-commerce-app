import { GenAIConfig } from '@/app/lib/types/workflow';

/**
 * Configuration definition for GenAI Intent Node
 * This file defines all the configuration fields, validation rules, and UI metadata
 * for the GenAI node. The NodeConfigPanel uses this to render the configuration form.
 */

export interface NodeConfigField {
  name: keyof GenAIConfig;
  label: string;
  type: 'text' | 'password' | 'select' | 'number' | 'textarea';
  required: boolean;
  placeholder?: string;
  description?: string;
  helpText?: string;
  options?: Array<{
    value: string;
    label: string;
    group?: string;
  }>;
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    custom?: (value: string) => string | null; // Returns error message or null if valid
  };
}

export interface NodeConfigSection {
  title: string;
  description?: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

export interface NodeConfigDefinition {
  nodeType: 'genai-intent';
  title: string;
  sections: NodeConfigSection[];
  fields: NodeConfigField[];
  validate: (config: Partial<GenAIConfig>, hasExistingApiKey?: boolean) => { valid: boolean; errors: string[] };
  getDefaultConfig: () => GenAIConfig;
  isConfigured: (config: Partial<GenAIConfig>, hasExistingApiKey: boolean) => boolean;
}

export const genaiNodeConfig: NodeConfigDefinition = {
  nodeType: 'genai-intent',
  title: 'GenAI Intent Configuration',
  
  sections: [
    {
      title: 'Configuration Info',
      description: 'Enter your API key (Perplexity or Google Gemini) to enable intent detection. The API key will be encrypted and stored securely.',
      type: 'info',
    },
  ],

  fields: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'pplx-... or AIza... (from Google AI Studio)',
      description: 'Your API key. For Perplexity, keys start with "pplx-". For Google Gemini, get your key from Google AI Studio.',
      helpText: 'Required for intent detection.',
      validation: {
        custom: (value: string) => {
          if (!value) return 'API key is required';
          // Basic validation - check if it starts with expected prefixes
          const isPerplexity = value.startsWith('pplx-');
          const isGemini = value.startsWith('AIza');
          if (!isPerplexity && !isGemini) {
            return 'API key should start with "pplx-" (Perplexity) or "AIza" (Google Gemini)';
          }
          return null;
        },
      },
    },
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      required: true,
      description: 'Select the AI model for intent detection. Perplexity models use keys starting with "pplx-", Gemini models use keys from Google AI Studio.',
      options: [
        {
          value: '',
          label: 'Select a model',
        },
        {
          value: 'sonar-pro',
          label: 'Perplexity Sonar Pro',
          group: 'Perplexity Models',
        },
        {
          value: 'gemini-pro',
          label: 'Gemini Pro',
          group: 'Google Gemini Models',
        },
        {
          value: 'gemini-1.5-pro',
          label: 'Gemini 1.5 Pro',
          group: 'Google Gemini Models',
        },
        {
          value: 'gemini-1.5-flash',
          label: 'Gemini 1.5 Flash',
          group: 'Google Gemini Models',
        },
      ],
      validation: {
        custom: (value: string) => {
          if (!value) return 'Model selection is required';
          const validModels = ['sonar-pro', 'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
          if (!validModels.includes(value)) {
            return `Invalid model. Supported models are: ${validModels.join(', ')}`;
          }
          return null;
        },
      },
    },
  ],

  validate: (config: Partial<GenAIConfig>, hasExistingApiKey: boolean = false): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!config.model) {
      errors.push('Model is required');
    } else {
      const validModels = ['sonar-pro', 'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
      if (!validModels.includes(config.model)) {
        errors.push(`Invalid model: "${config.model}". Supported models are: ${validModels.join(', ')}`);
      }
    }

    // Validate API key format if provided, or check if required
    if (config.apiKey && config.apiKey !== 'existing-key-placeholder') {
      // Validate API key format
      const isPerplexity = config.apiKey.startsWith('pplx-');
      const isGemini = config.apiKey.startsWith('AIza');
      if (!isPerplexity && !isGemini) {
        errors.push('API key should start with "pplx-" (Perplexity) or "AIza" (Google Gemini)');
      }
    } else if (!hasExistingApiKey && (!config.apiKey || config.apiKey === '')) {
      // API key is required only if there's no existing key
      errors.push('API key is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  getDefaultConfig: (): GenAIConfig => {
    return {
      model: '',
      apiKey: '',
    };
  },

  isConfigured: (config: Partial<GenAIConfig>, hasExistingApiKey: boolean): boolean => {
    // Node is configured if:
    // 1. Model is selected
    // 2. API key is present (either new or existing)
    return !!(config.model && (config.apiKey || hasExistingApiKey));
  },
};

/**
 * Helper function to get field by name
 */
export function getGenAIField(name: keyof GenAIConfig): NodeConfigField | undefined {
  return genaiNodeConfig.fields.find((field) => field.name === name);
}

/**
 * Helper function to get grouped options for select fields
 */
export function getGroupedOptions(field: NodeConfigField): Record<string, Array<{ value: string; label: string }>> {
  if (!field.options) return {};

  const grouped: Record<string, Array<{ value: string; label: string }>> = {};
  const ungrouped: Array<{ value: string; label: string }> = [];

  field.options.forEach((option) => {
    if (option.group) {
      if (!grouped[option.group]) {
        grouped[option.group] = [];
      }
      grouped[option.group].push({ value: option.value, label: option.label });
    } else {
      ungrouped.push({ value: option.value, label: option.label });
    }
  });

  if (ungrouped.length > 0) {
    grouped[''] = ungrouped;
  }

  return grouped;
}

/**
 * Helper function to get model label by value
 */
export function getModelLabel(modelValue: string): string {
  const modelField = genaiNodeConfig.fields.find((f) => f.name === 'model');
  if (!modelField?.options) return modelValue;
  
  const option = modelField.options.find((opt) => opt.value === modelValue);
  return option?.label || modelValue;
}

