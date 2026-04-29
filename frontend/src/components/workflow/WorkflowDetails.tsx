import React from 'react';
import { Workflow } from '@/types';
import { AGENT_HIERARCHIES, getWorkflowStatusBadge } from '@/utils/workflowHelpers';

interface WorkflowDetailsProps {
  workflow: Workflow;
  onExecuteStep: (stepIndex: number) => void;
}

export const WorkflowDetails: React.FC<WorkflowDetailsProps> = ({ workflow, onExecuteStep }) => {
  const hierarchy = AGENT_HIERARCHIES[workflow.workflow_type || 'business_analyst'];

  return (
    <>
      <div className="wfp-details-info-section">
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>Name</p>
          <p style={{ fontSize: '1rem', fontWeight: '500' }}>{workflow.workflow_name}</p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{workflow.workflow_id}</p>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>Type</p>
          <p style={{ fontSize: '1rem', fontWeight: '500', textTransform: 'capitalize' }}>{workflow.workflow_type?.replace('_', ' ')}</p>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>Status</p>
          <span className={`wfp-status-badge ${getWorkflowStatusBadge(workflow.status)}`}>
            {workflow.status}
          </span>
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>Description</p>
          <p style={{ fontSize: '0.875rem' }}>{workflow.description || 'No description provided'}</p>
        </div>
      </div>

      <div className="wfp-details-steps-section">
        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem' }}>Steps & Tools</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {workflow.workflow_type === 'complete' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fcd34d' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e', marginBottom: '0.5rem' }}>BA SUPERVISOR (6 agents)</p>
              </div>
              <div style={{ padding: '0.75rem', background: '#ddd6fe', borderRadius: '0.5rem', border: '1px solid #c4b5fd' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#5b21b6', marginBottom: '0.5rem' }}>DEVELOPER SUPERVISOR (6 agents)</p>
              </div>
              <div style={{ padding: '0.75rem', background: '#dbeafe', borderRadius: '0.5rem', border: '1px solid #93c5fd' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e40af', marginBottom: '0.5rem' }}>REVIEWER SUPERVISOR (4 agents)</p>
              </div>
            </div>
          ) : (
            hierarchy.subAgents.map((agent, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem',
                  background: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => onExecuteStep(idx)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e0e7ff';
                  e.currentTarget.style.borderColor = '#6366f1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                  {agent.name}
                </p>
                {agent.tools.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {agent.tools.map((tool, toolIdx) => (
                      <div key={toolIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6' }}></div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{tool}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No tools</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
