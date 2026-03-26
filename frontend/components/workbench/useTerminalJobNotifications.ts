import { useEffect, useRef, useState } from "react";

import type { JobStatus } from "../jobs/JobProgressCard";

type UseTerminalJobNotificationsArgs = {
  jobs: JobStatus[];
  resetScope: string;
  maxNotifications?: number;
  onTerminalTransition?: (job: JobStatus) => void;
};

export function useTerminalJobNotifications({
  jobs,
  resetScope,
  maxNotifications,
  onTerminalTransition
}: UseTerminalJobNotificationsArgs) {
  const [notifications, setNotifications] = useState<JobStatus[]>([]);
  const previousStatusesRef = useRef<Map<string, string>>(new Map());
  const announcedNotificationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const previousStatuses = previousStatusesRef.current;
    const nextStatuses = new Map<string, string>();
    const now = Date.now();

    jobs.forEach((job) => {
      const jobId = String(job.id);
      const previousStatus = previousStatuses.get(jobId);
      const terminal = job.status === "completed" || job.status === "failed";
      const terminalAtRaw = job.completed_at || job.cancelled_at || job.created_at || job.started_at;
      const terminalAt = terminalAtRaw ? new Date(terminalAtRaw).getTime() : 0;
      const recentlyFinished = Number.isFinite(terminalAt) && terminalAt > 0 && now - terminalAt <= 3 * 60 * 1000;
      const transitionedToTerminal =
        previousStatus !== undefined &&
        previousStatus !== job.status &&
        terminal;
      const firstSeenRecentTerminal =
        previousStatus === undefined &&
        terminal &&
        recentlyFinished;

      if ((transitionedToTerminal || firstSeenRecentTerminal) && !announcedNotificationsRef.current.has(jobId)) {
        announcedNotificationsRef.current.add(jobId);
        setNotifications((prev) => {
          const next = [...prev, job];
          return maxNotifications ? next.slice(-maxNotifications) : next;
        });
        onTerminalTransition?.(job);
      }

      nextStatuses.set(jobId, job.status);
    });

    previousStatusesRef.current = nextStatuses;
  }, [jobs, maxNotifications, onTerminalTransition]);

  useEffect(() => {
    setNotifications([]);
    previousStatusesRef.current = new Map();
    announcedNotificationsRef.current = new Set();
  }, [resetScope]);

  function dismissNotification(jobId: string | number) {
    const key = String(jobId);
    setNotifications((prev) => prev.filter((item) => String(item.id) !== key));
  }

  return {
    notifications,
    dismissNotification,
  };
}
