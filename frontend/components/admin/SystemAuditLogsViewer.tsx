/**
 * Component for viewing and downloading system audit logs
 */

import { useEffect, useState } from 'react';
import {
  fetchSystemAuditLogs,
  downloadSystemAuditLogs,
  SystemAuditLogEntry,
  AuditLogFilters,
} from '../../app/logs/logsApi';

export function SystemAuditLogsViewer() {
  const [logs, setLogs] = useState<SystemAuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0,
  });

  useEffect(() => {
    loadLogs();
  }, [filters.offset, filters.project_id, filters.actor, filters.event_category, filters.severity]);

  async function loadLogs() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchSystemAuditLogs(filters);
      setLogs(response.logs);
      setTotalCount(response.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    try {
      await downloadSystemAuditLogs(filters);
      setDownloadMessage("Downloaded system audit logs.");
    } catch (err) {
      setDownloadMessage(err instanceof Error ? err.message : 'Failed to download audit logs');
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

  function getSeverityColor(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'info':
        return 'chip-ba';
      case 'warning':
        return 'chip-reviewer';
      case 'error':
        return 'chip-dev';
      case 'critical':
        return 'chip-system';
      default:
        return 'chip-default';
    }
  }

  function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'success':
        return 'is-success';
      case 'failure':
        return 'is-failure';
      default:
        return 'is-neutral';
    }
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  return (
    <div className="log-panel">
      <div className="log-panel__head">
        <div className="log-panel__controls log-panel__controls--space-between">
          <h2 className="log-panel__title">System Audit Logs</h2>
          <button onClick={handleDownload} className="header-btn" type="button">
            Download Logs
          </button>
        </div>
        {downloadMessage && (
          <div className="admin-success-message">
            <p>{downloadMessage}</p>
          </div>
        )}

        <div className="log-panel__grid">
          <input
            type="text"
            placeholder="Filter by Project ID"
            value={filters.project_id || ''}
            onChange={(e) => setFilters({ ...filters, project_id: e.target.value || undefined, offset: 0 })}
            className="log-panel__input"
          />
          <input
            type="text"
            placeholder="Filter by Actor"
            value={filters.actor || ''}
            onChange={(e) => setFilters({ ...filters, actor: e.target.value || undefined, offset: 0 })}
            className="log-panel__input"
          />
          <select
            value={filters.severity || ''}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined, offset: 0 })}
            className="log-panel__input"
          >
            <option value="">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <p className="log-panel__meta">Total entries: {totalCount}</p>
      </div>

      <div className="log-panel__body">
        {loading && logs.length === 0 ? (
          <div className="log-panel__empty">Loading audit logs...</div>
        ) : error ? (
          <div className="log-panel-error">
            <p>Error: {error}</p>
            <button onClick={loadLogs} className="header-btn" type="button">
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="log-panel__empty">No audit logs found</div>
        ) : (
          <div className="log-list">
            {logs.map((log) => (
              <div key={log.id} className="log-item">
                <div className="log-item__content">
                  <div className="log-item__line">
                    <span className={`log-chip ${getSeverityColor(log.severity)}`}>{log.severity.toUpperCase()}</span>
                    <span className="log-chip chip-default">{log.event_category}</span>
                    <span className="log-item__type">{log.event_type}</span>
                    <span className={`log-item__status ${getStatusColor(log.status)}`}>{log.status.toUpperCase()}</span>
                  </div>

                  <p className="log-item__description">{log.description}</p>

                  <div className="log-item__meta">
                    <span>{formatTimestamp(log.created_at)}</span>
                    {log.actor && <span>Actor: {log.actor}</span>}
                    {log.project_id && <span>Project: {log.project_id}</span>}
                    {log.target_type && log.target_id && <span>Target: {log.target_type}:{log.target_id}</span>}
                    {log.ip_address && <span>IP: {log.ip_address}</span>}
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

      {totalCount > limit && (
        <div className="log-panel__footer">
          <button
            onClick={() => setFilters({ ...filters, offset: Math.max(0, offset - limit) })}
            disabled={offset === 0}
            className="secondary-btn"
            type="button"
          >
            Previous
          </button>
          <span className="log-panel__pager">
            Showing {offset + 1}-{Math.min(offset + limit, totalCount)} of {totalCount}
          </span>
          <button
            onClick={() => setFilters({ ...filters, offset: offset + limit })}
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
