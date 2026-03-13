'use client';

import React, { useState, useRef } from 'react';
import { ReactFlow, Node, Edge, NodeMouseHandler, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCompletion } from '@ai-sdk/react';
import { MemoizedMarkdown } from './components/memoized-markdown';
import { CheckingQuestion } from './components/checking-question';
import { FlowchartChat } from './components/flowchart-chat';
import { MessageCircle } from 'lucide-react';

const STYLES = {
    node: {
        default: { backgroundColor: '#ffffff', border: '1px solid #d1d5db' },
        done: { backgroundColor: '#dcfce7', border: '2px solid #22c55e' },
        selected: { backgroundColor: '#fecaca', border: '2px solid #ef4444' },
        doneSelected: { background: 'linear-gradient(135deg, #fecaca 0%, #dcfce7 100%)', border: '2px solid #ef4444' }
    },
    edge: {
        default: { stroke: '#b1b1b7', strokeWidth: 1, strokeDasharray: 'none' },
        incoming: { stroke: '#2563eb', strokeWidth: 3, strokeDasharray: 'none' },
        outgoing: { stroke: '#dc2626', strokeWidth: 3, strokeDasharray: 'none' }
    },
    button: 'px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95'
};

const getNodeStyle = (isDone: boolean, isSelected: boolean) => ({
    ...(isDone && isSelected ? STYLES.node.doneSelected : isDone ? STYLES.node.done : isSelected ? STYLES.node.selected : STYLES.node.default),
    boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
});

const getEdgeStyle = (isIncoming: boolean, isOutgoing: boolean) => 
    isIncoming ? STYLES.edge.incoming : isOutgoing ? STYLES.edge.outgoing : STYLES.edge.default;

type RawNode = {
    id: string;
    position: { x: number; y: number };
    data: { label: string };
};

type RawEdge = { id: string; source: string; target: string };

type RawFlowchart = { nodes: RawNode[]; edges: RawEdge[] };

const LAYER_Y = [40, 140, 260, 380, 500];

function sanitizeLabel(indexOneBased: number, label: string): string {
    const trimmed = (label || '').trim();
    const hasNumericPrefix = /^\d+\./.test(trimmed);
    const base = hasNumericPrefix ? trimmed.replace(/^\d+\.\s*/, '') : trimmed;
    return `${indexOneBased}. ${base}`;
}

function validateAndLayoutFlowchart(raw: RawFlowchart): { nodes: Node[]; edges: Edge[] } {
    const idToNode: Map<string, RawNode> = new Map();
    for (const n of raw.nodes || []) idToNode.set(n.id, n);

    const validEdges: RawEdge[] = [];
    const outAdj: Map<string, string[]> = new Map();
    const inAdj: Map<string, string[]> = new Map();
    for (const e of raw.edges || []) {
        if (!idToNode.has(e.source) || !idToNode.has(e.target)) continue;
        validEdges.push(e);
        if (!outAdj.has(e.source)) outAdj.set(e.source, []);
        if (!inAdj.has(e.target)) inAdj.set(e.target, []);
        outAdj.get(e.source)!.push(e.target);
        inAdj.get(e.target)!.push(e.source);
    }

    const allIds = Array.from(idToNode.keys());
    if (allIds.length === 0) return { nodes: [], edges: [] };

    // Choose a single root: smallest indegree or fallback to first
    let rootId = allIds[0];
    let minIndegree = Infinity;
    for (const id of allIds) {
        const indeg = (inAdj.get(id) || []).length;
        if (indeg < minIndegree) {
            minIndegree = indeg;
            rootId = id;
        }
    }

    // Kahn's algorithm (restricted to nodes reachable from root)
    const indegree: Map<string, number> = new Map();
    const reachable: Set<string> = new Set();
    // BFS to mark reachable
    const queue: string[] = [rootId];
    reachable.add(rootId);
    while (queue.length) {
        const cur = queue.shift()!;
        for (const nxt of outAdj.get(cur) || []) {
            if (!reachable.has(nxt)) {
                reachable.add(nxt);
                queue.push(nxt);
            }
        }
    }

    const rIds = Array.from(reachable);
    for (const id of rIds) indegree.set(id, 0);
    for (const e of validEdges) {
        if (!reachable.has(e.source) || !reachable.has(e.target)) continue;
        indegree.set(e.target, (indegree.get(e.target) || 0) + 1);
    }

    const topo: string[] = [];
    const q: string[] = rIds.filter(id => (indegree.get(id) || 0) === 0);
    while (q.length) {
        const u = q.shift()!;
        topo.push(u);
        for (const v of outAdj.get(u) || []) {
            if (!reachable.has(v)) continue;
            indegree.set(v, (indegree.get(v) || 0) - 1);
            if ((indegree.get(v) || 0) === 0) q.push(v);
        }
    }
    // If cycle prevented full ordering, append remaining reachable nodes deterministically
    if (topo.length < rIds.length) {
        for (const id of rIds) if (!topo.includes(id)) topo.push(id);
    }

    // Layer assignment via BFS levels from root (on reachable subgraph)
    const layerOf: Map<string, number> = new Map();
    for (const id of rIds) layerOf.set(id, Infinity);
    layerOf.set(rootId, 0);
    const lq: string[] = [rootId];
    while (lq.length) {
        const u = lq.shift()!;
        const lu = layerOf.get(u)!;
        for (const v of outAdj.get(u) || []) {
            if (!reachable.has(v)) continue;
            if (layerOf.get(v)! > lu + 1) {
                layerOf.set(v, lu + 1);
                lq.push(v);
            }
        }
    }

    // Normalize layers into at most 5 buckets
    const usedLayers = Array.from(new Set(Array.from(layerOf.values()).filter(v => isFinite(v)))).sort((a,b)=>a-b);
    const maxBuckets = 5;
    const remap: Map<number, number> = new Map();
    if (usedLayers.length <= maxBuckets) {
        usedLayers.forEach((lvl, idx) => remap.set(lvl, Math.min(idx, maxBuckets - 1)));
    } else {
        // Quantize to 5 buckets
        usedLayers.forEach((lvl, idx) => {
            const bucket = Math.floor((idx / (usedLayers.length - 1)) * (maxBuckets - 1));
            remap.set(lvl, bucket);
        });
    }

    const layers: Map<number, string[]> = new Map();
    for (const id of topo) {
        const lvl = remap.get(layerOf.get(id) || 0) || 0;
        if (!layers.has(lvl)) layers.set(lvl, []);
        layers.get(lvl)!.push(id);
    }

    // Renumber nodes to n1..nK in topological order
    const oldToNewId: Map<string, string> = new Map();
    topo.forEach((oldId, i) => oldToNewId.set(oldId, `n${i + 1}`));

    // Assign positions with even horizontal spacing per layer
    const newNodes: Node[] = [];
    const minX = 40, maxX = 760;
    for (const [lvl, nodeIds] of Array.from(layers.entries()).sort((a,b)=>a[0]-b[0])) {
        const y = LAYER_Y[Math.min(lvl, LAYER_Y.length - 1)];
        const count = nodeIds.length;
        if (count === 1) {
            const id = nodeIds[0];
            const newId = oldToNewId.get(id)!;
            const label = sanitizeLabel(newNodes.length + 1, idToNode.get(id)!.data.label);
            newNodes.push({ id: newId, position: { x: (minX + maxX) / 2, y }, data: { label }, style: STYLES.node.default });
        } else {
            const step = (maxX - minX) / (count - 1);
            nodeIds.forEach((id, idx) => {
                const newId = oldToNewId.get(id)!;
                const label = sanitizeLabel(newNodes.length + 1, idToNode.get(id)!.data.label);
                const x = Math.round(minX + step * idx);
                newNodes.push({ id: newId, position: { x, y }, data: { label }, style: STYLES.node.default });
            });
        }
    }

    // Build edges only to adjacent layers and update ids
    const newEdges: Edge[] = [];
    for (const e of validEdges) {
        if (!reachable.has(e.source) || !reachable.has(e.target)) continue;
        const ls = remap.get(layerOf.get(e.source) || 0) || 0;
        const lt = remap.get(layerOf.get(e.target) || 0) || 0;
        if (lt !== ls + 1) continue;
        const s = oldToNewId.get(e.source)!;
        const t = oldToNewId.get(e.target)!;
        const id = `${s}->${t}`;
        newEdges.push({ id, source: s, target: t, style: STYLES.edge.default });
    }

    // Ensure exactly one terminal: keep nodes with no outgoing; if multiple, prefer the deepest/newest
    const outCount: Map<string, number> = new Map(newNodes.map(n => [n.id, 0]));
    for (const e of newEdges) outCount.set(e.source, (outCount.get(e.source) || 0) + 1);
    const terminals = newNodes.filter(n => (outCount.get(n.id) || 0) === 0);
    if (terminals.length > 1) {
        // Connect earlier terminals to the final terminal to maintain single exit
        const finalTerminal = terminals[terminals.length - 1];
        for (let i = 0; i < terminals.length - 1; i++) {
            const candidate = terminals[i];
            const yFinal = finalTerminal.position.y;
            const yCandidate = candidate.position.y;
            if (yCandidate >= yFinal) continue;
            newEdges.push({ id: `${candidate.id}->${finalTerminal.id}`, source: candidate.id, target: finalTerminal.id, style: STYLES.edge.default });
        }
    }

    return { nodes: newNodes, edges: newEdges };
}

export default function HomePage() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [doneNodes, setDoneNodes] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'details' | 'chat'>('details');
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

    const { completion, complete, isLoading: isLoadingDetails, setCompletion: setCompletionDetails, stop: stopDetailsGeneration } = useCompletion({
        api: '/api/flowchart/node-details',
        streamProtocol: 'text',
        onFinish: () => console.log('Node details streaming completed'),
        onError: (error) => {
            console.error('Error streaming node details:', error);
            alert('Failed to fetch node details. Please try again.');
        }
    });

    const updateStyles = (selectedId: string | null) => {
        setNodes(prev => prev.map(n => ({ ...n, style: getNodeStyle(doneNodes.has(n.id), n.id === selectedId) })));
        setEdges(prev => prev.map(edge => ({ ...edge, style: getEdgeStyle(edge.target === selectedId, edge.source === selectedId) })));
    };

    const generateFlowchart = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/flowchart', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to generate flowchart');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            let result = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                result += new TextDecoder().decode(value);
            }

            const flowchart = JSON.parse(result) as RawFlowchart;
            const sanitized = validateAndLayoutFlowchart(flowchart);
            setNodes(sanitized.nodes);
            setEdges(sanitized.edges);
            setSelectedNode(null);
            setDoneNodes(new Set());
            setCompletionDetails('');
            setViewMode('details');
            
            setTimeout(() => {
                reactFlowInstance.current?.fitView({ padding: 0.1, includeHiddenNodes: false });
            }, 100);
        } catch (error) {
            console.error('Error generating flowchart:', error);
            alert('Failed to generate flowchart. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const onNodeClick: NodeMouseHandler = (event, node) => {
        stopDetailsGeneration();
        setCompletionDetails('');
        setSelectedNode(node);
        setViewMode('details');
        updateStyles(node.id);
    };

    const markAsDone = () => {
        if (!selectedNode) return;
        setDoneNodes(prev => new Set([...prev, selectedNode.id]));
        updateStyles(selectedNode.id);
        setNodes(prev => prev.map(n => 
            n.id === selectedNode.id 
                ? { ...n, style: getNodeStyle(true, true) }
                : n
        ));
    };

    const generateNodeDetails = () => {
        const nodeName = (selectedNode?.data as { label?: string })?.label || selectedNode?.id;
        complete('', { body: { nodeName } });
    };

    const handleChatClick = () => {
        if (!selectedNode) {
            alert('Please select a node first to chat about it.');
            return;
        }
        setViewMode('chat');
    };

    const nodeName = selectedNode ? (selectedNode.data as { label?: string })?.label || selectedNode.id : 'ADHD-friendly Interactive Mind Map Demo';

    return (
        <div className='w-full h-screen bg-stone-50 flex'>
            <div className='w-1/2 h-screen bg-gradient-to-br from-blue-100 to-red-100 p-4 flex flex-col'>
                <div className='mb-4 space-y-2 flex-shrink-0'>
                    <div>Sample learning material uploaded.</div>
                    <button onClick={generateFlowchart} disabled={isGenerating} className={STYLES.button}>
                        {isGenerating ? 'Generating...' : 'Generate Interactive Mind Map'}
                    </button>
                </div>
                <div className='flex-1 min-h-0'>
                    <ReactFlow 
                        nodes={nodes} 
                        edges={edges} 
                        onNodeClick={onNodeClick}
                        onInit={(instance) => { reactFlowInstance.current = instance; }}
                    />
                </div>
            </div>
            
            <div className='w-1/2 h-screen bg-white border-l border-gray-200 flex flex-col overflow-hidden'>
                <div className='p-6 border-b border-gray-200 flex-shrink-0'>
                    <div className='flex justify-between items-center'>
                        <div>
                            <h2 className='text-4xl font-bold text-gray-800'>{nodeName}</h2>
                            <p className='text-md text-gray-500 mt-1'>
                                {selectedNode ? 'Click on any node in the flowchart to view its details' : 'Select a node to view details or chat about it'}
                            </p>
                        </div>
                        {selectedNode && (
                            <div className='flex space-x-3'>
                                <button
                                    onClick={() => setViewMode('details')}
                                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                                        viewMode === 'details' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md'
                                    }`}
                                >
                                    Details
                                </button>
                                <button
                                    onClick={handleChatClick}
                                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 shadow-lg ${
                                        viewMode === 'chat' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    <span>Chat</span>
                                </button>
                                <button
                                    onClick={markAsDone}
                                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
                                >
                                    Mark as Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className='flex-1 overflow-y-auto'>
					{selectedNode ? (
						<div className='h-full'>
							<div className={viewMode === 'details' ? '' : 'hidden'}>
								<div className='p-6 space-y-4'>
									<div className='space-y-4 space-x-4'>
										<button onClick={generateNodeDetails} disabled={isLoadingDetails} className={STYLES.button}>
											{isLoadingDetails ? 'Generating...' : 'Extract Node Details'}
										</button>
										{completion && <CheckingQuestion nodeName={nodeName} nodeDetails={completion} />}
									</div>
									<div className='pt-4'>
										{isLoadingDetails && <div className='mb-4 text-sm text-gray-600'>Loading node details...</div>}
										{completion && (
											<div className='mt-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4'>
												<MemoizedMarkdown content={completion} id={`node-${selectedNode.id}-details`} />
											</div>
										)}
									</div>
								</div>
							</div>
							<div className={viewMode === 'chat' ? 'h-full' : 'hidden h-full'}>
								<FlowchartChat
									nodeName={nodeName}
									nodeDetails={completion}
									isOpen={viewMode === 'chat'}
									onClose={() => setViewMode('details')}
								/>
							</div>
						</div>
					) : (
                        <div className='flex items-center justify-center h-full'>
                            <div className='text-center text-gray-500'>
                                <div className='text-6xl mb-4'>📊</div>
                                <h3 className='text-xl font-medium mb-2'>No Node Selected</h3>
                                <p className='text-sm'>Click on any node in the flowchart to view its details or chat about it</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


