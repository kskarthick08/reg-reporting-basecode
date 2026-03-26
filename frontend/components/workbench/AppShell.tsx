 "use client";

import { useEffect, useState, type ReactNode } from "react";

import { ActionIcon } from "./ActionIcon";
import { projectOptionsWithCurrent } from "./projectOptions";
type AppNavIconName = "home" | "jobs" | "admin" | "analytics" | "workflow";

type AppNavItem = {
  key: string;
  label: string;
  icon?: AppNavIconName;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: string | number | null;
};

type AppShellProps = {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  workflowName?: string;
  stageLabel?: string;
  projectId?: string;
  setProjectId?: (value: string) => void;
  backendUp?: boolean | null;
  backendStatusText?: string;
  llmUp?: boolean | null;
  navItems: AppNavItem[];
  headerActions?: ReactNode;
  summaryBar?: ReactNode;
  statusSignal?: { label: string; tone?: "running" | "idle" };
  children: ReactNode;
};

export function AppShell({
  title,
  subtitle,
  backLabel,
  onBack,
  workflowName,
  stageLabel,
  projectId,
  setProjectId,
  backendUp,
  backendStatusText,
  llmUp,
  navItems,
  headerActions,
  summaryBar,
  statusSignal,
  children
}: AppShellProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const projectOptions = projectOptionsWithCurrent(projectId);

  useEffect(() => {
    const saved = window.localStorage.getItem("regai-theme");
    const nextTheme = saved === "dark" || saved === "light" ? saved : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("regai-theme", nextTheme);
  };

  const showBackendStatusBanner = Boolean(
    backendStatusText && !(backendUp === true && llmUp === false)
  );

  return (
    <div className="app-shell bootstrap-workbench container-fluid px-3 px-lg-4 py-3 py-lg-4">
      <aside className="app-shell__sidebar card border-0 shadow-lg">
        <div className="app-shell__brand d-flex align-items-center">
          <img className="brand-logo-mark" src="/brand/regai-logo-mark.svg" alt="Reg Reporting AI logo mark" width={44} height={44} />
          <div className="app-shell__brand-copy">
            <div className="app-shell__brand-kicker">Reg Reporting AI</div>
            <div className="app-shell__brand-name">Workflow Workbench</div>
            <div className="app-shell__brand-subtitle">AI-assisted regulatory delivery</div>
          </div>
        </div>

        <nav className="app-shell__nav nav flex-column" aria-label="Primary">
          {navItems.map((item) => {
            const content = (
              <>
                <span className="app-shell__nav-item-main d-inline-flex align-items-center">
                  {item.icon ? <ActionIcon name={item.icon} className="action-icon" /> : null}
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge !== null && (
                  <span className="app-shell__nav-badge badge rounded-pill">{item.badge}</span>
                )}
              </>
            );

            if (item.href) {
              return (
                <a
                  key={item.key}
                  className={`app-shell__nav-item nav-link d-flex align-items-center justify-content-between ${item.active ? "active" : ""}`}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={item.key}
                className={`app-shell__nav-item nav-link btn btn-link d-flex align-items-center justify-content-between ${item.active ? "active" : ""}`}
                onClick={item.onClick}
                type="button"
                disabled={!item.onClick}
                aria-pressed={item.active ? "true" : "false"}
              >
                {content}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__header card border-0 shadow-sm">
          <div className="app-shell__header-row">
            <div className="app-shell__title-block d-flex align-items-start gap-3">
              {onBack && backLabel ? (
                <button className="secondary-btn btn btn-outline-secondary btn-with-icon app-shell__back" onClick={onBack} type="button">
                  <ActionIcon name="back" className="action-icon" />
                  {backLabel}
                </button>
              ) : null}
              <div>
                <h1>{title}</h1>
                {subtitle ? <p>{subtitle}</p> : null}
              </div>
            </div>

            <div className="app-shell__header-tools">
              <div className="app-shell__control-group">
                <button
                  className="secondary-btn btn btn-outline-secondary btn-with-icon theme-toggle-btn"
                  onClick={toggleTheme}
                  type="button"
                  aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
                >
                  <ActionIcon name={theme === "light" ? "sun" : "moon"} className="action-icon" />
                  {theme === "light" ? "Light" : "Dark"}
                </button>
                {projectId && setProjectId ? (
                  <label className="app-shell__selector d-flex align-items-center gap-2">
                    <span>Workspace</span>
                    <select className="header-select form-select form-select-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                      {projectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {(backendUp !== undefined && backendUp !== null) || (llmUp !== undefined && llmUp !== null) ? (
                <div className="app-shell__status-group">
                  {backendUp !== undefined && backendUp !== null ? (
                    <span className={`health-chip badge rounded-pill ${backendUp ? "up" : "down"}`}>
                      <ActionIcon name="system" className="action-icon" />
                      {backendUp ? "System Up" : "System Down"}
                    </span>
                  ) : null}
                  {llmUp !== undefined && llmUp !== null ? (
                    <span className={`health-chip badge rounded-pill ${llmUp ? "up" : "down"}`}>
                      <ActionIcon name="bot" className="action-icon" />
                      {llmUp ? "Agent Online" : "Agent Offline"}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {headerActions ? <div className="app-shell__header-actions-slot">{headerActions}</div> : null}
            </div>
          </div>

          {showBackendStatusBanner ? <div className="project-message">{backendStatusText}</div> : null}

          {(workflowName || stageLabel || statusSignal) && (
            <div className="app-shell__workflow-context">
              <span className="app-shell__workflow-label">Workflow</span>
              {workflowName ? <strong>{workflowName}</strong> : null}
              {stageLabel ? <span className="panel-badge badge rounded-pill badge-slate">{stageLabel}</span> : null}
              {statusSignal ? (
                <span className={`app-shell__signal badge rounded-pill ${statusSignal.tone || "idle"}`}>
                  <span className="app-shell__signal-dot" />
                  {statusSignal.label}
                </span>
              ) : null}
            </div>
          )}
        </header>

        {summaryBar ? <div className="app-shell__summary card border-0 shadow-sm">{summaryBar}</div> : null}
        <div className="app-shell__content">{children}</div>
      </div>
    </div>
  );
}
