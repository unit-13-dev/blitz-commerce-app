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
      const encryptedApiKey = genAIConfig.apiKey as string;
      
      // Check if API key is encrypted (format: salt:iv:encrypted)
      // If it doesn't have the encrypted format, assume it's already decrypted (for backwards compatibility)
      if (encryptedApiKey.includes(':') && encryptedApiKey.split(':').length === 3) {
        try {
          // Validate API_ENCRYPTION_KEY is set
          if (!process.env.API_ENCRYPTION_KEY) {
            console.error('[decryptConfigData] API_ENCRYPTION_KEY environment variable is not set. Cannot decrypt API key.');
            throw new Error('API_ENCRYPTION_KEY environment variable is not set');
          }
          
          const decryptedApiKey = decryptAPIKey(encryptedApiKey);
          decrypted.genAIConfig = {
            ...genAIConfig,
            apiKey: decryptedApiKey,
          } as GenAIConfig;
          
          console.log('[decryptConfigData] Successfully decrypted GenAI API key');
        } catch (error) {
          console.error('[decryptConfigData] Failed to decrypt GenAI API key:', error);
          console.error('[decryptConfigData] Encrypted key format:', encryptedApiKey.substring(0, 50) + '...');
          console.error('[decryptConfigData] API_ENCRYPTION_KEY exists:', !!process.env.API_ENCRYPTION_KEY);
          // Re-throw error to surface decryption issues
          throw new Error(`Failed to decrypt GenAI API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        // API key is not encrypted (plain text) - use as-is
        // This might happen if the key was stored before encryption was implemented
        console.warn('[decryptConfigData] GenAI API key does not appear to be encrypted (format: salt:iv:encrypted). Using as-is (assuming plain text).');
        decrypted.genAIConfig = genAIConfig as GenAIConfig;
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
    // Update existing configuration
    console.log(`[saveNodeConfiguration] Updating existing configuration for node ${nodeId} (${nodeType})`);
    console.log(`[saveNodeConfiguration] Setting is_configured = ${isConfigured}`);
    
    const { data, error } = await supabase
      .from('node_configurations')
      .update({
        node_type: nodeType,
        config_data: encryptedConfig,
        is_configured: isConfigured, // This is the is_configured column in the database
        // updated_at is automatically updated by the database trigger
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !data) {
      console.error(`[saveNodeConfiguration] Failed to update node configuration:`, error);
      throw new Error(`Failed to update node configuration: ${error?.message ?? 'unknown error'}`);
    }

    console.log(`[saveNodeConfiguration] ✓ Configuration updated successfully`);
    console.log(`[saveNodeConfiguration] Saved is_configured value: ${data.is_configured}`);
    
    return data as NodeConfigurationRecord;
  } else {
    // Insert new configuration
    console.log(`[saveNodeConfiguration] Creating new configuration for node ${nodeId} (${nodeType})`);
    console.log(`[saveNodeConfiguration] Setting is_configured = ${isConfigured}`);
    
    const { data, error } = await supabase
      .from('node_configurations')
      .insert({
        workflow_id: workflowId,
        node_id: nodeId,
        node_type: nodeType,
        config_data: encryptedConfig,
        is_configured: isConfigured, // This is the is_configured column in the database
      })
      .select()
      .single();

    if (error || !data) {
      console.error(`[saveNodeConfiguration] Failed to create node configuration:`, error);
      throw new Error(`Failed to create node configuration: ${error?.message ?? 'unknown error'}`);
    }

    console.log(`[saveNodeConfiguration] ✓ Configuration created successfully`);
    console.log(`[saveNodeConfiguration] Saved is_configured value: ${data.is_configured}`);
    
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
    try {
      // Decrypt configuration data (this will decrypt API keys)
      const decrypted = decryptConfigData(record.config_data);
      
      configurations[record.node_id] = {
        ...decrypted,
        isConfigured: record.is_configured, // Use is_configured flag from database
      };
      
      // Log for debugging
      if (record.node_type === 'genai-intent') {
        console.log(`[loadNodeConfigurations] Loaded GenAI node config for node ${record.node_id}:`, {
          isConfigured: record.is_configured,
          hasApiKey: !!decrypted.genAIConfig?.apiKey,
          hasModel: !!decrypted.genAIConfig?.model,
          model: decrypted.genAIConfig?.model,
          apiKeyLength: decrypted.genAIConfig?.apiKey?.length || 0,
        });
      }
    } catch (error) {
      console.error(`[loadNodeConfigurations] Failed to decrypt config for node ${record.node_id}:`, error);
      console.error(`[loadNodeConfigurations] Error details:`, {
        nodeId: record.node_id,
        nodeType: record.node_type,
        isConfiguredInDB: record.is_configured,
        errorMessage: error instanceof Error ? error.message : String(error),
        apiEncryptionKeyExists: !!process.env.API_ENCRYPTION_KEY,
        configDataKeys: Object.keys(record.config_data || {}),
      });
      
      // IMPORTANT: Preserve the database is_configured flag even if decryption fails
      // The database flag is the source of truth - decryption failure is a separate issue
      // Decryption errors will surface when trying to use the node (e.g., in chat API)
      if (record.node_type === 'genai-intent') {
        // For GenAI nodes, preserve database flag but don't include config (can't decrypt)
        configurations[record.node_id] = {
          isConfigured: record.is_configured, // PRESERVE database flag (source of truth)
          // Don't include genAIConfig since we can't decrypt it
          // The caller will need to handle the missing config appropriately
        };
      } else {
        // For non-GenAI nodes, try to return config without decryption
        // (they might not have encrypted API keys)
        try {
          const configData = record.config_data as NodeConfigurationData;
          configurations[record.node_id] = {
            ...configData,
            isConfigured: record.is_configured, // PRESERVE database flag
          };
        } catch {
          // If that also fails, still preserve database flag
          configurations[record.node_id] = {
            isConfigured: record.is_configured, // PRESERVE database flag
          };
        }
      }
    }
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

