"use client";

import { useState } from "react";
import { JobStatus, JobProgressCard } from "./JobProgressCard";
import "../../app/styles/job-progress.css";

interface JobHistoryPanelProps {
  jobs: JobStatus[];
  onViewResult?: (job: JobStatus) => void;
}

export function JobHistoryPanel({ jobs, onViewResult }: JobHistoryPanelProps) {
  const [filter, setFilter] = useState<"all" | "completed" | "failed">("all");

  const filteredJobs = jobs
    .filter((job) => {
      if (filter === "all") return job.status === "completed" || job.status === "failed";
      return job.status === filter;
    })
    .sort((a, b) => {
      const timeA = a.completed_at || a.created_at;
      const timeB = b.completed_at || b.created_at;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

  return (
    <div className="job-history-panel">
      <div className="job-history-header">
        <h3 className="job-history-title">Job History</h3>
        <div className="job-history-filters">
          <button className={`job-filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All
          </button>
          <button className={`job-filter-btn ${filter === "completed" ? "active" : ""}`} onClick={() => setFilter("completed")}>
            Completed
          </button>
          <button className={`job-filter-btn ${filter === "failed" ? "active" : ""}`} onClick={() => setFilter("failed")}>
            Failed
          </button>
        </div>
      </div>
      <div className="job-history-body">
        {filteredJobs.length === 0 ? (
          <div className="job-history-empty">
            <p>No {filter !== "all" ? filter : "terminal"} jobs found</p>
          </div>
        ) : (
          <ul className="job-history-list">
            {filteredJobs.map((job) => (
              <li key={job.id} className="job-history-item">
                <JobProgressCard job={job} onViewResult={onViewResult} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

