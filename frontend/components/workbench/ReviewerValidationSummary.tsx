import type { XmlValidationState } from "./types";

type ReviewerValidationSummaryProps = {
  validation: XmlValidationState;
  rawReport?: string;
  xmlPreview?: string;
};

function asNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

export function ReviewerValidationSummary({ validation, rawReport, xmlPreview }: ReviewerValidationSummaryProps) {
  const display = validation.display || {};
  const ruleChecks = validation.rule_checks || {};
  const aiReview = validation.ai_review || {};
  const xsdErrors = Array.isArray(validation.error_details) ? validation.error_details : [];
  const aiIssues = asList(aiReview.issues);
  const aiSuggestions = asList(aiReview.suggestions);
  const missingFields = asList(ruleChecks.required_field_missing);
  const topErrors = Array.isArray(display.top_errors) && display.top_errors.length > 0 ? display.top_errors : xsdErrors.slice(0, 8);
  const actionItems = asList(display.action_items);
  const runId = validation.run_id;
  const coverageScore = aiReview.coverage_score ?? ruleChecks.required_field_coverage_pct ?? 0;
  const summaryCards = [
    { label: "Latest run", value: runId ? `Run ${runId}` : "Latest" },
    { label: "Overall", value: String(display.status || (validation.pass ? "PASS" : "REVIEW_REQUIRED")).replaceAll("_", " ") },
    { label: "Coverage score", value: `${asNumber(coverageScore)}%` },
    { label: "Required coverage", value: `${asNumber(ruleChecks.required_field_coverage_pct)}%` },
    { label: "Schema errors", value: String(asNumber(display.error_count) || xsdErrors.length) },
  ];

  return (
    <div className="review-output">
      <div className="review-output__hero">
        <div>
          <h3>{validation.pass ? "Validation passed" : "Review required"}</h3>
          <p>{String(display.summary || aiReview.rationale || "Validation completed. Review the findings below.")}</p>
        </div>
        <div className={`review-output__status ${validation.pass ? "pass" : "warn"}`}>
          {validation.pass ? "PASS" : "REVIEW"}
        </div>
      </div>

      <div className="review-output__cards">
        {summaryCards.map((card) => (
          <div className="review-output__card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="review-output__grid">
        <section className="review-output__section">
          <div className="review-output__section-title">Validation Checks</div>
          <div className="review-output__mini-grid">
            <div className="review-output__mini-card">
              <span>XSD structure</span>
              <strong>{display.xsd_pass ? "Pass" : "Fail"}</strong>
            </div>
            <div className="review-output__mini-card">
              <span>Rule checks</span>
              <strong>{display.rule_checks_pass ? "Pass" : "Review required"}</strong>
            </div>
            <div className="review-output__mini-card">
              <span>Matched required fields</span>
              <strong>{asNumber(ruleChecks.required_field_matched)} / {asNumber(ruleChecks.required_field_total)}</strong>
            </div>
          </div>
        </section>

        <section className="review-output__section">
          <div className="review-output__section-title">Missing Or Mismatched Items</div>
          {missingFields.length > 0 ? (
            <ul className="review-output__list">
              {missingFields.slice(0, 12).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <div className="review-output__empty">No missing required PSD fields were flagged by the rule checks.</div>
          )}
        </section>
      </div>

      <div className="review-output__grid">
        <section className="review-output__section">
          <div className="review-output__section-title">Top Schema And Format Errors</div>
          {topErrors.length > 0 ? (
            <div className="review-output__issues">
              {topErrors.map((error, index) => (
                <div className="review-output__issue" key={`${error.path || "path"}-${index}`}>
                  <strong>{error.path || "Path unavailable"}</strong>
                  <p>{error.message || "Validation error"}</p>
                  {(error.expected || error.actual) && (
                    <div className="review-output__issue-meta">
                      {error.expected ? <span>Expected: {error.expected}</span> : null}
                      {error.actual ? <span>Actual: {error.actual}</span> : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="review-output__empty">No schema or formatting errors were returned.</div>
          )}
        </section>

        <section className="review-output__section">
          <div className="review-output__section-title">AI Review Findings</div>
          {aiIssues.length > 0 ? (
            <ul className="review-output__list">
              {aiIssues.slice(0, 8).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <div className="review-output__empty">No AI review issues were returned.</div>
          )}
        </section>
      </div>

      <div className="review-output__grid">
        <section className="review-output__section">
          <div className="review-output__section-title">Latest Validation Data</div>
          <div className="review-output__inline-note">
            Reviewer output is showing the most recent completed validation run for this workflow.
          </div>
          <details className="advanced-block" open>
            <summary>View submission XML preview</summary>
            <pre className="review-output__raw">
              <code>{xmlPreview || "Submission XML preview is not available yet."}</code>
            </pre>
          </details>
        </section>

        <section className="review-output__section">
          <div className="review-output__section-title">Recommended Actions</div>
          {actionItems.length > 0 || aiSuggestions.length > 0 ? (
            <ul className="review-output__list">
              {[...actionItems, ...aiSuggestions].slice(0, 10).map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <div className="review-output__empty">No follow-up actions were returned.</div>
          )}
        </section>

        <section className="review-output__section">
          <div className="review-output__section-title">Raw Validation Payload</div>
          <details className="advanced-block" open>
            <summary>View raw validation JSON</summary>
            <pre className="review-output__raw">
              <code>{rawReport || "No raw payload available."}</code>
            </pre>
          </details>
        </section>
      </div>
    </div>
  );
}
