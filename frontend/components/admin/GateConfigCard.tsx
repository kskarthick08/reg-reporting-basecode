/**
 * Gate Configuration Card Component
 * Displays and manages gate settings for a single workflow stage.
 */
"use client";

import { useState } from "react";

export type GateConfig = {
  id: number | null;
  project_id: string;
  stage: "BA" | "DEV" | "REVIEWER";
  gate_enabled: boolean;
  allow_unresolved_missing: boolean;
  allow_degraded_quality: boolean;
  require_sql_validation: boolean;
  require_xml_artifact: boolean;
  min_coverage_score: number;
  require_xsd_validation: boolean;
  require_rule_checks: boolean;
  updated_by: string | null;
  updated_at: string | null;
};

type Props = {
  config: GateConfig;
  onUpdate: (stage: string, updates: Partial<GateConfig>) => Promise<void>;
  onReset: (stage: string) => Promise<void>;
  busy: boolean;
};

export default function GateConfigCard({ config, onUpdate, onReset, busy }: Props) {
  const [localConfig, setLocalConfig] = useState(config);
  const [hasChanges, setHasChanges] = useState(false);
  const stageDescription =
    config.stage === "BA"
      ? "Controls mapping quality and unresolved requirement handling."
      : config.stage === "DEV"
        ? "Controls SQL and submission artifact readiness before review."
        : "Controls validation strictness and quality threshold before completion.";

  const updateLocal = (field: keyof GateConfig, value: any) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const updates: Partial<GateConfig> = {};
    if (localConfig.gate_enabled !== config.gate_enabled) {
      updates.gate_enabled = localConfig.gate_enabled;
    }
    if (localConfig.allow_unresolved_missing !== config.allow_unresolved_missing) {
      updates.allow_unresolved_missing = localConfig.allow_unresolved_missing;
    }
    if (localConfig.allow_degraded_quality !== config.allow_degraded_quality) {
      updates.allow_degraded_quality = localConfig.allow_degraded_quality;
    }
    if (localConfig.require_sql_validation !== config.require_sql_validation) {
      updates.require_sql_validation = localConfig.require_sql_validation;
    }
    if (localConfig.require_xml_artifact !== config.require_xml_artifact) {
      updates.require_xml_artifact = localConfig.require_xml_artifact;
    }
    if (localConfig.min_coverage_score !== config.min_coverage_score) {
      updates.min_coverage_score = localConfig.min_coverage_score;
    }
    if (localConfig.require_xsd_validation !== config.require_xsd_validation) {
      updates.require_xsd_validation = localConfig.require_xsd_validation;
    }
    if (localConfig.require_rule_checks !== config.require_rule_checks) {
      updates.require_rule_checks = localConfig.require_rule_checks;
    }

    if (Object.keys(updates).length > 0) {
      await onUpdate(config.stage, updates);
      setHasChanges(false);
    }
  };

  const handleReset = async () => {
    await onReset(config.stage);
    setLocalConfig(config);
    setHasChanges(false);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">{config.stage} Stage Gate</div>
        <div className="gate-status-badge">
          {localConfig.gate_enabled ? (
            <span className="badge-success">Enabled</span>
          ) : (
            <span className="badge-warning">Disabled</span>
          )}
        </div>
      </div>

      <div className="gate-config-content">
        <div className="gate-intro">
          <div className="gate-intro__text">{stageDescription}</div>
          <div className="gate-intro__chips">
            <span className="panel-badge badge-slate">Stage: {config.stage}</span>
            <span className={`panel-badge ${localConfig.gate_enabled ? "badge-teal" : "badge-amber"}`}>
              {localConfig.gate_enabled ? "Gate Active" : "Gate Disabled"}
            </span>
          </div>
        </div>
        <div className="gate-control-row">
          <label className="gate-control-label">
            <input
              type="checkbox"
              checked={localConfig.gate_enabled}
              onChange={(e) => updateLocal("gate_enabled", e.target.checked)}
              disabled={busy}
            />
            <span>Enable Gate Validation</span>
          </label>
        </div>

        {config.stage === "BA" && (
          <>
            <div className="gate-section-title">BA Gate Settings</div>
            <div className="gate-control-row">
              <label className="gate-control-label">
                <input
                  type="checkbox"
                  checked={localConfig.allow_unresolved_missing}
                  onChange={(e) => updateLocal("allow_unresolved_missing", e.target.checked)}
                  disabled={busy || !localConfig.gate_enabled}
                />
                <span>Allow Unresolved Missing Fields</span>
              </label>
            </div>
            <div className="gate-control-row">
              <label className="gate-control-label">
                <input
                  type="checkbox"
                  checked={localConfig.allow_degraded_quality}
                  onChange={(e) => updateLocal("allow_degraded_quality", e.target.checked)}
                  disabled={busy || !localConfig.gate_enabled}
                />
                <span>Allow Degraded Quality Analysis</span>
              </label>
            </div>
          </>
        )}

        {config.stage === "DEV" && (
          <>
            <div className="gate-section-title">DEV Gate Settings</div>
            <div className="gate-control-row">
              <label className="gate-control-label">
                <input
                  type="checkbox"
                  checked={localConfig.require_sql_validation}
                  onChange={(e) => updateLocal("require_sql_validation", e.target.checked)}
                  disabled={busy || !localConfig.gate_enabled}
                />
                <span>Require SQL Validation</span>
              </label>
            </div>
            <div className="gate-control-row">
              <label className="gate-control-label">
                <input
                  type="checkbox"
                  checked={localConfig.require_xml_artifact}
                  onChange={(e) => updateLocal("require_xml_artifact", e.target.checked)}
                  disabled={busy || !localConfig.gate_enabled}
                />
                <span>Require Report XML Artifact</span>
              </label>
            </div>
          </>
        )}

        {config.stage === "REVIEWER" && (
          <>
            <div className="gate-section-title">REVIEWER Gate Settings</div>
            <div className="gate-control-row">
              <label className="gate-control-label">
                <span>Minimum Coverage Score</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localConfig.min_coverage_score}
                  onChange={(e) => {
                    const parsed = Number.parseFloat(e.target.value);
                    updateLocal("min_coverage_score", Number.isNaN(parsed) ? 0 : parsed);
                  }}
                  disabled={busy || !localConfig.gate_enabled}
                  className="gate-number-input"
                />
                <span className="gate-meta">({(localConfig.min_coverage_score * 100).toFixed(0)}%)</span>
              </label>
            </div>
            <div className="gate-control-row">
              <label className="gate-control-label">
                <input
                  type="checkbox"
                  checked={localConfig.require_xsd_validation}
                  onChange={(e) => updateLocal("require_xsd_validation", e.target.checked)}
                  disabled={busy || !localConfig.gate_enabled}
                />
                <span>Require XSD Validation</span>
              </label>
            </div>
            <div className="gate-control-row">
              <label className="gate-control-label">
                <input
                  type="checkbox"
                  checked={localConfig.require_rule_checks}
                  onChange={(e) => updateLocal("require_rule_checks", e.target.checked)}
                  disabled={busy || !localConfig.gate_enabled}
                />
                <span>Require Rule Checks</span>
              </label>
            </div>
          </>
        )}

        <div className="gate-meta-info">
          {config.updated_by && config.updated_at ? (
            <span>
              Last updated by {config.updated_by} at {new Date(config.updated_at).toLocaleString()}
            </span>
          ) : (
            <span>Using default configuration</span>
          )}
        </div>

        <div className="gate-actions">
          <button className="header-btn" onClick={handleSave} disabled={busy || !hasChanges}>
            {hasChanges ? "Save Changes" : "No Changes"}
          </button>
          <button className="secondary-btn" onClick={handleReset} disabled={busy || config.id === null}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
