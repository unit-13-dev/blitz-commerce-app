import { ModuleConfig, APIConfig } from '@/app/lib/types/workflow';
import { 
  ModuleExecutionResult, 
  NodeExecutionData, 
  ExecutionContext,
  ExecutionError 
} from '../types/execution';
import { decryptAPIKey } from '@/app/lib/encryption';

/**
 * Module Node Executor
 * Executes module nodes by calling business APIs
 */
export class ModuleNodeExecutor {
  /**
   * Executes the module node
   */
  async execute(
    moduleConfig: ModuleConfig,
    executionData: NodeExecutionData,
    context: ExecutionContext
  ): Promise<ModuleExecutionResult> {
    console.log('[ModuleNodeExecutor] Starting execution:', {
      moduleType: moduleConfig.moduleType,
      apiConfigCount: Object.keys(moduleConfig.apiConfigs || {}).length,
    });

    try {
      // Validate configuration
      if (!moduleConfig.apiConfigs || Object.keys(moduleConfig.apiConfigs).length === 0) {
        throw this.createError(
          'MODULE_CONFIG_INVALID',
          'Module has no API configurations',
          { moduleType: moduleConfig.moduleType }
        );
      }

      // Get router result for routing data
      const routingData = executionData.routerResult?.routingData || {};
      const extractedData = executionData.genAIResult?.extractedData || {};

      // Execute based on module type
      let result: ModuleExecutionResult;
      switch (moduleConfig.moduleType) {
        case 'tracking':
          result = await this.executeTrackingModule(moduleConfig, routingData, extractedData, context);
          break;
        case 'cancellation':
          result = await this.executeCancellationModule(moduleConfig, routingData, extractedData, context);
          break;
        case 'refund':
          result = await this.executeRefundModule(moduleConfig, routingData, extractedData, context);
          break;
        case 'faq':
          result = await this.executeFAQModule(moduleConfig, routingData, extractedData, context);
          break;
        default:
          throw this.createError(
            'MODULE_TYPE_UNSUPPORTED',
            `Unsupported module type: ${moduleConfig.moduleType}`,
            { moduleType: moduleConfig.moduleType }
          );
      }

      console.log('[ModuleNodeExecutor] Module executed successfully:', {
        moduleType: moduleConfig.moduleType,
        success: result.success,
        hasData: !!result.data,
      });

      return {
        ...result,
        moduleType: moduleConfig.moduleType,
        nodeId: '', // Will be set by workflow executor
        executionTime: 0, // Will be set by workflow executor
      };
    } catch (error) {
      console.error('[ModuleNodeExecutor] Module execution failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        method: 'MODULE_TO_FRONTEND',
        moduleType: moduleConfig.moduleType,
        nodeId: '', // Will be set by workflow executor
        executionTime: 0, // Will be set by workflow executor
      };
    }
  }

  /**
   * Executes tracking module
   */
  private async executeTrackingModule(
    moduleConfig: ModuleConfig,
    routingData: Record<string, unknown>,
    extractedData: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ModuleExecutionResult> {
    console.log('[ModuleNodeExecutor] Executing tracking module');

    // Get API config for orders endpoint
    const ordersApiConfig = moduleConfig.apiConfigs['orders'];
    if (!ordersApiConfig) {
      throw this.createError('API_CONFIG_MISSING', 'Orders API configuration is missing');
    }

    // Build API request
    const apiResult = await this.callBusinessAPI(
      ordersApiConfig,
      {
        userId: context.userId,
        ...extractedData,
      },
      context
    );

    // Process and return result
    return {
      success: true,
      data: {
        orders: apiResult.data || [],
        message: 'Order tracking information retrieved',
      },
      method: 'MODULE_TO_FRONTEND',
    };
  }

  /**
   * Executes cancellation module
   */
  private async executeCancellationModule(
    moduleConfig: ModuleConfig,
    routingData: Record<string, unknown>,
    extractedData: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ModuleExecutionResult> {
    console.log('[ModuleNodeExecutor] Executing cancellation module');

    // Get API config for cancellation endpoint
    const cancelApiConfig = moduleConfig.apiConfigs['cancel'];
    if (!cancelApiConfig) {
      throw this.createError('API_CONFIG_MISSING', 'Cancellation API configuration is missing');
    }

    // Build cancellation request
    const apiResult = await this.callBusinessAPI(
      cancelApiConfig,
      {
        userId: context.userId,
        orderId: extractedData.orderId,
        reason: extractedData.reason,
        ...extractedData,
      },
      context
    );

    // Process and return result
    return {
      success: true,
      data: {
        cancelled: true,
        orderId: extractedData.orderId,
        message: 'Order cancellation processed',
        ...apiResult.data,
      },
      method: 'MODULE_TO_FRONTEND',
    };
  }

  /**
   * Executes refund module
   */
  private async executeRefundModule(
    moduleConfig: ModuleConfig,
    routingData: Record<string, unknown>,
    extractedData: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ModuleExecutionResult> {
    console.log('[ModuleNodeExecutor] Executing refund module');

    // Get API config for refund endpoint
    const refundApiConfig = moduleConfig.apiConfigs['refund'];
    if (!refundApiConfig) {
      throw this.createError('API_CONFIG_MISSING', 'Refund API configuration is missing');
    }

    // Build refund request
    const apiResult = await this.callBusinessAPI(
      refundApiConfig,
      {
        userId: context.userId,
        orderId: extractedData.orderId,
        reason: extractedData.reason,
        ...extractedData,
      },
      context
    );

    // Process and return result
    return {
      success: true,
      data: {
        refunded: true,
        orderId: extractedData.orderId,
        message: 'Refund request processed',
        ...apiResult.data,
      },
      method: 'MODULE_TO_FRONTEND',
    };
  }

  /**
   * Executes FAQ module
   */
  private async executeFAQModule(
    moduleConfig: ModuleConfig,
    routingData: Record<string, unknown>,
    extractedData: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ModuleExecutionResult> {
    console.log('[ModuleNodeExecutor] Executing FAQ module');

    // FAQ module can use GenAI response directly or call a knowledge base API
    // For now, we'll return the GenAI response as the answer
    const genAIResponse = routingData.genAIResponse as string || '';

    return {
      success: true,
      data: {
        answer: genAIResponse,
        message: 'FAQ response generated',
      },
      method: 'GENAI_TO_FRONTEND', // Use GenAI response directly
    };
  }

  /**
   * Calls a business API
   */
  private async callBusinessAPI(
    apiConfig: APIConfig,
    payload: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<{ data: unknown; status: number; duration: number }> {
    const startTime = Date.now();
    const method = apiConfig.method || 'GET';
    const url = apiConfig.baseUrl;

    console.log('[ModuleNodeExecutor] Calling business API:', {
      url,
      method,
      apiConfigName: apiConfig.name,
    });

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(apiConfig.headers || {}),
      };

      // Add API key if present (decrypt if needed)
      if (apiConfig.apiKey) {
        try {
          // Try to decrypt (in case it's encrypted)
          const decryptedKey = decryptAPIKey(apiConfig.apiKey);
          headers['Authorization'] = `Bearer ${decryptedKey}`;
        } catch {
          // If decryption fails, use as-is (might be plain text or already decrypted)
          headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
        }
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers,
      };

      // Add body for POST/PUT requests
      if (['POST', 'PUT'].includes(method)) {
        requestOptions.body = JSON.stringify(payload);
      } else if (method === 'GET') {
        // Add query parameters for GET requests
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(payload)) {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        }
        if (queryParams.toString()) {
          url += (url.includes('?') ? '&' : '?') + queryParams.toString();
        }
      }

      // Set timeout
      const timeout = apiConfig.timeout || 30000; // 30 seconds default
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      requestOptions.signal = controller.signal;

      // Make API call
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const data = await response.json().catch(() => ({}));

      console.log('[ModuleNodeExecutor] API call completed:', {
        url,
        method,
        status: response.status,
        duration,
      });

      if (!response.ok) {
        throw this.createError(
          'API_CALL_FAILED',
          `API call failed with status ${response.status}`,
          { url, method, status: response.status, response: data }
        );
      }

      return {
        data,
        status: response.status,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[ModuleNodeExecutor] API call failed:', {
        url,
        method,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError(
          'API_CALL_TIMEOUT',
          `API call timed out after ${apiConfig.timeout || 30000}ms`,
          { url, method, timeout: apiConfig.timeout }
        );
      }

      throw this.createError(
        'API_CALL_ERROR',
        `API call failed: ${error instanceof Error ? error.message : String(error)}`,
        { url, method, error: error instanceof Error ? error.stack : String(error) }
      );
    }
  }

  /**
   * Creates an execution error
   */
  private createError(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): ExecutionError {
    return {
      code,
      message,
      details,
      timestamp: Date.now(),
    };
  }
}

