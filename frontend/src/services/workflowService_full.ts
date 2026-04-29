import api from '@/utils/axios';
import { Workflow } from '@/types';

export const workflowService = {
  getAll: async (): Promise<Workflow[]> => {
    const response = await api.get<Workflow[]>('/workflows/');
    return response.data;
  },

  getById: async (id: number): Promise<Workflow> => {
    const response = await api.get<Workflow>(`/workflows/${id}`);
    return response.data;
  },

  create: async (data: { name: string; workflow_type: string; description?: string; config?: any }): Promise<Workflow> => {
    // Map frontend workflow types to backend enum values
    const workflowTypeMap: Record<string, string> = {
      'ba_analysis': 'business_analyst',
      'development': 'developer',
      'reporting': 'reviewer',
      'full_pipeline': 'complete'
    };

    const payload = {
      workflow_name: data.name,
      workflow_type: workflowTypeMap[data.workflow_type] || 'business_analyst',
      description: data.description || '',
      version: '1.0'
    };

    const response = await api.post<Workflow>('/workflows', payload);
    return response.data;
  },

  // Create workflow by persona - creates entry in appropriate session table
  createByPersona: async (data: { name: string; persona: string; version: string; description?: string }): Promise<any> => {
    const personaEndpointMap: Record<string, string> = {
      'business_analyst': '/ba-workflows/workflows/simple',
      'developer': '/developer-workflows/simple',
      'reviewer': '/reviewer-workflows/simple',
      'complete': '/analyst-workflows/simple' // Full pipeline uses analyst for now
    };

    const endpoint = personaEndpointMap[data.persona] || '/ba-workflows/workflows/simple';

    const payload = {
      workflow_name: data.name,
      description: data.description || '',
      version: data.version || '1.0'
    };

    const response = await api.post(endpoint, payload);
    return response.data;
  },

  execute: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute`, { context: context || {} });
    return response.data;
  },

  executeDocumentParser: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-document-parser`, { context: context || {} });
    return response.data;
  },

  executeGapAnalysis: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-gap-analysis`, { context: context || {} });
    return response.data;
  },

  executeRegulatoryDiff: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-regulatory-diff`, { context: context || {} });
    return response.data;
  },

  executeRequirementStructuring: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-requirement-structuring`, { context: context || {} });
    return response.data;
  },

  executeTestCaseGenerator: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-test-case-generator`, { context: context || {} });
    return response.data;
  },

  executeOntologyUpdate: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-ontology-update`, { context: context || {} });
    return response.data;
  },

  // Developer Workflow Methods
  executeSchemaAnalyzer: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-schema-analyzer`, { context: context || {} });
    return response.data;
  },

  executeSQLGenerator: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-sql-generator`, { context: context || {} });
    return response.data;
  },

  executePythonETLGenerator: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-python-etl-generator`, { context: context || {} });
    return response.data;
  },

  executeLineageBuilder: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-lineage-builder`, { context: context || {} });
    return response.data;
  },

  executeDeterministicMapping: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-deterministic-mapping`, { context: context || {} });
    return response.data;
  },

  executeTestIntegration: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-test-integration`, { context: context || {} });
    return response.data;
  },

  // Reporting Workflow Methods
  executeValidation: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-validation`, { context: context || {} });
    return response.data;
  },

  executeAnomalyDetection: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-anomaly-detection`, { context: context || {} });
    return response.data;
  },

  executeVarianceExplanation: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-variance-explanation`, { context: context || {} });
    return response.data;
  },

  executeCrossReportReconciliation: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-cross-report-reconciliation`, { context: context || {} });
    return response.data;
  },

  executeAuditPackGenerator: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-audit-pack-generator`, { context: context || {} });
    return response.data;
  },

  executePSDCSVGenerator: async (id: number, context?: any): Promise<any> => {
    const response = await api.post(`/workflows/${id}/execute-psd-csv-generator`, { context: context || {} });
    return response.data;
  },

  exportStepResults: async (id: number, stepName: string, resultsData: any, exportFormat: 'json' | 'csv' = 'json'): Promise<any> => {
    const response = await api.post(`/workflows/${id}/export-step-results`, {
      context: {
        step_name: stepName,
        results_data: resultsData,
        export_format: exportFormat
      }
    });
    return response.data;
  },

  cancel: async (id: number): Promise<void> => {
    await api.post(`/workflows/${id}/cancel`);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/workflows/${id}`);
  },

  getLogs: async (id: number): Promise<string[]> => {
    const response = await api.get<string[]>(`/workflows/${id}/logs`);
    return response.data;
  },

  getSteps: async (id: number): Promise<any[]> => {
    const response = await api.get<any[]>(`/workflows/${id}/steps`);
    return response.data;
  },

  // ============================================================================
  // BA WORKFLOW SESSION METHODS (Full Automated Execution)
  // ============================================================================

  createBASession: async (data: {
    session_name: string;
    description?: string;
    source_document_id: string;
    target_document_id: string;
    llm_config_id: string;
    comparison_mode: 'document' | 'datamodel';
    report_format?: 'markdown' | 'json';
  }): Promise<any> => {
    const response = await api.post('/ba-workflows/sessions', data);
    return response.data;
  },

  executeBASession: async (sessionId: string): Promise<any> => {
    const response = await api.post(`/ba-workflows/sessions/${sessionId}/execute`);
    return response.data;
  },

  getBASessionStatus: async (sessionId: string): Promise<any> => {
    const response = await api.get(`/ba-workflows/sessions/${sessionId}/status`);
    return response.data;
  },

  getBASessionResults: async (sessionId: string): Promise<any> => {
    const response = await api.get(`/ba-workflows/sessions/${sessionId}/results`);
    return response.data;
  },

  listBASessions: async (status?: string, limit: number = 50, offset: number = 0): Promise<any[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await api.get(`/ba-workflows/sessions?${params.toString()}`);
    return response.data;
  },

  downloadBAGapReport: async (sessionId: string): Promise<Blob> => {
    const response = await api.get(`/ba-workflows/sessions/${sessionId}/gap-report/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // ============================================================================
  // DEVELOPER WORKFLOW SESSION METHODS (Full Automated Execution)
  // ============================================================================

  createDeveloperSession: async (data: {
    session_name: string;
    description?: string;
    ba_package_id?: string;
    requirements?: string;
    llm_config_id: string;
  }): Promise<any> => {
    const response = await api.post('/developer-workflows/sessions', data);
    return response.data;
  },

  executeDeveloperSession: async (sessionId: string): Promise<any> => {
    const response = await api.post(`/developer-workflows/sessions/${sessionId}/execute`);
    return response.data;
  },

  getDeveloperSessionStatus: async (sessionId: string): Promise<any> => {
    const response = await api.get(`/developer-workflows/sessions/${sessionId}/status`);
    return response.data;
  },

  getDeveloperSessionResults: async (sessionId: string): Promise<any> => {
    const response = await api.get(`/developer-workflows/sessions/${sessionId}/results`);
    return response.data;
  },

  listDeveloperSessions: async (status?: string, limit: number = 50, offset: number = 0): Promise<any[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await api.get(`/developer-workflows/sessions?${params.toString()}`);
    return response.data;
  },

  deleteDeveloperSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/developer-workflows/sessions/${sessionId}`);
  },

  // ============================================================================
  // ANALYST WORKFLOW SESSION METHODS (Full Automated Execution)
  // ============================================================================

  createAnalystSession: async (data: {
    session_name: string;
    description?: string;
    source_data_id?: string;
    validation_rules?: any;
    llm_config_id: string;
  }): Promise<any> => {
    const response = await api.post('/analyst-workflows/sessions', data);
    return response.data;
  },

  executeAnalystSession: async (sessionId: string): Promise<any> => {
    const response = await api.post(`/analyst-workflows/sessions/${sessionId}/execute`);
    return response.data;
  },

  getAnalystSessionStatus: async (sessionId: string): Promise<any> => {
    const response = await api.get(`/analyst-workflows/sessions/${sessionId}/status`);
    return response.data;
  },

  getAnalystSessionResults: async (sessionId: string): Promise<any> => {
    const response = await api.get(`/analyst-workflows/sessions/${sessionId}/results`);
    return response.data;
  },

  listAnalystSessions: async (status?: string, limit: number = 50, offset: number = 0): Promise<any[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await api.get(`/analyst-workflows/sessions?${params.toString()}`);
    return response.data;
  },

  deleteAnalystSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/analyst-workflows/sessions/${sessionId}`);
  },
};
