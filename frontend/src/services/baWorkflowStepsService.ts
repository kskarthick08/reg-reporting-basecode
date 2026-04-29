import axios from '@/utils/axios';

export interface StepExecutionResult {
  step_name: string;
  status: string;
  output: Record<string, any>;
  execution_time_ms: number;
  tokens_used?: number;
  message: string;
}

export interface StepsStatus {
  session_id: string;
  overall_status: string;
  steps_completed: number;
  total_steps: number;
  steps: {
    document_parser_source: {
      completed: boolean;
      result?: any;
    };
    document_parser_target: {
      completed: boolean;
      result?: any;
    };
    regulatory_diff: {
      completed: boolean;
      result?: any;
    };
    gap_analysis: {
      completed: boolean;
      result?: any;
    };
  };
}

class BAWorkflowStepsService {
  /**
   * Execute Document Parser step
   */
  async executeDocumentParser(
    sessionId: string,
    documentRole: 'source' | 'target'
  ): Promise<StepExecutionResult> {
    const response = await axios.post(
      `/ba-workflow/sessions/${sessionId}/steps/document-parser?document_role=${documentRole}`
    );
    return response.data;
  }

  /**
   * Execute Regulatory Diff step
   */
  async executeRegulatoryDiff(sessionId: string): Promise<StepExecutionResult> {
    const response = await axios.post(
      `/ba-workflow/sessions/${sessionId}/steps/regulatory-diff`
    );
    return response.data;
  }

  /**
   * Execute GAP Analysis step
   */
  async executeGapAnalysis(sessionId: string): Promise<StepExecutionResult> {
    const response = await axios.post(
      `/ba-workflow/sessions/${sessionId}/steps/gap-analysis`
    );
    return response.data;
  }

  /**
   * Get status of all steps
   */
  async getStepsStatus(sessionId: string): Promise<StepsStatus> {
    const response = await axios.get(
      `/ba-workflow/sessions/${sessionId}/steps/status`
    );
    return response.data;
  }
}

export const baWorkflowStepsService = new BAWorkflowStepsService();
