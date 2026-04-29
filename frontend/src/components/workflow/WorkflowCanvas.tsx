import React, { useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import { Workflow } from '@/types';
import { generateWorkflowNodes } from '@/utils/workflowHelpers';
import { useWorkflowStageStore } from '@/store/workflowStageStore';
import { getCompletedStages } from '@/services/workflowStageService';
import 'reactflow/dist/style.css';

interface WorkflowCanvasProps {
  workflow: Workflow;
  executionMode: 'quick' | 'full';
  onExecutionModeChange: (mode: 'quick' | 'full') => void;
  onExecute: () => void;
  renderProgressOnly?: boolean;
}

const WorkflowCanvasComponent: React.FC<WorkflowCanvasProps> = ({
  workflow,
  executionMode,
  onExecutionModeChange,
  onExecute,
  renderProgressOnly = false,
}) => {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  console.log('WorkflowCanvas render - workflow:', {
    id: workflow.id,
    type: workflow.workflow_type,
    name: workflow.workflow_name,
    expandedStage
  });

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => generateWorkflowNodes(workflow, expandedStage),
    [workflow.id, workflow.workflow_type, expandedStage]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const {
    currentStage,
    isLoadingStage,
    fetchCurrentStage,
    clearStageData,
  } = useWorkflowStageStore();

  const hasStageSupport = workflow.current_stage !== undefined;
  const completedStages = hasStageSupport ? getCompletedStages(workflow) : [];

  useEffect(() => {
    if (hasStageSupport && workflow.id) {
      fetchCurrentStage(workflow.id);
    }

    return () => {
      clearStageData();
    };
  }, [workflow.id, hasStageSupport]);

  // Update nodes and edges when workflow or expanded stage changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = generateWorkflowNodes(workflow, expandedStage);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [workflow.id, workflow.workflow_type, expandedStage, setNodes, setEdges]);

  const onConnect = React.useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node clicks - expand stage details when stage nodes are clicked
  const onNodeClick = React.useCallback((event: React.MouseEvent, node: any) => {
    console.log('Node clicked:', node.id);
    // Check if it's a stage indicator node
    if (node.id.startsWith('stage-')) {
      const stageIndexMap: Record<string, number> = {
        'stage-1': 0,
        'stage-2': 1,
        'stage-3': 2,
      };

      const stageIndex = stageIndexMap[node.id];
      console.log('Stage clicked, index:', stageIndex);
      if (stageIndex !== undefined) {
        // Toggle: if already expanded, collapse; otherwise expand
        setExpandedStage((prev) => {
          const newState = prev === stageIndex ? null : stageIndex;
          console.log('Setting expandedStage from', prev, 'to', newState);
          return newState;
        });
      }
    }
  }, []);

  // If rendering progress only, return just the progress section (compact version)
  if (renderProgressOnly) {
    if (!hasStageSupport || isLoadingStage) {
      return null;
    }

    const getStageColor = (stage: string) => {
      if (completedStages.includes(stage)) return { bg: '#dcfce7', border: '#86efac', text: '#166534' };
      if (stage === workflow.current_stage) return { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' };
      return { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b' };
    };

    const stages = [
      { key: 'business_analyst', label: 'BA' },
      { key: 'developer', label: 'Dev' },
      { key: 'reviewer', label: 'Review' },
    ];

    return (
      <div>
        {/* Compact Stage Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {stages.map((stage, idx) => {
            const colors = getStageColor(stage.key);
            const isCompleted = completedStages.includes(stage.key);
            const isCurrent = stage.key === workflow.current_stage;

            return (
              <React.Fragment key={stage.key}>
                <div style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  background: colors.bg,
                  border: `1.5px solid ${colors.border}`,
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}>
                  {isCompleted && (
                    <svg style={{ width: '14px', height: '14px', color: colors.text }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isCurrent && !isCompleted && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: colors.text,
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.6875rem',
                      fontWeight: '600',
                      color: colors.text,
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {stage.label}
                    </p>
                  </div>
                </div>
                {idx < stages.length - 1 && (
                  <svg style={{ width: '12px', height: '12px', color: '#94a3b8', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Current Stage Stats Grid */}
        {currentStage && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {/* Steps Progress */}
            <div style={{
              padding: '0.625rem',
              background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
              borderRadius: '0.375rem',
              border: '1px solid #93c5fd'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                <svg style={{ width: '12px', height: '12px', color: '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p style={{ fontSize: '0.625rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>Steps</p>
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1e3a8a', margin: 0 }}>
                {currentStage.stage_progress?.completed || 0}/{currentStage.stage_progress?.total || 0}
              </p>
            </div>

            {/* Completion % */}
            <div style={{
              padding: '0.625rem',
              background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
              borderRadius: '0.375rem',
              border: '1px solid #86efac'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                <svg style={{ width: '12px', height: '12px', color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p style={{ fontSize: '0.625rem', fontWeight: '600', color: '#166534', margin: 0 }}>Progress</p>
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#15803d', margin: 0 }}>
                {Math.round(((currentStage.stage_progress?.completed || 0) / (currentStage.stage_progress?.total || 1)) * 100)}%
              </p>
            </div>

            {/* Status */}
            <div style={{
              padding: '0.625rem',
              background: workflow.stage_status === 'in_progress'
                ? 'linear-gradient(135deg, #fef3c7 0%, #fefce8 100%)'
                : 'linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)',
              borderRadius: '0.375rem',
              border: workflow.stage_status === 'in_progress' ? '1px solid #fcd34d' : '1px solid #d1d5db'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                <svg style={{ width: '12px', height: '12px', color: workflow.stage_status === 'in_progress' ? '#d97706' : '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ fontSize: '0.625rem', fontWeight: '600', color: workflow.stage_status === 'in_progress' ? '#92400e' : '#4b5563', margin: 0 }}>Status</p>
              </div>
              <p style={{ fontSize: '0.65rem', fontWeight: '700', color: workflow.stage_status === 'in_progress' ? '#78350f' : '#374151', margin: 0, textTransform: 'capitalize' }}>
                {(workflow.stage_status || 'pending').replace('_', ' ')}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        key={`${workflow.id}-${workflow.workflow_type}`}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 1.5,
        }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="#cbd5e1"
          gap={20}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.id === 'supervisor') return '#f59e0b';
            if (node.id.includes('supervisor-')) return '#8b5cf6';
            if (node.id.includes('agent-')) return '#3b82f6';
            return '#e5e7eb';
          }}
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          maskColor="rgba(0, 0, 0, 0.05)"
        />
        <Panel position="top-left" style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          }} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
            {workflow.workflow_name}
          </span>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px',
            background: '#f1f5f9',
            color: '#64748b',
            fontWeight: '500',
          }}>
            {workflow.workflow_type === 'business_analyst' ? 'BA' :
             workflow.workflow_type === 'developer' ? 'Developer' :
             workflow.workflow_type === 'reviewer' ? 'Reviewer' :
             workflow.workflow_type === 'complete' ? 'Complete Pipeline' : workflow.workflow_type}
          </span>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// Memoized export to prevent unnecessary re-renders
// Only re-render if workflow ID, type, or execution mode changes
export const WorkflowCanvas = React.memo(WorkflowCanvasComponent, (prevProps, nextProps) => {
  return (
    prevProps.workflow.id === nextProps.workflow.id &&
    prevProps.workflow.workflow_type === nextProps.workflow.workflow_type &&
    prevProps.workflow.current_stage === nextProps.workflow.current_stage &&
    prevProps.workflow.stage_status === nextProps.workflow.stage_status &&
    prevProps.executionMode === nextProps.executionMode &&
    prevProps.renderProgressOnly === nextProps.renderProgressOnly
  );
});
