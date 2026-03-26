"use client";

import { useState } from "react";

type OutputViewerProps = {
  content: string;
  language?: "sql" | "xml" | "json" | "text";
  title?: string;
  downloadUrl?: string;
  validation?: {
    pass: boolean;
    errors: string[];
    error_details?: Array<{
      path?: string;
      message?: string;
      expected?: string;
      actual?: string;
    }>;
  };
};

export function OutputViewer({
  content,
  language = "text",
  title,
  downloadUrl,
  validation
}: OutputViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`output-viewer ${isFullscreen ? "fullscreen" : ""}`}>
      <div className="output-header">
        {title && <h3 className="output-title">{title}</h3>}
        <div className="output-actions">
          {validation && (
            <span className={`validation-badge ${validation.pass ? "pass" : "fail"}`}>
              {validation.pass ? "Valid" : "Invalid"}
            </span>
          )}
          {downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="output-action-btn">
              Download
            </a>
          )}
          <button className="output-action-btn" onClick={copyContent}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="output-action-btn" onClick={toggleFullscreen}>
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>
      {validation && !validation.pass && (validation.error_details?.length || validation.errors.length > 0) && (
        <div className="validation-errors">
          <h4>Validation Errors:</h4>
          <ul>
            {validation.error_details && validation.error_details.length > 0
              ? validation.error_details.slice(0, 20).map((err, idx) => (
                  <li key={idx}>
                    <strong>{err.path || "Path unavailable"}:</strong> {err.message || "Schema validation error"}
                  </li>
                ))
              : validation.errors.map((err, idx) => <li key={idx}>{err}</li>)}
          </ul>
        </div>
      )}
      <pre className={`output-content language-${language}`}>
        <code>{content || "No content available"}</code>
      </pre>
    </div>
  );
}
