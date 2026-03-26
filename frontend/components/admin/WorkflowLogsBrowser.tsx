/**
 * Component for browsing and selecting workflows to view logs
 */

import { useEffect, useState } from 'react';
import { fetchWorkflows, type HeaderFactory } from '../../app/admin/adminApi';
import { WorkflowLogsViewer } from './WorkflowLogsViewer';

interface WorkflowSummary {
  id: number;
  project_id: string;
  name: string;
  current_stage: string;
  status: string;
  assigned_ba?: string | null;
  assigned_dev?: string | null;
  assigned_reviewer?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface WorkflowLogsBrowserProps {
  projectId: string;
  adminHeaders: HeaderFactory;
}

export function WorkflowLogsBrowser({ projectId: initialProjectId, adminHeaders }: WorkflowLogsBrowserProps) {
  const [projectId, setProjectId] = useState<string>(initialProjectId || '');
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (initialProjectId && initialProjectId !== projectId) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  async function loadWorkflows() {
    try {
      setLoadingWorkflows(true);
      setError(null);
      const items = await fetchWorkflows(projectId, adminHeaders);
      setWorkflows(items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoadingWorkflows(false);
    }
  }

  const filteredWorkflows = workflows.filter(
    (workflow) =>
      searchTerm === '' ||
      workflow.id.toString().includes(searchTerm) ||
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.current_stage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workflow.assigned_ba && workflow.assigned_ba.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (workflow.assigned_dev && workflow.assigned_dev.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (workflow.assigned_reviewer && workflow.assigned_reviewer.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  if (selectedWorkflowId) {
    return <WorkflowLogsViewer workflowId={selectedWorkflowId} onClose={() => setSelectedWorkflowId(null)} />;
  }

  return (
    <div className="log-panel">
      <div className="log-panel__head">
        <h2 className="log-panel__title">Select Workflow to View Logs</h2>
        <div className="log-panel__meta">
          <span>Loaded workflows: {workflows.length}</span>
          <span>Search results: {filteredWorkflows.length}</span>
        </div>

        <div className="log-panel__filter-block">
          <label className="log-panel__field-label" htmlFor="logs-project-id">
            Project ID
          </label>
          <div className="log-panel__controls">
            <input
              id="logs-project-id"
              type="text"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setSelectedWorkflowId(null);
              }}
              className="log-panel__input"
              placeholder="e.g., PSD008"
            />
            <button
              onClick={loadWorkflows}
              disabled={loadingWorkflows || !projectId}
              className="header-btn"
              type="button"
            >
              {loadingWorkflows ? 'Loading...' : 'Load Workflows'}
            </button>
          </div>
        </div>

        {workflows.length > 0 && (
          <div className="log-panel__filter-block">
            <input
              type="text"
              placeholder="Search by ID, name, stage, status, or assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="log-panel__input"
            />
            <p className="log-panel__meta">Showing {filteredWorkflows.length} of {workflows.length} workflows</p>
          </div>
        )}

        {error && (
          <div className="log-inline-error">
            <p>{error}</p>
          </div>
        )}
      </div>

      <div className="log-panel__body">
        {loadingWorkflows ? (
          <div className="log-panel__empty">Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="log-panel__empty">No workflows found. Enter a project ID and click Load Workflows</div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="log-panel__empty">No workflows match your search</div>
        ) : (
          <div className="log-list">
            {filteredWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="log-item log-item--clickable"
                onClick={() => setSelectedWorkflowId(workflow.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedWorkflowId(workflow.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="log-item__content">
                  <div className="log-item__line">
                    <span className="log-item__type">#{workflow.id}</span>
                    <span className="log-item__name">{workflow.name}</span>
                    <span className="log-chip chip-default">{workflow.status}</span>
                  </div>

                  <div className="log-item__meta">
                    <span>Stage: {workflow.current_stage}</span>
                    {workflow.assigned_ba && <span>BA: {workflow.assigned_ba}</span>}
                    {workflow.assigned_dev && <span>Dev: {workflow.assigned_dev}</span>}
                    {workflow.assigned_reviewer && <span>Reviewer: {workflow.assigned_reviewer}</span>}
                  </div>

                  <div className="log-item__meta">
                    <span>Created: {workflow.created_at ? new Date(workflow.created_at).toLocaleString() : 'N/A'}</span>
                    <span>Updated: {workflow.updated_at ? new Date(workflow.updated_at).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>

                <button className="secondary-btn" type="button">
                  View Logs
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
