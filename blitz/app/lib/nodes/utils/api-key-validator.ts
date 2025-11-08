import { GenAINodeExecutor } from '../executors/GenAINodeExecutor';
import { GenAIConfig, NodeData } from '@/app/lib/types/workflow';

/**
 * Tests if an API key is valid by making a test call to the AI service
 * @param config The GenAI configuration with API key and model
 * @returns Object with valid flag and error message if invalid
 */
export async function testAPIKey(config: GenAIConfig): Promise<{ valid: boolean; error?: string }> {
  try {
    // Validate that we have both API key and model
    if (!config.apiKey || !config.model) {
      return {
        valid: false,
        error: 'API key and model are required',
      };
    }

    // Create node data for executor
    const nodeData: NodeData & { genAIConfig: GenAIConfig } = {
      genAIConfig: config,
    };

    // Create executor
    const executor = new GenAINodeExecutor(nodeData);

    // Validate configuration
    const validation = executor.validateConfig();
    if (!validation.valid) {
      return {
        valid: false,
        error: validation.errors.join(', '),
      };
    }

    // Test with a simple message (with timeout)
    const testPromise = executor.test('Test');
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('API key test timeout after 30 seconds')), 30000);
    });

    await Promise.race([testPromise, timeoutPromise]);

    return { valid: true };
  } catch (error) {
    console.error('[testAPIKey] Error testing API key:', error);
    
    // Provide user-friendly error messages
    if (error && typeof error === 'object' && 'code' in error) {
      const execError = error as { code: string; message: string };
      if (execError.code === 'GENAI_CONFIG_ERROR') {
        return {
          valid: false,
          error: execError.message,
        };
      }
      if (execError.code === 'GENAI_EXECUTION_ERROR') {
        // Check for common API key errors
        const message = execError.message.toLowerCase();
        if (message.includes('unauthorized') || message.includes('invalid') || message.includes('api key')) {
          return {
            valid: false,
            error: 'API key is invalid or unauthorized. Please check your API key configuration.',
          };
        }
        return {
          valid: false,
          error: 'Failed to test API key: ' + execError.message,
        };
      }
    }

    // Check for timeout
    if (error instanceof Error && error.message.includes('timeout')) {
      return {
        valid: false,
        error: 'API key test timed out. Please check your network connection and try again.',
      };
    }

    // Generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('invalid')) {
      return {
        valid: false,
        error: 'API key is invalid or unauthorized. Please check your API key configuration.',
      };
    }

    return {
      valid: false,
      error: `Failed to validate API key: ${errorMessage}`,
    };
  }
}

