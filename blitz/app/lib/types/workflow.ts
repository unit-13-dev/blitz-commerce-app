// Type definitions for workflow nodes and edges

export type NodeType = 
  | 'genai-intent' 
  | 'router' 
  | 'module' 
  | 'response';

export type ModuleType = 
  | 'tracking' 
  | 'cancellation' 
  | 'refund' 
  | 'modify-order';

export type IntentType = 
  | 'TRACK_SHIPMENT' 
  | 'CANCEL_ORDER' 
  | 'REQUEST_REFUND' 
  | 'MODIFY_ORDER' 
  | 'GENERIC_QUERY';

export interface APIConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export interface ModuleConfig {
  moduleType: ModuleType;
  apiConfigs: Record<string, APIConfig>;
  parameters?: Record<string, unknown>;
}

export interface GenAIConfig {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface RouterConfig {
  intentMappings: Record<IntentType, string>; // Maps intent to module node ID
  defaultModule?: string;
}

export interface NodeData extends Record<string, unknown> {
  // GenAI Intent Node
  genAIConfig?: GenAIConfig;
  
  // Router Node
  routerConfig?: RouterConfig;
  
  // Module Node
  moduleConfig?: ModuleConfig;
  moduleType?: ModuleType;
  label?: string;
  
  // Response Node
  responseType?: 'text' | 'structured' | 'ui-component';
  responseConfig?: Record<string, unknown>;
  
  // Common
  description?: string;
  isConfigured?: boolean;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
}

export interface Workflow {
  id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt?: string;
  updatedAt?: string;
}

