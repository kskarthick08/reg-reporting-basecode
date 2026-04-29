/**
 * BA Workflow Service
 *
 * API service layer for Business Analyst workflow management.
 * Handles document comparison and GAP analysis workflows.
 */

import axios from '@/utils/axios';

const BASE_URL = '/ba-workflow';

// ============================================================================
// Types
// ============================================================================

export interface BAWorkflowSession {
  id: string;
  session_name: string;
  description?: string;
  workflow_type: string;
  comparison_mode: string;
  report_format: string;
  source_document_id: string;
  target_document_id: string;
  llm_config_id: string;
  status: 'pending' | 'parsing' | 'comparing' | 'analyzing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  total_tokens_used: number;
  execution_time_ms?: number;
  steps_completed: number;
  total_steps: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BAWorkflowSessionCreate {
  session_name: string;
  description?: string;
  source_document_id: string;
  target_document_id: string;
  llm_config_id: string;
  comparison_mode?: 'full' | 'tables_only' | 'paragraphs_only';
  report_format?: 'markdown' | 'json';
}

export interface BAWorkflowSessionUpdate {
  session_name?: string;
  description?: string;
  status?: string;
  error_message?: string;
}

export interface BAWorkflowStatus {
  session_id: string;
  status: string;
  steps_completed: number;
  total_steps: number;
  current_step?: string;
  progress_percentage: number;
  started_at?: string;
  completed_at?: string;
  execution_time_ms?: number;
  error_message?: string;
}

export interface BADocumentParsedResult {
  id: string;
  session_id: string;
  document_id: string;
  document_role: 'source' | 'target';
  parsed_content: {
    tables: any[];
    paragraphs: any[];
    headers: any[];
    lists: any[];
    metadata?: any;
    enhanced_analysis?: any;
  };
  chunks_processed?: number;
  total_chunks?: number;
  parse_mode?: string;
  tables_count: number;
  paragraphs_count: number;
  headers_count: number;
  lists_count: number;
  agent_name: string;
  model_used?: string;
  provider?: string;
  tokens_used?: number;
  execution_time_ms?: number;
  created_at: string;
}

export interface BAComparisonResult {
  id: string;
  session_id: string;
  comparison_mode?: string;
  min_similarity?: number;
  comparison_data: {
    matches: any[];
    differences: any[];
    new_in_source: any[];
    new_in_target: any[];
  };
  total_comparisons: number;
  exact_matches: number;
  partial_matches: number;
  no_matches: number;
  new_in_source_count: number;
  new_in_target_count: number;
  overall_similarity?: number;
  match_quality?: string;
  regulatory_impact?: string;
  summary?: any;
  agent_name: string;
  model_used?: string;
  provider?: string;
  tokens_used?: number;
  execution_time_ms?: number;
  created_at: string;
}

export interface BAGapAnalysisReport {
  id: string;
  session_id: string;
  report_format: string;
  report_content: string;
  total_gaps: number;
  critical_gaps: number;
  high_gaps: number;
  medium_gaps: number;
  low_gaps: number;
  informational_gaps: number;
  gap_details?: any[];
  recommendations?: any[];
  recommendations_count: number;
  source_document_filename?: string;
  target_document_filename?: string;
  agent_name: string;
  model_used?: string;
  provider?: string;
  tokens_used?: number;
  execution_time_ms?: number;
  created_at: string;
}

export interface BAWorkflowCompleteResult {
  session: BAWorkflowSession;
  source_parsed?: BADocumentParsedResult;
  target_parsed?: BADocumentParsedResult;
  comparison?: BAComparisonResult;
  gap_report?: BAGapAnalysisReport;
}

export interface BAWorkflowExecuteResponse {
  session_id: string;
  status: string;
  message: string;
}

// ============================================================================
// Service
// ============================================================================

/**
 * BA Workflow Service
 *
 * Provides methods for interacting with BA workflow API endpoints.
 */
export const baWorkflowService = {
  /**
   * Create a simple BA workflow (unified creation)
   *
   * @param data - Simple workflow creation data
   * @returns Created workflow
   */
  createSimpleWorkflow: async (data: {
    workflow_name: string;
    description?: string;
    version?: string;
  }): Promise<{ id: string; workflow_name: string; status: string }> => {
    const response = await axios.post(`${BASE_URL}/workflows/simple`, data);
    return response.data;
  },

  /**
   * Create a new BA workflow session
   *
   * @param data - Session creation data
   * @returns Created session
   */
  createSession: async (data: BAWorkflowSessionCreate): Promise<BAWorkflowSession> => {
    const response = await axios.post<BAWorkflowSession>(`${BASE_URL}/sessions`, data);
    return response.data;
  },

  /**
   * Get BA workflow session by ID
   *
   * @param sessionId - Session UUID
   * @returns Session details
   */
  getSession: async (sessionId: string): Promise<BAWorkflowSession> => {
    const response = await axios.get<BAWorkflowSession>(`${BASE_URL}/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * List BA workflow sessions
   *
   * @param params - Query parameters
   * @returns List of sessions
   */
  listSessions: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<BAWorkflowSession[]> => {
    const response = await axios.get<BAWorkflowSession[]>(`${BASE_URL}/sessions`, { params });
    return response.data;
  },

  /**
   * Update BA workflow session
   *
   * @param sessionId - Session UUID
   * @param data - Update data
   * @returns Updated session
   */
  updateSession: async (
    sessionId: string,
    data: BAWorkflowSessionUpdate
  ): Promise<BAWorkflowSession> => {
    const response = await axios.put<BAWorkflowSession>(`${BASE_URL}/sessions/${sessionId}`, data);
    return response.data;
  },

  /**
   * Delete BA workflow session
   *
   * @param sessionId - Session UUID
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/sessions/${sessionId}`);
  },

  /**
   * Execute BA workflow
   *
   * Starts workflow execution in background.
   * Use getStatus() to poll for progress.
   *
   * @param sessionId - Session UUID
   * @returns Execution response
   */
  executeWorkflow: async (sessionId: string): Promise<BAWorkflowExecuteResponse> => {
    const response = await axios.post<BAWorkflowExecuteResponse>(
      `${BASE_URL}/sessions/${sessionId}/execute`
    );
    return response.data;
  },

  /**
   * Get workflow execution status
   *
   * Poll this endpoint to track workflow progress.
   *
   * @param sessionId - Session UUID
   * @returns Status with progress
   */
  getStatus: async (sessionId: string): Promise<BAWorkflowStatus> => {
    const response = await axios.get<BAWorkflowStatus>(`${BASE_URL}/sessions/${sessionId}/status`);
    return response.data;
  },

  /**
   * Get complete workflow results
   *
   * Returns all results: parsed documents, comparison, GAP report.
   *
   * @param sessionId - Session UUID
   * @returns Complete results
   */
  getResults: async (sessionId: string): Promise<BAWorkflowCompleteResult> => {
    const response = await axios.get<BAWorkflowCompleteResult>(
      `${BASE_URL}/sessions/${sessionId}/results`
    );
    return response.data;
  },

  /**
   * Download GAP analysis report
   *
   * Downloads markdown report as file.
   *
   * @param sessionId - Session UUID
   * @returns Blob for download
   */
  downloadReport: async (sessionId: string): Promise<Blob> => {
    const response = await axios.get(`${BASE_URL}/sessions/${sessionId}/gap-report/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Poll workflow status until completion
   *
   * Utility method that polls status every 3 seconds until workflow completes.
   *
   * @param sessionId - Session UUID
   * @param onProgress - Callback for progress updates
   * @returns Final status
   */
  pollUntilComplete: async (
    sessionId: string,
    onProgress?: (status: BAWorkflowStatus) => void
  ): Promise<BAWorkflowStatus> => {
    const poll = async (): Promise<BAWorkflowStatus> => {
      const status = await baWorkflowService.getStatus(sessionId);

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

export default baWorkflowService;
