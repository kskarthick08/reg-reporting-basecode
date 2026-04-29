import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { graphService } from '@/services/graphService';
import '@/components/css/GraphRAGPage.css';
import dagre from 'dagre';

// Node type colors with gradient
const nodeColors = {
  regulation: { main: '#8b5cf6', light: '#a78bfa', shadow: 'rgba(139, 92, 246, 0.3)' },
  metric: { main: '#10b981', light: '#34d399', shadow: 'rgba(16, 185, 129, 0.3)' },
  data_attribute: { main: '#f59e0b', light: '#fbbf24', shadow: 'rgba(245, 158, 11, 0.3)' },
  default: { main: '#6b7280', light: '#9ca3af', shadow: 'rgba(107, 114, 128, 0.3)' },
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 150, nodesep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 100, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 50,
        y: nodeWithPosition.y - 50,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export const GraphRAGPage = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    initializeGraph();
  }, []);

  useEffect(() => {
    // Auto-refresh graph every 30 seconds to catch new vectorizations
    const interval = setInterval(() => {
      initializeGraph();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const initializeGraph = async () => {
    setLoading(true);
    try {
      const graphData = await graphService.getGraphData();
      setLastRefresh(new Date());

      // Convert graph data to ReactFlow format
      const flowNodes: Node[] = (graphData.nodes || []).map((node) => {
        const type = node.type || 'default';
        const colorScheme = nodeColors[type as keyof typeof nodeColors] || nodeColors.default;

        return {
          id: node.id,
          type: 'default',
          position: { x: 0, y: 0 }, // Will be set by dagre layout
          data: {
            ...node
          },
          style: {
            background: `radial-gradient(circle, ${colorScheme.light} 0%, ${colorScheme.main} 100%)`,
            color: '#fff',
            border: '3px solid #fff',
            borderRadius: '50%',
            padding: '10px',
            fontSize: '10px',
            fontWeight: 600,
            width: 100,
            height: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            lineHeight: '1.2',
            boxShadow: `0 4px 20px ${colorScheme.shadow}, 0 0 0 8px rgba(255, 255, 255, 0.1)`,
            transition: 'all 0.3s ease',
          },
        };
      });

      const flowEdges: Edge[] = (graphData.edges || []).map((edge, index) => ({
        id: `e${index}-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: edge.type || '',
        type: 'default',
        animated: true,
        style: {
          stroke: '#94a3b8',
          strokeWidth: 2.5,
        },
        labelStyle: {
          fontSize: 10,
          fontWeight: 500,
          fill: '#475569',
          background: '#fff',
          padding: 4,
          borderRadius: 4,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#94a3b8',
          width: 20,
          height: 20,
        },
      }));

      // Apply dagre layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.error('Failed to load graph:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    initializeGraph();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const results = await graphService.searchNodes(searchQuery);
      if (results.length > 0) {
        // Highlight matching nodes by changing their style
        setNodes((nds) =>
          nds.map((node) => {
            const isMatch = results.some((r) => r.id === node.id);
            const type = node.data?.type || 'default';
            const colorScheme = nodeColors[type as keyof typeof nodeColors] || nodeColors.default;

            return {
              ...node,
              style: {
                ...node.style,
                border: isMatch ? '4px solid #ef4444' : '3px solid #fff',
                boxShadow: isMatch
                  ? '0 0 30px rgba(239, 68, 68, 0.8), 0 0 0 12px rgba(239, 68, 68, 0.2)'
                  : `0 4px 20px ${colorScheme.shadow}, 0 0 0 8px rgba(255, 255, 255, 0.1)`,
                transform: isMatch ? 'scale(1.15)' : 'scale(1)',
              },
            };
          })
        );
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const onNodeClick = useCallback(async (_event: React.MouseEvent, node: Node) => {
    try {
      const nodeData = await graphService.getNodeDetails(node.id);
      setSelectedNode(nodeData);
    } catch (error) {
      console.error('Failed to load node details:', error);
    }
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="graph-page-container">
      <div className="graph-header-section">
        <div>
          <h1 className="graph-main-title">Graph RAG Visualization</h1>
          <p className="graph-subtitle">Explore knowledge graph relationships and entities</p>
        </div>
        <div className="graph-header-actions">
          <span className="graph-last-updated">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="graph-refresh-btn graph-refresh-btn-styled"
          >
            <svg
              className={loading ? 'graph-icon-spinning' : 'graph-icon-sm'}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh Graph'}
          </Button>
        </div>
      </div>

      <div className="graph-search-section">
        <Input
          type="text"
          placeholder="Search nodes in the graph..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="graph-search-input"
        />
        <Button onClick={handleSearch} className="graph-search-btn">
          <svg className="graph-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </Button>
      </div>

      <div className="graph-content-layout">
        <Card className="graph-visualization-card">
          <CardContent className="graph-canvas-container">
            {nodes.length === 0 && !loading ? (
              <div className="graph-empty-state">
                <svg
                  className="graph-empty-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <h3 className="graph-empty-title">
                    No Graph Data Available
                  </h3>
                  <p className="graph-empty-description">
                    The knowledge graph is empty. Please upload and vectorize documents first to generate the graph visualization.
                  </p>
                  <p className="graph-empty-hint">
                    Go to <strong>Documents</strong> → Upload files → Click <strong>Vectorize</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="graph-canvas">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  fitView
                  fitViewOptions={{ padding: 0.3 }}
                  attributionPosition="bottom-left"
                  minZoom={0.1}
                  maxZoom={2}
                  defaultEdgeOptions={{
                    animated: true,
                    style: { strokeWidth: 2.5 },
                  }}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="#cbd5e1"
                    className="graph-background-gradient"
                  />
                  <Controls
                    showZoom
                    showFitView
                    showInteractive
                    className="graph-controls-styled"
                  />
                  <MiniMap
                    nodeColor={(node) => {
                      const type = node.data?.type || 'default';
                      const colorScheme = nodeColors[type as keyof typeof nodeColors] || nodeColors.default;
                      return colorScheme.main;
                    }}
                    nodeStrokeWidth={3}
                    maskColor="rgba(100, 116, 139, 0.15)"
                    className="graph-minimap-styled"
                  />
                </ReactFlow>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedNode && (
          <Card className="graph-details-panel">
            <CardContent className="graph-details-content">
              <div className="graph-details-header">
                <h3 className="graph-details-title">Node Details</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="graph-close-btn"
                >
                  <svg className="graph-icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="graph-node-type-badge-wrapper">
                <span className={`graph-node-type-badge graph-type-${selectedNode.type}`}>
                  {selectedNode.type}
                </span>
              </div>

              <div className="graph-node-label">
                <svg className="graph-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{selectedNode.label}</span>
              </div>

              {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                <div className="graph-properties-section">
                  <h4 className="graph-properties-title">Properties</h4>
                  <div className="graph-properties-list">
                    {Object.entries(selectedNode.properties).map(([key, value]) => (
                      <div key={key} className="graph-property-item">
                        <span className="graph-property-key">{key}:</span>
                        <span className="graph-property-value">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="graph-legend-card">
        <CardContent className="graph-legend-content">
          <h3 className="graph-legend-title">
            <svg className="graph-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Legend
          </h3>
          <div className="graph-legend-items">
            <div className="graph-legend-item">
              <div className="graph-legend-color graph-color-regulation"></div>
              <span className="graph-legend-label">Regulation</span>
            </div>
            <div className="graph-legend-item">
              <div className="graph-legend-color graph-color-metric"></div>
              <span className="graph-legend-label">Metric</span>
            </div>
            <div className="graph-legend-item">
              <div className="graph-legend-color graph-color-attribute"></div>
              <span className="graph-legend-label">Data Attribute</span>
            </div>
            <div className="graph-legend-item">
              <div className="graph-legend-color graph-color-other"></div>
              <span className="graph-legend-label">Other</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
