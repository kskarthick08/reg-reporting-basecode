import type { ReactNode } from "react";

type WorkflowStageTransitionProps = {
  eyebrow: string;
  title: string;
  transitionLabel: string;
  statusLabel: string;
  isReady: boolean;
  isBusy?: boolean;
  readOnly?: boolean;
  actionButtonLabel: string;
  onAction?: () => void;
  warningMessage?: string;
  readyMessage?: string;
  notReadyMessage?: string;
  exitCheckStatus: string;
  exitCheckMessage?: ReactNode;
  deliverableLabel: string;
  deliverableButtons?: ReactNode;
  primaryActions?: ReactNode;
  primaryActionsLabel?: string;
  chips?: Array<{ label: string; type: "good" | "warn" | "neutral" }>;
};

export function WorkflowStageTransition({
  eyebrow,
  title,
  transitionLabel,
  statusLabel,
  isReady,
  isBusy = false,
  readOnly = false,
  actionButtonLabel,
  onAction,
  warningMessage,
  readyMessage = "Everything needed for this transition is in place.",
  notReadyMessage,
  exitCheckStatus,
  exitCheckMessage,
  deliverableLabel,
  deliverableButtons,
  primaryActions,
  primaryActionsLabel,
  chips = []
}: WorkflowStageTransitionProps) {
  return (
    <section className="panel workflow-action-panel work-stage-panel">
      <div className="workflow-action-stage-transition">
        <div className="workflow-action-hero__summary">
          <div className="workflow-action-bar__eyebrow">{eyebrow}</div>
          <div className="workflow-action-bar__title">{title}</div>
          <div className="workflow-action-hero__meta">
            <span>{transitionLabel}</span>
            <span>{statusLabel}</span>
          </div>
          <div className="workflow-action-bar__chips">
            {chips.map((chip, index) => (
              <span key={index} className={`workflow-action-chip ${chip.type}`}>
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="workflow-action-split-layout">
        <div className="workflow-action-split-right">
          <div className="workflow-action-right-panel">
            <button
              className={`invoke-btn workflow-final-btn btn-with-icon ${!isReady ? "is-blocked" : ""}`}
              disabled={isBusy || !isReady || readOnly}
              aria-disabled={!isReady}
              title={isReady ? actionButtonLabel : warningMessage}
              onClick={onAction}
            >
              <svg className="action-icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 8h9.5"></path>
                <path d="m8.5 3.5 4 4.5-4 4.5"></path>
              </svg>
              {actionButtonLabel}
            </button>
            <div className={`workflow-next-step ${!isReady ? "warn" : "ready"}`}>
              {isReady ? readyMessage : notReadyMessage}
            </div>
            {!isReady && warningMessage && (
              <div className="workflow-submit-warning" role="alert">
                <strong>Warning:</strong> {warningMessage}
              </div>
            )}

            {primaryActions && (
              <div className="workflow-action-group">
                <div className="workflow-action-group__label">{primaryActionsLabel}</div>
                <div className="workflow-primary-actions workflow-primary-actions--ba">
                  {primaryActions}
                </div>
              </div>
            )}

            <div className="workflow-action-buttons workflow-action-buttons-compact workflow-support-actions">
              <button className="secondary-btn btn-with-icon workflow-support-btn">
                <svg className="action-icon" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2.5 4.5h11v7h-11z"></path>
                  <path d="M2.5 7.5h11"></path>
                  <path d="M5.25 10h1.5M9.25 10h1.5"></path>
                </svg>
                Artifacts
              </button>
            </div>
          </div>

          <details className="workflow-action-section" open={!isReady}>
            <summary className="workflow-action-section__summary">
              <div>
                <div className="workflow-action-section__title">Exit Check</div>
                <div className="workflow-action-section__subtitle">Only the final blockers and quality signals for this transition.</div>
              </div>
              <span className={`panel-badge ${isReady ? "badge-teal" : "badge-amber"}`}>
                {isReady ? "Ready" : "Attention"}
              </span>
            </summary>
            <div className="workflow-action-section__body">
              <div className="workflow-transition-brief">
                <div className="workflow-transition-brief__item">
                  <span>Transition</span>
                  <strong>{transitionLabel}</strong>
                </div>
                <div className="workflow-transition-brief__item">
                  <span>Owner</span>
                  <strong>Assigned to you</strong>
                </div>
                <div className="workflow-transition-brief__item">
                  <span>Status</span>
                  <strong>{exitCheckStatus}</strong>
                </div>
              </div>
              {exitCheckMessage}
            </div>
          </details>

          <details className="workflow-action-section" open>
            <summary className="workflow-action-section__summary">
              <div>
                <div className="workflow-action-section__title">Deliverables</div>
                <div className="workflow-action-section__subtitle">Publish, download, or inspect the current handoff asset from here.</div>
              </div>
            </summary>
            <div className="workflow-action-section__body">
              <div className="workflow-deliverable-highlight">
                <span>Current handoff asset</span>
                <strong>{deliverableLabel}</strong>
              </div>
              {deliverableButtons}
              <div className="workflow-action-buttons workflow-action-buttons-compact workflow-support-actions">
                <button className="secondary-btn btn-with-icon workflow-support-btn" disabled={!isReady}>
                  <svg className="action-icon" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M2.5 4.5h11v7h-11z"></path>
                    <path d="M2.5 7.5h11"></path>
                    <path d="M5.25 10h1.5M9.25 10h1.5"></path>
                  </svg>
                  View linked artifacts
                </button>
              </div>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
