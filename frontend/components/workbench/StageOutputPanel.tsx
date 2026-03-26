import { useState } from "react";

import { OutputViewer } from "../OutputViewer";
import { InfoTooltip } from "./InfoTooltip";
import { CompareView } from "./CompareView";
import { GapTableView } from "./GapTableView";
import { ReviewerValidationSummary } from "./ReviewerValidationSummary";
import type { BAAnalysisMode, GapRow, XmlValidationState } from "./types";

type GapFilter = "all" | "full" | "partial" | "missing";

type StageOutputPanelProps = {
  activeWorkflowId: number | null;
  activeAgentTab: "ba" | "dev" | "rev";
  baMode: BAAnalysisMode;
  activeOutputTitle: string;
  hasOutput: boolean;
  metricCards: Array<{ label: string; value: string; tone?: string }>;
  gapSummaryCards: Array<{ key: GapFilter; label: string; value: string; tone: string }>;
  gapFilter: GapFilter;
  setGapFilter: (value: GapFilter) => void;
  filteredGapRows: Array<GapRow & { normalized_status: string }>;
  gapRunId: number | null;
  apiBase: string;
  compareResult: any;
  compareBaselineId: number | "";
  compareChangedId: number | "";
  compareBaselineName: string;
  compareChangedName: string;
  sqlScript: string;
  xmlReport: string;
  reportXmlPreview?: string;
  xmlValidation: XmlValidationState | null;
  onGapRowUpdate?: (newRunId: number) => void;
  readOnly?: boolean;
};

export function StageOutputPanel({
  activeWorkflowId,
  activeAgentTab,
  baMode,
  activeOutputTitle,
  hasOutput,
  metricCards,
  gapSummaryCards,
  gapFilter,
  setGapFilter,
  filteredGapRows,
  gapRunId,
  apiBase,
  compareResult,
  compareBaselineId,
  compareChangedId,
  compareBaselineName,
  compareChangedName,
  sqlScript,
  xmlReport,
  reportXmlPreview = "",
  xmlValidation,
  onGapRowUpdate,
  readOnly = false
}: StageOutputPanelProps) {
  const [showGapResultModal, setShowGapResultModal] = useState(false);
  const baCompareMode = baMode === "psd_psd";
  const showBaSummary = activeAgentTab === "ba" && !baCompareMode && hasOutput;
  const gapFilterLabel = gapFilter === "all" ? "All Fields" : gapFilter === "full" ? "Matching Fields" : gapFilter === "partial" ? "Partial Fields" : "Missing Fields";
  const viewResultLabel = gapFilter === "all" ? "View All Results" : `View ${gapFilterLabel}`;
  const outputStatusLabel = hasOutput ? "Ready" : "Waiting";
  return (
    <>
      <div className="panel output-column-panel">
        <div className="panel-header">
          <div className="panel-title output-panel-title">
            Work Output
            <InfoTooltip
              text={showBaSummary
                ? "Shows the current BA mapping result summary for the selected workflow, including counts by mapping status."
                : activeAgentTab === "dev"
                ? "Shows the current developer-stage deliverable preview, including generated SQL or linked delivery outputs."
                : "Shows the latest reviewer validation output, including schema validation, rule checks, and AI review details."}
              ariaLabel="Work Output information"
            />
          </div>
          <span className={`panel-badge ${hasOutput ? "badge-teal" : "badge-amber"}`}>{outputStatusLabel}</span>
        </div>
        <div className="panel-body">
          <div className="output-subtitle">{activeOutputTitle}</div>

          {showBaSummary ? (
            <div className="summary-cards gap-summary-cards">
              {gapSummaryCards.map((card) => (
                <button
                  key={card.label}
                  className={`summary-card summary-card-clickable ${gapFilter === card.key ? "active" : ""}`}
                  type="button"
                  aria-pressed={gapFilter === card.key}
                  onClick={() => setGapFilter(card.key)}
                >
                  <div className="sc-label">{card.label}</div>
                  <div className={`sc-value ${card.tone || ""}`}>{card.value}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="summary-cards">
              {metricCards.map((card) => (
                <div className="summary-card" key={card.label}>
                  <div className="sc-label">{card.label}</div>
                  <div className={`sc-value ${card.tone || ""}`}>{card.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className={`output-scroll-area ${activeAgentTab === "ba" && !baCompareMode ? "ba-output-scroll" : ""}`}>
            {!hasOutput ? (
              <div className="output-empty">
                <div className="output-empty__icon">AI</div>
                <div className="empty-title">No stage output yet</div>
                <div className="output-empty__text">
                  Run the stage action to generate results. This panel updates automatically when output is ready.
                </div>
              </div>
            ) : activeAgentTab === "dev" ? (
              <OutputViewer title="SQL Preview" language="sql" content={sqlScript || "No SQL generated yet."} />
            ) : activeAgentTab === "rev" ? (
              xmlValidation ? (
                <ReviewerValidationSummary validation={xmlValidation} rawReport={xmlReport} xmlPreview={reportXmlPreview} />
              ) : (
                <OutputViewer
                  title="Submission XML Validation Output"
                  language="json"
                  content={xmlReport || "No validation response yet."}
                  validation={xmlValidation || undefined}
                />
              )
            ) : baCompareMode ? (
              <CompareView
                compareResult={compareResult}
                compareBaselineId={compareBaselineId}
                compareChangedId={compareChangedId}
                compareBaselineName={compareBaselineName}
                compareChangedName={compareChangedName}
              />
            ) : (
              <div className="ba-output-summary">
                <div className="ba-output-summary-copy">
                  <div className="ba-output-summary-title">Result Summary</div>
                  <p>Review the mapping counts here, then open the editable result only when you need row-level detail.</p>
                  <div className="ba-output-summary-meta">Gap Run: {gapRunId || "-"} | Showing: {gapFilterLabel} | Rows: {filteredGapRows.length}</div>
                </div>
                <div className="ba-output-actions">
                  <button className="invoke-btn" onClick={() => setShowGapResultModal(true)} type="button">
                    {viewResultLabel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBaSummary && showGapResultModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Gap analysis result">
          <div className="panel modal-panel gap-result-modal">
            <div className="panel-header">
              <div className="gap-result-modal__header-copy">
                <div className="panel-title">Gap Analysis Result</div>
                <div className="project-message">Gap Run {gapRunId || "-"} | Showing {gapFilterLabel} | {filteredGapRows.length} row(s)</div>
              </div>
              <button className="secondary-btn" onClick={() => setShowGapResultModal(false)} type="button">
                Close
              </button>
            </div>
            <div className="gap-result-modal__toolbar">
              {gapSummaryCards.map((card) => (
                <button
                  key={`modal-${card.key}`}
                  className={`gap-filter-chip ${gapFilter === card.key ? "active" : ""}`}
                  type="button"
                  aria-pressed={gapFilter === card.key}
                  onClick={() => setGapFilter(card.key)}
                >
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </button>
              ))}
            </div>
            <div className="gap-result-modal__body">
              <GapTableView
                key={`${gapRunId || "none"}-${gapFilter}`}
                rows={filteredGapRows}
                gapRunId={gapRunId}
                workflowId={activeWorkflowId}
                apiBase={apiBase}
                onUpdateSuccess={onGapRowUpdate}
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
