import { OutputViewer } from "../OutputViewer";

type CompareViewProps = {
  compareResult: any;
  compareBaselineId: number | "";
  compareChangedId: number | "";
  compareBaselineName: string;
  compareChangedName: string;
};

export function CompareView({
  compareResult,
  compareBaselineId,
  compareChangedId,
  compareBaselineName,
  compareChangedName
}: CompareViewProps) {
  return (
    <div className="compare-pretty">
      <div className="compare-header">
        <div className="compare-header__title">PSD Comparison Snapshot</div>
        <div className="compare-header__meta">
          <span>Baseline: {compareBaselineName || compareBaselineId || "-"}</span>
          <span>Changed: {compareChangedName || compareChangedId || "-"}</span>
        </div>
      </div>
      <div className="compare-strip">
        <div className="compare-chip">
          <span>Added</span>
          <strong>{compareResult?.comparison?.added_count ?? 0}</strong>
        </div>
        <div className="compare-chip">
          <span>Removed</span>
          <strong>{compareResult?.comparison?.removed_count ?? 0}</strong>
        </div>
        <div className="compare-chip">
          <span>Unchanged</span>
          <strong>{compareResult?.comparison?.unchanged_count ?? 0}</strong>
        </div>
      </div>

      {!!compareResult?.llm_summary && (
        <div className="compare-summary-card">
          <div className="compare-title">Impact Summary</div>
          <div className="compare-text">{compareResult.llm_summary}</div>
        </div>
      )}

      <div className="compare-lists">
        <div className="compare-list-block">
          <div className="compare-title">Added Requirements</div>
          {(compareResult?.added_lines || []).length === 0 ? (
            <div className="compare-empty">No added requirements detected.</div>
          ) : (
            <ul className="compare-list">
              {(compareResult?.added_lines || []).slice(0, 20).map((line: string, idx: number) => (
                <li key={`add-${idx}`}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="compare-list-block">
          <div className="compare-title">Removed Requirements</div>
          {(compareResult?.removed_lines || []).length === 0 ? (
            <div className="compare-empty">No removed requirements detected.</div>
          ) : (
            <ul className="compare-list">
              {(compareResult?.removed_lines || []).slice(0, 20).map((line: string, idx: number) => (
                <li key={`rem-${idx}`}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <details className="advanced-block">
        <summary>View raw compare JSON</summary>
        <OutputViewer title="PSD Compare Response (Raw)" language="json" content={JSON.stringify(compareResult || {}, null, 2) || "No response available."} />
      </details>
      <div className="output-links">
        <a
          className="header-link-btn"
          href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(compareResult || {}, null, 2))}`}
          download={`psd_compare_${compareBaselineId || "base"}_vs_${compareChangedId || "changed"}.json`}
        >
          Download Compare JSON
        </a>
        <a
          className="header-link-btn"
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(
            [
              `Baseline: ${compareBaselineName || compareBaselineId || "-"}`,
              `Changed: ${compareChangedName || compareChangedId || "-"}`,
              `Added: ${compareResult?.comparison?.added_count ?? 0}`,
              `Removed: ${compareResult?.comparison?.removed_count ?? 0}`,
              `Unchanged: ${compareResult?.comparison?.unchanged_count ?? 0}`,
              "",
              "Impact Summary:",
              compareResult?.llm_summary || "N/A"
            ].join("\n")
          )}`}
          download={`psd_compare_summary_${compareBaselineId || "base"}_vs_${compareChangedId || "changed"}.txt`}
        >
          Download Summary
        </a>
      </div>
    </div>
  );
}
