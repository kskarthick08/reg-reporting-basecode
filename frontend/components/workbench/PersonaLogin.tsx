import { ActionIcon } from "./ActionIcon";
import type { Persona } from "./types";

type PersonaLoginProps = {
  onSelectPersona: (persona: Persona) => void;
};

export function PersonaLogin({ onSelectPersona }: PersonaLoginProps) {
  return (
    <section className="panel persona-login-panel">
      <div className="persona-login-hero">
        <img 
          className="brand-logo-mark" 
          src="/brand/GlobalLogo_NTTDATA_FutureBlue_RGB.png" 
          alt="NTT DATA logo" 
          style={{ width: 'auto', height: '60px', maxWidth: '280px', objectFit: 'contain' }}
        />
        <div className="persona-login-copy">
          <div className="persona-login-kicker">AI-Assisted Regulatory Delivery</div>
          <div className="persona-login-brand">
            <div className="persona-login-brand__name">Regulatory Compliance Workbench</div>
            <div className="persona-login-brand__sub">Intelligent Workflow Platform</div>
          </div>
        </div>
      </div>
      <h2 className="persona-login-title">Choose Your Workspace</h2>
      <p className="persona-login-subtitle">Each role opens a focused view with the right actions and checks.</p>
      <div className="persona-login-grid">
        <button className="invoke-btn persona-role-btn persona-role-btn--ba" onClick={() => onSelectPersona("BA")}>
          <span className="persona-role-btn__icon">
            <ActionIcon name="ba" className="action-icon" />
          </span>
          <span className="persona-role-btn__label">Open BA Workspace</span>
          <small className="persona-role-btn__meta">Mapping and requirement decomposition</small>
        </button>
        <button className="invoke-btn persona-role-btn persona-role-btn--dev" onClick={() => onSelectPersona("DEV")}>
          <span className="persona-role-btn__icon">
            <ActionIcon name="dev" className="action-icon" />
          </span>
          <span className="persona-role-btn__label">Open DEV Workspace</span>
          <small className="persona-role-btn__meta">Build SQL and delivery artifacts</small>
        </button>
        <button className="invoke-btn persona-role-btn persona-role-btn--reviewer" onClick={() => onSelectPersona("REVIEWER")}>
          <span className="persona-role-btn__icon">
            <ActionIcon name="reviewer" className="action-icon" />
          </span>
          <span className="persona-role-btn__label">Open Reviewer Workspace</span>
          <small className="persona-role-btn__meta">Validate XML, rules, and coverage</small>
        </button>
      </div>
      <div className="persona-login-platform">
        <a className="persona-link-card" href="/admin">
          <span className="persona-link-card__icon"><ActionIcon name="admin" className="action-icon" /></span>
          <span className="persona-link-card__copy">
            <strong>Admin Console</strong>
            <small>Govern workflows, artifacts, and stage rules</small>
          </span>
        </a>
        <a className="persona-link-card" href="/analytics">
          <span className="persona-link-card__icon"><ActionIcon name="analytics" className="action-icon" /></span>
          <span className="persona-link-card__copy">
            <strong>Analytics</strong>
            <small>Monitor throughput, quality, and workflow health</small>
          </span>
        </a>
      </div>
    </section>
  );
}
