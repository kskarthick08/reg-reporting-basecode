/**
 * Analyst Workflow Service
 *
 * API service layer for Analyst workflow management.
 * Handles data validation, anomaly detection, variance explanation,
 * reconciliation, audit pack generation, and PSD CSV generation.
 */

import axios from '@/utils/axios';

const BASE_URL = '/analyst-workflows';

// ============================================================================
// Types
// ============================================================================

export interface AnalystWorkflowSession {
  id: string;
  session_name: string;
  description?: string;
  status: 'pending' | 'executing' | 'validating' | 'detecting' | 'explaining' | 'reconciling' | 'generating' | 'completed' | 'failed';
  created_by_id: string;
  created_at: string;
  updated_at: string;
  progress_percentage: number;
  current_step?: string;
  data_sources_count: number;
  reports_count: number;
  steps_completed: number;
  total_steps: number;
}

export interface AnalystWorkflowCreate {
  session_name: string;
  description?: string;
  data_sources: Array<{
    source_id: string;
    source_type: string;
    source_name: string;
    schema?: any;
  }>;
  reports: Array<{
    report_id: string;
    report_type: string;
    report_name: string;
    data?: any;
  }>;
  validation_rules: Array<{
    rule_id: string;
    rule_type: string;
    rule_name: string;
    conditions: any;
  }>;
  llm_config_id: string;
  threshold_config?: {
    anomaly_threshold?: number;
    variance_threshold?: number;
    confidence_threshold?: number;
  };
}

export interface AnalystWorkflowStatus {
  session_id: string;
  status: string;
  progress_percentage: number;
  current_step?: string;
  steps_completed: number;
  total_steps: number;
  started_at?: string;
  completed_at?: string;
  execution_time_ms?: number;
  error_message?: string;
}

export interface ValidationResult {
  total_issues: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  issues: Array<{
    issue_id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    rule_name: string;
    description: string;
    data_source: string;
    affected_records: number;
    recommendation: string;
  }>;
  validation_summary: {
    total_records_validated: number;
    passed_records: number;
    failed_records: number;
    pass_rate: number;
  };
}

export interface AnomalyDetection {
  anomalies: Array<{
    anomaly_id: string;
    anomaly_type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    data_source: string;
    field_name: string;
    expected_value: any;
    actual_value: any;
    deviation: number;
    confidence_score: number;
    description: string;
  }>;
  anomaly_summary: {
    total_anomalies: number;
    critical_anomalies: number;
    high_anomalies: number;
    medium_anomalies: number;
    low_anomalies: number;
  };
}

export interface VarianceExplanation {
  variances: Array<{
    variance_id: string;
    variance_type: string;
    data_source: string;
    field_name: string;
    expected_value: any;
    actual_value: any;
    variance_amount: number;
    variance_percentage: number;
    explanation: string;
    root_cause: string;
    recommended_action: string;
  }>;
  variance_summary: {
    total_variances: number;
    total_variance_amount: number;
    average_variance_percentage: number;
  };
}

export interface ReconciliationResult {
  reconciliation_status: 'matched' | 'partial' | 'unmatched';
  total_issues: number;
  reconciliation_items: Array<{
    item_id: string;
    item_type: string;
    source_report: string;
    target_report: string;
    source_value: any;
    target_value: any;
    difference: any;
    status: 'matched' | 'variance' | 'missing';
    explanation: string;
  }>;
  summary: {
    total_items: number;
    matched_items: number;
    variance_items: number;
    missing_items: number;
    match_rate: number;
  };
}

export interface AuditPack {
  audit_pack_id: string;
  audit_pack_name: string;
  generated_at: string;
  components: Array<{
    component_id: string;
    component_type: string;
    component_name: string;
    file_path?: string;
    file_size?: number;
  }>;
  summary: {
    total_components: number;
    validation_included: boolean;
    anomalies_included: boolean;
    variances_included: boolean;
    reconciliation_included: boolean;
  };
}

export interface PSDCSVFile {
  csv_files: Array<{
    file_id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    record_count: number;
    report_type: string;
    generated_at: string;
  }>;
  summary: {
    total_files: number;
    total_records: number;
    total_size: number;
  };
}

export interface AnalystWorkflowResults {
  session_id: string;
  status: string;
  validation_results?: ValidationResult;
  anomalies?: AnomalyDetection;
  variance_explanations?: VarianceExplanation;
  reconciliation?: ReconciliationResult;
  audit_pack?: AuditPack;
  psd_csv?: PSDCSVFile;
  workflow_summary?: {
    total_steps: number;
    completed_steps: number;
    data_sources_validated: number;
    validation_issues: number;
    anomalies_detected: number;
    variances_explained: number;
    reports_reconciled: number;
    reconciliation_issues: number;
    audit_pack_generated: boolean;
    psd_csv_files_generated: number;
    execution_time_seconds: number;
    total_tokens_used: number;
    llm_calls: number;
    tool_calls: number;
  };
}

export interface AnalystWorkflowExecuteResponse {
  session_id: string;
  status: string;
  message: string;
}

// ============================================================================
// Service
// ============================================================================

/**
 * Analyst Workflow Service
 *
 * Provides methods for interacting with Analyst workflow API endpoints.
 */
export const analystWorkflowService = {
  /**
   * Create a simple Analyst workflow (unified creation)
   *
   * @param data - Simple workflow creation data
   * @returns Created workflow
   */
  createSimpleWorkflow: async (data: {
    workflow_name: string;
    description?: string;
    version?: string;
  }): Promise<{ id: string; workflow_name: string; status: string }> => {
    const response = await axios.post(`${BASE_URL}/simple`, data);
    return response.data;
  },

  /**
   * Create a new Analyst workflow session
   *
   * @param data - Session creation data
   * @returns Created session
   */
  createSession: async (data: AnalystWorkflowCreate): Promise<AnalystWorkflowSession> => {
    const response = await axios.post<{ session: AnalystWorkflowSession }>(`${BASE_URL}/sessions`, data);
    return response.data.session;
  },

  /**
   * Execute Analyst workflow
   *
   * Starts workflow execution in background.
   * Use getStatus() to poll for progress.
   *
   * @param sessionId - Session ID
   * @returns Execution response
   */
  executeWorkflow: async (sessionId: string): Promise<AnalystWorkflowExecuteResponse> => {
    const response = await axios.post<AnalystWorkflowExecuteResponse>(
      `${BASE_URL}/sessions/${sessionId}/execute`
    );
    return response.data;
  },

  /**
   * Get workflow execution status
   *
   * Poll this endpoint to track workflow progress.
   *
   * @param sessionId - Session ID
   * @returns Status with progress
   */
  getStatus: async (sessionId: string): Promise<AnalystWorkflowStatus> => {
    const response = await axios.get<AnalystWorkflowStatus>(`${BASE_URL}/sessions/${sessionId}/status`);
    return response.data;
  },

  /**
   * Get complete workflow results
   *
   * Returns all results: validation, anomalies, variances, reconciliation, audit pack, PSD CSV.
   *
   * @param sessionId - Session ID
   * @returns Complete results
   */
  getResults: async (sessionId: string): Promise<AnalystWorkflowResults> => {
    const response = await axios.get<AnalystWorkflowResults>(
      `${BASE_URL}/sessions/${sessionId}/results`
    );
    return response.data;
  },

  /**
   * List Analyst workflow sessions
   *
   * @param params - Query parameters
   * @returns List of sessions
   */
  listSessions: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<AnalystWorkflowSession[]> => {
    const response = await axios.get<AnalystWorkflowSession[]>(`${BASE_URL}/sessions`, { params });
    return response.data;
  },

  /**
   * Delete Analyst workflow session
   *
   * @param sessionId - Session ID
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/sessions/${sessionId}`);
  },

  /**
   * Poll workflow status until completion
   *
   * Utility method that polls status every 3 seconds until workflow completes.
   *
   * @param sessionId - Session ID
   * @param onProgress - Callback for progress updates
   * @returns Final status
   */
  pollUntilComplete: async (
    sessionId: string,
    onProgress?: (status: AnalystWorkflowStatus) => void
  ): Promise<AnalystWorkflowStatus> => {
    const poll = async (): Promise<AnalystWorkflowStatus> => {
      const status = await analystWorkflowService.getStatus(sessionId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Wait 3 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return poll();
    };

    return poll();
  },
};

export default analystWorkflowService;
