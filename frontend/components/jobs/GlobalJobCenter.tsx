"use client";

import { useMemo, useState } from "react";

import type { JobStatus } from "./JobProgressCard";

type GlobalJobCenterProps = {
  jobs: JobStatus[];
  title?: string;
  compact?: boolean;
  emptyLabel?: string;
  hideWhenEmpty?: boolean;
};

export function GlobalJobCenter({
  jobs,
  title = "Active Jobs",
  compact = false,
  emptyLabel = "No jobs are running for this view.",
  hideWhenEmpty = false
}: GlobalJobCenterProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "running" | "completed" | "failed">("all");
  const [workflowFilter, setWorkflowFilter] = useState("");

  const { queuedJobs, runningJobs, recentJobs, filteredJobs } = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const workflowNeedle = workflowFilter.trim().toLowerCase();
    const matchesWorkflow = (job: JobStatus) => {
      if (!workflowNeedle) return true;
      const workflowId = job.workflow_id != null ? String(job.workflow_id) : "";
      const displayId = workflowId ? `wf-${new Date(job.created_at).getFullYear()}-${workflowId.padStart(6, "0")}` : "";
      const haystack = `${workflowId} ${displayId} ${getJobLabel(job.job_type)} ${job.progress_message || ""} ${job.error_message || ""}`.toLowerCase();
      return haystack.includes(workflowNeedle);
    };
    const matchesStatus = (job: JobStatus) => statusFilter === "all" || job.status === statusFilter;
    const filtered = sorted.filter((job) => matchesStatus(job) && matchesWorkflow(job));
    return {
      queuedJobs: sorted.filter((job) => job.status === "pending"),
      runningJobs: sorted.filter((job) => job.status === "running"),
      recentJobs: sorted.filter((job) => job.status === "completed" || job.status === "failed").slice(0, compact ? 4 : 6),
      filteredJobs: filtered
    };
  }, [compact, jobs, statusFilter, workflowFilter]);

  const activeJobs = [...runningJobs, ...queuedJobs];

  const formatDateTime = (rawValue?: string) => {
    if (!rawValue) return "-";
    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric"
    });
  };

  const getJobLabel = (type: string): string => {
    const labels: Record<string, string> = {
      gap_analysis: "Gap Analysis",
      gap_remediation: "Gap Remediation",
      sql_generation: "SQL Generation",
      xml_generation: "XML Generation",
      xml_validation: "XML Validation"
    };
    return labels[type] || type;
  };

  const getJobNote = (job: JobStatus) => {
    if (job.status === "completed") return "Completed successfully";
    if (job.status === "failed") return job.error_message || "Failed";
    if (job.status === "running") return job.progress_message || "In progress";
    return "Queued for processing";
  };

  const getWorkflowLabel = (job: JobStatus) => {
    if (job.workflow_id == null) return "No workflow";
    const year = new Date(job.created_at).getFullYear();
    return `WF-${String(year).padStart(4, "0")}-${String(job.workflow_id).padStart(6, "0")}`;
  };

  const getStatusLabel = (job: JobStatus) => {
    if (job.status === "pending") return "Queued";
    if (job.status === "running") return "Running";
    if (job.status === "completed") return "Completed";
    return "Failed";
  };

  const visibleJobs = filteredJobs.slice(0, compact ? 8 : 50);

  if (hideWhenEmpty && activeJobs.length === 0 && recentJobs.length === 0) {
    return null;
  }

  return (
    <section className={`panel global-job-center ${compact ? "compact" : ""}`} id="global-job-center">
      <div className="panel-header">
        <div>
          <div className="global-job-center__title-row">
            <div className="panel-title">{title}</div>
            <span className="panel-badge badge-slate">Live</span>
          </div>
          <div className="global-job-center__subtitle">Track queued and running work without leaving the page.</div>
        </div>
        <div className="global-job-center__stats">
          <div className="global-job-center__stat">
            <span className="global-job-center__stat-label">Running</span>
            <strong>{runningJobs.length}</strong>
          </div>
          <div className="global-job-center__stat">
            <span className="global-job-center__stat-label">Queued</span>
            <strong>{queuedJobs.length}</strong>
          </div>
          <div className="global-job-center__stat">
            <span className="global-job-center__stat-label">Recent</span>
            <strong>{recentJobs.length}</strong>
          </div>
        </div>
      </div>

      <div className="global-job-center__body">
        <div className="workflow-filters-shell">
          <div className="workflow-filters-head">
            <span className="workflow-panel-eyebrow">Filter jobs</span>
          </div>
          <div className="form-grid workflow-filters-row global-job-center__filters">
            <div className="field">
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "running" | "completed" | "failed")}>
                <option value="all">All</option>
                <option value="running">Running</option>
                <option value="pending">Queued</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="field">
              <label>Workflow / Job</label>
              <input
                value={workflowFilter}
                onChange={(e) => setWorkflowFilter(e.target.value)}
                placeholder="Search by workflow ID, display ID, or job"
              />
            </div>
          </div>
        </div>

        <div className="global-job-center__active">
          {visibleJobs.length === 0 ? (
            emptyLabel ? <div className="global-job-center__empty">{emptyLabel}</div> : null
          ) : (
            <div className="global-job-center__table-wrap">
              <table className="global-job-center__table">
                <caption className="visually-hidden">Workflow jobs</caption>
                <thead>
                  <tr>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Status</th>
                    <th>Job</th>
                    <th>Workflow</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleJobs.map((job) => (
                    <tr key={job.id}>
                      <td>{formatDateTime(job.started_at || job.created_at)}</td>
                      <td>{formatDateTime(job.completed_at)}</td>
                      <td>
                        <span className={`global-job-center__status status-${job.status}`}>
                          {getStatusLabel(job)}
                        </span>
                      </td>
                      <td>{getJobLabel(job.job_type)}</td>
                      <td>{getWorkflowLabel(job)}</td>
                      <td>{getJobNote(job)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
