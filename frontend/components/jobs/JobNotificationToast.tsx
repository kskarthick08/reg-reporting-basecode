"use client";

import { useEffect, useState } from "react";
import { JobStatus } from "./JobProgressCard";
import "../../app/styles/job-progress.css";

interface JobNotificationToastProps {
  job: JobStatus;
  onDismiss: (jobId: string | number) => void;
  autoHideDuration?: number;
}

export function JobNotificationToast({ job, onDismiss, autoHideDuration = 5000 }: JobNotificationToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (job.status === "completed" || job.status === "failed") {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [job.status, autoHideDuration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(job.id);
    }, 300);
  };

  const getMessage = () => {
    switch (job.status) {
      case "pending":
        return "Job queued";
      case "running":
        return job.progress_message || "Processing";
      case "completed":
        return "Completed successfully";
      case "failed":
        return job.error_message || "Job failed";
    }
  };

  const getIcon = () => {
    switch (job.status) {
      case "pending":
        return "Q";
      case "running":
        return <span className="job-mini-spinner" aria-hidden="true" />;
      case "completed":
        return "OK";
      case "failed":
        return "ERR";
    }
  };

  return (
    <div className={`job-notification-toast ${isExiting ? "exiting" : ""}`}>
      <div className="job-toast-row">
        <span className={`job-icon job-icon-${job.status}`}>{getIcon()}</span>
        <div className="job-toast-copy">
          <p className="job-type">{getMessage()}</p>
          {job.status === "running" && (
            <div className="job-progress-track compact" role="progressbar" aria-valuenow={job.progress_pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="job-progress-fill" style={{ width: `${job.progress_pct}%` }} />
            </div>
          )}
        </div>
        <button className="job-icon-btn" onClick={handleDismiss} aria-label="Dismiss">
          x
        </button>
      </div>
    </div>
  );
}

