import { useEffect, useState } from "react";
import type { WorkflowItem, WorkflowVersionCreateInput } from "./types";

type CreateWorkflowVersionModalProps = {
  open: boolean;
  workflow: WorkflowItem | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: WorkflowVersionCreateInput) => Promise<void>;
};

export function CreateWorkflowVersionModal({
  open,
  workflow,
  busy,
  onClose,
  onSubmit
}: CreateWorkflowVersionModalProps) {
  const [name, setName] = useState("");
  const [psdVersion, setPsdVersion] = useState("");
  const [reuseLatestGapRun, setReuseLatestGapRun] = useState(true);
  const [reuseFunctionalSpec, setReuseFunctionalSpec] = useState(true);
  const [cloneUnresolvedOnly, setCloneUnresolvedOnly] = useState(false);

  useEffect(() => {
    if (!workflow || !open) return;
    setName(workflow.name ? `${workflow.name} - New Version` : "New Workflow Version");
    setPsdVersion(workflow.psd_version || "");
    setReuseLatestGapRun(true);
    setReuseFunctionalSpec(true);
    setCloneUnresolvedOnly(false);
  }, [workflow, open]);

  if (!open || !workflow) return null;
  const canSubmit = Boolean(name.trim());

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Create workflow version">
      <div className="panel modal-panel workflow-version-modal">
        <div className="agent-head">
          <h2>Create Workflow Version</h2>
        </div>
        <p className="workflow-version-modal__lead">Create a new version while optionally carrying forward validated baseline context.</p>
        <div className="workflow-card-meta workflow-version-modal__baseline">
          <span><strong>Baseline Workflow ID:</strong> {workflow.id}</span>
          <span><strong>Baseline Name:</strong> {workflow.name}</span>
          <span><strong>Baseline PSD:</strong> {workflow.psd_version || "-"}</span>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Version Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow version name" />
          </div>
          <div className="field">
            <label>New PSD Version (optional)</label>
            <input value={psdVersion} onChange={(e) => setPsdVersion(e.target.value)} placeholder="PSD version label" />
          </div>
        </div>
        <div className="field workflow-version-modal__carry-forward">
          <label>Carry Forward Options</label>
          <div className="workflow-card-meta">
            <label className="checkbox-line">
              <input type="checkbox" checked={reuseLatestGapRun} onChange={(e) => setReuseLatestGapRun(e.target.checked)} />
              Reuse latest Requirement-to-Data Mapping run
            </label>
            <label className="checkbox-line">
              <input type="checkbox" checked={reuseFunctionalSpec} onChange={(e) => setReuseFunctionalSpec(e.target.checked)} />
              Reuse latest Regulatory Mapping Specification
            </label>
            <label className="checkbox-line">
              <input type="checkbox" checked={cloneUnresolvedOnly} onChange={(e) => setCloneUnresolvedOnly(e.target.checked)} />
              Clone unresolved-only context from prior mapping
            </label>
          </div>
        </div>
        <div className="workflow-card-actions">
          <button className="header-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="invoke-btn"
            disabled={!canSubmit || busy}
            onClick={async () => {
              await onSubmit({
                workflowId: workflow.id,
                name: name.trim(),
                psdVersion: psdVersion.trim() || undefined,
                reuseLatestGapRun,
                reuseFunctionalSpec,
                cloneUnresolvedOnly
              });
            }}
          >
            Create Version
          </button>
        </div>
      </div>
    </div>
  );
}
