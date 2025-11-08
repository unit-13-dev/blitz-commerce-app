import { 
  ResponseExecutionResult, 
  NodeExecutionData, 
  ExecutionContext,
  ExecutionError 
} from '../types/execution';

export interface ResponseConfig {
  responseType?: 'text' | 'structured' | 'ui-component';
  config?: Record<string, unknown>;
}

/**
 * Response Node Executor
 * Formats module outputs for frontend display
 */
export class ResponseNodeExecutor {
  /**
   * Executes the response node
   * Formats the module output based on response type
   */
  async execute(
    responseConfig: ResponseConfig,
    executionData: NodeExecutionData,
    context: ExecutionContext
  ): Promise<ResponseExecutionResult> {
    console.log('[ResponseNodeExecutor] Starting execution:', {
      responseType: responseConfig.responseType,
    });

    try {
      // Get module result
      const moduleResult = executionData.moduleResult;
      if (!moduleResult || !moduleResult.success) {
        throw this.createError(
          'MODULE_RESULT_MISSING',
          'Module result is missing or failed',
          { moduleResult }
        );
      }

      // Format based on response type
      const responseType = responseConfig.responseType || 'structured';
      let formattedResponse: string | Record<string, unknown>;

      switch (responseType) {
        case 'text':
          formattedResponse = this.formatAsText(moduleResult, executionData, context);
          break;
        case 'structured':
          formattedResponse = this.formatAsStructured(moduleResult, executionData, context);
          break;
        case 'ui-component':
          formattedResponse = this.formatAsUIComponent(moduleResult, executionData, context, responseConfig);
          break;
        default:
          formattedResponse = this.formatAsStructured(moduleResult, executionData, context);
      }

      console.log('[ResponseNodeExecutor] Response formatted successfully:', {
        responseType,
        isString: typeof formattedResponse === 'string',
        isObject: typeof formattedResponse === 'object',
      });

      return {
        formattedResponse,
        responseType,
        nodeId: '', // Will be set by workflow executor
        executionTime: 0, // Will be set by workflow executor
      };
    } catch (error) {
      console.error('[ResponseNodeExecutor] Response formatting failed:', error);
      throw this.createError(
        'RESPONSE_FORMATTING_FAILED',
        `Response formatting failed: ${error instanceof Error ? error.message : String(error)}`,
        { error: error instanceof Error ? error.stack : String(error) }
      );
    }
  }

  /**
   * Formats response as plain text
   */
  private formatAsText(
    moduleResult: NodeExecutionData['moduleResult'],
    executionData: NodeExecutionData,
    context: ExecutionContext
  ): string {
    if (!moduleResult) {
      return 'No response available';
    }

    // If module has a message, use it
    if (moduleResult.data && typeof moduleResult.data === 'object') {
      const data = moduleResult.data as Record<string, unknown>;
      if (data.message && typeof data.message === 'string') {
        return data.message;
      }
    }

    // Otherwise, format the data as text
    return JSON.stringify(moduleResult.data, null, 2);
  }

  /**
   * Formats response as structured JSON
   */
  private formatAsStructured(
    moduleResult: NodeExecutionData['moduleResult'],
    executionData: NodeExecutionData,
    context: ExecutionContext
  ): Record<string, unknown> {
    if (!moduleResult) {
      return { error: 'No response available' };
    }

    return {
      success: moduleResult.success,
      data: moduleResult.data || {},
      intent: executionData.genAIResult?.intent,
      extractedData: executionData.genAIResult?.extractedData,
    };
  }

  /**
   * Formats response as UI component
   */
  private formatAsUIComponent(
    moduleResult: NodeExecutionData['moduleResult'],
    executionData: NodeExecutionData,
    context: ExecutionContext,
    responseConfig: ResponseConfig
  ): Record<string, unknown> {
    if (!moduleResult) {
      return {
        component: 'Error',
        props: {
          message: 'No response available',
        },
      };
    }

    // Get component type from config or default based on module type
    const componentType = responseConfig.config?.componentType || this.inferComponentType(moduleResult);

    return {
      component: componentType,
      props: {
        ...moduleResult.data,
        intent: executionData.genAIResult?.intent,
        extractedData: executionData.genAIResult?.extractedData,
      },
    };
  }

  /**
   * Infers UI component type based on module result
   */
  private inferComponentType(moduleResult: NodeExecutionData['moduleResult']): string {
    if (!moduleResult || !moduleResult.data) {
      return 'TextResponse';
    }

    const data = moduleResult.data as Record<string, unknown>;

    // Check for orders array (tracking module)
    if (Array.isArray(data.orders)) {
      return 'OrderList';
    }

    // Check for cancelled flag (cancellation module)
    if (data.cancelled === true) {
      return 'CancellationConfirmation';
    }

    // Check for refunded flag (refund module)
    if (data.refunded === true) {
      return 'RefundConfirmation';
    }

    // Default component
    return 'TextResponse';
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

