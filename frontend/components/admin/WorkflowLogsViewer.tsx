/**
 * Component for viewing and downloading workflow action logs
 */

import { useEffect, useState } from 'react';
import {
  fetchWorkflowLogs,
  downloadWorkflowLogs,
  WorkflowLogEntry,
} from '../../app/logs/logsApi';

interface WorkflowLogsViewerProps {
  workflowId?: number;
  onClose?: () => void;
}

export function WorkflowLogsViewer({ workflowId: initialWorkflowId, onClose }: WorkflowLogsViewerProps) {
  const [workflowId, setWorkflowId] = useState<number>(initialWorkflowId || 0);
  const [inputWorkflowId, setInputWorkflowId] = useState<string>(initialWorkflowId?.toString() || '');
  const [logs, setLogs] = useState<WorkflowLogEntry[]>([]);
  const [workflowName, setWorkflowName] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const limit = 50;

  useEffect(() => {
    if (workflowId > 0) {
      loadLogs();
    }
  }, [workflowId, offset]);

  function handleLoadLogs() {
    const id = parseInt(inputWorkflowId, 10);
    if (isNaN(id) || id <= 0) {
      setError('Please enter a valid workflow ID');
      return;
    }
    setWorkflowId(id);
    setOffset(0);
  }

  async function loadLogs() {
    if (workflowId <= 0) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWorkflowLogs(workflowId, limit, offset);
      setLogs(response.logs);
      setWorkflowName(response.workflow_name);
      setTotalCount(response.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    try {
      await downloadWorkflowLogs(workflowId);
      setDownloadMessage(`Downloaded logs for workflow #${workflowId}.`);
    } catch (err) {
      setDownloadMessage(err instanceof Error ? err.message : 'Failed to download logs');
    }
  }

  function formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  }

  function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'success':
        return 'is-success';
      case 'failure':
        return 'is-failure';
      case 'partial':
        return 'is-partial';
      default:
        return 'is-neutral';
    }
  }

  function getCategoryColor(category: string): string {
    switch (category) {
      case 'BA':
        return 'chip-ba';
      case 'DEV':
        return 'chip-dev';
      case 'REVIEWER':
        return 'chip-reviewer';
      case 'SYSTEM':
        return 'chip-system';
      default:
        return 'chip-default';
    }
  }

  if (loading && logs.length === 0) {
    return (
      <div className="log-panel-loading">
        <div>Loading logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="log-panel-error">
        <p>Error: {error}</p>
        <button onClick={loadLogs} className="header-btn" type="button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="log-panel">
      <div className="log-panel__head">
        <h2 className="log-panel__title">Workflow Action Logs</h2>
        <div className="log-panel__meta">
          <span>Workflow ID: {workflowId > 0 ? workflowId : "-"}</span>
          <span>Loaded entries: {logs.length}</span>
        </div>

        <div className="log-panel__controls">
          <input
            type="number"
            value={inputWorkflowId}
            onChange={(e) => setInputWorkflowId(e.target.value)}
            placeholder="Enter Workflow ID"
            className="log-panel__input"
          />
          <button onClick={handleLoadLogs} disabled={loading} className="header-btn" type="button">
            Load Logs
          </button>
          {workflowId > 0 && (
            <button onClick={handleDownload} className="secondary-btn" type="button">
              Download Logs
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="secondary-btn" type="button">
              Close
            </button>
          )}
        </div>

        {workflowName && (
          <div className="log-panel__meta">
            <p>
              Workflow: {workflowName} (ID: {workflowId})
            </p>
            <p>Total entries: {totalCount}</p>
          </div>
        )}
        {downloadMessage && (
          <div className="admin-success-message">
            <p>{downloadMessage}</p>
          </div>
        )}
      </div>

      <div className="log-panel__body">
        {workflowId === 0 ? (
          <div className="log-panel__empty">Enter a workflow ID above to view logs</div>
        ) : logs.length === 0 ? (
          <div className="log-panel__empty">No logs found for this workflow</div>
        ) : (
          <div className="log-list">
            {logs.map((log) => (
              <div key={log.id} className="log-item">
                <div className="log-item__content">
                  <div className="log-item__line">
                    <span className={`log-chip ${getCategoryColor(log.action_category)}`}>{log.action_category}</span>
                    <span className="log-item__type">{log.action_type}</span>
                    {log.stage && <span className="log-item__stage">Stage: {log.stage}</span>}
                    <span className={`log-item__status ${getStatusColor(log.status)}`}>{log.status.toUpperCase()}</span>
                  </div>

                  <p className="log-item__description">{log.description}</p>

                  <div className="log-item__meta">
                    <span>{formatTimestamp(log.created_at)}</span>
                    {log.actor && <span>Actor: {log.actor}</span>}
                    {log.duration_ms !== null && <span>Duration: {log.duration_ms}ms</span>}
                  </div>

                  {log.error_message && (
                    <div className="log-item__error">
                      <p>Error: {log.error_message}</p>
                    </div>
                  )}

                  {log.details_json && (
                    <div className="log-item__details">
                      <button
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="log-details-toggle"
                        type="button"
                      >
                        {expandedLog === log.id ? 'Hide Details' : 'Show Details'}
                      </button>
                      {expandedLog === log.id && <pre className="log-item__json">{JSON.stringify(log.details_json, null, 2)}</pre>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalCount > limit && workflowId > 0 && (
        <div className="log-panel__footer">
          <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="secondary-btn" type="button">
            Previous
          </button>
          <span className="log-panel__pager">
            Showing {offset + 1}-{Math.min(offset + limit, totalCount)} of {totalCount}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= totalCount}
            className="secondary-btn"
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
