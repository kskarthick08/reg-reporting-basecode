export type Artifact = {
  id: number;
  kind: string;
  filename: string;
  display_name?: string;
  created_at?: string;
};

export type GapRow = {
  ref: string;
  field: string;
  matching_column: string;
  status: string;
  confidence: number;
  description: string;
  evidence?: string;
};

export type GapDiagnostics = {
  expected_required_count?: number;
  returned_count?: number;
  missing_count?: number;
  mapped_count?: number;
  coverage_pct?: number;
  mapped_coverage_pct?: number;
  llm_error_batches?: number;
  fallback_batches?: number;
  degraded_quality?: boolean;
  degraded_reasons?: string[];
  [key: string]: any;
};

export type CompareResult = {
  comparison?: {
    baseline_artifact_id?: number;
    changed_artifact_id?: number;
    baseline_lines?: number;
    changed_lines?: number;
    added_count?: number;
    removed_count?: number;
    unchanged_count?: number;
    added_samples?: string[];
    removed_samples?: string[];
  };
  added_lines?: string[];
  removed_lines?: string[];
  llm_summary?: string;
  [key: string]: any;
};

export type XmlValidationState = {
  pass: boolean;
  run_id?: number;
  errors: string[];
  error_details?: Array<{
    path?: string;
    rule?: string;
    expected?: string;
    actual?: string;
    message?: string;
  }>;
  display?: {
    status?: string;
    summary?: string;
    xsd_pass?: boolean;
    rule_checks_pass?: boolean;
    error_count?: number;
    top_error_paths?: string[];
    top_errors?: Array<{
      path?: string;
      rule?: string;
      expected?: string;
      actual?: string;
      message?: string;
    }>;
    action_items?: string[];
  };
  gate_status?: {
    passed?: boolean;
    pass?: boolean;
    code?: string;
    message?: string;
    metrics?: Record<string, any>;
  };
  ai_review?: any;
  rule_checks?: any;
  analysis_meta?: any;
};

export type Toast = {
  id: number;
  kind: "success" | "error";
  text: string;
};

export type NotificationItem = {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
  at: string;
  read: boolean;
  source?: string;
};

export type AgentTab = "ba" | "dev" | "rev";
export type BAAnalysisMode = "psd_model" | "psd_psd";
export type Persona = "BA" | "DEV" | "REVIEWER";

export type ArtifactKind = "fca" | "data_model" | "data" | "xsd" | "report_xml";

export type UploadArtifactFn = (
  kind: ArtifactKind,
  file: File | null,
  onSelect?: (id: number) => void
) => Promise<void>;

export type WorkflowItem = {
  id: number;
  display_id?: string;
  project_id: string;
  name: string;
  psd_version?: string | null;
  current_stage: "BA" | "DEV" | "REVIEWER" | "COMPLETED";
  status: string;
  parent_workflow_id?: number | null;
  pending_for_me?: boolean;
  latest_gap_run_id?: number | null;
  latest_sql_run_id?: number | null;
  latest_xml_run_id?: number | null;
  latest_report_xml_artifact_id?: number | null;
  functional_spec_artifact_id?: number | null;
  ba_gap_waivers_json?: {
    refs?: string[];
    fields?: string[];
    allow_degraded_quality?: boolean;
    [key: string]: any;
  } | null;
  quality_summary?: {
    stage: string;
    open_issues_count: number;
    exit_gate_status: {
      pass?: boolean;
      passed?: boolean;
      code: string;
      message: string;
      metrics?: Record<string, any>;
    };
    last_action_at?: string | null;
    last_action_by?: string | null;
  } | null;
  updated_at?: string | null;
};

export type WorkflowVersionCreateInput = {
  workflowId: number;
  name: string;
  psdVersion?: string;
  reuseLatestGapRun: boolean;
  reuseFunctionalSpec: boolean;
  cloneUnresolvedOnly: boolean;
};
