import { NodeData, GenAIConfig } from '@/app/lib/types/workflow';

export interface ExecutionContext {
  businessId: string;
  userId: string;
  workflowId?: string;
  chatSessionId?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface NodeExecutionInput {
  nodeConfig: NodeData;
  inputData: Record<string, unknown>;
  context: ExecutionContext;
}

export interface GenAIExecutionResult {
  intent: 'general_query' | 'cancellation' | 'order_query' | 'refund_query';
  response: string;
  extractedData?: Record<string, unknown>;
  method: 'GENAI_TO_FRONTEND' | 'USER_TO_BLITZ';
}

export interface RouterExecutionResult {
  targetModuleId: string;
  payload: Record<string, unknown>;
}

export interface ModuleExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  method: 'MODULE_TO_FRONTEND' | 'GENAI_TO_FRONTEND';
  uiComponent?: {
    type: 'radio' | 'select' | 'input';
    options?: string[];
    label?: string;
  };
}

export interface ResponseExecutionResult {
  formattedResponse: string | Record<string, unknown>;
  responseType: 'text' | 'structured' | 'ui-component';
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

