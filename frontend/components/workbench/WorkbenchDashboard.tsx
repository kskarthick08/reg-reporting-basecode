import { useEffect, useRef, useState } from "react";

import { AppShell } from "./AppShell";
import { JobNotificationToast } from "../jobs/JobNotificationToast";
import type { JobStatus } from "../jobs/JobProgressCard";
import { GlobalJobCenter } from "../jobs/GlobalJobCenter";
import { InfoTooltip } from "./InfoTooltip";
import { NotificationCenter } from "./NotificationCenter";
import { API_BASE, parseJson } from "./utils";
import { WorkbenchChrome } from "./WorkbenchChrome";
import { WorkbenchStageContent } from "./WorkbenchStageContent";
import type { WorkbenchActions } from "./useWorkbenchActions";
import type { WorkbenchDerived } from "./useWorkbenchDerived";
import type { WorkbenchState } from "./useWorkbenchState";
import { useTerminalJobNotifications } from "./useTerminalJobNotifications";

type Props = {
  state: WorkbenchState;
  actions: WorkbenchActions;
  derived: WorkbenchDerived;
  projectJobs: JobStatus[];
};

const JOB_STAGE_MAP: Record<string, "ba" | "dev" | "rev"> = {
  gap_analysis: "ba",
  gap_remediation: "ba",
  sql_generation: "dev",
  xml_generation: "dev",
  xml_validation: "rev"
};

export function WorkbenchDashboard({ state, actions, derived, projectJobs }: Props) {
  const workbenchTitle = state.activeAgentTab === "ba" ? "BA Workbench" : state.activeAgentTab === "dev" ? "DEV Workbench" : "Reviewer Workbench";
  const [showJobCenter, setShowJobCenter] = useState(false);
  const currentWorkflowJobs = projectJobs.filter((job) => job.workflow_id === state.activeWorkflowId);
  const processedDevSqlSyncRef = useRef<Set<string>>(new Set());
  const processedRevValidationSyncRef = useRef<Set<string>>(new Set());
  const processedXmlPreviewSyncRef = useRef<Set<string>>(new Set());
  const currentWorkflowActiveJobs = currentWorkflowJobs.filter((job) => job.status === "pending" || job.status === "running");
  const queuedWorkflowJobs = currentWorkflowJobs.filter((job) => job.status === "pending");
  const completedWorkflowJobs = currentWorkflowJobs.filter((job) => job.status === "completed");
  const stageJobStatus = (["ba", "dev", "rev"] as const).reduce<Partial<Record<"ba" | "dev" | "rev", JobStatus["status"]>>>((acc, stage) => {
    const stageJobs = currentWorkflowJobs
      .filter((job) => JOB_STAGE_MAP[job.job_type] === stage)
      .sort((a, b) => {
        const aTime = new Date(a.completed_at || a.started_at || a.created_at).getTime();
        const bTime = new Date(b.completed_at || b.started_at || b.created_at).getTime();
        return bTime - aTime;
      });
    const activeStageJob = stageJobs.find((job) => job.status === "running" || job.status === "pending");
    const latestStageJob = stageJobs[0];
    const chosen = activeStageJob || latestStageJob;
    if (chosen) {
      acc[stage] = chosen.status;
    }
    return acc;
  }, {});

  const { notifications: globalJobNotifications, dismissNotification: dismissGlobalJobNotification } = useTerminalJobNotifications({
    jobs: projectJobs,
    resetScope: `${state.persona}:${state.projectId}`,
    maxNotifications: 6,
    onTerminalTransition: (job) => {
      if (job.status === "completed") {
        const label = job.job_type.replace(/_/g, " ");
        state.addNotification("success", `${label} completed for workflow ${job.workflow_id || "-"}.`, "job");
      }
      if (job.status === "failed") {
        const label = job.job_type.replace(/_/g, " ");
        state.addNotification("error", `${label} failed for workflow ${job.workflow_id || "-"}.`, "job");
      }
      if (job.status === "cancelled") {
        const label = job.job_type.replace(/_/g, " ");
        state.addNotification("info", `${label} was cancelled for workflow ${job.workflow_id || "-"}.`, "job");
      }
    }
  });
  const latestCompletedSqlJob = currentWorkflowJobs
    .filter((job) => job.job_type === "sql_generation" && job.status === "completed" && Number(job.result_run_id || 0) > 0)
    .sort((a, b) => {
      const aTime = new Date(a.completed_at || a.started_at || a.created_at).getTime();
      const bTime = new Date(b.completed_at || b.started_at || b.created_at).getTime();
      return bTime - aTime;
    })[0];
  const latestCompletedXmlValidationJob = currentWorkflowJobs
    .filter((job) => job.job_type === "xml_validation" && job.status === "completed" && Number(job.result_run_id || 0) > 0)
    .sort((a, b) => {
      const aTime = new Date(a.completed_at || a.started_at || a.created_at).getTime();
      const bTime = new Date(b.completed_at || b.started_at || b.created_at).getTime();
      return bTime - aTime;
    })[0];

  useEffect(() => {
    if (currentWorkflowActiveJobs.length === 0) {
      setShowJobCenter(false);
    }
  }, [currentWorkflowActiveJobs.length]);

  useEffect(() => {
    const runId = Number(latestCompletedSqlJob?.result_run_id || 0);
    if (runId <= 0) return;
    if (state.sqlRunId === runId && state.sqlScript) return;

    const syncKey = `${state.activeWorkflowId ?? "none"}:${runId}`;
    if (processedDevSqlSyncRef.current.has(syncKey) && state.sqlRunId === runId) return;

    const sqlScript = String(latestCompletedSqlJob?.result_json?.sql_script || "");
    state.setSqlRunId(runId);
    if (sqlScript) {
      state.setSqlScript(sqlScript);
    }
    processedDevSqlSyncRef.current.add(syncKey);
  }, [latestCompletedSqlJob, state.activeWorkflowId, state.sqlRunId, state.sqlScript, state.setSqlRunId, state.setSqlScript]);

  useEffect(() => {
    processedDevSqlSyncRef.current = new Set();
    processedRevValidationSyncRef.current = new Set();
    processedXmlPreviewSyncRef.current = new Set();
  }, [state.activeWorkflowId]);

  useEffect(() => {
    const runId = Number(latestCompletedXmlValidationJob?.result_run_id || 0);
    if (runId <= 0 || !state.activeWorkflowId) return;
    if (state.xmlRunId === runId && state.xmlValidation) return;

    const syncKey = `${state.activeWorkflowId}:${runId}`;
    if (processedRevValidationSyncRef.current.has(syncKey) && state.xmlRunId === runId) return;

    let cancelled = false;

    async function syncLatestReviewerValidation() {
      try {
        const validationRes = await fetch(`${API_BASE}/v1/xml/validation/${runId}`);
        const validationJson = await parseJson(validationRes);
        if (!validationRes.ok || cancelled) return;

        const xsdPass = Boolean(validationJson?.xsd_validation?.pass);
        const rulePass = Boolean(validationJson?.rule_checks?.passed);
        const gatePassed =
          validationJson?.gate_status?.passed ??
          validationJson?.gate_status?.pass ??
          (validationJson?.display?.status === "PASS" ? true : undefined);

        state.setXmlRunId(runId);
        state.setXmlValidation({
          run_id: runId,
          pass: typeof gatePassed === "boolean" ? gatePassed : xsdPass && rulePass,
          errors: Array.isArray(validationJson?.xsd_validation?.errors) ? validationJson.xsd_validation.errors : [],
          error_details: Array.isArray(validationJson?.xsd_validation?.error_details) ? validationJson.xsd_validation.error_details : [],
          display: validationJson?.display || undefined,
          gate_status: validationJson?.gate_status || undefined,
          ai_review: validationJson?.ai_review || {},
          rule_checks: validationJson?.rule_checks || {},
          analysis_meta: validationJson?.analysis_meta || undefined
        });

        if (validationJson?.report_xml_artifact_id) {
          state.setReportXmlArtifactId(Number(validationJson.report_xml_artifact_id));
        }
        if (validationJson?.xsd_artifact_id) {
          state.setXsdArtifactId(Number(validationJson.xsd_artifact_id));
        }
        if (validationJson?.fca_artifact_id) {
          state.setFcaArtifactId(Number(validationJson.fca_artifact_id));
        }
        if (validationJson?.data_model_artifact_id) {
          state.setModelArtifactId(Number(validationJson.data_model_artifact_id));
        }

        state.setWorkflows((prev) =>
          prev.map((workflow) =>
            workflow.id === state.activeWorkflowId ? { ...workflow, latest_xml_run_id: runId } : workflow
          )
        );
      } finally {
        processedRevValidationSyncRef.current.add(syncKey);
      }
    }

    void syncLatestReviewerValidation();
    return () => {
      cancelled = true;
    };
  }, [
    latestCompletedXmlValidationJob,
    state.activeWorkflowId,
    state.xmlRunId,
    state.xmlValidation,
    state.setXmlRunId,
    state.setXmlValidation,
    state.setReportXmlArtifactId,
    state.setXsdArtifactId,
    state.setFcaArtifactId,
    state.setModelArtifactId,
    state.setWorkflows
  ]);

  useEffect(() => {
    const artifactId = Number(state.reportXmlArtifactId || derived.currentWorkflow?.latest_report_xml_artifact_id || 0);
    if (artifactId <= 0) {
      if (state.reportXmlPreview) state.setReportXmlPreview("");
      return;
    }

    const syncKey = `${state.activeWorkflowId ?? "none"}:${artifactId}`;
    if (processedXmlPreviewSyncRef.current.has(syncKey) && state.reportXmlPreview) return;

    let cancelled = false;
    async function syncReportXmlPreview() {
      try {
        const response = await fetch(`${API_BASE}/v1/artifacts/${artifactId}/download`);
        const text = await response.text();
        if (!response.ok || cancelled) return;
        state.setReportXmlPreview(text);
      } finally {
        processedXmlPreviewSyncRef.current.add(syncKey);
      }
    }

    void syncReportXmlPreview();
    return () => {
      cancelled = true;
    };
  }, [
    state.activeWorkflowId,
    state.reportXmlArtifactId,
    derived.currentWorkflow?.latest_report_xml_artifact_id,
    state.reportXmlPreview,
    state.setReportXmlPreview
  ]);

  return (
    <>
      <div className="job-notification-container">
        {globalJobNotifications.map((job) => (
          <JobNotificationToast key={`global-job-${job.id}`} job={job} onDismiss={dismissGlobalJobNotification} />
        ))}
      </div>
      {state.busy && (
        <div className="overlay">
          <div className="spinner" />
          <span>Processing request...</span>
        </div>
      )}
      <div className="toast-stack">{state.toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}</div>

      <AppShell
        title={workbenchTitle}
        subtitle={derived.currentWorkflow ? `Workflow ${derived.currentWorkflow.name} is in ${derived.currentWorkflow.current_stage}. Actions and outputs stay aligned in one place.` : undefined}
        backLabel="Back to Workflow Home"
        onBack={() => state.setActiveWorkflowId(null)}
        workflowName={derived.currentWorkflow?.name}
        stageLabel={derived.currentWorkflow?.current_stage}
        projectId={state.projectId}
        setProjectId={state.setProjectId}
        backendUp={state.backendUp}
        backendStatusText={state.backendStatusText}
        llmUp={state.llmUp}
        navItems={[
          { key: "workflows", label: "Workflow Home", icon: "home", active: !showJobCenter, onClick: () => setShowJobCenter(false) },
          { key: "jobs", label: "Active Jobs", icon: "jobs", badge: currentWorkflowActiveJobs.length, active: showJobCenter, onClick: () => setShowJobCenter((value) => !value) },
          { key: "admin", label: "Admin", icon: "admin", href: "/admin" },
          { key: "analytics", label: "Analytics", icon: "analytics", href: "/analytics" }
        ]}
        summaryBar={
          <WorkbenchChrome
            activeAgentTab={state.activeAgentTab}
            stageFlags={derived.stageFlags}
            stageJobStatus={stageJobStatus}
            setActiveAgentTab={(tab) => {
              if (derived.allowedTabs.includes(tab)) state.setActiveAgentTab(tab);
            }}
            allowedTabs={derived.allowedTabs}
            showFullWorkflow
          />
        }
        headerActions={
          <NotificationCenter
            notifications={state.notifications}
            markNotificationRead={state.markNotificationRead}
            markAllNotificationsRead={state.markAllNotificationsRead}
            clearNotifications={state.clearNotifications}
          />
        }
        statusSignal={currentWorkflowActiveJobs.length > 0 ? { label: `${currentWorkflowActiveJobs.length} running`, tone: "running" } : undefined}
      >
        <main className="dashboard-main">
          <section className="panel stage-ops-banner">
            <div className="stage-ops-banner__copy">
              <div className="stage-ops-banner__eyebrow">Workflow Summary</div>
              <div className="stage-ops-banner__title">
                Workflow Health
                <InfoTooltip
                  text="Summary of workflow-level operational metrics for the currently open workflow, including total jobs, running work, queued work, and completed jobs."
                  ariaLabel="Workflow Health At A Glance information"
                />
              </div>
              <div className="stage-ops-banner__subtitle">
                Track progress, active work, and handoff readiness before advancing the workflow.
              </div>
            </div>
            <div className="stage-ops-banner__stats">
              <div className="stage-ops-stat">
                <span>Total Jobs</span>
                <strong>{currentWorkflowJobs.length}</strong>
              </div>
              <div className="stage-ops-stat stage-ops-stat--running">
                <span>Running</span>
                <strong>{currentWorkflowActiveJobs.length}</strong>
              </div>
              <div className="stage-ops-stat">
                <span>Queued</span>
                <strong>{queuedWorkflowJobs.length}</strong>
              </div>
              <div className="stage-ops-stat stage-ops-stat--complete">
                <span>Completed</span>
                <strong>{completedWorkflowJobs.length}</strong>
              </div>
            </div>
          </section>
          {showJobCenter ? (
            <GlobalJobCenter
              jobs={currentWorkflowJobs}
              title={`${derived.currentWorkflow?.name || "Workflow"} Jobs`}
              emptyLabel="No jobs are running for this workflow."
            />
          ) : (
            <WorkbenchStageContent state={state} actions={actions} derived={derived} currentWorkflowJobs={currentWorkflowJobs} />
          )}
        </main>

        <details className="advanced-block insight-collapse audit-tail-bottom">
          <summary>Workflow Audit Trail ({state.auditTrail.length})</summary>
          <section className="audit-section">
            <div className="audit-panel">
              <div className="audit-timeline">
                {state.auditTrail.length === 0 ? (
                  <div className="empty-audit">No activity yet.</div>
                ) : (
                  state.auditTrail.map((item) => (
                    <div className="audit-item" key={item.id}>
                      <div className={`audit-dot ${item.level === "success" ? "teal" : item.level === "warn" ? "amber" : ""}`} />
                      <div className="audit-time">{item.at}</div>
                      <div className="audit-msg">{item.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </details>
      </AppShell>
    </>
  );
}
