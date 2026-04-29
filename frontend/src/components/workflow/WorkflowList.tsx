import React, { useMemo, useCallback } from 'react';
import { Workflow } from '@/types';
import { getWorkflowTypeBadgeColor, getWorkflowStatusColor, formatWorkflowTypeDisplay } from '@/utils/workflowHelpers';
import { getStageDisplayName, getCompletedStages } from '@/services/workflowStageService';

interface WorkflowListProps {
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  onSelect: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow, e: React.MouseEvent) => void;
}

// Memoized workflow item component to prevent re-renders
const WorkflowItem = React.memo<{
  workflow: Workflow;
  isSelected: boolean;
  onSelect: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow, e: React.MouseEvent) => void;
}>(({ workflow, isSelected, onSelect, onDelete }) => {
  const handleClick = useCallback(() => onSelect(workflow), [workflow, onSelect]);
  const handleDelete = useCallback((e: React.MouseEvent) => onDelete(workflow, e), [workflow, onDelete]);

  const completedStages = useMemo(() => getCompletedStages(workflow), [workflow]);
  const typeBadgeColor = useMemo(() => getWorkflowTypeBadgeColor(workflow.workflow_type), [workflow.workflow_type]);
  const statusColor = useMemo(() => getWorkflowStatusColor(workflow.status), [workflow.status]);

  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: '0.5rem',
        border: isSelected ? '2px solid #6366f1' : '1px solid #e5e7eb',
        background: isSelected ? '#f0f9ff' : 'white',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '0.25rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {workflow.workflow_name}
          </h3>
          <p style={{
            fontSize: '0.75rem',
            color: '#64748b',
            fontFamily: 'monospace'
          }}>
            {workflow.workflow_id}
          </p>
        </div>
        <button
          onClick={handleDelete}
          style={{
            padding: '0.25rem',
            borderRadius: '0.25rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#94a3b8',
            transition: 'all 0.15s',
            marginLeft: '0.5rem'
          }}
          title="Delete workflow"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fee2e2';
            e.currentTarget.style.color = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '500',
          background: typeBadgeColor.bg,
          color: typeBadgeColor.text,
          border: `1px solid ${typeBadgeColor.border}`
        }}>
          {formatWorkflowTypeDisplay(workflow.workflow_type)}
        </span>
        <span style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '500',
          background: statusColor.bg,
          color: statusColor.text,
          border: `1px solid ${statusColor.border}`
        }}>
          {workflow.status}
        </span>

        {workflow.current_stage && (
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
            background: workflow.stage_status === 'completed' ? '#dcfce7' :
                       workflow.stage_status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
            color: workflow.stage_status === 'completed' ? '#16a34a' :
                   workflow.stage_status === 'in_progress' ? '#2563eb' : '#6b7280',
            border: workflow.stage_status === 'completed' ? '1px solid #86efac' :
                    workflow.stage_status === 'in_progress' ? '1px solid #93c5fd' : '1px solid #d1d5db'
          }}>
            {getStageDisplayName(workflow.current_stage)}
          </span>
        )}
      </div>

      {workflow.current_stage && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
            {['business_analyst', 'developer', 'reviewer'].map((stage) => {
              const isCompleted = completedStages.includes(stage);
              const isCurrent = workflow.current_stage === stage;

              return (
                <div
                  key={stage}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: isCompleted ? '#22c55e' : isCurrent ? '#3b82f6' : '#e5e7eb',
                    transition: 'background 0.3s ease'
                  }}
                  title={getStageDisplayName(stage)}
                />
              );
            })}
          </div>
          <div style={{
            fontSize: '0.7rem',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              {completedStages.length} of 3 stages completed
            </span>
            {workflow.current_stage && (
              <span style={{ fontWeight: '500', color: '#475569' }}>
                {workflow.stage_status === 'pending_submission' ? '✓ Ready to submit' :
                 workflow.stage_status === 'in_progress' ? '▶ In progress' : '○ Not started'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return prev.workflow.id === next.workflow.id &&
    prev.workflow.status === next.workflow.status &&
    prev.workflow.current_stage === next.workflow.current_stage &&
    prev.workflow.stage_status === next.workflow.stage_status &&
    prev.isSelected === next.isSelected;
});

const WorkflowListComponent: React.FC<WorkflowListProps> = ({
  workflows,
  selectedWorkflow,
  onSelect,
  onDelete,
}) => {
  if (workflows.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2rem',
        textAlign: 'center',
        color: '#94a3b8'
      }}>
        <svg style={{ width: '48px', height: '48px', marginBottom: '1rem', opacity: 0.3, color: '#d97706' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>No workflows yet</p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#94a3b8' }}>Create your first workflow to get started</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 1rem 1rem 1rem' }}>
      {workflows.map((workflow) => (
        <WorkflowItem
          key={workflow.id}
          workflow={workflow}
          isSelected={selectedWorkflow?.id === workflow.id}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

// Memoized export to prevent unnecessary re-renders
// Only re-render if workflows array changes (by reference) or selected workflow changes
export const WorkflowList = React.memo(WorkflowListComponent, (prevProps, nextProps) => {
  return (
    prevProps.workflows === nextProps.workflows &&
    prevProps.selectedWorkflow?.id === nextProps.selectedWorkflow?.id
  );
});
