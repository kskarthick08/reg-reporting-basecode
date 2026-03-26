import { useState } from "react";
import { formatConfidence } from "./utils";
import type { GapRow } from "./types";

type GapTableViewProps = {
  rows: Array<GapRow & { normalized_status: string }>;
  gapRunId: number | null;
  workflowId: number | null;
  apiBase: string;
  onUpdateSuccess?: (newRunId: number) => void;
  readOnly?: boolean;
};

function confidenceTone(score: number): "teal" | "amber" | "bad" {
  const n = Number(score);
  if (Number.isNaN(n)) return "bad";
  if (n >= 0.85) return "teal";
  if (n >= 0.6) return "amber";
  return "bad";
}

export function GapTableView({ rows, gapRunId, workflowId, apiBase, onUpdateSuccess, readOnly = false }: GapTableViewProps) {
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editMatchingColumn, setEditMatchingColumn] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (row: GapRow & { normalized_status: string }) => {
    setEditingRef(row.ref);
    setEditStatus(row.status);
    setEditMatchingColumn(row.matching_column || "");
    setError(null);
  };

  const cancelEdit = () => {
    setEditingRef(null);
    setEditStatus("");
    setEditMatchingColumn("");
    setError(null);
  };

  const saveEdit = async (ref: string) => {
    if (!gapRunId || !workflowId) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/v1/gap-analysis/${gapRunId}/update-row`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          ref,
          status: editStatus,
          matching_column: editMatchingColumn
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Update failed" }));
        throw new Error(errorData.detail || "Update failed");
      }

      const result = await response.json();

      if (onUpdateSuccess && result.run_id) {
        await onUpdateSuccess(result.run_id);
      }

      setEditingRef(null);
      setEditStatus("");
      setEditMatchingColumn("");
      setError(null);
      setIsSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update row");
      setIsSaving(false);
    }
  };

  return (
    <>
      {error && (
        <div className="gap-table-error">
          Error: {error}
        </div>
      )}
      <div className="table-wrap gap-table-wrap">
        <table className="gap-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Status</th>
              <th>Score</th>
              <th>Data Field</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isEditing = editingRef === r.ref;
              return (
                <tr key={`${r.ref}-${r.field}`} className={isEditing ? "editing-row" : ""}>
                  <td>
                    <div className="gap-cell gap-cell--field">
                      <div className="gap-row-ref">{r.ref}</div>
                      <div className="gap-row-label">{r.field}</div>
                    </div>
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        disabled={isSaving}
                        className="gap-table-select"
                      >
                        <option value="Full Match">Full Match</option>
                        <option value="Partial Match">Partial Match</option>
                        <option value="Missing">Missing</option>
                      </select>
                    ) : (
                      <span className={`status-pill ${String(r.normalized_status || "").toLowerCase()}`}>
                        {r.normalized_status}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`confidence-pill ${confidenceTone(r.confidence)}`}>
                      {formatConfidence(r.confidence)}
                    </span>
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editMatchingColumn}
                        onChange={(e) => setEditMatchingColumn(e.target.value)}
                        disabled={isSaving}
                        placeholder="e.g., DATASET.FIELD"
                        className="gap-table-input"
                      />
                    ) : (
                      <div className="gap-cell gap-cell--code">
                        {["FULL", "PARTIAL"].includes(r.normalized_status) ? r.matching_column : "-"}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="gap-cell gap-cell--description">{r.description || "-"}</div>
                  </td>
                  <td>
                    {isEditing ? (
                      <div className="gap-table-actions">
                        <button
                          onClick={() => saveEdit(r.ref)}
                          disabled={isSaving}
                          className="gap-table-btn gap-table-btn-save"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="gap-table-btn gap-table-btn-cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(r)}
                        disabled={readOnly}
                        className={`gap-table-btn gap-table-btn-edit ${readOnly ? "disabled" : ""}`}
                        title={readOnly ? "Read-only mode: This workflow has been submitted to the next stage" : "Edit this row"}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>No rows for selected filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="output-links">
        {gapRunId && (
          <a className="header-link-btn" href={`${apiBase}/v1/gap-analysis/${gapRunId}/export?format=csv`} target="_blank" rel="noopener noreferrer">
            Download Gap CSV
          </a>
        )}
        {gapRunId && (
          <a className="header-link-btn" href={`${apiBase}/v1/gap-analysis/${gapRunId}/export?format=json`} target="_blank" rel="noopener noreferrer">
            Download Gap JSON
          </a>
        )}
      </div>
    </>
  );
}
