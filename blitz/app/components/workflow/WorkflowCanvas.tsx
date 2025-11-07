'use client';

import React, { useCallback, useMemo, useState } from 'react';
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
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GenAIIntentNode, RouterNode, ModuleNode, ResponseNode } from './nodes';
import { ModulePalette } from './ModulePalette';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowNode, WorkflowEdge, ModuleType, NodeType } from '@/app/lib/types/workflow';

const nodeTypes = {
  'genai-intent': GenAIIntentNode,
  router: RouterNode,
  module: ModuleNode,
  response: ResponseNode,
} as const;

interface WorkflowCanvasProps {
  workflowId?: string;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
}

export function WorkflowCanvas({
  workflowId,
  initialNodes = [],
  initialEdges = [],
}: WorkflowCanvasProps) {
  const [activeWorkflowId, setActiveWorkflowId] = useState(workflowId);
  const convertedNodes: Node[] = useMemo(
    () =>
      initialNodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
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
      })),
    [initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(convertedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertedEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isValidConnection = useCallback(
    (connection: Connection | Edge): boolean => {
      const conn = connection as Connection;
      if (!conn.source || !conn.target) return false;

      const sourceNode = nodes.find((n) => n.id === conn.source);
      const targetNode = nodes.find((n) => n.id === conn.target);

      if (!sourceNode || !targetNode) return false;

      if (sourceNode.type === 'genai-intent') {
        return targetNode.type === 'router';
      }

      if (sourceNode.type === 'router') {
        return targetNode.type === 'module';
      }

      if (sourceNode.type === 'module') {
        return targetNode.type === 'module' || targetNode.type === 'response';
      }

      if (sourceNode.type === 'response') {
        return false;
      }

      return true;
    },
    [nodes]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (isValidConnection(params)) {
        setEdges((eds) => addEdge(params, eds));
      }
    },
    [isValidConnection, setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: activeWorkflowId,
          nodes,
          edges,
        }),
      });

      if (!response.ok) {
        const errorPayload: { error?: string } = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || 'Failed to save workflow');
      }

      const payload: { workflow?: { id?: string } } = await response.json();
      if (payload.workflow?.id) {
        setActiveWorkflowId(payload.workflow.id);
      }

      setSaveMessage('Workflow saved successfully');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }, [activeWorkflowId, nodes, edges]);

  const handleAddNode = useCallback(
    (nodeType: NodeType, moduleType?: ModuleType) => {
      const baseNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 400 + 100,
        },
        data: {},
      };

      if (nodeType === 'module' && moduleType) {
        baseNode.data = {
          moduleType,
          moduleConfig: {
            moduleType,
            apiConfigs: {},
          },
          isConfigured: false,
        };
      } else if (nodeType === 'genai-intent') {
        baseNode.data = {
          genAIConfig: {
            model: 'gpt-4',
            temperature: 0.3,
          },
          isConfigured: false,
        };
      } else if (nodeType === 'router') {
        baseNode.data = {
          routerConfig: {
            intentMappings: {},
          },
          isConfigured: false,
        };
      } else if (nodeType === 'response') {
        baseNode.data = {
          responseType: 'text',
        };
      }

      setNodes((nds) => [...nds, baseNode]);
      setSaveMessage(null);
      setSaveError(null);
    },
    [setNodes]
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<Node['data']>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: { ...node.data, ...updates, isConfigured: true },
              }
            : node
        )
      );
      setSaveMessage(null);
      setSaveError(null);
    },
    [setNodes]
  );

  return (
    <div className="flex h-full w-full bg-white text-slate-900">
      <ModulePalette onAddNode={handleAddNode} />

      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          isValidConnection={isValidConnection}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />

          <Panel position="top-right" className="space-y-2 rounded-lg bg-white p-3 shadow">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-700/60"
            >
              {isSaving ? 'Saving…' : 'Save Workflow'}
            </button>
            {saveMessage && (
              <p className="text-xs text-emerald-600">{saveMessage}</p>
            )}
            {saveError && <p className="text-xs text-rose-600">{saveError}</p>}
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeConfigPanel
          key={selectedNode.id}
          node={selectedNode}
          allNodes={nodes}
          onUpdate={handleUpdateNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

