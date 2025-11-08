import { NodeData, GenAIConfig, GenAIIntent, IntentType } from '@/app/lib/types/workflow';

/**
 * Execution context passed to all nodes
 * Contains full context about the execution environment
 */
export interface ExecutionContext {
  businessId: string;
  userId: string;
  workflowId: string;
  chatSessionId: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  originalMessage: string; // Original user message
  executionId: string; // Unique ID for this workflow execution
  startTime: number; // Timestamp when execution started
}

/**
 * Data passed between nodes in the workflow
 * Contains full context: original message + all previous node results
 */
export interface NodeExecutionData {
  // Original input
  originalMessage: string;
  
  // GenAI node output (if executed)
  genAIResult?: GenAIExecutionResult;
  
  // Router node output (if executed)
  routerResult?: RouterExecutionResult;
  
  // Module node output (if executed)
  moduleResult?: ModuleExecutionResult;
  
  // Accumulated data from all nodes
  accumulatedData: Record<string, unknown>;
  
  // Execution metadata
  executionContext: ExecutionContext;
}

/**
 * GenAI Node Execution Result
 */
export interface GenAIExecutionResult {
  intent: GenAIIntent;
  response: string;
  extractedData?: Record<string, unknown>;
  method: 'GENAI_TO_FRONTEND' | 'FRONTEND_TO_BLITZ';
  nodeId: string;
  executionTime: number; // Time taken to execute in ms
}

/**
 * Router Node Execution Result
 */
export interface RouterExecutionResult {
  mappedIntent: IntentType | null; // Router intent (mapped from GenAI intent)
  targetModuleId: string | null; // Target module node ID
  routingData: Record<string, unknown>; // Data to pass to module
  nodeId: string;
  executionTime: number;
}

/**
 * Module Node Execution Result
 */
export interface ModuleExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  method: 'MODULE_TO_FRONTEND' | 'GENAI_TO_FRONTEND';
  nodeId: string;
  moduleType: string;
  executionTime: number;
  apiCalls?: Array<{
    url: string;
    method: string;
    status: number;
    duration: number;
  }>;
}

/**
 * Complete workflow execution result
 */
export interface WorkflowExecutionResult {
  success: boolean;
  finalResponse: string | Record<string, unknown>;
  responseType: 'text' | 'structured' | 'ui-component';
  method: 'GENAI_TO_FRONTEND' | 'FRONTEND_TO_BLITZ' | 'MODULE_TO_FRONTEND';
  intent?: GenAIIntent;
  extractedData?: Record<string, unknown>;
  nodeResults: {
    genAI?: GenAIExecutionResult;
    router?: RouterExecutionResult;
    module?: ModuleExecutionResult;
  };
  totalExecutionTime: number;
  executionPath: string[]; // Array of node IDs executed in order
  errors?: ExecutionError[];
  debug: {
    executionId: string;
    workflowId: string;
    businessId: string;
    userId: string;
    timestamp: number;
  };
}

/**
 * Execution Error
 */
export interface ExecutionError {
  code: string;
  message: string;
  nodeId?: string;
  nodeType?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Node Execution Input (for individual node execution)
 */
export interface NodeExecutionInput {
  nodeId: string;
  nodeType: string;
  nodeConfig: NodeData;
  inputData: NodeExecutionData; // Full context
  context: ExecutionContext;
}

