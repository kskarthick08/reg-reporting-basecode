import { type ReactNode, useMemo, useState } from "react";
import { StageOutputPanel } from "./StageOutputPanel";
import { SupportAssistant } from "./SupportAssistant";
import type { BAAnalysisMode, GapRow, XmlValidationState } from "./types";
import { formatStatus } from "./utils";

type AuditEntry = {
  id: number;
  level: "info" | "success" | "warn";
  text: string;
  at: string;
};

type ChatModelOption = {
  value: string;
  label: string;
};

type GapFilter = "all" | "full" | "partial" | "missing";

type WorkbenchInsightsProps = {
  activeWorkflowId: number | null;
  activeAgentTab: "ba" | "dev" | "rev";
  baMode: BAAnalysisMode;
  activeOutputTitle: string;
  gapRows: GapRow[];
  uploadCount: number;
  validationCount: number;
  reportCount: number;
  pendingCount: number;
  gapRunId: number | null;
  gapRowsCount: number;
  modelArtifactId: number | "";
  compareBaselineId: number | "";
  compareChangedId: number | "";
  compareBaselineName: string;
  compareChangedName: string;
  compareResult: any;
  sqlScript: string;
  xmlReport: string;
  reportXmlPreview?: string;
  xmlValidation: XmlValidationState | null;
  auditTrail: AuditEntry[];
  chatInput: string;
  chatBusy: boolean;
  chatIncludeAll: boolean;
  chatModel: string;
  chatModelOptions: ChatModelOption[];
  chatResponse: string;
  chatHistory: Array<{ id: number; role: "user" | "assistant"; text: string; at: string }>;
  setChatInput: (value: string) => void;
  setChatIncludeAll: (value: boolean) => void;
  setChatModel: (value: string) => void;
  clearChatHistory: () => void;
  runContextChat: () => Promise<void>;
  apiBase: string;
  showSecondaryInsights: boolean;
  onGapRowUpdate?: (newRunId: number) => void;
  readOnly?: boolean;
  actionPanel?: ReactNode;
};

export function WorkbenchInsights({
  activeWorkflowId,
  activeAgentTab,
  baMode,
  activeOutputTitle,
  gapRows,
  uploadCount,
  validationCount,
  reportCount,
  pendingCount,
  gapRunId,
  gapRowsCount,
  modelArtifactId,
  compareBaselineId,
  compareChangedId,
  compareBaselineName,
  compareChangedName,
  compareResult,
  sqlScript,
  xmlReport,
  reportXmlPreview = "",
  xmlValidation,
  auditTrail,
  chatInput,
  chatBusy,
  chatIncludeAll,
  chatModel,
  chatModelOptions,
  chatResponse,
  chatHistory,
  setChatInput,
  setChatIncludeAll,
  setChatModel,
  clearChatHistory,
  runContextChat,
  apiBase,
  showSecondaryInsights,
  onGapRowUpdate,
  readOnly = false,
  actionPanel
}: WorkbenchInsightsProps) {
  const [gapFilter, setGapFilter] = useState<GapFilter>("all");
  const baCompareMode = baMode === "psd_psd";
  const hasBaOutput = baCompareMode ? Boolean(compareResult) : Boolean(gapRunId);
  const hasDevOutput = Boolean(sqlScript && sqlScript.trim());
  const hasRevOutput = Boolean(xmlValidation);
  const hasOutput = activeAgentTab === "ba" ? hasBaOutput : activeAgentTab === "dev" ? hasDevOutput : hasRevOutput;
  const metricCards =
    activeAgentTab === "ba"
      ? baCompareMode
        ? [
            { label: "Baseline PSD", value: compareBaselineName || (compareBaselineId ? `Artifact ${String(compareBaselineId)}` : "-") },
            { label: "Changed PSD", value: compareChangedName || (compareChangedId ? `Artifact ${String(compareChangedId)}` : "-") },
            { label: "Added", value: String(compareResult?.comparison?.added_count ?? 0), tone: compareResult?.comparison?.added_count ? "amber" : "" },
            { label: "Removed", value: String(compareResult?.comparison?.removed_count ?? 0), tone: compareResult?.comparison?.removed_count ? "amber" : "" }
          ]
        : [
            { label: "Gap Run", value: gapRunId ? String(gapRunId) : "-" },
            { label: "Gap Rows", value: String(gapRowsCount) },
            { label: "Missing", value: String(pendingCount), tone: "amber" },
            { label: "Mapped", value: String(Math.max(0, gapRowsCount - pendingCount)) }
          ]
      : activeAgentTab === "dev"
        ? [
            { label: "Gap Run", value: gapRunId ? String(gapRunId) : "-" },
            { label: "SQL Run", value: reportCount > 0 ? "Available" : "Pending" },
            { label: "SQL Lines", value: sqlScript ? String(sqlScript.split(/\r?\n/).length) : "0" },
            { label: "Model Artifact", value: modelArtifactId ? String(modelArtifactId) : "-" }
          ]
        : [
            { label: "XML Run", value: xmlValidation?.run_id ? `Run ${xmlValidation.run_id}` : hasRevOutput ? "Available" : "Pending" },
            { label: "Validation", value: xmlValidation ? (xmlValidation.pass ? "Pass" : "Fail") : "-", tone: xmlValidation && !xmlValidation.pass ? "amber" : "" },
            {
              label: "Errors",
              value: String(xmlValidation?.error_details?.length || xmlValidation?.errors?.length || 0),
              tone: (xmlValidation?.error_details?.length || xmlValidation?.errors?.length || 0) > 0 ? "amber" : ""
            },
            { label: "Reports", value: String(reportCount) }
          ];
  const gapStatusRows = useMemo(() => {
    return gapRows.map((r) => {
      const normalized = formatStatus(r.status);
      return { ...r, normalized_status: normalized };
    });
  }, [gapRows]);

  const gapCounts = useMemo(() => {
    const full = gapStatusRows.filter((r) => r.normalized_status === "FULL").length;
    const partial = gapStatusRows.filter((r) => r.normalized_status === "PARTIAL").length;
    const missing = gapStatusRows.filter((r) => r.normalized_status === "MISSING").length;
    return { total: gapStatusRows.length, full, partial, missing };
  }, [gapStatusRows]);

  const filteredGapRows = useMemo(() => {
    if (gapFilter === "all") return gapStatusRows;
    if (gapFilter === "full") return gapStatusRows.filter((r) => r.normalized_status === "FULL");
    if (gapFilter === "partial") return gapStatusRows.filter((r) => r.normalized_status === "PARTIAL");
    return gapStatusRows.filter((r) => r.normalized_status === "MISSING");
  }, [gapFilter, gapStatusRows]);

  const gapSummaryCards = [
    { key: "all" as const, label: "Total Required Fields", value: String(gapCounts.total), tone: "" },
    { key: "full" as const, label: "Matching", value: String(gapCounts.full), tone: "teal" },
    { key: "partial" as const, label: "Partial", value: String(gapCounts.partial), tone: "amber" },
    { key: "missing" as const, label: "Missing", value: String(gapCounts.missing), tone: "bad" }
  ];

  return (
    <aside className="workbench-insights-stack">
      <StageOutputPanel
        activeWorkflowId={activeWorkflowId}
        activeAgentTab={activeAgentTab}
        baMode={baMode}
        activeOutputTitle={activeOutputTitle}
        hasOutput={hasOutput}
        metricCards={metricCards}
        gapSummaryCards={gapSummaryCards}
        gapFilter={gapFilter}
        setGapFilter={setGapFilter}
        filteredGapRows={filteredGapRows}
        gapRunId={gapRunId}
        apiBase={apiBase}
        compareResult={compareResult}
        compareBaselineId={compareBaselineId}
        compareChangedId={compareChangedId}
        compareBaselineName={compareBaselineName}
        compareChangedName={compareChangedName}
        sqlScript={sqlScript}
        xmlReport={xmlReport}
        reportXmlPreview={reportXmlPreview}
        xmlValidation={xmlValidation}
        onGapRowUpdate={onGapRowUpdate}
        readOnly={readOnly}
      />

      {actionPanel}

      {showSecondaryInsights && (
        <details className="workflow-action-section" open>
          <summary className="workflow-action-section__summary">
            <div>
              <div className="workflow-action-section__title">Workflow Audit Trail ({auditTrail.length})</div>
              <div className="workflow-action-section__subtitle">Activity history for this workflow session.</div>
            </div>
          </summary>
          <div className="workflow-action-section__body">
            <div className="audit-timeline">
              {auditTrail.length === 0 ? (
                <div className="workflow-empty">No activity yet.</div>
              ) : (
                auditTrail.map((item) => (
                  <div className="audit-item" key={item.id}>
                    <div className={`audit-dot ${item.level === "success" ? "teal" : item.level === "warn" ? "amber" : ""}`} />
                    <div className="audit-time">{item.at}</div>
                    <div className="audit-msg">{item.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </details>
      )}

      <SupportAssistant
        chatInput={chatInput}
        chatBusy={chatBusy}
        chatIncludeAll={chatIncludeAll}
        chatModel={chatModel}
        chatModelOptions={chatModelOptions}
        chatHistory={chatHistory}
        setChatInput={setChatInput}
        setChatIncludeAll={setChatIncludeAll}
        setChatModel={setChatModel}
        clearChatHistory={clearChatHistory}
        runContextChat={runContextChat}
      />
    </aside>
  );
}
