// Type definitions for workflow nodes and edges

export type NodeType = 
  | 'genai-intent' 
  | 'router' 
  | 'module' 
  | 'response';

export type ModuleType = 
  | 'tracking' 
  | 'cancellation' 
  | 'faq' 
  | 'refund';

export type IntentType = 
  | 'TRACK_SHIPMENT' 
  | 'CANCEL_ORDER' 
  | 'FAQ_SUPPORT';

// GenAI detected intent types (from GenAI node output)
export type GenAIIntent = 
  | 'general_query' 
  | 'cancellation' 
  | 'order_query' 
  | 'refund_query';

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
  apiKey?: string; // Perplexity API key for this business
}

export interface RouterConfig {
  intentMappings: Record<IntentType, string>; // Maps intent to module node ID
  defaultModule?: string;
}

// NodeData for react_flow_state - only basic info, no configurations
export interface NodeData extends Record<string, unknown> {
  // Basic info only - no sensitive config data
  label?: string;
  description?: string;
  moduleType?: ModuleType; // For module nodes, to identify which module type
  // Note: All configurations (genAIConfig, routerConfig, moduleConfig, etc.) 
  // are stored separately in node_configurations table
}

// Full node data including configurations (used when loading from DB)
export interface WorkflowNodeWithConfig {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  // Configurations loaded from node_configurations table
  genAIConfig?: GenAIConfig;
  routerConfig?: RouterConfig;
  moduleConfig?: ModuleConfig;
  responseConfig?: {
    responseType?: 'text' | 'structured' | 'ui-component';
    config?: Record<string, unknown>;
  };
  isConfigured?: boolean;
}

// WorkflowNode for react_flow_state (basic info only)
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

