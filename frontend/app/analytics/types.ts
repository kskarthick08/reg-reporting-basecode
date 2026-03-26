/**
 * Analytics Dashboard Types
 */

export interface DashboardMetrics {
  total_workflows: number;
  active_workflows: number;
  completed_workflows: number;
  in_progress_workflows: number;
  avg_cycle_time_hours: number;
  total_artifacts: number;
  total_analysis_runs: number;
  total_stage_events: number;
  total_action_logs: number;
  quality_first_pass_rate: number;
  send_back_count: number;
}

export interface WorkflowPipelineStatus {
  pipeline: {
    BA: number;
    DEV: number;
    REVIEWER: number;
    COMPLETED: number;
  };
  stuck_workflows: number;
}

export interface CycleTimes {
  average_hours_by_stage: {
    BA: number;
    DEV: number;
    REVIEWER: number;
  };
}

export interface ArtifactMetrics {
  total_artifacts: number;
  active_artifacts: number;
  deleted_artifacts: number;
  generated_artifacts: number;
  by_kind: Record<string, number>;
  latest_artifact_at: string | null;
}

export interface RunMetrics {
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  latest_run_at: string | null;
}

export interface QualityMetrics {
  send_back_reasons: Record<string, number>;
  total_send_backs: number;
  pass_rate_by_stage: {
    BA: number;
    DEV: number;
    REVIEWER: number;
  };
}

export interface ActivityCaptureMetrics {
  stage_history_events: number;
  workflow_action_logs: number;
  workflows_with_stage_history: number;
  workflows_with_action_logs: number;
  workflows_without_action_logs: number;
  action_logging_coverage_pct: number;
  logged_download_actions: number;
  action_category_breakdown: Record<string, number>;
  action_status_breakdown: Record<string, number>;
  latest_stage_event_at: string | null;
  latest_action_log_at: string | null;
}

export interface RecentActivity {
  id: string;
  source: "stage_history" | "workflow_action_log";
  workflow_id: number;
  action: string;
  stage: string | null;
  from_stage: string | null;
  to_stage: string | null;
  status: string | null;
  description: string | null;
  actor: string | null;
  created_at: string | null;
}

export interface AnalyticsDashboardData {
  ok: boolean;
  data_sources: string[];
  metrics: DashboardMetrics;
  pipeline: WorkflowPipelineStatus;
  cycle_times: CycleTimes;
  artifacts: ArtifactMetrics;
  runs: RunMetrics;
  quality: QualityMetrics;
  activity_capture: ActivityCaptureMetrics;
  recent_activity: RecentActivity[];
}
