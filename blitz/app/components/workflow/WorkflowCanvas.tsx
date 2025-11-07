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
import { WorkflowNode, WorkflowEdge } from '@/app/lib/types/workflow';

const nodeTypes = {
  'genai-intent': GenAIIntentNode,
  'router': RouterNode,
  'module': ModuleNode,
  'response': ResponseNode,
};

interface WorkflowCanvasProps {
  workflowId?: string;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

export function WorkflowCanvas({ 
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave 
}: WorkflowCanvasProps) {
  // Convert WorkflowNode[] to React Flow Node[]
  const convertedNodes: Node[] = useMemo(() => 
    initialNodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })), [initialNodes]
  );

  // Convert WorkflowEdge[] to React Flow Edge[]
  const convertedEdges: Edge[] = useMemo(() => 
    initialEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      animated: edge.animated,
    })), [initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(convertedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertedEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Connection validation
  const isValidConnection = useCallback((connection: Connection | Edge): boolean => {
    const conn = connection as Connection;
    if (!conn.source || !conn.target) return false;

    const sourceNode = nodes.find(n => n.id === conn.source);
    const targetNode = nodes.find(n => n.id === conn.target);

    if (!sourceNode || !targetNode) return false;

    // GenAI Intent Node can only connect to Router Node
    if (sourceNode.type === 'genai-intent') {
      return targetNode.type === 'router';
    }

    // Router Node can only connect to Module Nodes
    if (sourceNode.type === 'router') {
      return targetNode.type === 'module';
    }

    // Module Nodes can connect to other Module Nodes or Response Nodes
    if (sourceNode.type === 'module') {
      return targetNode.type === 'module' || targetNode.type === 'response';
    }

    // Response Nodes cannot have outgoing connections
    if (sourceNode.type === 'response') {
      return false;
    }

    return true;
  }, [nodes]);

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

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
    }
  }, [nodes, edges, onSave]);

  const handleAddNode = useCallback((nodeType: string, moduleType?: string) => {
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType as any,
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
      data: {
        ...(nodeType === 'module' && moduleType ? {
          moduleType: moduleType as any,
          moduleConfig: {
            moduleType: moduleType as any,
            apiConfigs: {},
          },
          isConfigured: false,
        } : {}),
        ...(nodeType === 'genai-intent' ? {
          genAIConfig: {
            model: 'gpt-4',
            temperature: 0.3,
          },
          isConfigured: false,
        } : {}),
        ...(nodeType === 'router' ? {
          routerConfig: {
            intentMappings: {},
          },
          isConfigured: false,
        } : {}),
        ...(nodeType === 'response' ? {
          responseType: 'text',
        } : {}),
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<Node['data']>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [setNodes]);

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Module Palette */}
      <ModulePalette onAddNode={handleAddNode} />
      
      {/* Main Canvas */}
      <div className="flex-1 relative">
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
          
          <Panel position="top-right" className="bg-white p-2 rounded shadow-lg">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Workflow
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Configuration Panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          allNodes={nodes}
          onUpdate={handleUpdateNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

