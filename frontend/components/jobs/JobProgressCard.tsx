"use client";

import { useEffect, useState } from "react";
import { fullJobError, hasExpandedJobError, summarizeJobError } from "./jobErrorSummary";
import "../../app/styles/job-progress.css";

export interface JobStatus {
  id: string | number;
  job_type: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress_pct: number;
  progress_message?: string;
  actor: string;
  workflow_id?: number | null;
  project_id?: string;
  result_run_id?: number | null;
  result_artifact_id?: number | null;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  error_message?: string;
  result_json?: any;
}

interface JobProgressCardProps {
  job: JobStatus;
  onDismiss?: (jobId: string | number) => void;
  onViewResult?: (job: JobStatus) => void;
}

export function JobProgressCard({ job, onDismiss, onViewResult }: JobProgressCardProps) {
  const [timeElapsed, setTimeElapsed] = useState<string>("");
  const errorSummary = summarizeJobError(job.error_message);
  const showExpandedError = hasExpandedJobError(job.error_message);
  const errorDetails = fullJobError(job.error_message);

  useEffect(() => {
    const updateElapsed = () => {
      const start = job.started_at ? new Date(job.started_at) : new Date(job.created_at);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffSec = Math.floor(diffMs / 1000);

      if (diffSec < 60) {
        setTimeElapsed(`${diffSec}s`);
      } else {
        const mins = Math.floor(diffSec / 60);
        const secs = diffSec % 60;
        setTimeElapsed(`${mins}m ${secs}s`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [job.started_at, job.created_at]);

  const getJobTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      gap_analysis: "Gap Analysis",
      gap_remediation: "Gap Remediation",
      sql_generation: "SQL Generation",
      xml_generation: "XML Generation",
      xml_validation: "XML Validation",
    };
    return labels[type] || type;
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case "pending":
        return "Q";
      case "running":
        return <span className="job-mini-spinner" aria-hidden="true" />;
      case "completed":
        return "OK";
      case "failed":
        return "ERR";
      case "cancelled":
        return "STOP";
    }
  };

  const getStatusBadgeClass = () => {
    switch (job.status) {
      case "pending":
        return "neutral";
      case "running":
        return "info";
      case "completed":
        return "success";
      case "failed":
        return "error";
      case "cancelled":
        return "neutral";
    }
  };

  return (
    <div className={`job-progress-card ${job.status}`}>
      <div className="job-progress-header">
        <div className="job-progress-title">
          <span className={`job-icon job-icon-${job.status}`}>{getStatusIcon()}</span>
          <div>
            <h4 className="job-type">{getJobTypeLabel(job.job_type)}</h4>
            <p className="job-meta">
              {job.actor} · {timeElapsed}
            </p>
          </div>
        </div>
        <div className="job-progress-actions">
          <span className={`job-status-pill ${getStatusBadgeClass()}`}>{job.status.toUpperCase()}</span>
          {(job.status === "completed" || job.status === "failed" || job.status === "cancelled") && onDismiss && (
            <button className="job-icon-btn" onClick={() => onDismiss(job.id)} aria-label="Dismiss">
              x
            </button>
          )}
        </div>
      </div>

      {job.status === "running" && (
        <div className="job-progress-body">
          <div className="job-progress-track" role="progressbar" aria-valuenow={job.progress_pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="job-progress-fill" style={{ width: `${job.progress_pct}%` }} />
          </div>
          {job.progress_message && <p className="progress-message">{job.progress_message}</p>}
        </div>
      )}

      {job.status === "completed" && job.result_json && (
        <div className="job-progress-body">
          <div className="job-inline-alert success">
            <span className="job-inline-alert__icon">OK</span>
            <span>Job completed successfully</span>
          </div>
          {onViewResult && (
            <button className="header-btn" onClick={() => onViewResult(job)}>
              View Result
            </button>
          )}
        </div>
      )}

      {job.status === "failed" && (
        <div className="job-progress-body">
          <div className="job-inline-alert error">
            <span className="job-inline-alert__icon">!</span>
            <div>
              <strong>Job failed</strong>
              {errorSummary && <p className="error-details">{errorSummary}</p>}
              {showExpandedError && (
                <details className="job-error-details">
                  <summary>Show full error</summary>
                  <pre>{errorDetails}</pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {job.status === "cancelled" && (
        <div className="job-progress-body">
          <div className="job-inline-alert">
            <span className="job-inline-alert__icon">STOP</span>
            <div>
              <strong>Job cancelled</strong>
              {errorSummary && <p className="error-details">{errorSummary}</p>}
              {showExpandedError && (
                <details className="job-error-details">
                  <summary>Show full error</summary>
                  <pre>{errorDetails}</pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

