export interface AgentWithTools {
  name: string;
  tools: string[];
}

export interface Hierarchy {
  supervisor: string;
  subAgents: AgentWithTools[];
}

export const AGENT_HIERARCHIES: Record<string, Hierarchy> = {
  business_analyst: {
    supervisor: 'BA Supervisor',
    subAgents: [
      { name: 'Select Documents', tools: ['ReadPDF', 'ReadWord', 'ReadExcel', 'FetchDocument'] },
      { name: 'Comparison', tools: ['ParseStructured', 'ExtractInfo'] },
      { name: 'Field Mapping', tools: ['ReadJSON', 'ValidateSchema', 'ExecuteQuery'] },
      { name: 'Functional Specification', tools: ['GenerateCompletion', 'WriteFile', 'FormatReport'] },
      { name: 'Assignment', tools: ['ExecuteQuery', 'UpdateRecord'] }
    ]
  },
  developer: {
    supervisor: 'Developer Supervisor',
    subAgents: [
      { name: 'Schema Generator', tools: ['ReadPDF', 'ReadWord', 'ParseStructured', 'ExtractInfo'] },
      { name: 'Schema Analyzer', tools: ['InspectSchema', 'ExecuteQuery', 'AnalyzeSchemaCompliance'] },
      { name: 'SQL Generator', tools: ['GenerateCompletion', 'ValidateSQLSyntax', 'ExecuteQuery'] },
      { name: 'Python ETL Generator', tools: ['GenerateETLCode', 'WriteFile'] },
      { name: 'Deterministic Mapping', tools: ['GenerateXSD', 'GenerateXML', 'ValidateSchema'] },
      { name: 'Test Integration', tools: ['GenerateTestCases', 'ExecuteQuery'] }
    ]
  },
  reviewer: {
    supervisor: 'Reviewer Supervisor',
    subAgents: [
      { name: 'Validation', tools: ['ValidateDataQuality', 'ValidateCompleteness', 'ExecuteQuery'] },
      { name: 'Anomaly Detection', tools: ['DetectAnomalies', 'CalculateVariance'] },
      { name: 'Variance Explanation', tools: ['CalculateVariance', 'GenerateCompletion', 'FormatReport'] },
      { name: 'Cross Report Reconciliation', tools: ['ReconcileReports', 'ValidateDataQuality'] },
      { name: 'Audit Pack Generator', tools: ['GenerateAuditTrail', 'FormatReport', 'WriteFile'] },
      { name: 'PSD CSV Generator', tools: ['FormatReport', 'WriteFile', 'ExecuteQuery'] }
    ]
  },
  analyst: {
    supervisor: 'Reviewer Supervisor',
    subAgents: [
      { name: 'Validation', tools: ['ValidateDataQuality', 'ValidateCompleteness', 'ExecuteQuery'] },
      { name: 'Anomaly Detection', tools: ['DetectAnomalies', 'CalculateVariance'] },
      { name: 'Variance Explanation', tools: ['CalculateVariance', 'GenerateCompletion', 'FormatReport'] },
      { name: 'Cross Report Reconciliation', tools: ['ReconcileReports', 'ValidateDataQuality'] },
      { name: 'Audit Pack Generator', tools: ['GenerateAuditTrail', 'FormatReport', 'WriteFile'] },
      { name: 'PSD CSV Generator', tools: ['FormatReport', 'WriteFile', 'ExecuteQuery'] }
    ]
  },
  complete: {
    supervisor: 'Full Pipeline Orchestrator',
    subAgents: [
      { name: 'BA Supervisor', tools: [] },
      { name: 'Developer Supervisor', tools: [] },
      { name: 'Reviewer Supervisor', tools: [] }
    ]
  }
};

export const FULL_PIPELINE_DETAILS = [
  {
    name: 'BA Supervisor',
    subAgents: [
      { name: 'Select Documents', tools: ['ReadPDF', 'ReadWord', 'ReadExcel'] },
      { name: 'Comparison', tools: ['ParseStructured', 'ExtractInfo'] },
      { name: 'Field Mapping', tools: ['ReadJSON', 'ValidateSchema'] },
      { name: 'Functional Specification', tools: ['GenerateCompletion', 'FormatReport'] },
      { name: 'Assignment', tools: ['ExecuteQuery'] }
    ]
  },
  {
    name: 'Developer Supervisor',
    subAgents: [
      { name: 'Schema Analyzer', tools: ['InspectSchema', 'AnalyzeCompliance'] },
      { name: 'SQL Generator', tools: ['GenerateCompletion', 'ValidateSQLSyntax'] },
      { name: 'Python ETL Generator', tools: ['GenerateETLCode', 'WriteFile'] },
      { name: 'Deterministic Mapping', tools: ['GenerateXSD', 'GenerateXML'] },
      { name: 'Test Integration', tools: ['GenerateTestCases'] }
    ]
  },
  {
    name: 'Reviewer Supervisor',
    subAgents: [
      { name: 'Validation', tools: ['ValidateDataQuality', 'ValidateCompleteness'] },
      { name: 'Anomaly Detection', tools: ['DetectAnomalies'] },
      { name: 'Variance Explanation', tools: ['CalculateVariance', 'FormatReport'] },
      { name: 'Cross Report Reconciliation', tools: ['ReconcileReports'] },
      { name: 'Audit Pack Generator', tools: ['GenerateAuditTrail', 'WriteFile'] },
      { name: 'PSD CSV Generator', tools: ['FormatReport', 'WriteFile'] }
    ]
  }
];
