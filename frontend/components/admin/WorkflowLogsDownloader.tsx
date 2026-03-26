/**
 * Download workflow logs for a selected project/workflow.
 */

import { useEffect, useState } from 'react';
import { downloadWorkflowLogs } from '../../app/logs/logsApi';

interface WorkflowSummary {
  id: number;
  project_id: string;
  name: string;
  current_stage: string;
  status: string;
  updated_at: string;
}

interface WorkflowLogsDownloaderProps {
  projectId: string;
}

export function WorkflowLogsDownloader({ projectId: initialProjectId }: WorkflowLogsDownloaderProps) {
  const [projectId, setProjectId] = useState<string>(initialProjectId || '');
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialProjectId && initialProjectId !== projectId) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId, projectId]);

  async function loadWorkflows() {
    try {
      setLoadingWorkflows(true);
      setError(null);
      const response = await fetch(`/v1/admin/workflows?project_id=${projectId}&include_inactive=true&limit=300`);
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      const data = await response.json();
      setWorkflows(data.items || []);
      setSelectedWorkflowId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
      setWorkflows([]);
    } finally {
      setLoadingWorkflows(false);
    }
  }

  async function handleDownload() {
    if (!selectedWorkflowId) {
      setError('Please select a workflow');
      return;
    }

    try {
      setDownloading(true);
      setError(null);
      setSuccess(null);

      await downloadWorkflowLogs(parseInt(selectedWorkflowId, 10));

      const selectedWorkflow = workflows.find((w) => w.id === parseInt(selectedWorkflowId, 10));
      setSuccess(`Downloaded logs for Workflow #${selectedWorkflowId}${selectedWorkflow ? ` - ${selectedWorkflow.name}` : ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download logs');
    } finally {
      setDownloading(false);
    }
  }

  const selectedWorkflow = selectedWorkflowId
    ? workflows.find((w) => w.id === parseInt(selectedWorkflowId, 10))
    : null;

  return (
    <div className="log-panel admin-download-panel">
      <div className="log-panel__head">
        <h2 className="log-panel__title">Download Workflow Logs</h2>

        <div className="log-panel__filter-block">
          <label className="log-panel__field-label" htmlFor="downloader-project-id">Project ID</label>
          <div className="log-panel__controls">
            <input
              id="downloader-project-id"
              type="text"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setSelectedWorkflowId('');
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

        <div className="log-panel__filter-block">
          <label className="log-panel__field-label" htmlFor="downloader-workflow-select">Select Workflow</label>
          <select
            id="downloader-workflow-select"
            value={selectedWorkflowId}
            onChange={(e) => {
              setSelectedWorkflowId(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            disabled={workflows.length === 0}
            className="log-panel__input"
          >
            <option value="">{workflows.length === 0 ? 'No workflows available' : '-- Select a workflow --'}</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                #{workflow.id} - {workflow.name} ({workflow.current_stage} - {workflow.status})
              </option>
            ))}
          </select>
          {workflows.length > 0 ? (
            <p className="log-panel__meta">
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} available
            </p>
          ) : null}
        </div>

        <button
          onClick={handleDownload}
          disabled={!selectedWorkflowId || downloading}
          className="header-btn admin-download-panel__cta"
          type="button"
        >
          {downloading ? 'Downloading...' : 'Download Logs as Text File'}
        </button>

        {error && (
          <div className="log-inline-error">
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="admin-success-message">
            <p>{success}</p>
          </div>
        )}
      </div>

      {selectedWorkflow && (
        <div className="admin-download-panel__selection">
          <p className="admin-download-panel__selection-title">Selected Workflow</p>
          <p>
            <strong>#{selectedWorkflow.id}</strong> - {selectedWorkflow.name}
          </p>
          <p>Stage: {selectedWorkflow.current_stage} | Status: {selectedWorkflow.status}</p>
          <p>Last updated: {new Date(selectedWorkflow.updated_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
