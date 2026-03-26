"use client";

import { useEffect, useState } from "react";

import { ActionIcon } from "../../components/workbench/ActionIcon";
import { AppShell } from "../../components/workbench/AppShell";
import { InfoTooltip } from "../../components/workbench/InfoTooltip";
import { projectLabel, projectOptionsWithCurrent } from "../../components/workbench/projectOptions";
import { fetchAnalyticsDashboard } from "./analyticsApi";
import type { AnalyticsDashboardData } from "./types";
import "./dashboard.css";

function AnalyticsCardTitle({
  icon,
  title,
  description
}: {
  icon: "workflow" | "clock" | "analytics" | "artifacts" | "check" | "activity";
  title: string;
  description: string;
}) {
  return (
    <div className="dashboard-card__title">
      <ActionIcon name={icon} className="action-icon" />
      <h2>{title}</h2>
      <InfoTooltip text={description} ariaLabel={`${title} information`} />
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const projectOptions = projectOptionsWithCurrent(projectId);

  const loadDashboard = async () => {
    try {
      setError(null);
      const dashboardData = await fetchAnalyticsDashboard(projectId || null);
      setData(dashboardData);
      setLastUpdatedAt(new Date().toLocaleString("en-GB"));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load dashboard";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [projectId]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadDashboard();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, projectId]);

  if (loading && !data) {
    return (
      <div className="analytics-dashboard-loading">
        <div className="spinner" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="analytics-dashboard-error">
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={loadDashboard}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const { data_sources, metrics, pipeline, cycle_times, artifacts, runs, quality, activity_capture, recent_activity } = data;
  const artifactKinds = Object.entries(artifacts.by_kind).sort(([, a], [, b]) => b - a);
  const runTypes = Object.entries(runs.by_type).sort(([, a], [, b]) => b - a);
  const actionCategories = Object.entries(activity_capture.action_category_breakdown).sort(([, a], [, b]) => b - a);
  const actionStatuses = Object.entries(activity_capture.action_status_breakdown).sort(([, a], [, b]) => b - a);

  return (
    <AppShell
      title="Analytics Dashboard"
      subtitle="Review workflow state, stored artifacts, execution runs, and recorded activity."
      backLabel="Back to Workbench"
      onBack={() => {
        window.location.href = "/";
      }}
      stageLabel="Analytics"
      headerActions={
        <div className="analytics-header-tools">
          <label className="filter-control">
            <span>Workspace</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="project-filter-input"
            >
              <option value="">All workspaces</option>
              {projectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh</span>
          </label>
          <button onClick={loadDashboard} className="refresh-btn btn-with-icon" disabled={loading}>
            <ActionIcon name="refresh" className="action-icon" />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      }
      navItems={[
        { key: "workbench", label: "Workbench", icon: "home", href: "/" },
        { key: "admin", label: "Admin", icon: "admin", href: "/admin" },
        { key: "analytics", label: "Analytics", icon: "analytics", active: true }
      ]}
    >
      <div className="analytics-dashboard">
        <section className="analytics-command-grid">
          <section className="dashboard-card analytics-hero-panel">
            <div className="analytics-hero-panel__row">
              <div>
                <div className="analytics-hero-panel__title">
                  Operational Analytics Snapshot
                  <InfoTooltip
                    text="High-level summary of persisted workflow volume, artifact volume, and first-pass quality across the selected project scope."
                    ariaLabel="Operational Analytics Snapshot information"
                  />
                </div>
                <div className="analytics-hero-panel__subtitle">
                  Track workflow throughput, quality outcomes, and action coverage in one view.
                </div>
              </div>
              <div className="analytics-hero-panel__chips">
                <span className="panel-badge badge-slate">Workspace: {projectId ? projectLabel(projectId) : "All workspaces"}</span>
                <span className="panel-badge badge-slate">Sources: {data_sources.length}</span>
                <span className={`panel-badge ${autoRefresh ? "badge-teal" : "badge-amber"}`}>{autoRefresh ? "Auto Refresh On" : "Auto Refresh Off"}</span>
              </div>
            </div>
            <div className="analytics-hero-panel__meta">Last refreshed: {lastUpdatedAt || "Loading..."}</div>
            <div className="analytics-hero-panel__signals">
              <div className="analytics-signal-card">
                <span>Workflows</span>
                <strong>{metrics.total_workflows}</strong>
              </div>
              <div className="analytics-signal-card">
                <span>Artifacts</span>
                <strong>{metrics.total_artifacts}</strong>
              </div>
              <div className="analytics-signal-card">
                <span>First pass</span>
                <strong>{metrics.quality_first_pass_rate}%</strong>
              </div>
            </div>
          </section>

          <aside className="dashboard-card analytics-focus-panel">
            <AnalyticsCardTitle
              icon="activity"
              title="Stored Data Sources"
              description="Shows which persisted backend sources feed this dashboard so users can understand what records are included in the current view."
            />
            <p className="dashboard-note">
              This dashboard only uses persisted platform records from the sources listed below.
            </p>
            <div className="source-badges">
              {data_sources.map((source) => (
                <span key={source} className="source-badge">
                  {source}
                </span>
              ))}
            </div>
            <div className="analytics-focus-panel__summary">
              <div className="summary-metric">
                <span>Completed</span>
                <strong>{metrics.completed_workflows}</strong>
              </div>
              <div className="summary-metric">
                <span>Send-backs</span>
                <strong>{metrics.send_back_count}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="kpi-cards">
          <div className="kpi-card">
            <div className="kpi-icon"><ActionIcon name="workflow" className="action-icon" /></div>
            <div className="kpi-content">
              <div className="kpi-label">Total Workflows</div>
              <div className="kpi-value">{metrics.total_workflows}</div>
              <div className="kpi-detail">Active: {metrics.active_workflows} | Done: {metrics.completed_workflows}</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon"><ActionIcon name="clock" className="action-icon" /></div>
            <div className="kpi-content">
              <div className="kpi-label">Avg Cycle Time</div>
              <div className="kpi-value">{metrics.avg_cycle_time_hours.toFixed(1)}h</div>
              <div className="kpi-detail">Creation to completion</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon"><ActionIcon name="artifacts" className="action-icon" /></div>
            <div className="kpi-content">
              <div className="kpi-label">Stored Artifacts</div>
              <div className="kpi-value">{metrics.total_artifacts}</div>
              <div className="kpi-detail">Active: {artifacts.active_artifacts} | Deleted: {artifacts.deleted_artifacts}</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon"><ActionIcon name="analytics" className="action-icon" /></div>
            <div className="kpi-content">
              <div className="kpi-label">Analysis Runs</div>
              <div className="kpi-value">{metrics.total_analysis_runs}</div>
              <div className="kpi-detail">Completed: {runs.completed_runs} | Failed: {runs.failed_runs}</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon"><ActionIcon name="activity" className="action-icon" /></div>
            <div className="kpi-content">
              <div className="kpi-label">Action Logging Coverage</div>
              <div className="kpi-value">{activity_capture.action_logging_coverage_pct.toFixed(1)}%</div>
              <div className="kpi-detail">
                Workflows with logs: {activity_capture.workflows_with_action_logs} / {metrics.total_workflows}
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon"><ActionIcon name="check" className="action-icon" /></div>
            <div className="kpi-content">
              <div className="kpi-label">First Pass Rate</div>
              <div className="kpi-value">{metrics.quality_first_pass_rate}%</div>
              <div className="kpi-detail">Send-backs: {metrics.send_back_count}</div>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="dashboard-card pipeline-card">
            <AnalyticsCardTitle
              icon="workflow"
              title="Pipeline Status"
              description="Counts workflows by current stage so you can see where work is sitting across BA, DEV, Reviewer, and Completed."
            />
            <div className="pipeline-stages">
              <div className="pipeline-stage ba-stage">
                <div className="stage-label">BA</div>
                <div className="stage-count">{pipeline.pipeline.BA}</div>
              </div>
              <div className="pipeline-arrow">-&gt;</div>
              <div className="pipeline-stage dev-stage">
                <div className="stage-label">DEV</div>
                <div className="stage-count">{pipeline.pipeline.DEV}</div>
              </div>
              <div className="pipeline-arrow">-&gt;</div>
              <div className="pipeline-stage rev-stage">
                <div className="stage-label">REVIEW</div>
                <div className="stage-count">{pipeline.pipeline.REVIEWER}</div>
              </div>
              <div className="pipeline-arrow">-&gt;</div>
              <div className="pipeline-stage completed-stage">
                <div className="stage-label">DONE</div>
                <div className="stage-count">{pipeline.pipeline.COMPLETED}</div>
              </div>
            </div>
            {pipeline.stuck_workflows > 0 ? (
              <div className="alert-warning">
                <ActionIcon name="warning" className="action-icon" /> {pipeline.stuck_workflows} workflow(s) stuck over 24h
              </div>
            ) : null}
          </section>

          <section className="dashboard-card cycle-times-card">
            <AnalyticsCardTitle
              icon="clock"
              title="Time by Stage"
              description="Average elapsed hours spent in each delivery stage based on persisted workflow timestamps."
            />
            <div className="cycle-times-bars">
              {(["BA", "DEV", "REVIEWER"] as const).map((stageKey) => (
                <div className="cycle-bar" key={stageKey}>
                  <div className="bar-label">{stageKey === "REVIEWER" ? "REVIEW" : stageKey}</div>
                  <div className="bar-container">
                    <div
                      className={`bar-fill ${stageKey === "BA" ? "ba-bar" : stageKey === "DEV" ? "dev-bar" : "rev-bar"}`}
                      style={{ width: `${Math.min((cycle_times.average_hours_by_stage[stageKey] / 50) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="bar-value">{cycle_times.average_hours_by_stage[stageKey].toFixed(1)}h</div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-card inventory-card">
            <AnalyticsCardTitle
              icon="artifacts"
              title="Artifact Inventory"
              description="Summary of stored artifacts by state and kind, including the latest recorded artifact timestamp."
            />
            <div className="summary-metrics-grid">
              <div className="summary-metric">
                <span>Active</span>
                <strong>{artifacts.active_artifacts}</strong>
              </div>
              <div className="summary-metric">
                <span>Deleted</span>
                <strong>{artifacts.deleted_artifacts}</strong>
              </div>
              <div className="summary-metric">
                <span>Generated</span>
                <strong>{artifacts.generated_artifacts}</strong>
              </div>
              <div className="summary-metric">
                <span>Latest</span>
                <strong>{artifacts.latest_artifact_at ? new Date(artifacts.latest_artifact_at).toLocaleString() : "N/A"}</strong>
              </div>
            </div>
            <div className="breakdown-list">
              {artifactKinds.length === 0 ? (
                <div className="empty-activity">No artifact records</div>
              ) : (
                artifactKinds.map(([kind, count]) => (
                  <div key={kind} className="breakdown-item">
                    <span>{kind}</span>
                    <strong>{count}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="dashboard-card runs-card">
            <AnalyticsCardTitle
              icon="analytics"
              title="Analysis Runs"
              description="Shows how many analysis executions have been recorded, their status mix, and the latest run timestamp."
            />
            <div className="summary-metrics-grid">
              <div className="summary-metric">
                <span>Total</span>
                <strong>{runs.total_runs}</strong>
              </div>
              <div className="summary-metric">
                <span>Completed</span>
                <strong>{runs.completed_runs}</strong>
              </div>
              <div className="summary-metric">
                <span>Failed</span>
                <strong>{runs.failed_runs}</strong>
              </div>
              <div className="summary-metric">
                <span>Latest</span>
                <strong>{runs.latest_run_at ? new Date(runs.latest_run_at).toLocaleString() : "N/A"}</strong>
              </div>
            </div>
            <div className="breakdown-list">
              {runTypes.length === 0 ? (
                <div className="empty-activity">No run records</div>
              ) : (
                runTypes.map(([runType, count]) => (
                  <div key={runType} className="breakdown-item">
                    <span>{runType}</span>
                    <strong>{count}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="dashboard-card quality-card">
            <AnalyticsCardTitle
              icon="check"
              title="Quality Metrics"
              description="Pass-rate and send-back metrics across stages, highlighting where review quality is trending strong or weak."
            />
            <div className="quality-stats">
              <div className="quality-metric"><span>BA Pass</span><strong className={quality.pass_rate_by_stage.BA >= 80 ? "good" : "warning"}>{quality.pass_rate_by_stage.BA}%</strong></div>
              <div className="quality-metric"><span>DEV Pass</span><strong className={quality.pass_rate_by_stage.DEV >= 80 ? "good" : "warning"}>{quality.pass_rate_by_stage.DEV}%</strong></div>
              <div className="quality-metric"><span>Review Pass</span><strong className={quality.pass_rate_by_stage.REVIEWER >= 80 ? "good" : "warning"}>{quality.pass_rate_by_stage.REVIEWER}%</strong></div>
              <div className="quality-metric"><span>Send-backs</span><strong>{quality.total_send_backs}</strong></div>
            </div>
            {Object.keys(quality.send_back_reasons).length > 0 ? (
              <div className="send-back-reasons">
                <h3>Top Send-back Reasons</h3>
                {Object.entries(quality.send_back_reasons)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([reason, count]) => (
                    <div key={reason} className="reason-item">
                      <span className="reason-text">{reason}</span>
                      <span className="reason-count">{count}</span>
                    </div>
                  ))}
              </div>
            ) : null}
          </section>

          <section className="dashboard-card capture-card">
            <AnalyticsCardTitle
              icon="activity"
              title="Activity Capture"
              description="Coverage of logged workflow actions and stage-history events, including latest captured activity timestamps."
            />
            <div className="summary-metrics-grid">
              <div className="summary-metric">
                <span>Stage Events</span>
                <strong>{activity_capture.stage_history_events}</strong>
              </div>
              <div className="summary-metric">
                <span>Action Logs</span>
                <strong>{activity_capture.workflow_action_logs}</strong>
              </div>
              <div className="summary-metric">
                <span>Workflows Missing Logs</span>
                <strong>{activity_capture.workflows_without_action_logs}</strong>
              </div>
              <div className="summary-metric">
                <span>Logged Downloads</span>
                <strong>{activity_capture.logged_download_actions}</strong>
              </div>
            </div>
            <div className="capture-meta">
              <span>Latest stage event: {activity_capture.latest_stage_event_at ? new Date(activity_capture.latest_stage_event_at).toLocaleString() : "N/A"}</span>
              <span>Latest action log: {activity_capture.latest_action_log_at ? new Date(activity_capture.latest_action_log_at).toLocaleString() : "N/A"}</span>
            </div>
            <div className="breakdown-columns">
              <div>
                <h3>Action Categories</h3>
                <div className="breakdown-list compact">
                  {actionCategories.length === 0 ? (
                    <div className="empty-activity">No action category records</div>
                  ) : (
                    actionCategories.map(([category, count]) => (
                      <div key={category} className="breakdown-item">
                        <span>{category}</span>
                        <strong>{count}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3>Action Status</h3>
                <div className="breakdown-list compact">
                  {actionStatuses.length === 0 ? (
                    <div className="empty-activity">No action status records</div>
                  ) : (
                    actionStatuses.map(([status, count]) => (
                      <div key={status} className="breakdown-item">
                        <span>{status}</span>
                        <strong>{count}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-card activity-card">
            <AnalyticsCardTitle
              icon="activity"
              title="Recent Activity"
              description="Most recent workflow events and logged actions recorded by the platform for the selected project scope."
            />
            <div className="activity-list">
              {recent_activity.length === 0 ? (
                <div className="empty-activity">No recent activity</div>
              ) : (
                recent_activity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-time">{activity.created_at ? new Date(activity.created_at).toLocaleString() : "N/A"}</div>
                    <div className="activity-details">
                      <span className={`activity-source ${activity.source}`}>{activity.source === "stage_history" ? "Stage" : "Action Log"}</span>
                      <span className="activity-actor">{activity.actor || "System"}</span>
                      <span className="activity-action">{activity.action}</span>
                      {activity.stage ? <span className="activity-stage">{activity.stage}</span> : null}
                      {activity.status ? <span className="activity-status">{activity.status}</span> : null}
                      {activity.from_stage && activity.to_stage ? <span className="activity-stages">{activity.from_stage} -&gt; {activity.to_stage}</span> : null}
                      {activity.description ? <span className="activity-description">{activity.description}</span> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
