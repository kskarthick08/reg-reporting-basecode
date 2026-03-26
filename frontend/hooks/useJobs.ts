"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { JobStatus } from "../components/jobs/JobProgressCard";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UseJobsOptions {
  actor?: string;
  projectId?: string;
  workflowId?: number | null;
  pollInterval?: number;
  useSSE?: boolean;
}

const JOB_STATUS_PRIORITY: Record<string, number> = {
  completed: 4,
  failed: 4,
  cancelled: 4,
  running: 3,
  pending: 2
};

function getJobTimestamp(job: JobStatus): number {
  const value = job.completed_at || job.started_at || job.created_at;
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function selectCanonicalJob(current: JobStatus, next: JobStatus): JobStatus {
  const currentTime = getJobTimestamp(current);
  const nextTime = getJobTimestamp(next);
  if (nextTime !== currentTime) {
    return nextTime > currentTime ? next : current;
  }

  const currentPriority = JOB_STATUS_PRIORITY[current.status] ?? 0;
  const nextPriority = JOB_STATUS_PRIORITY[next.status] ?? 0;
  if (nextPriority !== currentPriority) {
    return nextPriority > currentPriority ? next : current;
  }

  return next;
}

function normalizeJobs(items: JobStatus[]): JobStatus[] {
  const byId = new Map<string, JobStatus>();
  items.forEach((job) => {
    const key = String(job.id);
    const existing = byId.get(key);
    byId.set(key, existing ? selectCanonicalJob(existing, job) : job);
  });

  return Array.from(byId.values()).sort((a, b) => {
    return getJobTimestamp(b) - getJobTimestamp(a);
  });
}

export function useJobs(options: UseJobsOptions = {}) {
  const { actor, projectId, workflowId, pollInterval = 2000, useSSE = true } = options;
  const canUseSSE = useSSE && Boolean(actor);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconcileTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackPollingRef = useRef(false);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const clearReconcileTimer = useCallback(() => {
    if (reconcileTimerRef.current) {
      clearInterval(reconcileTimerRef.current);
      reconcileTimerRef.current = null;
    }
  }, []);

  // Fetch jobs via polling
  const fetchJobs = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (projectId) query.set("project_id", projectId);
      if (workflowId != null) query.set("workflow_id", String(workflowId));
      const queryString = query.toString();

      const url = actor
        ? `${API_BASE_URL}/jobs/by-actor/${actor}${queryString ? `?${queryString}` : ""}`
        : `${API_BASE_URL}/jobs/active${queryString ? `?${queryString}` : ""}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.statusText}`);
      }
      
      const data = await response.json();
      setJobs(normalizeJobs(data));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [actor, projectId, workflowId]);

  const setupPolling = useCallback(() => {
    fallbackPollingRef.current = true;
    clearReconcileTimer();
    clearPollTimer();
    void fetchJobs();
    pollTimerRef.current = setInterval(() => {
      void fetchJobs();
    }, pollInterval);
  }, [clearPollTimer, clearReconcileTimer, fetchJobs, pollInterval]);

  const setupReconciliationPolling = useCallback(() => {
    clearReconcileTimer();
    reconcileTimerRef.current = setInterval(() => {
      void fetchJobs();
    }, Math.max(pollInterval * 3, 5000));
  }, [clearReconcileTimer, fetchJobs, pollInterval]);

  // Setup SSE connection
  useEffect(() => {
    setLoading(true);
    setError(null);
    setJobs([]);
    clearPollTimer();
    clearReconcileTimer();
    eventSourceRef.current?.close();
    eventSourceRef.current = null;

    if (!canUseSSE) return;
    fallbackPollingRef.current = false;

    const query = new URLSearchParams();
    if (projectId) query.set("project_id", projectId);
    if (workflowId != null) query.set("workflow_id", String(workflowId));
    const queryString = query.toString();
    const url = actor
      ? `${API_BASE_URL}/jobs/stream/${actor}${queryString ? `?${queryString}` : ""}`
      : `${API_BASE_URL}/v1/jobs/stream${queryString ? `?${queryString}` : ""}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    void fetchJobs();
    setupReconciliationPolling();

    eventSource.onmessage = (event) => {
      try {
        const job: JobStatus = JSON.parse(event.data);
        setJobs((prevJobs) => {
          const existingIndex = prevJobs.findIndex((j) => j.id === job.id);
          if (existingIndex >= 0) {
            const updated = [...prevJobs];
            updated[existingIndex] = job;
            return normalizeJobs(updated);
          } else {
            return normalizeJobs([...prevJobs, job]);
          }
        });
        if (job.status === "completed" || job.status === "failed") {
          void fetchJobs();
        }
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      eventSource.close();
      eventSourceRef.current = null;
      if (!fallbackPollingRef.current) {
        setupPolling();
      }
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      clearPollTimer();
      clearReconcileTimer();
    };
  }, [canUseSSE, actor, projectId, workflowId, clearPollTimer, clearReconcileTimer, fetchJobs, setupPolling, setupReconciliationPolling]);

  useEffect(() => {
    if (!canUseSSE) {
      fallbackPollingRef.current = true;
      void fetchJobs();
      setupPolling();

      return () => {
        clearPollTimer();
        clearReconcileTimer();
      };
    }
  }, [canUseSSE, clearPollTimer, clearReconcileTimer, fetchJobs, setupPolling]);

  // Submit a new job
  const submitJob = useCallback(async (
    jobType: string,
    requestData: any,
    actorName: string
  ): Promise<JobStatus> => {
    const response = await fetch(`${API_BASE_URL}/jobs/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_type: jobType,
        request_data: requestData,
        actor: actorName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit job: ${response.statusText}`);
    }

    const job = await response.json();
    setJobs((prevJobs) => normalizeJobs([...prevJobs, job]));
    return job;
  }, []);

  // Get specific job status
  const getJob = useCallback(async (jobId: string): Promise<JobStatus> => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch job: ${response.statusText}`);
    }
    return response.json();
  }, []);

  // Cancel a job
  const cancelJob = useCallback(async (jobId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/cancel`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Failed to cancel job: ${response.statusText}`);
    }
    await fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    error,
    submitJob,
    getJob,
    cancelJob,
    refresh: fetchJobs,
  };
}

// Hook for a single job's status
export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    setLoading(true);
    const eventSource = new EventSource(`${API_BASE_URL}/jobs/${jobId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const jobData: JobStatus = JSON.parse(event.data);
        setJob(jobData);
        setError(null);
        
        // Close connection if job is complete
        if (jobData.status === "completed" || jobData.status === "failed") {
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse job status:", err);
        setError("Failed to parse job status");
      } finally {
        setLoading(false);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Job status stream error:", err);
      setError("Connection error");
      eventSource.close();
      setLoading(false);
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  return { job, loading, error };
}
