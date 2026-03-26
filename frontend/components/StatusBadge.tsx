import { ReactNode } from "react";

type StatusBadgeProps = {
  status: "idle" | "ready" | "running" | "done" | "error";
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function StatusBadge({ status, children, size = "md", className }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-${status} size-${size} ${className || ""}`.trim()}>
      {status === "running" && <span className="status-icon spin" aria-hidden="true" />}
      {status === "error" && <span className="status-icon label" aria-hidden="true">ERR</span>}
      {status === "ready" && <span className="status-icon label" aria-hidden="true">ON</span>}
      {status === "done" && <span className="status-icon label" aria-hidden="true">OK</span>}
      {children}
    </span>
  );
}
