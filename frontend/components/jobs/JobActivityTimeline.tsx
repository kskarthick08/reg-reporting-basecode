"use client";

import { JobStatus } from "./JobProgressCard";
import "../../app/styles/job-progress.css";

interface JobActivityTimelineProps {
  jobs: JobStatus[];
  maxItems?: number;
}

export function JobActivityTimeline({ jobs, maxItems = 10 }: JobActivityTimelineProps) {
  const sortedJobs = [...jobs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, maxItems);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

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

  const getStatusDescription = (job: JobStatus): string => {
    switch (job.status) {
      case "pending":
        return "Queued for processing";
      case "running":
        return job.progress_message || "In progress";
      case "completed":
        return "Completed successfully";
      case "failed":
        return job.error_message || "Failed";
      case "cancelled":
        return job.error_message || "Cancelled";
    }
  };

  const getStatusMarker = (status: JobStatus["status"]): string => {
    if (status === "completed") return "OK";
    if (status === "failed") return "!";
    if (status === "cancelled") return "STOP";
    if (status === "running") return "...";
    return "Q";
  };

  if (sortedJobs.length === 0) {
    return (
      <div className="job-activity-timeline">
        <p className="job-activity-empty">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="job-activity-timeline">
      {sortedJobs.map((job) => (
        <div key={job.id} className="job-activity-item">
          <div className={`job-activity-icon ${job.status}`}>{getStatusMarker(job.status)}</div>
          <div className="job-activity-content">
            <div className="job-activity-header">
              <h5 className="job-activity-title">{getJobTypeLabel(job.job_type)}</h5>
              <span className="job-activity-time">{formatTime(job.created_at)}</span>
            </div>
            <p className="job-activity-description">
              {job.actor} · {getStatusDescription(job)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

