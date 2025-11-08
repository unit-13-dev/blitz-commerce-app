import { getSupabaseAdmin } from '../supabase/admin';
import { NodeType, GenAIConfig, RouterConfig, ModuleConfig } from '../types/workflow';
import { encryptAPIKey, decryptAPIKey } from '../encryption';

export type NodeConfigurationRecord = {
  id: string;
  workflow_id: string;
  node_id: string;
  node_type: NodeType;
  config_data: Record<string, unknown>;
  is_configured: boolean;
  created_at: string;
  updated_at: string;
};

export interface NodeConfigurationData {
  genAIConfig?: GenAIConfig;
  routerConfig?: RouterConfig;
  moduleConfig?: ModuleConfig;
  responseConfig?: {
    responseType?: 'text' | 'structured' | 'ui-component';
    config?: Record<string, unknown>;
  };
}

/**
 * Encrypts API keys in configuration data before saving
 */
function encryptConfigData(config: NodeConfigurationData): Record<string, unknown> {
  const encrypted: Record<string, unknown> = { ...config };

  // Encrypt GenAI API key if present
  if (config.genAIConfig?.apiKey) {
    encrypted.genAIConfig = {
      ...config.genAIConfig,
      apiKey: encryptAPIKey(config.genAIConfig.apiKey),
    };
  }

  // Encrypt module API keys if present
  if (config.moduleConfig?.apiConfigs) {
    const encryptedApiConfigs: Record<string, unknown> = {};
    for (const [name, apiConfig] of Object.entries(config.moduleConfig.apiConfigs)) {
      if (apiConfig.apiKey) {
        encryptedApiConfigs[name] = {
          ...apiConfig,
          apiKey: encryptAPIKey(apiConfig.apiKey),
        };
      } else {
        encryptedApiConfigs[name] = apiConfig;
      }
    }
    encrypted.moduleConfig = {
      ...config.moduleConfig,
      apiConfigs: encryptedApiConfigs,
    };
  }

  return encrypted;
}

/**
 * Decrypts API keys in configuration data after loading
 */
function decryptConfigData(configData: Record<string, unknown>): NodeConfigurationData {
  const decrypted: NodeConfigurationData = { ...configData };

  // Decrypt GenAI API key if present
  if (configData.genAIConfig && typeof configData.genAIConfig === 'object') {
    const genAIConfig = configData.genAIConfig as Record<string, unknown>;
    if (genAIConfig.apiKey && typeof genAIConfig.apiKey === 'string') {
      try {
        const encryptedKey = genAIConfig.apiKey as string;
        
        // Check if the key looks encrypted (should contain colons from our encryption format: salt:iv:encrypted)
        // If it doesn't contain colons, it might already be decrypted or in a different format
        if (encryptedKey.includes(':')) {
          // Try to decrypt
          const decryptedKey = decryptAPIKey(encryptedKey);
          decrypted.genAIConfig = {
            ...genAIConfig,
            apiKey: decryptedKey,
          } as GenAIConfig;
          
          console.log('[decryptConfigData] Successfully decrypted GenAI API key:', {
            encryptedLength: encryptedKey.length,
            decryptedLength: decryptedKey.length,
            hasModel: !!genAIConfig.model,
            model: genAIConfig.model,
          });
        } else {
          // Key doesn't look encrypted, use as-is (might be plain text for testing or already decrypted)
          console.warn('[decryptConfigData] GenAI API key does not appear to be encrypted (no colons found), using as-is');
          decrypted.genAIConfig = genAIConfig as GenAIConfig;
        }
      } catch (error) {
        console.error('[decryptConfigData] Failed to decrypt GenAI API key:', {
          error: error instanceof Error ? error.message : String(error),
          apiKeyLength: (genAIConfig.apiKey as string).length,
          apiKeyPrefix: (genAIConfig.apiKey as string).substring(0, 20),
        });
        // Re-throw the error instead of keeping encrypted key
        // This ensures we fail fast and don't try to use an encrypted key
        throw new Error(`Failed to decrypt GenAI API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      decrypted.genAIConfig = genAIConfig as GenAIConfig;
    }
  }

  // Decrypt module API keys if present
  if (configData.moduleConfig && typeof configData.moduleConfig === 'object') {
    const moduleConfig = configData.moduleConfig as Record<string, unknown>;
    if (moduleConfig.apiConfigs && typeof moduleConfig.apiConfigs === 'object') {
      const apiConfigs = moduleConfig.apiConfigs as Record<string, unknown>;
      const decryptedApiConfigs: Record<string, unknown> = {};
      for (const [name, apiConfig] of Object.entries(apiConfigs)) {
        if (apiConfig && typeof apiConfig === 'object') {
          const config = apiConfig as Record<string, unknown>;
          if (config.apiKey && typeof config.apiKey === 'string') {
            try {
              decryptedApiConfigs[name] = {
                ...config,
                apiKey: decryptAPIKey(config.apiKey as string),
              };
            } catch (error) {
              console.error(`[decryptConfigData] Failed to decrypt API key for ${name}:`, error);
              decryptedApiConfigs[name] = config;
            }
          } else {
            decryptedApiConfigs[name] = config;
          }
        } else {
          decryptedApiConfigs[name] = apiConfig;
        }
      }
      decrypted.moduleConfig = {
        ...moduleConfig,
        apiConfigs: decryptedApiConfigs,
      } as ModuleConfig;
    } else {
      decrypted.moduleConfig = moduleConfig as ModuleConfig;
    }
  }

  return decrypted;
}

/**
 * Saves or updates a node configuration
 */
export async function saveNodeConfiguration(
  workflowId: string,
  nodeId: string,
  nodeType: NodeType,
  config: NodeConfigurationData,
  isConfigured: boolean
): Promise<NodeConfigurationRecord> {
  const supabase = getSupabaseAdmin();

  // Encrypt API keys before saving
  const encryptedConfig = encryptConfigData(config);

  // Try to update existing configuration
  const { data: existing, error: fetchError } = await supabase
    .from('node_configurations')
    .select('id')
    .eq('workflow_id', workflowId)
    .eq('node_id', nodeId)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 is "not found" error, which is fine
    throw new Error(`Failed to check existing configuration: ${fetchError.message}`);
  }

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('node_configurations')
      .update({
        node_type: nodeType,
        config_data: encryptedConfig,
        is_configured: isConfigured,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update node configuration: ${error?.message ?? 'unknown error'}`);
    }

    return data as NodeConfigurationRecord;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('node_configurations')
      .insert({
        workflow_id: workflowId,
        node_id: nodeId,
        node_type: nodeType,
        config_data: encryptedConfig,
        is_configured: isConfigured,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create node configuration: ${error?.message ?? 'unknown error'}`);
    }

    return data as NodeConfigurationRecord;
  }
}

/**
 * Loads all node configurations for a workflow
 */
export async function loadNodeConfigurations(
  workflowId: string
): Promise<Record<string, NodeConfigurationData & { isConfigured: boolean }>> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('node_configurations')
    .select('*')
    .eq('workflow_id', workflowId);

  if (error) {
    throw new Error(`Failed to load node configurations: ${error.message}`);
  }

  const configurations: Record<string, NodeConfigurationData & { isConfigured: boolean }> = {};

  for (const record of data || []) {
    const decrypted = decryptConfigData(record.config_data);
    configurations[record.node_id] = {
      ...decrypted,
      isConfigured: record.is_configured,
    };
  }

  return configurations;
}

/**
 * Deletes a node configuration
 */
export async function deleteNodeConfiguration(workflowId: string, nodeId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('node_configurations')
    .delete()
    .eq('workflow_id', workflowId)
    .eq('node_id', nodeId);

  if (error) {
    throw new Error(`Failed to delete node configuration: ${error.message}`);
  }
}

/**
 * Checks if workflow has a configured GenAI node
 */
export async function workflowHasConfiguredGenAI(workflowId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('node_configurations')
    .select('id')
    .eq('workflow_id', workflowId)
    .eq('node_type', 'genai-intent')
    .eq('is_configured', true)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to check GenAI configuration: ${error.message}`);
  }

  return !!data;
}

