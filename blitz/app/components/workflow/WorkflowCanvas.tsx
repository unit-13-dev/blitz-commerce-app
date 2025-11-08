'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Connection,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GenAIIntentNode, RouterNode, ModuleNode, ResponseNode } from './nodes';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowNode, WorkflowEdge, ModuleType, NodeType, NodeData } from '@/app/lib/types/workflow';
import { NodeAddModal, AddableNode } from './NodeAddModal';

const nodeTypes = {
  'genai-intent': GenAIIntentNode as React.ComponentType<any>,
  router: RouterNode as React.ComponentType<any>,
  module: ModuleNode as React.ComponentType<any>,
  response: ResponseNode as React.ComponentType<any>,
};

const MODULE_DEFINITIONS: Array<{
  moduleType: ModuleType;
  label: string;
  description: string;
}> = [
  {
    moduleType: 'tracking',
    label: 'Order Tracking',
    description: 'Fetch shipment status and delivery milestones.',
  },
  {
    moduleType: 'cancellation',
    label: 'Order Cancellation',
    description: 'Validate policies and orchestrate cancellation flows.',
  },
  {
    moduleType: 'faq',
    label: 'FAQ Assistant',
    description: 'Answer common questions using your knowledge base.',
  },
  {
    moduleType: 'refund',
    label: 'Refund Processing',
    description: 'Trigger automated refunds or flag manual reviews.',
  },
];

const CORE_NODES: Array<{ id: string; type: NodeType; position: { x: number; y: number } }> = [
  {
    id: 'genai-node',
    type: 'genai-intent',
    position: { x: 200, y: 200 },
  },
  {
    id: 'router-node',
    type: 'router',
    position: { x: 600, y: 200 },
  },
  {
    id: 'response-node',
    type: 'response',
    position: { x: 1000, y: 200 },
  },
];

interface WorkflowCanvasProps {
  workflowId?: string;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  initialNodeConfigs?: Record<string, {
    genAIConfig?: any;
    routerConfig?: any;
    moduleConfig?: any;
    responseConfig?: any;
    isConfigured?: boolean;
  }>;
}

const DEFAULT_MODULE_POSITIONS: Record<ModuleType, { x: number; y: number }> = {
  tracking: { x: 600, y: 20 },
  cancellation: { x: 600, y: 380 },
  faq: { x: 820, y: 200 },
  refund: { x: 820, y: 380 },
};

export function WorkflowCanvas({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  initialNodeConfigs = {},
}: WorkflowCanvasProps) {
  // Store node configurations separately from React Flow state
  const [nodeConfigs, setNodeConfigs] = useState<Record<string, {
    genAIConfig?: any;
    routerConfig?: any;
    moduleConfig?: any;
    responseConfig?: any;
    isConfigured?: boolean;
  }>>(initialNodeConfigs);

  const convertedNodes: Node[] = useMemo(
    () =>
      initialNodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data, // Only basic data, no configs
        deletable: node.type === 'genai-intent' || node.type === 'router' ? false : true,
      })),
    [initialNodes]
  );

  const convertedEdges: Edge[] = useMemo(
    () =>
      initialEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type,
        animated: edge.animated,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      })),
    [initialEdges]
  );

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(convertedNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(convertedEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isInitialRender = useRef(true);

  const persistWorkflow = useCallback(
    async (nextNodes: Node[], nextEdges: Edge[]) => {
      if (!workflowId) return; // Don't save if no workflow ID yet
      
      // Convert React Flow nodes to WorkflowNode format (basic info only)
      const workflowNodes: WorkflowNode[] = nextNodes.map((node) => ({
        id: node.id,
        type: node.type as NodeType,
        position: node.position,
        data: node.data as NodeData, // Only basic data
      }));

      await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          nodes: workflowNodes,
          edges: nextEdges,
        }),
      });
    },
    [workflowId]
  );

  // Save node configuration separately
  const saveNodeConfig = useCallback(
    async (nodeId: string, nodeType: NodeType, config: any, isConfigured: boolean) => {
      if (!workflowId) return;

      try {
        const response = await fetch('/api/workflows/node-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowId,
            nodeId,
            nodeType,
            config,
            isConfigured,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          // If API key is invalid, the config is still saved but not configured
          // Update local state with the saved config (even if error)
          if (data.nodeConfig) {
            setNodeConfigs((prev) => ({
              ...prev,
              [nodeId]: { ...data.nodeConfig.config_data, isConfigured: data.nodeConfig.is_configured },
            }));
          }
          throw new Error(data.error || 'Failed to save node configuration');
        }

        // Update local state with saved config
        setNodeConfigs((prev) => ({
          ...prev,
          [nodeId]: { ...config, isConfigured: data.nodeConfig?.is_configured ?? isConfigured },
        }));
      } catch (error) {
        console.error('Failed to save node configuration:', error);
        throw error;
      }
    },
    [workflowId]
  );

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    persistWorkflow(nodes, edges);
  }, [nodes, edges, persistWorkflow]);

  // Sync node data with configuration status for UI display
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const config = nodeConfigs[node.id];
        if (config !== undefined) {
          return {
            ...node,
            data: {
              ...node.data,
              isConfigured: config.isConfigured ?? false,
            },
          };
        }
        return node;
      })
    );
  }, [nodeConfigs, setNodes]);

  useEffect(() => {
    setNodes((existing) => {
      const existingIds = new Set(existing.map((node) => node.id));
      const additions: Node[] = [];

      CORE_NODES.forEach((core) => {
        if (!existingIds.has(core.id)) {
          additions.push({
            id: core.id,
            type: core.type,
            position: core.position,
            data: {
              // Only basic data, no configs
              ...(core.type === 'response' ? { responseType: 'text' } : {}),
            },
            deletable: core.type === 'genai-intent' || core.type === 'router' ? false : true,
          });
        }
      });

      if (additions.length === 0) {
        return existing;
      }

      return [...existing, ...additions];
    });
  }, [setNodes]);

  const availableModules = useMemo(() => {
    const existingModuleTypes = new Set(
      nodes.filter((node) => node.type === 'module').map((node) => (node.data as NodeData).moduleType as ModuleType)
    );
    return MODULE_DEFINITIONS.map((module) => ({
      type: 'module' as const,
      moduleType: module.moduleType,
      label: module.label,
      description: module.description,
      disabled: existingModuleTypes.has(module.moduleType),
    }));
  }, [nodes]);

  const handleAddModule = useCallback(
    (moduleType: ModuleType) => {
      setNodes((current) => {
        const id = `module-${moduleType}`;
        if (current.some((node) => node.id === id)) {
          return current;
        }

        const newNode: Node = {
          id,
          type: 'module',
          position: DEFAULT_MODULE_POSITIONS[moduleType] || { x: 400, y: 200 },
          data: {
            moduleType, // Only basic info, no configs
          },
        };

        return [...current, newNode];
      });
    },
    [setNodes]
  );

  const handleDeleteModule = useCallback(
    async (nodeId: string) => {
      // Delete node configuration from database if workflow exists
      if (workflowId) {
        try {
          await fetch(`/api/workflows/node-config?workflowId=${workflowId}&nodeId=${nodeId}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Failed to delete node configuration:', error);
        }
      }

      // Remove from local state
      setNodeConfigs((prev) => {
        const updated = { ...prev };
        delete updated[nodeId];
        return updated;
      });

      // Remove from React Flow
      setNodes((current) => current.filter((node) => node.id !== nodeId));
      setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNode(null);
    },
    [setEdges, setNodes, workflowId]
  );

  const protectedCoreIds = useMemo(() => new Set(CORE_NODES.filter((node) => node.type !== 'response').map((node) => node.id)), []);

  const onNodesDelete = useCallback(
    (nodesToDelete: Node[]) => {
      const modulesToRemove = nodesToDelete.filter((node) => node.type === 'module');

      if (modulesToRemove.length > 0) {
        modulesToRemove.forEach((module) => handleDeleteModule(module.id));
      }

      const coreToRestore = nodesToDelete.filter((node) => protectedCoreIds.has(node.id));
      if (coreToRestore.length > 0) {
        setNodes((current) => {
          const existingIds = new Set(current.map((node) => node.id));
          const restored = coreToRestore
            .filter((node) => !existingIds.has(node.id))
            .map((node) => ({ ...node, selected: false, deletable: false }));
          return [...current, ...restored];
        });
      }
    },
    [handleDeleteModule, protectedCoreIds, setNodes]
  );

  const setSelectedAndOpenConfig = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const isAllowedConnection = useCallback(
    (sourceType?: string, targetType?: string) => {
      if (!sourceType || !targetType) return false;
      if (sourceType === targetType) {
        return sourceType === 'module';
      }

      const pair = `${sourceType}->${targetType}`;
      const allowedPairs = new Set([
        'genai-intent->router',
        'router->genai-intent',
        'router->module',
        'module->router',
        'module->module',
        'module->response',
        'response->module',
      ]);
      return allowedPairs.has(pair);
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);
      if (!sourceNode || !targetNode) return;
      if (!isAllowedConnection(sourceNode.type, targetNode.type)) return;

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `${connection.source}-${connection.target}-${Date.now()}`,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          },
          eds
        )
      );
    },
    [isAllowedConnection, nodes, setEdges]
  );

  const onNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChangeInternal>[0]) => {
      onNodesChangeInternal(changes);
    },
    [onNodesChangeInternal]
  );

  const onEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChangeInternal>[0]) => {
      onEdgesChangeInternal(changes);
    },
    [onEdgesChangeInternal]
  );

  const addableNodes: AddableNode[] = useMemo(() => availableModules, [availableModules]);

  const allModulesPlaced = useMemo(() => addableNodes.every((node) => node.disabled), [addableNodes]);

  return (
    <div className="relative h-full w-full bg-white text-slate-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onConnect={onConnect}
        onNodeClick={setSelectedAndOpenConfig}
        onPaneClick={clearSelection}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Backspace', 'Delete']}
        isValidConnection={(connection) => {
          const sourceNode = nodes.find((node) => node.id === connection.source);
          const targetNode = nodes.find((node) => node.id === connection.target);
          return isAllowedConnection(sourceNode?.type, targetNode?.type);
        }}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <div className="pointer-events-none absolute left-6 top-6 rounded-full bg-white/80 px-3 py-1 text-xs text-slate-500 shadow-sm">
        Tip: select an edge and press Delete/Backspace to disconnect.
      </div>

      {!allModulesPlaced && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="absolute right-6 top-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-black"
          aria-label="Add module"
        >
          <span className="text-lg leading-none">+</span>
          <span>Add Module</span>
        </button>
      )}

      <NodeAddModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        nodes={addableNodes}
        onSelect={(item) => {
          if (item.type === 'module' && !item.disabled) {
            handleAddModule(item.moduleType);
          }
          setIsModalOpen(false);
        }}
      />

      {/* Backdrop overlay when config panel is open */}
      {selectedNode && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setSelectedNode(null)}
          aria-hidden="true"
        />
      )}

      {selectedNode && (
        <NodeConfigPanel
          key={selectedNode.id}
          node={selectedNode}
          allNodes={nodes}
          nodeConfig={nodeConfigs[selectedNode.id]}
          workflowId={workflowId}
          onUpdate={async (nodeId, config, isConfigured) => {
            try {
              // Save configuration to database
              // Note: saveNodeConfig may throw if API key is invalid, but config is still saved
              await saveNodeConfig(nodeId, selectedNode.type as NodeType, config, isConfigured);
              
              // Get the actual configured status from nodeConfigs (updated by saveNodeConfig)
              // The saveNodeConfig function updates nodeConfigs with the actual isConfigured status
              const savedConfig = nodeConfigs[nodeId];
              const actualIsConfigured = savedConfig?.isConfigured ?? isConfigured;
              
              // Update node data to reflect configured status for UI display
              setNodes((current) =>
                current.map((node) =>
                  node.id === nodeId
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          isConfigured: actualIsConfigured,
                        },
                      }
                    : node
                )
              );
            } catch (error) {
              console.error('Failed to save node configuration:', error);
              // Still update node to reflect saved state (even if not configured due to invalid API key)
              // The saveNodeConfig function has already updated nodeConfigs
              const savedConfig = nodeConfigs[nodeId];
              if (savedConfig) {
                setNodes((current) =>
                  current.map((node) =>
                    node.id === nodeId
                      ? {
                          ...node,
                          data: {
                            ...node.data,
                            isConfigured: savedConfig.isConfigured ?? false,
                          },
                        }
                      : node
                  )
                );
              }
              throw error; // Re-throw to let NodeConfigPanel handle it
            }
          }}
          onDelete={selectedNode.type === 'module' ? handleDeleteModule : undefined}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

