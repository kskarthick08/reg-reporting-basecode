import { useMemo, useState } from "react";
import { GlobalJobCenter } from "../jobs/GlobalJobCenter";
import type { JobStatus } from "../jobs/JobProgressCard";
import { CreateWorkflowVersionModal } from "./CreateWorkflowVersionModal";
import { NotificationCenter } from "./NotificationCenter";
import { projectLabel } from "./projectOptions";
import { ActionIcon } from "./ActionIcon";
import { AppShell } from "./AppShell";
import type { NotificationItem, Persona, WorkflowItem, WorkflowVersionCreateInput } from "./types";

type WorkflowHomeProps = {
  persona: Persona;
  projectId: string;
  setProjectId: (value: string) => void;
  backendUp: boolean | null;
  backendStatusText: string;
  llmUp: boolean | null;
  projectJobs: JobStatus[];
  workflows: WorkflowItem[];
  notifications: NotificationItem[];
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  workflowBusy: boolean;
  workflowName: string;
  workflowPsdVersion: string;
  workflowNameError: string;
  setWorkflowName: (value: string) => void;
  setWorkflowPsdVersion: (value: string) => void;
  createWorkflow: () => Promise<void>;
  createWorkflowVersion: (input: WorkflowVersionCreateInput) => Promise<void>;
  openWorkflow: (workflow: WorkflowItem) => Promise<void>;
  switchRole: () => void;
};

export function WorkflowHome({
  persona,
  projectId,
  setProjectId,
  backendUp,
  backendStatusText,
  llmUp,
  projectJobs,
  workflows,
  notifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  workflowBusy,
  workflowName,
  workflowPsdVersion,
  workflowNameError,
  setWorkflowName,
  setWorkflowPsdVersion,
  createWorkflow,
  createWorkflowVersion,
  openWorkflow,
  switchRole
}: WorkflowHomeProps) {
  const [stageFilter, setStageFilter] = useState("ALL");
  const [psdFilter, setPsdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showJobCenter, setShowJobCenter] = useState(false);
  const [versionWorkflow, setVersionWorkflow] = useState<WorkflowItem | null>(null);
  const personaStage = persona === "BA" ? "BA" : persona === "DEV" ? "DEV" : "REVIEWER";
  const pendingItems = workflows.filter((w) => w.pending_for_me);
  const activeJobs = projectJobs.filter((job) => job.status === "pending" || job.status === "running");
  const blockedCount = workflows.filter((wf) => workflowStatusBucket(wf) === "blocked").length;
  const readyCount = workflows.filter((wf) => workflowStatusBucket(wf) === "ready").length;
  const completedCount = workflows.filter((wf) => wf.current_stage === "COMPLETED" || wf.status === "completed").length;
  const inProgressCount = workflows.filter((wf) => wf.status !== "completed" && wf.current_stage !== "COMPLETED" && !wf.pending_for_me).length;
  const psdVersions = useMemo(() => {
    const uniq = Array.from(new Set(workflows.map((w) => (w.psd_version || "").trim()).filter(Boolean)));
    return uniq.sort((a, b) => a.localeCompare(b));
  }, [workflows]);

  const filtered = useMemo(() => {
    return workflows.filter((wf) => {
      const stageOk = stageFilter === "ALL" ? true : wf.current_stage === stageFilter;
      const psdOk = psdFilter ? String(wf.psd_version || "") === psdFilter : true;
      const gatePass = Boolean((wf.quality_summary?.exit_gate_status as any)?.passed ?? (wf.quality_summary?.exit_gate_status as any)?.pass);
      const statusBucket = wf.current_stage === "COMPLETED" || wf.status === "completed" ? "completed" : gatePass ? "ready" : "blocked";
      const statusOk = statusFilter === "all" ? true : statusBucket === statusFilter;
      const completedOk = showCompleted ? true : statusBucket !== "completed";
      return stageOk && psdOk && statusOk && completedOk;
    });
  }, [workflows, stageFilter, psdFilter, statusFilter, showCompleted]);

  const grouped = useMemo(() => {
    const attention = filtered.filter((w) => w.pending_for_me);
    const inProgress = filtered.filter((w) => !w.pending_for_me && w.status !== "completed" && w.current_stage !== "COMPLETED");
    const completed = filtered.filter((w) => w.status === "completed" || w.current_stage === "COMPLETED");
    return { attention, inProgress, completed };
  }, [filtered]);

  const roleStageItems = useMemo(() => {
    return filtered.filter((wf) => wf.current_stage === personaStage && !wf.pending_for_me && wf.status !== "completed");
  }, [filtered, personaStage]);

  const crossStageItems = useMemo(() => {
    return filtered.filter((wf) => wf.current_stage !== personaStage && !wf.pending_for_me && wf.status !== "completed" && wf.current_stage !== "COMPLETED");
  }, [filtered, personaStage]);

  function workflowStatusBucket(wf: WorkflowItem): "ready" | "blocked" | "completed" {
    if (wf.current_stage === "COMPLETED" || wf.status === "completed") return "completed";
    return Boolean((wf.quality_summary?.exit_gate_status as any)?.passed ?? (wf.quality_summary?.exit_gate_status as any)?.pass) ? "ready" : "blocked";
  }

  function renderWorkflowCard(wf: WorkflowItem) {
    const workflowDisplayId = wf.display_id || `WF-${String(wf.id).padStart(6, "0")}`;
    const pendingOwner = wf.status === "in_progress" && wf.current_stage !== "COMPLETED" ? wf.current_stage : "None";
    const statusBucket = workflowStatusBucket(wf);
    const statusTone = statusBucket === "ready" ? "badge-teal" : statusBucket === "blocked" ? "badge-amber" : "badge-slate";
    const statusText = statusBucket === "ready" ? "Ready" : statusBucket === "blocked" ? "Blocked" : "Completed";
    const runningJobs = activeJobs.filter((job) => job.workflow_id === wf.id);
    return (
      <div key={wf.id} className={`workflow-card ${wf.pending_for_me ? "pending" : ""}`}>
        <div className="workflow-card-top">
          <div className="workflow-card-title">
            {runningJobs.length > 0 ? <span className="workflow-job-indicator" aria-label={`${runningJobs.length} background job running`} /> : null}
            <strong>{wf.name}</strong>
          </div>
          <div className="workflow-card-statuses">
            {runningJobs.length > 0 ? <span className="panel-badge badge-info-soft">Running</span> : null}
            <span className={`panel-badge ${statusTone}`}>{statusText}</span>
          </div>
        </div>
        <div className="workflow-card-meta-grid" role="list">
          <div className="workflow-card-meta-item" role="listitem">
            <span className="workflow-card-meta-label">Workflow ID</span>
            <strong>{workflowDisplayId}</strong>
          </div>
          <div className="workflow-card-meta-item" role="listitem">
            <span className="workflow-card-meta-label">Stage</span>
            <strong>{wf.current_stage}</strong>
          </div>
          <div className="workflow-card-meta-item" role="listitem">
            <span className="workflow-card-meta-label">Status</span>
            <strong>{wf.status === "in_progress" ? "In Progress" : wf.status}</strong>
          </div>
          <div className="workflow-card-meta-item" role="listitem">
            <span className="workflow-card-meta-label">Pending Owner</span>
            <strong>{pendingOwner}</strong>
          </div>
          <div className="workflow-card-meta-item" role="listitem">
            <span className="workflow-card-meta-label">PSD</span>
            <strong>{wf.psd_version || "-"}</strong>
          </div>
          <div className="workflow-card-meta-item" role="listitem">
            <span className="workflow-card-meta-label">Updated</span>
            <strong>{wf.updated_at ? new Date(wf.updated_at).toLocaleString("en-GB") : "-"}</strong>
          </div>
        </div>
        {!!wf.quality_summary?.exit_gate_status?.message && (
          <div className="project-message workflow-card-message">{wf.quality_summary.exit_gate_status.message}</div>
        )}
        <div className="workflow-card-actions">
          <button className="secondary-btn btn-with-icon" onClick={() => openWorkflow(wf)}>
            <ActionIcon name="open" className="action-icon" />
            Open Workflow
          </button>
          {persona === "BA" && (
            <button className="secondary-btn btn-with-icon" onClick={() => setVersionWorkflow(wf)} disabled={workflowBusy}>
              <ActionIcon name="add" className="action-icon" />
              Create New Version
            </button>
          )}
        </div>
      </div>
    );
  }

  const spotlightWorkflow = grouped.attention[0] || roleStageItems[0] || crossStageItems[0] || filtered[0] || null;

  return (
    <>
      <AppShell
        title={showJobCenter ? "Active Jobs" : "Workflow Home"}
        subtitle="Manage your queue, create new work, and keep background jobs visible."
        backLabel="Back to Role Select"
        onBack={switchRole}
        stageLabel={persona}
        projectId={projectId}
        setProjectId={setProjectId}
        backendUp={backendUp}
        backendStatusText={backendStatusText}
        llmUp={llmUp}
        navItems={[
          { key: "workflows", label: "Workflow Home", icon: "home", active: !showJobCenter, onClick: () => setShowJobCenter(false) },
          {
            key: "jobs",
            label: "Active Jobs",
            icon: "jobs",
            badge: activeJobs.length,
            active: showJobCenter,
            onClick: () => setShowJobCenter((value) => !value)
          },
          { key: "admin", label: "Admin", icon: "admin", href: "/admin" },
          { key: "analytics", label: "Analytics", icon: "analytics", href: "/analytics" }
        ]}
        headerActions={
          <NotificationCenter
            notifications={notifications}
            markNotificationRead={markNotificationRead}
            markAllNotificationsRead={markAllNotificationsRead}
            clearNotifications={clearNotifications}
          />
        }
      >
        <main className="dashboard-main workflow-home-main">
          {showJobCenter ? (
            <GlobalJobCenter jobs={projectJobs} title={`${persona} Active Jobs`} emptyLabel="No jobs are running for this role." />
          ) : (
            <>
              <section className="workflow-home-command-grid">
                <section className="workflow-home-hero panel">
                  <div className="workflow-home-hero__copy">
                    <div className="workflow-panel-eyebrow">Portfolio overview</div>
                    <h2>Workflow Queue</h2>
                    <p>Track active work, surface blockers quickly, and keep the next handoff moving.</p>
                  </div>
                  <div className="workflow-home-hero__stats">
                    <div className="workflow-hero-stat workflow-hero-stat--attention">
                      <span>Needs action</span>
                      <strong>{pendingItems.length}</strong>
                      <small>Assigned to your role now</small>
                    </div>
                    <div className="workflow-hero-stat workflow-hero-stat--progress">
                      <span>In progress</span>
                      <strong>{inProgressCount}</strong>
                      <small>Moving through stages</small>
                    </div>
                    <div className="workflow-hero-stat workflow-hero-stat--complete">
                      <span>Completed</span>
                      <strong>{completedCount}</strong>
                      <small>Finished workflows</small>
                    </div>
                    <div className="workflow-hero-stat workflow-hero-stat--jobs">
                      <span>Background jobs</span>
                      <strong>{activeJobs.length}</strong>
                      <small>Running or queued</small>
                    </div>
                  </div>
                  <div className="workflow-home-hero__signals">
                    <div className="workflow-home-signal-card">
                      <span>Blocked workflows</span>
                      <strong>{blockedCount}</strong>
                    </div>
                    <div className="workflow-home-signal-card">
                      <span>Ready to advance</span>
                      <strong>{readyCount}</strong>
                    </div>
                    <div className="workflow-home-signal-card">
                      <span>Active workspace</span>
                      <strong>{projectLabel(projectId)}</strong>
                    </div>
                  </div>
                </section>

                <aside className="panel workflow-home-focus-panel">
                  <div className="workflow-home-focus-panel__head">
                    <div className="workflow-panel-eyebrow">Current focus</div>
                    <h3>Start here</h3>
                  </div>
                  {spotlightWorkflow ? (
                    <div className="workflow-home-spotlight">
                      <div className="workflow-home-spotlight__top">
                        <strong>{spotlightWorkflow.name}</strong>
                        <span className={`panel-badge ${workflowStatusBucket(spotlightWorkflow) === "blocked" ? "badge-amber" : "badge-teal"}`}>
                          {workflowStatusBucket(spotlightWorkflow) === "blocked" ? "Attention" : "Ready"}
                        </span>
                      </div>
                      <div className="workflow-home-spotlight__meta">
                        <span>Stage {spotlightWorkflow.current_stage}</span>
                        <span>PSD {spotlightWorkflow.psd_version || "-"}</span>
                        <span>{spotlightWorkflow.updated_at ? new Date(spotlightWorkflow.updated_at).toLocaleDateString("en-GB") : "-"}</span>
                      </div>
                      <p className="workflow-home-spotlight__copy">
                        {spotlightWorkflow.quality_summary?.exit_gate_status?.message || "Open the workflow to review readiness, outputs, and next actions."}
                      </p>
                      <button className="invoke-btn btn-with-icon" onClick={() => openWorkflow(spotlightWorkflow)}>
                        <ActionIcon name="open" className="action-icon" />
                        Open Priority Workflow
                      </button>
                    </div>
                  ) : (
                    <p className="workflow-empty">No workflow currently needs attention.</p>
                  )}
                  {persona === "BA" && (
                    <div className="workflow-home-focus-panel__create">
                      <div className="workflow-panel-eyebrow">Launch workflow</div>
                      <div className="workflow-create-row workflow-create-row--stacked">
                        <input
                          className={`header-select ${workflowNameError ? "input-error" : ""}`}
                          placeholder="Workflow name"
                          value={workflowName}
                          onChange={(e) => setWorkflowName(e.target.value)}
                        />
                        <input
                          className="header-select"
                          placeholder="PSD version (optional)"
                          value={workflowPsdVersion}
                          onChange={(e) => setWorkflowPsdVersion(e.target.value)}
                        />
                        <button className="invoke-btn btn-with-icon" onClick={createWorkflow} disabled={workflowBusy}>
                          <ActionIcon name="start" className="action-icon" />
                          Start Workflow
                        </button>
                      </div>
                      {workflowNameError && <div className="project-message">{workflowNameError}</div>}
                    </div>
                  )}
                </aside>
              </section>

              <section className="panel workflow-queue-panel workflow-queue-panel--board">
                <div className="workflow-queue-top">
                  <div className="workflow-queue-copy">
                    <div className="workflow-panel-eyebrow">Your workload</div>
                    <h2>My Queue</h2>
                    <p className="workflow-queue-description">Prioritize items assigned to you, then review the rest of your stage.</p>
                  </div>
                  <div className="workflow-queue-badges">
                    <span className={`panel-badge ${pendingItems.length ? "badge-amber" : "badge-teal"}`}>Needs Action: {pendingItems.length}</span>
                    <span className="panel-badge badge-slate">Filtered: {filtered.length}</span>
                  </div>
                </div>

                <div className="workflow-filters-shell">
                  <div className="workflow-filters-head">
                    <span className="workflow-panel-eyebrow">Filter queue</span>
                  </div>
                  <div className="form-grid workflow-filters-row">
                    <div className="field">
                      <label>Stage</label>
                      <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                        <option value="ALL">All stages</option>
                        <option value="BA">BA</option>
                        <option value="DEV">DEV</option>
                        <option value="REVIEWER">REVIEWER</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>PSD Version</label>
                      <select value={psdFilter} onChange={(e) => setPsdFilter(e.target.value)}>
                        <option value="">All PSD versions</option>
                        {psdVersions.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Status</label>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">All</option>
                        <option value="blocked">Blocked</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Completed</label>
                      <label className="checkbox-line">
                        <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
                        Show completed
                      </label>
                    </div>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <p className="workflow-empty">No workflows found for {projectLabel(projectId) || projectId}.</p>
                ) : (
                  <div className="workflow-board">
                    <section className="workflow-board-column workflow-board-column--attention">
                      <div className="workflow-list-head">
                        <h3>Needs My Attention</h3>
                        <span className="panel-badge badge-amber">{grouped.attention.length}</span>
                      </div>
                      {grouped.attention.length === 0 ? <p className="workflow-empty">No items requiring your action.</p> : grouped.attention.map(renderWorkflowCard)}
                    </section>

                    <section className="workflow-board-column">
                      <div className="workflow-list-head">
                        <h3>{personaStage} Stage</h3>
                        <span className="panel-badge badge-slate">{roleStageItems.length}</span>
                      </div>
                      {roleStageItems.length === 0 ? <p className="workflow-empty">No workflows currently in your stage for these filters.</p> : roleStageItems.map(renderWorkflowCard)}
                    </section>

                    {crossStageItems.length > 0 && (
                      <section className="workflow-board-column workflow-board-column--full">
                        <div className="workflow-list-head">
                          <h3>Other In Progress</h3>
                          <span className="panel-badge badge-slate">{crossStageItems.length}</span>
                        </div>
                        {crossStageItems.map(renderWorkflowCard)}
                      </section>
                    )}

                    {showCompleted && (
                      <section className="workflow-board-column workflow-board-column--full">
                        <div className="workflow-list-head">
                          <h3>Completed / Archived</h3>
                          <span className="panel-badge badge-slate">{grouped.completed.length}</span>
                        </div>
                        {grouped.completed.length === 0 ? <p className="workflow-empty">No completed items for current filters.</p> : grouped.completed.map(renderWorkflowCard)}
                      </section>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </AppShell>

      <CreateWorkflowVersionModal
        open={Boolean(versionWorkflow)}
        workflow={versionWorkflow}
        busy={workflowBusy}
        onClose={() => setVersionWorkflow(null)}
        onSubmit={async (input) => {
          await createWorkflowVersion(input);
          setVersionWorkflow(null);
        }}
      />
    </>
  );
}
