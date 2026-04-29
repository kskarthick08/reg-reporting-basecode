import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Workflow, Document } from '@/types';
import { documentService } from '@/services/documentService';
import { getDataModels, DataModel } from '@/services/dataModelService';
import { workflowService } from '@/services/workflowService';
import workflowAssignmentService from '@/services/workflowAssignmentService';
import { showToast } from '@/lib/toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface WorkflowExecutionOverlayProps {
  workflow: Workflow;
  initialStepIndex: number;
  onClose: () => void;
  executionMode?: 'quick' | 'full'; // New prop to distinguish execution modes
}

// Type definitions for input configurations
interface InputField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'checkbox' | 'number' | 'slider' | 'radio' | 'date' | 'multi-select' | 'data-model-select';
  required?: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  description?: string;
  placeholder?: string;
  autoPopulate?: boolean;
  condition?: (values: any) => boolean;
  showWhen?: { field: string; value: any };
  min?: number;
  max?: number;
  step?: number;
}

interface StepInputConfig {
  stepName: string;
  description: string;
  fields: InputField[];
}

export const WorkflowExecutionOverlay = ({ workflow, initialStepIndex, onClose, executionMode = 'quick' }: WorkflowExecutionOverlayProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [runningAgent, setRunningAgent] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dataModels, setDataModels] = useState<DataModel[]>([]);
  const [selectedDoc1, setSelectedDoc1] = useState<string>('');
  const [selectedDoc2, setSelectedDoc2] = useState<string>('');
  const [comparisonMode, setComparisonMode] = useState<'datamodel' | 'document'>('datamodel');
  const [selectedDataModel, setSelectedDataModel] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [stepResults, setStepResults] = useState<Record<number, any>>({});
  const [currentStepResult, setCurrentStepResult] = useState<any>(null);
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const [autoExecutionProgress, setAutoExecutionProgress] = useState<string>('');

  // Dictionary Mapping state
  const [manualMappings, setManualMappings] = useState<any[]>([]);
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const [editingMapping, setEditingMapping] = useState<any>(null);

  // Submit step state
  const [submissionComments, setSubmissionComments] = useState<string>('');
  const [assignedToUserId, setAssignedToUserId] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [workflowSubmitted, setWorkflowSubmitted] = useState(false);
  const [submitAction, setSubmitAction] = useState<'complete' | 'return'>('complete');
  const [returnToStage, setReturnToStage] = useState<'business_analyst' | 'developer'>('business_analyst');

  // Publish Report Dialog State (Gap Analysis)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDescription, setPublishDescription] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Processing and error states
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comprehensive input state for all workflow steps
  const [inputValues, setInputValues] = useState<Record<string, any>>({
    // BA Workflow - Step 1: Document Parser
    parse_mode: 'all',

    // BA Workflow - Step 2: Regulatory Diff
    comparison_mode_diff: 'full',
    min_similarity: 70,

    // BA Workflow - Step 3: Dictionary Mapping
    confidence_threshold: 60,
    enable_fuzzy_matching: true,
    include_sample_values: true,
    manual_mappings: '',

    // BA Workflow - Step 4: Gap Analysis
    report_format: 'markdown',
    include_appendices: true,

    // BA Workflow - Step 4: Assign to Developer
    developer_id: '',
    assignment_notes: '',
    priority: 'medium',

    // Developer Workflow - Step 1: Schema Analyzer
    schema_source: '',
    schema_type: 'database_schema',
    analysis_mode: 'full',
    validate_compliance: true,
    extract_entities_schema: true,

    // Developer Workflow - Step 2: SQL Generator
    sql_requirements: '',
    generation_type: 'all',
    database_type: 'postgresql',
    include_comments: true,
    include_tests_sql: true,
    optimize_performance: true,

    // Developer Workflow - Step 3: Python ETL Generator
    etl_requirements: '',
    etl_framework: 'pandas',
    source_schema: '',
    target_schema: '',
    include_tests_etl: true,
    include_orchestration: true,

    // Developer Workflow - Step 4: Deterministic Mapping (XSD/XML Generation)
    sql_generator_output: '',
    schema_analyzer_output: '',
    output_format: 'both',
    namespace: '',
    include_annotations: true,
    validate_mappings: true,

    // Developer Workflow - Step 5: Test Integration
    test_cases: '',
    integration_type: 'all',
    generate_test_data: true,
    create_automation: true,

    // Analyst Workflow - Step 1: Validation
    data_source: '',
    validation_type: 'all',
    schema_name: 'capital_requirement',
    rule_set: 'basel_iii',
    template_name: 'psd_capital',
    fail_fast: false,

    // Analyst Workflow - Step 2: Anomaly Detection
    detection_algorithm: 'statistical',
    sensitivity: 'medium',
    time_period_start: '',
    time_period_end: '',
    threshold_rules: '',

    // Analyst Workflow - Step 3: Variance Explanation
    explanation_depth: 'detailed',
    include_recommendations: true,
    historical_context_months: 3,

    // Analyst Workflow - Step 4: Cross-Report Reconciliation
    reports_data: '',
    reconciliation_rules: 'standard',
    tolerance_threshold: 0.01,
    report_types: [],

    // Analyst Workflow - Step 5: Audit Pack Generator
    audit_format: 'pdf',
    include_evidence: true,
    audit_period_start: '',
    audit_period_end: '',
    regulatory_framework: 'basel_iii',

    // Analyst Workflow - Step 6: PSD CSV Generator
    psd_format: 'standard',
    include_metadata: true,
    reporting_date: new Date().toISOString().split('T')[0],
    institution_code: '',
  });
  const formState = inputValues;

  // Comprehensive input configurations for all workflow steps
  const getStepInputConfig = (stepName: string, workflowType: string): StepInputConfig | null => {
    const configs: Record<string, StepInputConfig> = {
      // BA WORKFLOW CONFIGURATIONS
      'Select Documents': {
        stepName: 'Select Documents',
        description: 'Parse and extract structured content from regulatory documents',
        fields: [
          {
            name: 'comparison_mode',
            label: 'Comparison Mode',
            type: 'radio',
            required: true,
            default: 'datamodel',
            options: [
              { value: 'datamodel', label: 'New Report' },
              { value: 'document', label: 'Existing report' }
            ],
            description: 'Choose whether to compare two documents or a data model against a document'
          },
          {
            name: 'data_model',
            label: 'Data Model',
            type: 'select',
            required: true,
            condition: (values) => values.comparison_mode === 'datamodel',
            description: 'Select data model to compare against'
          },
          {
            name: 'document_1',
            label: 'Document (Lower Version)',
            type: 'select',
            required: true,
            condition: (values) => values.comparison_mode === 'document',
            description: 'Select first document to parse'
          },
          {
            name: 'document_2',
            label: comparisonMode === 'datamodel' ? 'Document' : 'Document (Greater Version)',
            type: 'select',
            required: true,
            description: 'Select second document to compare'
          },
          {
            name: 'parse_mode',
            label: 'Parse Mode',
            type: 'select',
            required: false,
            default: 'all',
            options: [
              { value: 'all', label: 'All Content' },
              { value: 'tables', label: 'Tables Only' },
              { value: 'paragraphs', label: 'Paragraphs Only' }
            ],
            description: 'What content to extract from documents'
          }
        ]
      },

      'Comparison': {
        stepName: 'Comparison',
        description: 'Compare parsed documents to identify regulatory changes',
        fields: [
          {
            name: 'comparison_mode_diff',
            label: 'Comparison Focus',
            type: 'select',
            required: false,
            default: 'full',
            options: [
              { value: 'full', label: 'Full Comparison' },
              { value: 'tables_only', label: 'Tables Only' },
              { value: 'paragraphs_only', label: 'Paragraphs Only' }
            ],
            description: 'Focus comparison on specific content types'
          },
          {
            name: 'min_similarity',
            label: 'Minimum Similarity Threshold (%)',
            type: 'slider',
            required: false,
            default: 70,
            min: 0,
            max: 100,
            step: 5,
            description: 'Minimum similarity score to consider items as matches'
          }
        ]
      },

      'Field Mapping': {
        stepName: 'Field Mapping',
        description: 'Create field-level mappings between data sources with automatic similarity matching',
        fields: [
          {
            name: 'confidence_threshold',
            label: 'Confidence Threshold (%)',
            type: 'slider',
            required: false,
            default: 60,
            min: 50,
            max: 95,
            step: 5,
            description: 'Minimum confidence score for automatic mappings (60-95%)'
          },
          {
            name: 'enable_fuzzy_matching',
            label: 'Enable Fuzzy Matching',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Use fuzzy string matching for field names (recommended)'
          },
          {
            name: 'include_sample_values',
            label: 'Include Sample Values',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Show sample values in mapping results for verification'
          },
          {
            name: 'manual_mappings',
            label: 'Manual Mappings (JSON)',
            type: 'textarea',
            required: false,
            placeholder: '[{"datamodel_table":"Customers","datamodel_field":"customer_id","document_table":1,"document_column":"Customer ID"}]',
            description: 'Optional: Provide manual mappings as JSON array to override automatic mappings'
          }
        ]
      },

      'Functional Specification': {
        stepName: 'Functional Specification',
        description: 'Analyze gaps between regulatory requirements',
        fields: [
          {
            name: 'report_format',
            label: 'Report Format',
            type: 'radio',
            required: false,
            default: 'markdown',
            options: [
              { value: 'markdown', label: 'Markdown' },
              { value: 'json', label: 'JSON' }
            ],
            description: 'Output format for gap analysis report'
          },
          {
            name: 'include_appendices',
            label: 'Include Appendices',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Add detailed appendix sections to report'
          }
        ]
      },


      'Assign to Developer': {
        stepName: 'Assign to Developer',
        description: 'Assign workflow to a developer for implementation',
        fields: [
          {
            name: 'developer_id',
            label: 'Select Developer',
            type: 'select',
            required: true,
            options: [], // Will be populated dynamically with users having Developer role
            description: 'Choose a developer to work on this workflow'
          },
          {
            name: 'assignment_notes',
            label: 'Assignment Notes',
            type: 'textarea',
            required: false,
            placeholder: 'Add any specific instructions or context for the developer',
            description: 'Optional notes for the developer'
          },
          {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            required: false,
            default: 'medium',
            options: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ],
            description: 'Assignment priority level'
          }
        ]
      },

      // DEVELOPER WORKFLOW CONFIGURATIONS
      'Schema Generator': {
        stepName: 'Schema Generator',
        description: 'Generate data model schema from FCA documents',
        fields: [
          {
            name: 'document_id',
            label: 'FCA Document',
            type: 'select',
            required: true,
            placeholder: 'Select FCA document...',
            description: 'FCA document containing PSD tables'
          },
          {
            name: 'generate_all',
            label: 'Extract All PSD Tables',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Extract all PSD tables found in document'
          },
          {
            name: 'psd_tables',
            label: 'Specific PSD Tables',
            type: 'text',
            required: false,
            placeholder: 'PSD0006, PSD0008 (leave empty for all)',
            description: 'Comma-separated list of specific PSD tables to extract',
            showWhen: { field: 'generate_all', value: false }
          },
          {
            name: 'output_format',
            label: 'Output Format',
            type: 'select',
            required: false,
            default: 'data_model',
            options: [
              { value: 'data_model', label: 'Data Model (Library Format)' },
              { value: 'json', label: 'JSON Schema' }
            ],
            description: 'Schema output format'
          }
        ]
      },

      'Schema Analyzer': {
        stepName: 'Schema Analyzer',
        description: 'Analyze database schemas for compliance',
        fields: [
          {
            name: 'input_mode',
            label: 'Input Mode',
            type: 'select',
            required: true,
            default: 'data_model',
            options: [
              { value: 'data_model', label: 'Data Model Library' },
              { value: 'schema_definition', label: 'Schema Definition' }
            ],
            description: 'Select input source'
          },
          {
            name: 'data_model_id',
            label: 'Select Data Model',
            type: 'data-model-select',
            required: false,
            placeholder: 'Choose a data model from library...',
            description: 'Select pre-uploaded data model',
            showWhen: { field: 'input_mode', value: 'data_model' }
          },
          {
            name: 'schema_source',
            label: 'Schema Source',
            type: 'textarea',
            required: false,
            placeholder: 'Paste SQL DDL, JSON schema, or data dictionary...',
            description: 'Schema definition to analyze',
            showWhen: { field: 'input_mode', value: 'schema_definition' }
          },
          {
            name: 'schema_type',
            label: 'Schema Type',
            type: 'select',
            required: false,
            default: 'database_schema',
            options: [
              { value: 'database_schema', label: 'Database Schema' },
              { value: 'data_model', label: 'Data Model' },
              { value: 'data_dictionary', label: 'Data Dictionary' }
            ],
            description: 'Type of schema input',
            showWhen: { field: 'input_mode', value: 'schema_definition' }
          },
          {
            name: 'analysis_mode',
            label: 'Analysis Mode',
            type: 'select',
            required: false,
            default: 'full',
            options: [
              { value: 'full', label: 'Full Analysis' },
              { value: 'quick', label: 'Quick Analysis' }
            ],
            description: 'Depth of analysis'
          },
          {
            name: 'validate_compliance',
            label: 'Validate Compliance',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Check schema against best practices'
          },
          {
            name: 'extract_entities_schema',
            label: 'Extract Entities',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Extract entities for knowledge graph'
          }
        ]
      },

      'SQL Generator': {
        stepName: 'SQL Generator',
        description: 'Generate SQL queries and schemas from requirements',
        fields: [
          {
            name: 'sql_requirements',
            label: 'Requirements',
            type: 'textarea',
            required: false,
            placeholder: 'Describe SQL generation requirements...',
            description: 'Specify what SQL to generate'
          },
          {
            name: 'generation_type',
            label: 'Generation Type',
            type: 'select',
            required: false,
            default: 'all',
            options: [
              { value: 'all', label: 'All SQL Types' },
              { value: 'ddl', label: 'DDL (Schema)' },
              { value: 'dml', label: 'DML (Data)' },
              { value: 'query', label: 'Queries' },
              { value: 'migration', label: 'Migrations' }
            ],
            description: 'Types of SQL to generate'
          },
          {
            name: 'database_type',
            label: 'Database Type',
            type: 'select',
            required: false,
            default: 'postgresql',
            options: [
              { value: 'postgresql', label: 'PostgreSQL' },
              { value: 'mysql', label: 'MySQL' },
              { value: 'oracle', label: 'Oracle' },
              { value: 'sqlserver', label: 'SQL Server' }
            ],
            description: 'Target database platform'
          },
          {
            name: 'include_comments',
            label: 'Include Comments',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Add explanatory comments to SQL'
          },
          {
            name: 'include_tests_sql',
            label: 'Include Tests',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Generate test queries'
          },
          {
            name: 'optimize_performance',
            label: 'Optimize Performance',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Apply performance optimizations'
          }
        ]
      },

      'Python ETL Generator': {
        stepName: 'Python ETL Generator',
        description: 'Generate Python ETL pipelines for data transformation',
        fields: [
          {
            name: 'etl_requirements',
            label: 'ETL Requirements',
            type: 'textarea',
            required: false,
            placeholder: 'Describe ETL pipeline requirements...',
            description: 'Transformation logic and requirements'
          },
          {
            name: 'etl_framework',
            label: 'ETL Framework',
            type: 'select',
            required: false,
            default: 'pandas',
            options: [
              { value: 'pandas', label: 'Pandas' },
              { value: 'spark', label: 'Apache Spark' },
              { value: 'custom', label: 'Custom' }
            ],
            description: 'Python framework to use'
          },
          {
            name: 'target_data_model_id',
            label: 'Target Data Model',
            type: 'select',
            required: false,
            options: [], // Populated dynamically from dataModels state
            description: 'Select target schema from Data Model Library'
          },
          {
            name: 'source_schema',
            label: 'Source Schema (from SQL Generator)',
            type: 'textarea',
            required: false,
            autoPopulate: true,
            placeholder: 'Auto-populated from Step 2 (SQL Generator)...',
            description: 'Source schema from SQL Generator output (read-only)'
          },
          {
            name: 'target_schema',
            label: 'Target Schema (from Data Model)',
            type: 'textarea',
            required: false,
            autoPopulate: true,
            placeholder: 'Auto-populated from selected Data Model...',
            description: 'Target schema from Data Model Library (read-only)'
          },
          {
            name: 'include_tests_etl',
            label: 'Include Tests',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Generate unit tests for ETL'
          },
          {
            name: 'include_orchestration',
            label: 'Include Orchestration',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Generate Airflow/orchestration scripts'
          }
        ]
      },

      'Deterministic Mapping': {
        stepName: 'Deterministic Mapping',
        description: 'Generate XSD/XML mappings from SQL Generator and Schema Analyzer outputs',
        fields: [
          {
            name: 'sql_generator_output',
            label: 'SQL Generator Output (Step 2)',
            type: 'textarea',
            required: true,
            autoPopulate: true,
            placeholder: 'Auto-populated from Step 2 (SQL Generator)...',
            description: 'SQL schema and DDL from SQL Generator (read-only)'
          },
          {
            name: 'schema_analyzer_output',
            label: 'Schema Analyzer Output (Step 1)',
            type: 'textarea',
            required: true,
            autoPopulate: true,
            placeholder: 'Auto-populated from Step 1 (Schema Analyzer)...',
            description: 'Schema analysis results from Schema Analyzer (read-only)'
          },
          {
            name: 'output_format',
            label: 'Output Format',
            type: 'select',
            required: false,
            default: 'both',
            options: [
              { value: 'both', label: 'XSD + XML' },
              { value: 'xsd', label: 'XSD Only' },
              { value: 'xml', label: 'XML Only' }
            ],
            description: 'Format to generate'
          },
          {
            name: 'namespace',
            label: 'XML Namespace',
            type: 'text',
            required: false,
            placeholder: 'http://example.com/schema',
            description: 'XML namespace URI (optional)'
          },
          {
            name: 'include_annotations',
            label: 'Include Annotations',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Add documentation annotations to XSD'
          },
          {
            name: 'validate_mappings',
            label: 'Validate Schema',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Validate generated XSD/XML'
          },
          {
            name: 'generate_lookups',
            label: 'Generate Lookups',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Create lookup/reference tables'
          }
        ]
      },

      'Test Integration': {
        stepName: 'Test Integration',
        description: 'Auto-generate and execute test cases for SQL and Python ETL code',
        fields: [
          {
            name: 'integration_type',
            label: 'Test Type',
            type: 'select',
            required: true,
            default: 'all',
            options: [
              { value: 'all', label: 'All Test Types (Unit + Integration + E2E)' },
              { value: 'unit', label: 'Unit Tests Only' },
              { value: 'integration', label: 'Integration Tests Only' },
              { value: 'e2e', label: 'End-to-End Tests Only' }
            ],
            description: 'Select which types of tests to auto-generate and execute'
          },
          {
            name: 'execute_tests',
            label: 'Execute Tests',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Auto-execute generated tests (disable to only generate without running)'
          }
        ]
      },

      'Assign to Reviewer': {
        stepName: 'Assign to Reviewer',
        description: 'Assign workflow to a reviewer for approval',
        fields: [
          {
            name: 'reviewer_id',
            label: 'Select Reviewer',
            type: 'select',
            required: true,
            options: [], // Will be populated dynamically with users having Reviewer role
            description: 'Choose a reviewer to approve this workflow'
          },
          {
            name: 'assignment_notes',
            label: 'Assignment Notes',
            type: 'textarea',
            required: false,
            placeholder: 'Add any specific instructions or context for the reviewer',
            description: 'Optional notes for the reviewer'
          },
          {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            required: false,
            default: 'medium',
            options: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ],
            description: 'Assignment priority level'
          }
        ]
      },

      // ANALYST WORKFLOW CONFIGURATIONS
      'Validation': {
        stepName: 'Validation',
        description: 'Validate data quality and regulatory compliance',
        fields: [
          {
            name: 'data_source',
            label: 'Data Source',
            type: 'textarea',
            required: true,
            placeholder: 'Paste JSON or CSV data...',
            description: 'Regulatory data to validate'
          },
          {
            name: 'validation_type',
            label: 'Validation Type',
            type: 'select',
            required: false,
            default: 'all',
            options: [
              { value: 'all', label: 'All Validations' },
              { value: 'schema', label: 'Schema Validation' },
              { value: 'rules', label: 'Rules Validation' },
              { value: 'completeness', label: 'Completeness Check' }
            ],
            description: 'Types of validation to perform'
          },
          {
            name: 'schema_name',
            label: 'Schema Name',
            type: 'select',
            required: false,
            default: 'capital_requirement',
            options: [
              { value: 'capital_requirement', label: 'Capital Requirement' },
              { value: 'liquidity_ratio', label: 'Liquidity Ratio' },
              { value: 'risk_weighted_assets', label: 'Risk Weighted Assets' },
              { value: 'custom', label: 'Custom' }
            ],
            description: 'Predefined validation schema'
          },
          {
            name: 'rule_set',
            label: 'Rule Set',
            type: 'select',
            required: false,
            default: 'basel_iii',
            options: [
              { value: 'basel_iii', label: 'Basel III' },
              { value: 'basel_iv', label: 'Basel IV' },
              { value: 'crd_iv', label: 'CRD IV' },
              { value: 'custom', label: 'Custom' }
            ],
            description: 'Regulatory rule set to apply'
          },
          {
            name: 'template_name',
            label: 'Template Name',
            type: 'select',
            required: false,
            default: 'psd_capital',
            options: [
              { value: 'psd_capital', label: 'PSD Capital' },
              { value: 'psd_liquidity', label: 'PSD Liquidity' },
              { value: 'psd_leverage', label: 'PSD Leverage' },
              { value: 'custom', label: 'Custom' }
            ],
            description: 'Completeness check template'
          },
          {
            name: 'fail_fast',
            label: 'Fail Fast',
            type: 'checkbox',
            required: false,
            default: false,
            description: 'Stop validation on first critical error'
          }
        ]
      },

      'Anomaly Detection': {
        stepName: 'Anomaly Detection',
        description: 'Detect anomalies and outliers in regulatory data',
        fields: [
          {
            name: 'detection_algorithm',
            label: 'Detection Algorithm',
            type: 'select',
            required: false,
            default: 'statistical',
            options: [
              { value: 'statistical', label: 'Statistical' },
              { value: 'ml', label: 'Machine Learning' },
              { value: 'rule_based', label: 'Rule-Based' },
              { value: 'hybrid', label: 'Hybrid' }
            ],
            description: 'Anomaly detection method'
          },
          {
            name: 'sensitivity',
            label: 'Sensitivity',
            type: 'select',
            required: false,
            default: 'medium',
            options: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' }
            ],
            description: 'Sensitivity threshold for anomaly detection'
          },
          {
            name: 'time_period_start',
            label: 'Time Period Start',
            type: 'date',
            required: false,
            description: 'Historical period start date'
          },
          {
            name: 'time_period_end',
            label: 'Time Period End',
            type: 'date',
            required: false,
            description: 'Historical period end date'
          },
          {
            name: 'threshold_rules',
            label: 'Threshold Rules',
            type: 'textarea',
            required: false,
            placeholder: '{"field": "value", "threshold": 0.05}',
            description: 'Custom threshold rules (JSON)'
          }
        ]
      },

      'Variance Explanation': {
        stepName: 'Variance Explanation',
        description: 'Explain variances between expected and actual values',
        fields: [
          {
            name: 'explanation_depth',
            label: 'Explanation Depth',
            type: 'select',
            required: false,
            default: 'detailed',
            options: [
              { value: 'summary', label: 'Summary' },
              { value: 'detailed', label: 'Detailed' },
              { value: 'comprehensive', label: 'Comprehensive' }
            ],
            description: 'Level of analysis detail'
          },
          {
            name: 'include_recommendations',
            label: 'Include Recommendations',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Provide remediation recommendations'
          },
          {
            name: 'historical_context_months',
            label: 'Historical Context (Months)',
            type: 'number',
            required: false,
            default: 3,
            min: 1,
            max: 12,
            description: 'Months of historical data to consider'
          }
        ]
      },

      'Cross Report Reconciliation': {
        stepName: 'Cross Report Reconciliation',
        description: 'Reconcile data across multiple regulatory reports',
        fields: [
          {
            name: 'reports_data',
            label: 'Reports',
            type: 'textarea',
            required: true,
            placeholder: '[{...report1...}, {...report2...}]',
            description: 'Multiple regulatory reports to reconcile (JSON)'
          },
          {
            name: 'reconciliation_rules',
            label: 'Reconciliation Rules',
            type: 'select',
            required: false,
            default: 'standard',
            options: [
              { value: 'standard', label: 'Standard' },
              { value: 'strict', label: 'Strict' },
              { value: 'custom', label: 'Custom' }
            ],
            description: 'Rule set for reconciliation'
          },
          {
            name: 'tolerance_threshold',
            label: 'Tolerance Threshold (%)',
            type: 'slider',
            required: false,
            default: 1,
            min: 0.01,
            max: 10,
            step: 0.1,
            description: 'Acceptable variance threshold'
          },
          {
            name: 'report_types',
            label: 'Report Types',
            type: 'multi-select',
            required: false,
            options: [
              { value: 'capital', label: 'Capital' },
              { value: 'liquidity', label: 'Liquidity' },
              { value: 'leverage', label: 'Leverage' },
              { value: 'risk', label: 'Risk' },
              { value: 'other', label: 'Other' }
            ],
            description: 'Types of reports being reconciled'
          }
        ]
      },

      'Audit Pack Generator': {
        stepName: 'Audit Pack Generator',
        description: 'Generate comprehensive audit packages',
        fields: [
          {
            name: 'audit_format',
            label: 'Audit Format',
            type: 'select',
            required: false,
            default: 'pdf',
            options: [
              { value: 'pdf', label: 'PDF' },
              { value: 'excel', label: 'Excel' },
              { value: 'markdown', label: 'Markdown' },
              { value: 'all', label: 'All Formats' }
            ],
            description: 'Output format for audit documentation'
          },
          {
            name: 'include_evidence',
            label: 'Include Evidence',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Include supporting evidence documents'
          },
          {
            name: 'audit_period_start',
            label: 'Audit Period Start',
            type: 'date',
            required: false,
            description: 'Reporting period start date'
          },
          {
            name: 'audit_period_end',
            label: 'Audit Period End',
            type: 'date',
            required: false,
            description: 'Reporting period end date'
          },
          {
            name: 'regulatory_framework',
            label: 'Regulatory Framework',
            type: 'select',
            required: false,
            default: 'basel_iii',
            options: [
              { value: 'basel_iii', label: 'Basel III' },
              { value: 'basel_iv', label: 'Basel IV' },
              { value: 'crd_iv', label: 'CRD IV' },
              { value: 'ifrs9', label: 'IFRS 9' },
              { value: 'other', label: 'Other' }
            ],
            description: 'Applicable regulatory framework'
          }
        ]
      },

      'PSD CSV Generator': {
        stepName: 'PSD CSV Generator',
        description: 'Generate PSD CSV files for regulatory submission',
        fields: [
          {
            name: 'psd_format',
            label: 'PSD Format',
            type: 'select',
            required: false,
            default: 'standard',
            options: [
              { value: 'standard', label: 'Standard' },
              { value: 'extended', label: 'Extended' },
              { value: 'custom', label: 'Custom' }
            ],
            description: 'PSD file format specification'
          },
          {
            name: 'include_metadata',
            label: 'Include Metadata',
            type: 'checkbox',
            required: false,
            default: true,
            description: 'Add metadata headers to CSV'
          },
          {
            name: 'reporting_date',
            label: 'Reporting Date',
            type: 'date',
            required: false,
            default: new Date().toISOString().split('T')[0],
            description: 'Effective date for PSD report'
          },
          {
            name: 'institution_code',
            label: 'Institution Code',
            type: 'text',
            required: false,
            placeholder: 'e.g., GB12345678',
            description: 'Regulatory institution identifier'
          }
        ]
      },

      'Complete Workflow': {
        stepName: 'Complete Workflow',
        description: 'Complete and approve workflow or return for revisions',
        fields: [
          {
            name: 'approval_action',
            label: 'Action',
            type: 'radio',
            required: true,
            default: 'approve',
            options: [
              { value: 'approve', label: 'Approve and Complete' },
              { value: 'reject', label: 'Return for Revisions' }
            ],
            description: 'Approve workflow or return for corrections'
          },
          {
            name: 'return_to_stage',
            label: 'Return to Stage',
            type: 'select',
            required: false,
            condition: (values) => values.approval_action === 'reject',
            options: [
              { value: 'business_analyst', label: 'Business Analyst' },
              { value: 'developer', label: 'Developer' }
            ],
            description: 'Stage to return workflow to'
          },
          {
            name: 'assigned_to_user_id',
            label: 'Assign To',
            type: 'select',
            required: false,
            condition: (values) => values.approval_action === 'reject',
            options: [], // Will be populated dynamically
            description: 'User to assign returned workflow to'
          },
          {
            name: 'completion_notes',
            label: 'Completion Notes',
            type: 'textarea',
            required: true,
            placeholder: 'Add approval comments or revision requirements',
            description: 'Notes for completion or revision'
          }
        ]
      }
    };

    const config = configs[stepName] || null;

    // Dynamically populate developer dropdown for "Assign to Developer" step
    if (stepName === 'Assign to Developer' && config) {
      const developerField = config.fields.find(f => f.name === 'developer_id');
      if (developerField && Array.isArray(users)) {
        developerField.options = users
          .filter((u: any) => {
            const roleName = u.role?.name || '';
            // Match "Data Engineer/Developer" or "Developer" role
            return roleName.toLowerCase().includes('developer') ||
                   roleName.toLowerCase().includes('data engineer');
          })
          .map((u: any) => ({
            value: u.id,
            label: `${u.username} (${u.email})`
          }));

        // If no developers found, add a placeholder option
        if (developerField.options.length === 0) {
          developerField.options = [
            { value: '', label: 'No developers available - please create developer users first' }
          ];
        }
      }
    }

    // Dynamically populate reviewer dropdown for "Assign to Reviewer" step
    if (stepName === 'Assign to Reviewer' && config) {
      const reviewerField = config.fields.find(f => f.name === 'reviewer_id');
      if (reviewerField && Array.isArray(users)) {
        reviewerField.options = users
          .filter((u: any) => {
            const roleName = u.role?.name || '';
            return roleName.toLowerCase().includes('reviewer') ||
                   roleName.toLowerCase().includes('analyst');
          })
          .map((u: any) => ({
            value: u.id,
            label: `${u.username} (${u.email})`
          }));

        if (reviewerField.options.length === 0) {
          reviewerField.options = [
            { value: '', label: 'No reviewers available - please create reviewer users first' }
          ];
        }
      }
    }

    // Dynamically populate user dropdown for "Complete Workflow" return assignment
    if (stepName === 'Complete Workflow' && config) {
      const assignField = config.fields.find(f => f.name === 'assigned_to_user_id');
      if (assignField && Array.isArray(users)) {
        assignField.options = users.map((u: any) => ({
          value: u.id,
          label: `${u.username} (${u.email})`
        }));
      }
    }

    return config;
  };

  // Helper function to update input values
  const updateInputValue = (fieldName: string, value: any) => {
    setInputValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  useEffect(() => {
    fetchDocuments();
    fetchDataModels();
    fetchUsers();
    loadPreviousStepResults();

    // Check if workflow is already submitted
    if (workflow.is_submitted) {
      setWorkflowSubmitted(true);
    }
  }, [workflow.id]);

  // Auto-populate Python ETL Generator and Deterministic Mapping fields when step changes or data changes
  useEffect(() => {
    if (workflow.workflow_type !== 'developer') return;

    // Step 3: Python ETL Generator
    if (currentStepIndex === 3) {
      // Auto-populate source_schema from Step 2 (SQL Generator)
      const sqlGeneratorResult = stepResults[2];
      if (sqlGeneratorResult?.result) {
        try {
          let sourceSchemaText = '';

          // Handle different result formats
          if (typeof sqlGeneratorResult.result === 'string') {
            // If it's already a string, try to parse and re-stringify for formatting
            try {
              const parsed = JSON.parse(sqlGeneratorResult.result);
              sourceSchemaText = JSON.stringify(parsed, null, 2);
            } catch {
              // If parsing fails, use as-is
              sourceSchemaText = sqlGeneratorResult.result;
            }
          } else if (typeof sqlGeneratorResult.result === 'object') {
            // If it's an object, stringify it
            sourceSchemaText = JSON.stringify(sqlGeneratorResult.result, null, 2);
          }

          // Only update if we have content and field is empty
          if (sourceSchemaText && !inputValues.source_schema) {
            console.log('[ETL_UI] Setting source_schema, length:', sourceSchemaText.length);
            console.log('[ETL_UI] Source schema preview:', sourceSchemaText.substring(0, 200));
            updateInputValue('source_schema', sourceSchemaText);
          }
        } catch (error) {
          console.error('[ETL_UI] Error formatting source schema:', error);
        }
      }

      // Auto-populate target_schema when target_data_model_id changes
      if (inputValues.target_data_model_id) {
        // Fetch the full data model details to get schema_data
        const fetchModelSchema = async () => {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/model-library/models/${inputValues.target_data_model_id}`,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );

            if (response.ok) {
              const modelDetail = await response.json();
              console.log('[ETL_UI] Fetched model detail:', modelDetail);

              let targetSchemaText = '';

              // DataModel API returns schema_data field
              const schemaData = modelDetail.schema_data || modelDetail.tables;

              if (typeof schemaData === 'string') {
                // If it's a string, try to parse and re-stringify for formatting
                try {
                  const parsed = JSON.parse(schemaData);
                  targetSchemaText = JSON.stringify(parsed, null, 2);
                } catch {
                  targetSchemaText = schemaData;
                }
              } else if (typeof schemaData === 'object' && schemaData !== null) {
                // If it's an object (like tables array), stringify it
                targetSchemaText = JSON.stringify(schemaData, null, 2);
              }

              if (targetSchemaText) {
                console.log('[ETL_UI] Setting target_schema, length:', targetSchemaText.length);
                console.log('[ETL_UI] Target schema preview:', targetSchemaText.substring(0, 200));
                updateInputValue('target_schema', targetSchemaText);
              }
            } else {
              console.error('[ETL_UI] Failed to fetch model details:', response.status);
            }
          } catch (error) {
            console.error('[ETL_UI] Error fetching model schema:', error);
          }
        };

        fetchModelSchema();
      }
    }

    // Step 4: Deterministic Mapping (XSD/XML Generator)
    if (currentStepIndex === 4) {
      // Auto-populate sql_generator_output from Step 2 (SQL Generator)
      const sqlGeneratorResult = stepResults[2];
      if (sqlGeneratorResult?.result && !inputValues.sql_generator_output) {
        try {
          const sqlOutputText = JSON.stringify(sqlGeneratorResult.result, null, 2);
          console.log('[Mapping_UI] Setting sql_generator_output, length:', sqlOutputText.length);
          updateInputValue('sql_generator_output', sqlOutputText);
        } catch (error) {
          console.error('[Mapping_UI] Error formatting SQL Generator output:', error);
        }
      }

      // Auto-populate schema_analyzer_output from Step 1 (Schema Analyzer)
      const schemaAnalyzerResult = stepResults[1];
      if (schemaAnalyzerResult?.result && !inputValues.schema_analyzer_output) {
        try {
          const analyzerOutputText = JSON.stringify(schemaAnalyzerResult.result, null, 2);
          console.log('[Mapping_UI] Setting schema_analyzer_output, length:', analyzerOutputText.length);
          updateInputValue('schema_analyzer_output', analyzerOutputText);
        } catch (error) {
          console.error('[Mapping_UI] Error formatting Schema Analyzer output:', error);
        }
      }
    }
  }, [currentStepIndex, stepResults, inputValues.target_data_model_id, inputValues.source_schema, inputValues.sql_generator_output, inputValues.schema_analyzer_output, workflow.workflow_type]);

  const loadPreviousStepResults = async () => {
    try {
      const token = localStorage.getItem('token');

      // Use unified workflow API endpoint
      const response = await fetch(`${API_BASE_URL}/api/workflows/${workflow.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Build stepResults object from workflow steps
        const loadedResults: Record<number, any> = {};

        if (data.steps && Array.isArray(data.steps)) {
          // Sort steps by step_order and process them
          const sortedSteps = data.steps.sort((a: any, b: any) => a.step_order - b.step_order);

          sortedSteps.forEach((step: any) => {
            // Only load completed steps with results
            if (step.status === 'completed' && step.result) {
              loadedResults[step.step_order] = {
                status: 'success',
                result: step.result
              };
            }
          });
        }

        setStepResults(loadedResults);

        // Check if workflow is submitted (based on status)
        if (data.status === 'completed' || data.status === 'submitted') {
          setWorkflowSubmitted(true);
        }

        // Set current step to the last completed step, or 0 if none completed
        const completedIndices = Object.keys(loadedResults).map(k => parseInt(k));
        if (completedIndices.length > 0) {
          const lastCompletedIndex = Math.max(...completedIndices);
          setCurrentStepIndex(lastCompletedIndex);
          setCurrentStepResult(loadedResults[lastCompletedIndex]);

          console.log(`Loaded ${completedIndices.length} previous step results. Last completed: Step ${lastCompletedIndex}`);
          showToast.success(`Restored ${completedIndices.length} completed step${completedIndices.length > 1 ? 's' : ''}`);
        } else {
          console.log('No previous step results found');
        }

        console.log('Loaded step results:', loadedResults);
      }
    } catch (error) {
      console.error('Failed to load previous step results:', error);
      showToast.error('Failed to load previous results');
    }
  };

  const fetchDocuments = async () => {
    try {
      const data = await documentService.getAll();
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchDataModels = async () => {
    try {
      const response = await getDataModels(0, 100);
      setDataModels(response.models);
    } catch (error) {
      console.error('Failed to fetch data models:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/auth/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const getSteps = () => {
    if (workflow.workflow_type === 'complete') {
      return [
        { name: 'Select Documents', tools: ['Document Tool'], phase: 'BA Analysis', phaseColor: '#f59e0b' },
        { name: 'Comparison', tools: ['Document Tool'], phase: 'BA Analysis', phaseColor: '#f59e0b' },
        { name: 'Field Mapping', tools: ['Document Tool', 'Validation Tool'], phase: 'BA Analysis', phaseColor: '#8b5cf6' },
        { name: 'Functional Specification', tools: ['Report Tool', 'Statistical Tool'], phase: 'BA Analysis', phaseColor: '#f59e0b' },
        { name: 'Assign to Developer', tools: [], phase: 'Handoff', phaseColor: '#10b981' },
        { name: 'Schema Analyzer', tools: ['Postgres Tool', 'Embedding Tool'], phase: 'Development', phaseColor: '#8b5cf6' },
        { name: 'SQL Generator', tools: ['Postgres Tool'], phase: 'Development', phaseColor: '#8b5cf6' },
        { name: 'Python ETL Generator', tools: ['Code Formatter Tool'], phase: 'Development', phaseColor: '#8b5cf6' },
        { name: 'Deterministic Mapping', tools: ['XSD Generator', 'XML Validator'], phase: 'Development', phaseColor: '#8b5cf6' },
        { name: 'Test Integration', tools: ['Test Runner Tool'], phase: 'Development', phaseColor: '#8b5cf6' },
        { name: 'Cross Report Reconciliation', tools: ['Statistical Tool', 'Report Tool'], phase: 'Review', phaseColor: '#3b82f6' },
        { name: 'Variance Explanation', tools: ['Statistical Tool'], phase: 'Review', phaseColor: '#3b82f6' },
        { name: 'Anomaly Detection', tools: ['Statistical Tool', 'Visualization Tool'], phase: 'Review', phaseColor: '#3b82f6' },
        { name: 'PSD CSV Generator', tools: ['Report Tool'], phase: 'Review', phaseColor: '#3b82f6' },
        { name: 'Validation', tools: ['Validation Tool'], phase: 'Review', phaseColor: '#3b82f6' },
        { name: 'Audit Pack Generator', tools: ['Report Tool', 'Document Tool'], phase: 'Review', phaseColor: '#3b82f6' }
      ];
    }

    const hierarchies: Record<string, Array<{ name: string; tools: string[]; phaseColor: string }>> = {
      business_analyst: [
        { name: 'Select Documents', tools: ['Document Tool'], phaseColor: '#f59e0b' },
        { name: 'Comparison', tools: ['Document Tool'], phaseColor: '#f59e0b' },
        { name: 'Field Mapping', tools: ['Document Tool', 'Validation Tool'], phaseColor: '#8b5cf6' },
        { name: 'Functional Specification', tools: ['Report Tool', 'Statistical Tool'], phaseColor: '#f59e0b' },
        { name: 'Assign to Developer', tools: [], phaseColor: '#10b981' }
      ],
      developer: [
        { name: 'Schema Generator', tools: ['ReadPDF', 'ReadWord', 'ParseStructured'], phaseColor: '#8b5cf6' },
        { name: 'Schema Analyzer', tools: ['Postgres Tool', 'Embedding Tool'], phaseColor: '#8b5cf6' },
        { name: 'SQL Generator', tools: ['Postgres Tool'], phaseColor: '#8b5cf6' },
        { name: 'Python ETL Generator', tools: ['Code Formatter Tool'], phaseColor: '#8b5cf6' },
        { name: 'Deterministic Mapping', tools: ['XSD Generator', 'XML Validator'], phaseColor: '#8b5cf6' },
        { name: 'Test Integration', tools: ['Test Runner Tool'], phaseColor: '#8b5cf6' },
        { name: 'Assign to Reviewer', tools: [], phaseColor: '#10b981' }
      ],
      reviewer: [
        { name: 'Validation', tools: ['Validation Tool'], phaseColor: '#3b82f6' },
        { name: 'Anomaly Detection', tools: ['Statistical Tool'], phaseColor: '#3b82f6' },
        { name: 'Variance Explanation', tools: ['Statistical Tool', 'Report Tool'], phaseColor: '#3b82f6' },
        { name: 'Cross Report Reconciliation', tools: ['Validation Tool'], phaseColor: '#3b82f6' },
        { name: 'Audit Pack Generator', tools: ['Report Tool'], phaseColor: '#3b82f6' },
        { name: 'PSD CSV Generator', tools: ['Report Tool'], phaseColor: '#3b82f6' },
        { name: 'Complete Workflow', tools: [], phaseColor: '#10b981' }
      ],
      analyst: [
        { name: 'Validation', tools: ['Validation Tool'], phaseColor: '#3b82f6' },
        { name: 'Anomaly Detection', tools: ['Statistical Tool'], phaseColor: '#3b82f6' },
        { name: 'Variance Explanation', tools: ['Statistical Tool', 'Report Tool'], phaseColor: '#3b82f6' },
        { name: 'Cross Report Reconciliation', tools: ['Validation Tool'], phaseColor: '#3b82f6' },
        { name: 'Audit Pack Generator', tools: ['Report Tool'], phaseColor: '#3b82f6' },
        { name: 'PSD CSV Generator', tools: ['Report Tool'], phaseColor: '#3b82f6' },
        { name: 'Complete Workflow', tools: [], phaseColor: '#10b981' }
      ]
    };

    const agents = hierarchies[workflow.workflow_type || 'business_analyst'] || hierarchies.business_analyst;
    return agents.map(agent => ({
      name: agent.name,
      tools: agent.tools,
      phase: workflow.workflow_type === 'business_analyst' ? 'Business Analyst' :
             workflow.workflow_type === 'developer' ? 'Developer' :
             workflow.workflow_type === 'reviewer' ? 'Reviewer' : 'Workflow',
      phaseColor: agent.phaseColor
    }));
  };

  const steps = getSteps();
  const currentStep = steps[currentStepIndex];

  const handleRunAgent = async () => {
    // Check if documents are needed and available
    if (currentStep.name === 'Select Documents') {
      if (documents.length === 0) {
        alert('No documents available. Please upload documents via the Document Management page first.');
        return;
      }

      const isValid = comparisonMode === 'datamodel'
        ? selectedDataModel && selectedDoc2
        : selectedDoc1 && selectedDoc2;

      if (!isValid) {
        alert('Please select both items for comparison');
        return;
      }
    }
    
    setRunningAgent(true);
    setCurrentStepResult(null);
    
    try {
      let result: any;
      
      // Call the specific agent endpoint based on the current step
      switch (currentStep.name) {
        case 'Select Documents': {
          const context = {
            comparison_mode: comparisonMode,
            data_model_id: comparisonMode === 'datamodel' ? selectedDataModel : null,
            document_1_id: comparisonMode === 'document' ? selectedDoc1 : null,
            document_2_id: selectedDoc2,
            parse_mode: 'all' // Extract all content: tables, paragraphs, headers, lists
          };
          result = await workflowService.executeDocumentParser(workflow.id, context);
          break;
        }
        
        case 'Comparison': {
          const parserResults = stepResults[0]; // Get results from Select Documents
          if (!parserResults) {
            alert('Please run Select Documents step first');
            return;
          }
          const context = {
            parser_results: parserResults.result
          };
          result = await workflowService.executeRegulatoryDiff(workflow.id, context);
          break;
        }

        case 'Field Mapping': {
          const parserResults = stepResults[0]; // Get results from Select Documents
          const diffResults = stepResults[1]; // Get results from Comparison
          if (!parserResults || !diffResults) {
            alert('Please run Select Documents and Comparison steps first');
            return;
          }

          // Parse manual mappings from JSON if provided
          let parsedManualMappings = [];
          if (inputValues.manual_mappings) {
            try {
              parsedManualMappings = JSON.parse(inputValues.manual_mappings);
            } catch (e) {
              alert('Invalid JSON format for manual mappings. Please check the format.');
              return;
            }
          }

          const context = {
            parser_results: parserResults.result,
            regulatory_diff: diffResults.result,
            manual_mappings: parsedManualMappings,
            confidence_threshold: inputValues.confidence_threshold || 60,
            enable_fuzzy_matching: inputValues.enable_fuzzy_matching !== false,
            include_sample_values: inputValues.include_sample_values !== false
          };
          result = await workflowService.executeDictionaryMapping(workflow.id, context);
          break;
        }

        case 'Functional Specification': {
          // Functional Specification needs Comparison (required) and Field Mapping (optional)
          const diffResults = stepResults[1]; // Step 1: Comparison
          const mappingResults = stepResults[2]; // Step 2: Field Mapping

          if (!diffResults) {
            alert('Please run Comparison step first');
            return;
          }

          const context = {
            regulatory_diff: diffResults.result,  // From Comparison step
            dictionary_mapping: mappingResults?.result,  // From Field Mapping step (optional)
          };
          result = await workflowService.executeGapAnalysis(workflow.id, context);
          break;
        }
        
        case 'Assign to Developer': {
          // Assign to Developer after Functional Specification is completed
          const gapResults = stepResults[3]; // Step 3: Functional Specification
          if (!gapResults) {
            alert('Please run Functional Specification first');
            return;
          }

          const developerId = formState.developer_id;
          if (!developerId) {
            alert('Please select a developer');
            return;
          }

          const assignmentData = {
            assigned_to_user_id: developerId,
            assignment_notes: formState.assignment_notes || '',
            priority: formState.priority || 'medium',
            current_stage: 'development'
          };

          // Call the assignment API
          const response = await fetch(
            `${API_BASE_URL}/api/workflows/${workflow.id}/assign`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(assignmentData)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to assign workflow');
          }

          const assignmentResponse = await response.json();

          // Find the assigned developer details
          const assignedDeveloper = users.find((u: any) => u.id === developerId);

          // Wrap response in result object with assignment details
          result = {
            result: {
              assigned_to: assignedDeveloper ? {
                id: assignedDeveloper.id,
                username: assignedDeveloper.username,
                email: assignedDeveloper.email
              } : { username: 'Developer' },
              priority: formState.priority || 'medium',
              assignment_notes: formState.assignment_notes || '',
              assignment_date: new Date().toISOString(),
              workflow: assignmentResponse
            }
          };

          showToast.success('Workflow assigned to developer successfully!');
          break;
        }

        // ==================== DEVELOPER WORKFLOW STEPS ====================

        case 'Schema Generator': {
          const context = {
            document_id: inputValues.document_id,
            psd_tables: inputValues.psd_tables ? inputValues.psd_tables.split(',').map((t: string) => t.trim()) : [],
            generate_all: inputValues.generate_all !== false,
            output_format: inputValues.output_format || 'data_model'
          };

          if (!context.document_id) {
            alert('Please select an FCA document');
            return;
          }

          const response = await fetch(
            `${API_BASE_URL}/api/developer/${workflow.id}/steps/schema-generator`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute Schema Generator');
          }

          result = await response.json();
          showToast.success('Schema generated successfully!');
          break;
        }

        case 'Schema Analyzer': {
          const context: any = {
            input_mode: inputValues.input_mode || 'auto',
            analysis_depth: inputValues.analysis_depth || 'comprehensive'
          };

          // Add optional target_data_model_id if provided
          if (inputValues.target_data_model_id) {
            context.target_data_model_id = inputValues.target_data_model_id;
          }

          // If using manual schema definition
          if (inputValues.input_mode === 'manual' && inputValues.schema_definition) {
            context.schema_definition = inputValues.schema_definition;
          }

          // If using generated schema from previous step
          if (inputValues.input_mode === 'generated' && stepResults[0]) {
            context.schema_definition = JSON.stringify(stepResults[0].result?.schema);
          }

          const response = await fetch(
            `${API_BASE_URL}/api/developer/${workflow.id}/steps/schema-analyzer`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute Schema Analyzer');
          }

          result = await response.json();
          showToast.success('Schema analyzed successfully!');
          break;
        }

        case 'SQL Generator': {
          const schemaResults = stepResults[1]; // Schema Analyzer is now Step 1
          if (!schemaResults) {
            alert('Please run Schema Analyzer first');
            return;
          }

          const context = {
            schema: schemaResults.result,
            sql_type: inputValues.sql_type || 'ddl',
            include_constraints: inputValues.include_constraints !== false,
            include_indexes: inputValues.include_indexes !== false
          };

          const response = await fetch(
            `${API_BASE_URL}/api/developer/${workflow.id}/steps/sql-generator`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute SQL Generator');
          }

          result = await response.json();
          showToast.success('SQL generated successfully!');
          break;
        }

        case 'Python ETL Generator': {
          const sqlResults = stepResults[2]; // SQL Generator is now Step 2
          if (!sqlResults) {
            alert('Please run SQL Generator first');
            return;
          }

          const context = {
            sql_queries: sqlResults.result,  // Backend expects sql_queries
            target_data_model_id: inputValues.target_data_model_id || null,  // Optional target schema
            framework: inputValues.etl_framework || 'pandas',
            include_logging: inputValues.include_logging !== false,
            include_error_handling: inputValues.include_error_handling !== false,
            include_validation: inputValues.include_validation !== false,
            generate_tests: inputValues.generate_tests || false
          };

          const response = await fetch(
            `${API_BASE_URL}/api/developer/${workflow.id}/steps/python-etl-generator`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute Python ETL Generator');
          }

          result = await response.json();
          showToast.success('ETL code generated successfully!');
          break;
        }

        case 'Deterministic Mapping': {
          const sqlGeneratorResults = stepResults[2]; // SQL Generator is Step 2
          const schemaAnalyzerResults = stepResults[1]; // Schema Analyzer is Step 1

          if (!sqlGeneratorResults || !schemaAnalyzerResults) {
            alert('Please run Schema Analyzer and SQL Generator first');
            return;
          }

          // Validate required outputs
          if (!inputValues.sql_generator_output || !inputValues.schema_analyzer_output) {
            alert('SQL Generator and Schema Analyzer outputs are required');
            return;
          }

          const context = {
            sql_generator_output: inputValues.sql_generator_output,
            schema_analyzer_output: inputValues.schema_analyzer_output,
            output_format: inputValues.output_format || 'both',
            namespace: inputValues.namespace || '',
            include_annotations: inputValues.include_annotations !== false,
            validate_mappings: inputValues.validate_mappings !== false
          };

          const response = await fetch(
            `${API_BASE_URL}/api/developer/${workflow.id}/steps/deterministic-mapping`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute Deterministic Mapping');
          }

          result = await response.json();
          showToast.success('XSD/XML mapping generated successfully!');
          break;
        }

        case 'Test Integration': {
          // Verify previous steps are completed
          const sqlResults = stepResults[2]; // SQL Generator
          const pythonResults = stepResults[3]; // Python ETL Generator

          if (!sqlResults && !pythonResults) {
            alert('Please run SQL Generator or Python ETL Generator first');
            return;
          }

          // Auto-generate and execute tests - no test cases needed from user
          const context = {
            integration_type: inputValues.integration_type || 'all',
            execute_tests: inputValues.execute_tests !== false
          };

          const response = await fetch(
            `${API_BASE_URL}/api/developer/${workflow.id}/steps/test-integration`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute Test Integration');
          }

          result = await response.json();
          showToast.success(`Test integration completed! Generated and executed ${result.result?.total_tests_generated || 0} tests.`);
          break;
        }

        case 'Assign to Reviewer': {
          // Assign to Reviewer after all developer steps are completed
          const testResults = stepResults[5]; // Step 5: Test Integration
          if (!testResults) {
            alert('Please complete all previous developer steps first');
            return;
          }

          const reviewerId = formState.reviewer_id;
          if (!reviewerId) {
            alert('Please select a reviewer');
            return;
          }

          const assignmentData = {
            assigned_to_user_id: reviewerId,
            assignment_notes: formState.assignment_notes || '',
            priority: formState.priority || 'medium',
            current_stage: 'reviewer'
          };

          // Call the assignment API
          const response = await fetch(
            `${API_BASE_URL}/api/workflows/${workflow.id}/assign`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(assignmentData)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to assign workflow');
          }

          const assignmentResponse = await response.json();

          // Find the assigned reviewer details
          const assignedReviewer = users.find((u: any) => u.id === reviewerId);

          // Wrap response in result object with assignment details
          result = {
            result: {
              assigned_to: assignedReviewer ? {
                id: assignedReviewer.id,
                username: assignedReviewer.username,
                email: assignedReviewer.email
              } : { username: 'Reviewer' },
              priority: formState.priority || 'medium',
              assignment_notes: formState.assignment_notes || '',
              assignment_date: new Date().toISOString(),
              workflow: assignmentResponse
            }
          };

          showToast.success('Workflow assigned to reviewer successfully!');
          break;
        }

        // ==================== REVIEWER WORKFLOW STEPS ====================

        case 'Validation': {
          const context = {
            validation_rules: inputValues.validation_rules || 'standard',
            rule_set: inputValues.rule_set || 'basel_iii',
            template_name: inputValues.template_name || 'psd_capital',
            fail_fast: inputValues.fail_fast || false
          };

          const response = await fetch(
            `${API_BASE_URL}/api/analyst/${workflow.id}/steps/validation`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute Validation');
          }

          result = await response.json();
          showToast.success('Validation completed successfully!');
          break;
        }

        case 'Anomaly Detection': {
          const context = {
            detection_algorithm: inputValues.detection_algorithm || 'statistical',
            sensitivity: inputValues.sensitivity || 'medium',
            time_period_start: inputValues.time_period_start,
            time_period_end: inputValues.time_period_end,
            threshold_rules: inputValues.threshold_rules
          };

          const response = await fetch(
            `${API_BASE_URL}/api/analyst/${workflow.id}/steps/anomaly-detection`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute Anomaly Detection');
          }

          result = await response.json();
          showToast.success('Anomaly detection completed successfully!');
          break;
        }

        case 'Variance Explanation': {
          const context = {
            explanation_depth: inputValues.explanation_depth || 'detailed',
            include_recommendations: inputValues.include_recommendations !== false,
            historical_context_months: inputValues.historical_context_months || 3
          };

          const response = await fetch(
            `${API_BASE_URL}/api/analyst/${workflow.id}/steps/variance-explanation`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute Variance Explanation');
          }

          result = await response.json();
          showToast.success('Variance explanation generated successfully!');
          break;
        }

        case 'Cross Report Reconciliation': {
          const context = {
            reports_data: inputValues.reports_data,
            reconciliation_rules: inputValues.reconciliation_rules || 'standard',
            tolerance_threshold: inputValues.tolerance_threshold || 1,
            report_types: inputValues.report_types || []
          };

          const response = await fetch(
            `${API_BASE_URL}/api/analyst/${workflow.id}/steps/cross-report-reconciliation`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute Cross Report Reconciliation');
          }

          result = await response.json();
          showToast.success('Cross report reconciliation completed successfully!');
          break;
        }

        case 'Audit Pack Generator': {
          const context = {
            audit_format: inputValues.audit_format || 'pdf',
            include_attachments: inputValues.include_attachments !== false,
            audit_scope: inputValues.audit_scope || 'full',
            compliance_frameworks: inputValues.compliance_frameworks || []
          };

          const response = await fetch(
            `${API_BASE_URL}/api/analyst/${workflow.id}/steps/audit-pack-generator`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute Audit Pack Generator');
          }

          result = await response.json();
          showToast.success('Audit pack generated successfully!');
          break;
        }

        case 'PSD CSV Generator': {
          const context = {
            psd_format: inputValues.psd_format || 'standard',
            include_metadata: inputValues.include_metadata !== false,
            delimiter: inputValues.delimiter || ',',
            encoding: inputValues.encoding || 'utf-8'
          };

          const response = await fetch(
            `${API_BASE_URL}/api/analyst/${workflow.id}/steps/psd-csv-generator`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(context)
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to execute PSD CSV Generator');
          }

          result = await response.json();
          showToast.success('PSD CSV generated successfully!');
          break;
        }

        case 'Complete Workflow': {
          // Complete Workflow - approval or rejection
          const psdResults = stepResults[5]; // Step 5: PSD CSV Generator
          if (!psdResults) {
            alert('Please complete all previous analyst steps first');
            return;
          }

          const approvalAction = formState.approval_action || 'approve';
          const completionNotes = formState.completion_notes || '';

          if (!completionNotes.trim()) {
            alert('Please provide completion notes');
            return;
          }

          if (approvalAction === 'reject') {
            const returnStage = formState.return_to_stage;
            const assignedUserId = formState.assigned_to_user_id;

            if (!returnStage || !assignedUserId) {
              alert('Please select return stage and user for rejection');
              return;
            }

            const rejectionData = {
              submission_comments: completionNotes,
              action: 'return',
              return_to_stage: returnStage,
              assigned_to_user_id: assignedUserId
            };

            const response = await fetch(
              `${API_BASE_URL}/api/analyst/${workflow.id}/submit`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(rejectionData)
              }
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.detail || 'Failed to return workflow');
            }

            result = await response.json();
            showToast.success('Workflow returned for revisions!');
          } else {
            // Approve and complete
            const approvalData = {
              submission_comments: completionNotes,
              action: 'complete'
            };

            const response = await fetch(
              `${API_BASE_URL}/api/analyst/${workflow.id}/submit`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(approvalData)
              }
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.detail || 'Failed to complete workflow');
            }

            result = await response.json();
            showToast.success('Workflow approved and completed successfully!');
          }
          break;
        }

        case 'Submit': {
          // Handle submission for developer/reviewer workflows
          await handleSubmit();
          return;
        }

        default:
          alert(`No execution handler for ${currentStep.name} yet`);
          return;
      }
      
      console.log(`${currentStep.name} result:`, result);
      
      // Store the result for this step
      setStepResults(prev => ({ ...prev, [currentStepIndex]: result }));
      setCurrentStepResult(result);
      
    } catch (error: any) {
      console.error(`Failed to run ${currentStep.name}:`, error);
      alert(`Failed to run ${currentStep.name}: ${error.response?.data?.detail || error.message}`);
    } finally {
      setRunningAgent(false);
    }
  };

  const handleSubmit = async () => {
    if (submissionComments.length < 10) {
      alert('Please provide submission comments (minimum 10 characters)');
      return;
    }

    setSubmitting(true);
    try {
      const workflowType = workflow.workflow_type === 'business_analyst' ? 'ba' :
                          workflow.workflow_type === 'developer' ? 'developer' :
                          workflow.workflow_type === 'reviewer' ? 'reviewer' : 'analyst';

      const submitData: any = {
        submission_comments: submissionComments,
      };

      if (assignedToUserId) {
        submitData.assigned_to_user_id = assignedToUserId;
      }

      if (workflowType === 'reviewer') {
        submitData.action = submitAction;
        if (submitAction === 'return') {
          submitData.return_to_stage = returnToStage;
        }
      }

      const response = await workflowAssignmentService.submitWorkflow(
        workflow.id,
        workflowType,
        submitData
      );

      showToast.success(`Workflow submitted successfully to ${response.assigned_to || 'developer'}!`);

      // Mark workflow as submitted so download buttons appear
      setWorkflowSubmitted(true);
    } catch (error: any) {
      console.error('Failed to submit workflow:', error);
      showToast.error(error.response?.data?.detail || 'Failed to submit workflow');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-execution function for Full Execute mode
  const handleAutoExecute = async () => {
    setIsAutoExecuting(true);
    setAutoExecutionProgress('Starting automated execution...');

    for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
      const step = steps[stepIdx];
      setCurrentStepIndex(stepIdx);
      setAutoExecutionProgress(`Executing Step ${stepIdx + 1}/${steps.length}: ${step.name}`);

      try {
        // For the first step (Select Documents), use the selected documents
        if (stepIdx === 0 && step.name === 'Select Documents') {
          const isValid = comparisonMode === 'datamodel'
            ? selectedDataModel && selectedDoc2
            : selectedDoc1 && selectedDoc2;

          if (!isValid) {
            setAutoExecutionProgress('❌ Error: Please select documents before starting auto-execution');
            setIsAutoExecuting(false);
            return;
          }
        }

        setRunningAgent(true);
        setCurrentStepResult(null);

        let result: any;

        // Execute the step based on its name
        switch (step.name) {
          case 'Select Documents': {
            const context = {
              comparison_mode: comparisonMode,
              data_model_id: comparisonMode === 'datamodel' ? selectedDataModel : null,
              document_1_id: comparisonMode === 'document' ? selectedDoc1 : null,
              document_2_id: selectedDoc2,
            };
            result = await workflowService.executeDocumentParser(workflow.id, context);
            break;
          }

          case 'Comparison': {
            const parserResults = stepResults[stepIdx - 1];
            if (!parserResults) {
              throw new Error('Select Documents results not found');
            }
            const context = {
              parser_results: parserResults.result
            };
            result = await workflowService.executeRegulatoryDiff(workflow.id, context);
            break;
          }

          case 'Functional Specification': {
            const diffResults = stepResults[stepIdx - 1];
            if (!diffResults) {
              throw new Error('Comparison results not found');
            }

            const diffReport = diffResults.result?.diff_report || {};
            const requirements = {
              entities: diffReport.added_fields?.map((field: any) => ({
                name: field.name || field.field_name || field,
                type: field.type || 'entity',
                description: field.description || 'New entity from regulatory update'
              })) || [],
              attributes: diffReport.modified_fields?.map((field: any) => ({
                name: field.name || field.field_name || field,
                type: field.new_value || field.type || 'string',
                required: true,
                description: field.description || 'Modified attribute'
              })) || [],
              compliance_rules: diffReport.summary?.compliance_requirements || [],
              data_quality_rules: diffReport.summary?.quality_standards || [],
              business_rules: diffReport.summary?.business_rules || []
            };

            const context = {
              requirements: requirements,
              diff_report: diffResults.result
            };
            result = await workflowService.executeGapAnalysis(workflow.id, context);
            break;
          }

          case 'Assign to Developer': {
            // This step requires manual intervention - skip in auto-execution
            result = {
              success: true,
              message: 'Assignment step requires manual selection of developer',
              result: {
                step: step.name,
                status: 'pending',
                timestamp: new Date().toISOString(),
                note: 'Please manually assign workflow to a developer'
              }
            };
            break;
          }

          case 'Assign to Reviewer': {
            // This step requires manual intervention - skip in auto-execution
            result = {
              success: true,
              message: 'Assignment step requires manual selection of reviewer',
              result: {
                step: step.name,
                status: 'pending',
                timestamp: new Date().toISOString(),
                note: 'Please manually assign workflow to a reviewer'
              }
            };
            break;
          }

          case 'Complete Workflow': {
            // This step requires manual intervention - skip in auto-execution
            result = {
              success: true,
              message: 'Completion step requires manual approval decision',
              result: {
                step: step.name,
                status: 'pending',
                timestamp: new Date().toISOString(),
                note: 'Please manually approve or return workflow'
              }
            };
            break;
          }

          default: {
            // For other steps, use a generic execution
            result = {
              success: true,
              message: `${step.name} executed successfully`,
              result: {
                step: step.name,
                status: 'completed',
                timestamp: new Date().toISOString()
              }
            };
          }
        }

        // Store the result for this step
        setStepResults(prev => ({ ...prev, [stepIdx]: result }));
        setCurrentStepResult(result);
        setAutoExecutionProgress(`✓ Completed Step ${stepIdx + 1}/${steps.length}: ${step.name}`);

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`Auto-execution failed at ${step.name}:`, error);
        setAutoExecutionProgress(`❌ Failed at Step ${stepIdx + 1}: ${step.name} - ${error.message}`);
        setIsAutoExecuting(false);
        setRunningAgent(false);
        return;
      } finally {
        setRunningAgent(false);
      }
    }

    setAutoExecutionProgress('✅ All steps completed successfully!');
    setIsAutoExecuting(false);
  };

  // Trigger auto-execution when Full Execute mode is activated
  useEffect(() => {
    if (executionMode === 'full' && !isAutoExecuting) {
      // Check if documents are selected before starting
      const isValid = comparisonMode === 'datamodel'
        ? selectedDataModel && selectedDoc2
        : selectedDoc1 && selectedDoc2;

      if (isValid) {
        handleAutoExecute();
      }
    }
  }, [executionMode]);

  return (
    <div className="workflow-modal-overlay" onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        width: 'min(95vw, 1600px)',
        height: 'min(90vh, 900px)',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                {workflow.workflow_type === 'complete' ? 'Complete Pipeline' :
                  workflow.workflow_type === 'business_analyst' ? 'Business Analyst' :
                    workflow.workflow_type === 'developer' ? 'Developer' :
                      workflow.workflow_type === 'reviewer' ? 'Reviewer' : 'Workflow'} Workflow Execution
              </h2>
              {executionMode === 'full' && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  AUTO MODE
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{workflow.workflow_name}</p>
            {isAutoExecuting && autoExecutionProgress && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {!autoExecutionProgress.includes('✅') && !autoExecutionProgress.includes('❌') && (
                  <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span style={{ fontSize: '0.875rem', color: '#0c4a6e', fontWeight: '500' }}>
                  {autoExecutionProgress}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="workflow-modal-close">
            <svg className="workflow-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Horizontal Steps Row with Connecting Dots */}
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e5e7eb',
          background: 'white',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            flexWrap: 'nowrap',
            width: '100%',
            maxWidth: '100%'
          }}>
            {steps.map((step, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                flex: idx < steps.length - 1 ? '0 1 auto' : '0 0 auto',
                minWidth: 0
              }}>
                {/* Step Pill */}
                <div
                  onClick={() => {
                    setCurrentStepIndex(idx);
                    setCurrentStepResult(stepResults[idx] || null);
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: idx === currentStepIndex ? '#eff6ff' : 'transparent',
                    border: idx === currentStepIndex ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    whiteSpace: 'nowrap',
                    minWidth: 0
                  }}
                  onMouseEnter={(e) => {
                    if (idx !== currentStepIndex) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (idx !== currentStepIndex) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }
                  }}
                >
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: idx === currentStepIndex ? '#3b82f6' : stepResults[idx] ? '#10b981' : '#e5e7eb',
                    color: idx === currentStepIndex || stepResults[idx] ? 'white' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {stepResults[idx] ? '✓' : idx + 1}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: idx === currentStepIndex ? '600' : '500',
                    color: idx === currentStepIndex ? '#1e293b' : '#64748b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '120px'
                  }}>
                    {step.name}
                  </span>
                </div>

                {/* Connecting Dots (except after last step) */}
                {idx < steps.length - 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.125rem',
                    padding: '0 0.25rem',
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: '3px',
                      height: '3px',
                      borderRadius: '50%',
                      background: stepResults[idx] ? '#10b981' : '#cbd5e1'
                    }} />
                    <div style={{
                      width: '3px',
                      height: '3px',
                      borderRadius: '50%',
                      background: stepResults[idx] ? '#10b981' : '#cbd5e1'
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Column - Configuration Only */}
          <div style={{ flex: '0 0 40%', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
            {/* Configuration Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: 'white' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>
                Step {currentStepIndex + 1}: {currentStep.name}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Configure inputs and run this step</p>
            </div>

            {/* Scrollable Configuration Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: 'white' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {(() => {
                  const stepConfig = getStepInputConfig(currentStep.name, workflow.workflow_type);

                  if (!stepConfig) {
                    return (
                      <>
                        <div style={{
                          padding: '1rem',
                          background: '#eff6ff',
                          borderRadius: '0.5rem',
                          border: '1px solid #bfdbfe',
                          marginBottom: '1rem'
                        }}>
                          <p style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.6' }}>
                            This step is part of the workflow pipeline. Click the button below to execute this agent.
                          </p>
                        </div>

                        <Button
                          onClick={handleRunAgent}
                          disabled={runningAgent}
                          className="workflow-submit-btn"
                          style={{
                            width: '100%',
                            opacity: runningAgent ? 0.5 : 1
                          }}
                        >
                          {runningAgent ? (
                            <>
                              <svg style={{ width: '16px', height: '16px', marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Running {currentStep.name}...
                            </>
                          ) : (
                            <>
                              <svg style={{ width: '16px', height: '16px', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {currentStep.name === 'Assign to Developer' ? currentStep.name : `Run ${currentStep.name}`}
                            </>
                          )}
                        </Button>
                      </>
                    );
                  }

                  return (
                    <>
                      {/* Step Description */}
                      <div style={{
                        padding: '1rem',
                        background: '#eff6ff',
                        borderRadius: '0.5rem',
                        border: '1px solid #bfdbfe'
                      }}>
                        <p style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.6', margin: 0 }}>
                          {stepConfig.description}
                        </p>
                      </div>

                      {/* Input Fields */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {stepConfig.fields.map((field) => {
                          // Check if field should be displayed based on condition
                          if (field.condition && !field.condition(inputValues)) {
                            return null;
                          }

                          // Check showWhen condition for conditional rendering
                          if (field.showWhen) {
                            const conditionFieldValue = inputValues[field.showWhen.field];
                            if (conditionFieldValue !== field.showWhen.value) {
                              return null;
                            }
                          }

                          // Auto-populate fields from previous step results
                          // Skip auto-populate for source_schema and target_schema as they're handled by useEffect
                          if (field.autoPopulate && currentStepIndex > 0 &&
                              field.name !== 'source_schema' && field.name !== 'target_schema') {
                            const prevResult = stepResults[currentStepIndex - 1];
                            if (prevResult && !inputValues[field.name]) {
                              updateInputValue(field.name, prevResult.result);
                            }
                          }

                          return (
                            <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <Label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                                {field.label}
                                {field.required && <span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>*</span>}
                              </Label>

                              {field.description && (
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
                                  {field.description}
                                </p>
                              )}

                              {/* Render appropriate input based on field type */}
                              {field.type === 'text' && (
                                <Input
                                  value={inputValues[field.name] || ''}
                                  onChange={(e) => updateInputValue(field.name, e.target.value)}
                                  placeholder={field.placeholder}
                                  style={{ fontSize: '0.875rem' }}
                                />
                              )}

                              {field.type === 'textarea' && (
                                <Textarea
                                  value={typeof inputValues[field.name] === 'string' ? inputValues[field.name] : (inputValues[field.name] ? JSON.stringify(inputValues[field.name], null, 2) : '')}
                                  onChange={(e) => updateInputValue(field.name, e.target.value)}
                                  placeholder={field.placeholder}
                                  rows={field.name === 'source_schema' || field.name === 'target_schema' ? 8 : 4}
                                  readOnly={field.autoPopulate}
                                  style={{
                                    fontSize: '0.875rem',
                                    fontFamily: 'monospace',
                                    backgroundColor: field.autoPopulate ? '#f8fafc' : 'white',
                                    cursor: field.autoPopulate ? 'not-allowed' : 'text'
                                  }}
                                />
                              )}

                              {field.type === 'data-model-select' && (
                                <>
                                  <select
                                    value={inputValues[field.name] || ''}
                                    onChange={(e) => updateInputValue(field.name, e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      borderRadius: '0.375rem',
                                      border: '1px solid #d1d5db',
                                      fontSize: '0.875rem',
                                      background: 'white'
                                    }}
                                    disabled={dataModels.length === 0}
                                  >
                                    <option value="">{dataModels.length === 0 ? 'No data models available - Please upload a data model first' : 'Select a data model...'}</option>
                                    {dataModels.map((model) => (
                                      <option key={model.id} value={model.id}>
                                        {model.name} (v{model.version}) - {model.domain || 'No domain'}
                                      </option>
                                    ))}
                                  </select>
                                  {dataModels.length === 0 && (
                                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '0.375rem', border: '1px solid #fbbf24' }}>
                                      <p style={{ fontSize: '0.75rem', color: '#92400e', lineHeight: '1.4', margin: 0 }}>
                                        <strong>⚠️ No Data Models:</strong> Please upload data models via the Model Library page before running this step.
                                        You can also switch to "Schema Definition" mode to paste schema manually.
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}

                              {field.type === 'number' && (
                                <Input
                                  type="number"
                                  value={inputValues[field.name] || field.default || ''}
                                  onChange={(e) => updateInputValue(field.name, parseFloat(e.target.value))}
                                  min={field.min}
                                  max={field.max}
                                  step={field.step}
                                  style={{ fontSize: '0.875rem' }}
                                />
                              )}

                              {field.type === 'date' && (
                                <Input
                                  type="date"
                                  value={inputValues[field.name] || ''}
                                  onChange={(e) => updateInputValue(field.name, e.target.value)}
                                  style={{ fontSize: '0.875rem' }}
                                />
                              )}

                              {field.type === 'slider' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Slider
                                      value={[inputValues[field.name] || field.default || field.min || 0]}
                                      onValueChange={(value) => updateInputValue(field.name, value[0])}
                                      min={field.min || 0}
                                      max={field.max || 100}
                                      step={field.step || 1}
                                      style={{ flex: 1 }}
                                    />
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#3b82f6', minWidth: '3rem', textAlign: 'right' }}>
                                      {inputValues[field.name] || field.default || field.min || 0}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {field.type === 'checkbox' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
                                  <Checkbox
                                    checked={inputValues[field.name] !== undefined ? inputValues[field.name] : field.default}
                                    onCheckedChange={(checked) => updateInputValue(field.name, checked)}
                                  />
                                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{field.label}</span>
                                </div>
                              )}

                              {field.type === 'radio' && (
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                  {field.options?.map((option) => (
                                    <button
                                      key={option.value}
                                      onClick={() => {
                                        updateInputValue(field.name, option.value);
                                        // Special handling for comparison_mode
                                        if (field.name === 'comparison_mode') {
                                          setComparisonMode(option.value as 'datamodel' | 'document');
                                        }
                                      }}
                                      style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        border: inputValues[field.name] === option.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: inputValues[field.name] === option.value ? '#eff6ff' : 'white',
                                        color: inputValues[field.name] === option.value ? '#3b82f6' : '#64748b'
                                      }}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {field.type === 'select' && (
                                <>
                                  {field.name === 'target_data_model_id' ? (
                                    <select
                                      value={inputValues.target_data_model_id || ''}
                                      onChange={(e) => updateInputValue('target_data_model_id', e.target.value)}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        borderRadius: '0.375rem',
                                        border: '1px solid #d1d5db',
                                        fontSize: '0.875rem',
                                        background: 'white'
                                      }}
                                    >
                                      <option value="">Select target data model (optional)...</option>
                                      {dataModels.map((model) => (
                                        <option key={model.id} value={model.id}>
                                          {model.name} (v{model.version}) - {model.domain || 'No domain'}
                                        </option>
                                      ))}
                                    </select>
                                  ) : field.name === 'data_model' ? (
                                    <>
                                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                        <select
                                          value={selectedDataModel}
                                          onChange={(e) => setSelectedDataModel(e.target.value)}
                                          style={{
                                            flex: 1,
                                            padding: '0.5rem',
                                            borderRadius: '0.375rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '0.875rem',
                                            background: 'white'
                                          }}
                                          disabled={dataModels.length === 0}
                                        >
                                          <option value="">{dataModels.length === 0 ? 'No data models available' : 'Select a data model...'}</option>
                                          {dataModels.map((model) => (
                                            <option key={model.id} value={model.id}>
                                              {model.name} (v{model.version})
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          onClick={() => document.getElementById('upload-datamodel-input')?.click()}
                                          disabled={uploadingFile}
                                          style={{
                                            padding: '0.5rem 0.75rem',
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            cursor: uploadingFile ? 'not-allowed' : 'pointer',
                                            whiteSpace: 'nowrap',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                          }}
                                          title="Upload a new data model"
                                        >
                                          <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                          </svg>
                                          Upload
                                        </button>
                                        <input
                                          id="upload-datamodel-input"
                                          type="file"
                                          accept=".json,.xlsx,.xls,.csv"
                                          style={{ display: 'none' }}
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            
                                            // Show inline form for data model metadata
                                            const name = prompt('Enter data model name:', file.name.replace(/\.[^/.]+$/, ''));
                                            if (!name) {
                                              e.target.value = '';
                                              return;
                                            }
                                            
                                            const version = prompt('Enter version:', '1.0');
                                            if (!version) {
                                              e.target.value = '';
                                              return;
                                            }
                                            
                                            setUploadingFile(true);
                                            const toastId = showToast.loading(`Uploading data model "${file.name}"...`);
                                            
                                            try {
                                              const { uploadDataModel } = await import('@/services/dataModelService');
                                              const uploadedModel = await uploadDataModel(file, name, version);
                                              await fetchDataModels();
                                              showToast.dismiss(toastId);
                                              showToast.success(`Data model "${name}" uploaded successfully!`);
                                              // Auto-select the newly uploaded data model
                                              if (uploadedModel?.id) {
                                                setSelectedDataModel(uploadedModel.id.toString());
                                              }
                                              e.target.value = '';
                                            } catch (error) {
                                              console.error('Failed to upload data model:', error);
                                              showToast.dismiss(toastId);
                                              showToast.error('Failed to upload data model. Please try again.');
                                            } finally {
                                              setUploadingFile(false);
                                            }
                                          }}
                                        />
                                      </div>
                                      {dataModels.length === 0 && !selectedDataModel && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '0.375rem', border: '1px solid #bfdbfe' }}>
                                          <p style={{ fontSize: '0.75rem', color: '#1e40af', lineHeight: '1.4', margin: 0 }}>
                                            <strong>💡 Tip:</strong> Click "Upload" to add a new data model directly, or upload via Model Library page.
                                          </p>
                                        </div>
                                      )}
                                    </>
                          ) : field.name === 'document_1' ? (
                            <>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <select
                                  value={selectedDoc1}
                                  onChange={(e) => setSelectedDoc1(e.target.value)}
                                  style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #d1d5db',
                                    fontSize: '0.875rem',
                                    background: 'white'
                                  }}
                                  disabled={documents.length === 0}
                                >
                                  <option value="">{documents.length === 0 ? 'No documents available' : 'Select lower version...'}</option>
                                  {documents.sort((a, b) => a.filename.localeCompare(b.filename)).map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                      {doc.filename}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => document.getElementById('upload-doc1-input')?.click()}
                                  disabled={uploadingFile}
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    cursor: uploadingFile ? 'not-allowed' : 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                  title="Upload a new document"
                                >
                                  <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  Upload
                                </button>
                                <input
                                  id="upload-doc1-input"
                                  type="file"
                                  accept=".pdf,.doc,.docx,.txt"
                                  style={{ display: 'none' }}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    setUploadingFile(true);
                                    const toastId = showToast.loading(`Uploading "${file.name}"...`);
                                    
                                    try {
                                      const uploadedDoc = await documentService.upload(file);
                                      await fetchDocuments();
                                      showToast.dismiss(toastId);
                                      showToast.success(`Document "${file.name}" uploaded successfully!`);
                                      // Auto-select the newly uploaded document
                                      setSelectedDoc1(uploadedDoc.id || uploadedDoc.document_id || '');
                                      e.target.value = '';
                                    } catch (error) {
                                      console.error('Failed to upload document:', error);
                                      showToast.dismiss(toastId);
                                      showToast.error('Failed to upload document. Please try again.');
                                    } finally {
                                      setUploadingFile(false);
                                    }
                                  }}
                                />
                              </div>
                              {documents.length === 0 && !selectedDoc1 && (
                                <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '0.375rem', border: '1px solid #bfdbfe' }}>
                                  <p style={{ fontSize: '0.75rem', color: '#1e40af', lineHeight: '1.4', margin: 0 }}>
                                    <strong>💡 Tip:</strong> Click "Upload" to add a new document directly, or upload via Document Management page.
                                  </p>
                                </div>
                              )}
                            </>
                                  ) : field.name === 'document_id' ? (
                                    <>
                                      <select
                                        value={inputValues[field.name] || ''}
                                        onChange={(e) => updateInputValue(field.name, e.target.value)}
                                        style={{
                                          width: '100%',
                                          padding: '0.5rem',
                                          borderRadius: '0.375rem',
                                          border: '1px solid #d1d5db',
                                          fontSize: '0.875rem',
                                          background: 'white'
                                        }}
                                        disabled={documents.length === 0}
                                      >
                                        <option value="">{documents.length === 0 ? 'No documents available - Please upload documents first' : 'Select an FCA document...'}</option>
                                        {documents.sort((a, b) => a.filename.localeCompare(b.filename)).map((doc) => (
                                          <option key={doc.id} value={doc.id}>
                                            {doc.filename}
                                          </option>
                                        ))}
                                      </select>
                                      {documents.length === 0 && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '0.375rem', border: '1px solid #fbbf24' }}>
                                          <p style={{ fontSize: '0.75rem', color: '#92400e', lineHeight: '1.4', margin: 0 }}>
                                            <strong>⚠️ No Documents:</strong> Please upload FCA documents via the Document Management page before running this workflow.
                                          </p>
                                        </div>
                                      )}
                                    </>
                                  ) : field.name === 'document_2' ? (
                                    <>
                                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                        <select
                                          value={selectedDoc2}
                                          onChange={(e) => setSelectedDoc2(e.target.value)}
                                          style={{
                                            flex: 1,
                                            padding: '0.5rem',
                                            borderRadius: '0.375rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '0.875rem',
                                            background: 'white'
                                          }}
                                          disabled={documents.length === 0 || (comparisonMode === 'datamodel' ? !selectedDataModel : !selectedDoc1)}
                                        >
                                          <option value="">{documents.length === 0 ? 'No documents available' : 'Select a document...'}</option>
                                          {comparisonMode === 'datamodel'
                                            ? documents.map((doc) => (
                                                <option key={doc.id} value={doc.id}>{doc.filename}</option>
                                              ))
                                            : documents
                                                .filter((doc) => doc.id.toString() !== selectedDoc1)
                                                .sort((a, b) => a.filename.localeCompare(b.filename))
                                                .map((doc) => (
                                                  <option key={doc.id} value={doc.id}>{doc.filename}</option>
                                                ))
                                          }
                                        </select>
                                        <button
                                          onClick={() => document.getElementById('upload-doc2-input')?.click()}
                                          disabled={uploadingFile}
                                          style={{
                                            padding: '0.5rem 0.75rem',
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            cursor: uploadingFile ? 'not-allowed' : 'pointer',
                                            whiteSpace: 'nowrap',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                          }}
                                          title="Upload a new document"
                                        >
                                          <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                          </svg>
                                          Upload
                                        </button>
                                        <input
                                          id="upload-doc2-input"
                                          type="file"
                                          accept=".pdf,.doc,.docx,.txt"
                                          style={{ display: 'none' }}
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            
                                            setUploadingFile(true);
                                            const toastId = showToast.loading(`Uploading "${file.name}"...`);
                                            
                                            try {
                                              const uploadedDoc = await documentService.upload(file);
                                              await fetchDocuments();
                                              showToast.dismiss(toastId);
                                              showToast.success(`Document "${file.name}" uploaded successfully!`);
                                              // Auto-select the newly uploaded document
                                              setSelectedDoc2(uploadedDoc.id || uploadedDoc.document_id || '');
                                              e.target.value = '';
                                            } catch (error) {
                                              console.error('Failed to upload document:', error);
                                              showToast.dismiss(toastId);
                                              showToast.error('Failed to upload document. Please try again.');
                                            } finally {
                                              setUploadingFile(false);
                                            }
                                          }}
                                        />
                                      </div>
                                      {documents.length === 0 && !selectedDoc2 && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '0.375rem', border: '1px solid #bfdbfe' }}>
                                          <p style={{ fontSize: '0.75rem', color: '#1e40af', lineHeight: '1.4', margin: 0 }}>
                                            <strong>💡 Tip:</strong> Click "Upload" to add a new document directly, or upload via Document Management page.
                                          </p>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <Select
                                      value={inputValues[field.name] || field.default || ''}
                                      onValueChange={(value) => updateInputValue(field.name, value)}
                                    >
                                      <SelectTrigger style={{ fontSize: '0.875rem' }}>
                                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {field.options?.map((option) => (
                                          <SelectItem key={option.value} value={option.value} style={{ fontSize: '0.875rem' }}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </>
                              )}

                              {field.type === 'multi-select' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                                  {field.options?.map((option) => (
                                    <div key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <Checkbox
                                        checked={(inputValues[field.name] || []).includes(option.value)}
                                        onCheckedChange={(checked) => {
                                          const currentValues = inputValues[field.name] || [];
                                          const newValues = checked
                                            ? [...currentValues, option.value]
                                            : currentValues.filter((v: string) => v !== option.value);
                                          updateInputValue(field.name, newValues);
                                        }}
                                      />
                                      <span style={{ fontSize: '0.875rem', color: '#1e293b' }}>{option.label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Validation Summary for Select Documents */}
                      {currentStep.name === 'Select Documents' && (
                        ((comparisonMode === 'datamodel' && selectedDataModel && selectedDoc2) ||
                         (comparisonMode === 'document' && selectedDoc1 && selectedDoc2)) && (
                          <div style={{ padding: '0.75rem', background: '#dcfce7', borderRadius: '0.5rem', border: '1px solid #86efac' }}>
                            <p style={{ fontSize: '0.75rem', color: '#166534', lineHeight: '1.4', margin: 0 }}>
                              <strong>✓ Ready to Parse:</strong> {comparisonMode === 'datamodel'
                                ? `Will compare ${dataModels.find(m => m.id.toString() === selectedDataModel)?.name} with ${documents.find(d => d.id === selectedDoc2)?.filename}`
                                : `Will compare ${documents.find(d => d.id === selectedDoc1)?.filename} with ${documents.find(d => d.id === selectedDoc2)?.filename}`
                              }
                            </p>
                          </div>
                        )
                      )}

                      {/* Submit Step UI */}
                      {currentStep.name === 'Submit' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {/* Informational Header */}
                          <div style={{
                            padding: '1rem',
                            background: '#f0fdf4',
                            borderRadius: '0.5rem',
                            border: '2px solid #86efac',
                            marginBottom: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '1.25rem' }}>✅</span>
                              <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#166534', margin: 0 }}>
                                Ready to Submit Workflow
                              </p>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: '#15803d', lineHeight: '1.6', margin: 0 }}>
                              {workflow.workflow_type === 'business_analyst' && 'All workflow steps have been completed. Fill in the submission details below to send this workflow to the development team.'}
                              {workflow.workflow_type === 'developer' && 'All development steps have been completed. Fill in the submission details below to send this workflow to the reviewer team.'}
                              {workflow.workflow_type === 'reviewer' && 'All validation steps have been completed. Review the workflow and approve or return it for revisions.'}
                            </p>
                          </div>

                          {/* Reviewer-specific options */}
                          {workflow.workflow_type === 'reviewer' && (
                            <>
                              <div>
                                <Label>Action *</Label>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                  <button
                                    onClick={() => setSubmitAction('complete')}
                                    style={{
                                      flex: 1,
                                      padding: '0.75rem',
                                      borderRadius: '0.5rem',
                                      fontSize: '0.875rem',
                                      fontWeight: '600',
                                      border: submitAction === 'complete' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                      background: submitAction === 'complete' ? '#eff6ff' : 'white',
                                      color: submitAction === 'complete' ? '#3b82f6' : '#64748b',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Complete Workflow
                                  </button>
                                  <button
                                    onClick={() => setSubmitAction('return')}
                                    style={{
                                      flex: 1,
                                      padding: '0.75rem',
                                      borderRadius: '0.5rem',
                                      fontSize: '0.875rem',
                                      fontWeight: '600',
                                      border: submitAction === 'return' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                      background: submitAction === 'return' ? '#eff6ff' : 'white',
                                      color: submitAction === 'return' ? '#3b82f6' : '#64748b',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Return to Previous Stage
                                  </button>
                                </div>
                              </div>

                              {submitAction === 'return' && (
                                <div>
                                  <Label>Return To Stage *</Label>
                                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button
                                      onClick={() => setReturnToStage('business_analyst')}
                                      style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        border: returnToStage === 'business_analyst' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                        background: returnToStage === 'business_analyst' ? '#eff6ff' : 'white',
                                        color: returnToStage === 'business_analyst' ? '#3b82f6' : '#64748b',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Business Analyst
                                    </button>
                                    <button
                                      onClick={() => setReturnToStage('developer')}
                                      style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        border: returnToStage === 'developer' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                        background: returnToStage === 'developer' ? '#eff6ff' : 'white',
                                        color: returnToStage === 'developer' ? '#3b82f6' : '#64748b',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Developer
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Assign To (optional) */}
                          <div>
                            <Label>Assign To (Optional)</Label>
                            <Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select user (or leave empty for auto-assign)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Auto-assign by role</SelectItem>
                                {users.map((user: any) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.username} - {user.role?.name || 'No Role'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Submission Comments */}
                          <div>
                            <Label>Submission Comments *</Label>
                            <Textarea
                              value={submissionComments}
                              onChange={(e) => setSubmissionComments(e.target.value)}
                              placeholder="Enter submission comments (minimum 10 characters)..."
                              rows={4}
                              style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}
                            />
                            {submissionComments.length > 0 && submissionComments.length < 10 && (
                              <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                Please provide at least 10 characters ({10 - submissionComments.length} more needed)
                              </p>
                            )}
                          </div>

                          {/* Submit Button */}
                          <Button
                            onClick={handleSubmit}
                            disabled={submitting || submissionComments.length < 10}
                            className="workflow-submit-btn"
                            style={{
                              width: '100%',
                              marginTop: '0.5rem',
                              opacity: (submitting || submissionComments.length < 10) ? 0.5 : 1
                            }}
                          >
                            {submitting ? (
                              <>
                                <svg style={{ width: '16px', height: '16px', marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <svg style={{ width: '16px', height: '16px', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {workflow.workflow_type === 'reviewer' && submitAction === 'complete' ? 'Complete Workflow' : 'Submit Workflow'}
                              </>
                            )}
                          </Button>

                          {/* Download Buttons (shown after submission) */}
                          {workflowSubmitted && (
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.5rem' }}>
                              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#16a34a', marginBottom: '0.75rem' }}>
                                ✅ Workflow Submitted Successfully
                              </p>
                              <p style={{ fontSize: '0.75rem', color: '#15803d', marginBottom: '1rem' }}>
                                Download the consolidated results and requirement document below:
                              </p>
                              <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                                <Button
                                  onClick={async () => {
                                    try {
                                      const token = localStorage.getItem('token');
                                      const response = await fetch(
                                        `${API_BASE_URL}/api/ba/workflows/${workflow.id}/submission/consolidated-results`,
                                        {
                                          headers: { 'Authorization': `Bearer ${token}` }
                                        }
                                      );

                                      if (!response.ok) {
                                        throw new Error('Failed to download consolidated results');
                                      }

                                      const blob = await response.blob();
                                      const url = URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = `${workflow.workflow_name}_Consolidated_Results.json`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      URL.revokeObjectURL(url);

                                      showToast.success('Consolidated results downloaded!');
                                    } catch (error: any) {
                                      console.error('Download failed:', error);
                                      showToast.error('Failed to download consolidated results');
                                    }
                                  }}
                                  style={{ width: '100%', background: '#3b82f6' }}
                                >
                                  📊 Download Consolidated Results (JSON)
                                </Button>
                                <Button
                                  onClick={async () => {
                                    try {
                                      const token = localStorage.getItem('token');
                                      const response = await fetch(
                                        `${API_BASE_URL}/api/ba/${workflow.id}/submission/requirement-document`,
                                        {
                                          headers: { 'Authorization': `Bearer ${token}` }
                                        }
                                      );

                                      if (!response.ok) {
                                        throw new Error('Failed to download requirement document');
                                      }

                                      const blob = await response.blob();
                                      const url = URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = `${workflow.workflow_name}_Requirements.md`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      URL.revokeObjectURL(url);

                                      showToast.success('Requirement document downloaded!');
                                    } catch (error: any) {
                                      console.error('Download failed:', error);
                                      showToast.error('Failed to download requirement document');
                                    }
                                  }}
                                  style={{ width: '100%', background: '#8b5cf6' }}
                                >
                                  📄 Download Requirement Document (Markdown)
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Run Agent Button */
                        <Button
                          onClick={handleRunAgent}
                          disabled={runningAgent}
                          className="workflow-submit-btn"
                          style={{
                            width: '100%',
                            marginTop: '0.5rem',
                            opacity: runningAgent ? 0.5 : 1
                          }}
                        >
                          {runningAgent ? (
                            <>
                              <svg style={{ width: '16px', height: '16px', marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Running {currentStep.name}...
                            </>
                          ) : (
                            <>
                              <svg style={{ width: '16px', height: '16px', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {currentStep.name === 'Assign to Developer' ? currentStep.name : `Run ${currentStep.name}`}
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Navigation Buttons - Fixed at Bottom */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              background: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              flexShrink: 0
            }}>
              <button
                onClick={() => {
                  if (currentStepIndex > 0) {
                    setCurrentStepIndex(currentStepIndex - 1);
                    setCurrentStepResult(stepResults[currentStepIndex - 1] || null);
                  }
                }}
                disabled={currentStepIndex === 0}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: currentStepIndex === 0 ? '#f3f4f6' : 'white',
                  color: currentStepIndex === 0 ? '#9ca3af' : '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (currentStepIndex > 0) {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentStepIndex > 0) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Step
              </button>

              <button
                onClick={() => {
                  if (currentStepIndex < steps.length - 1) {
                    setCurrentStepIndex(currentStepIndex + 1);
                    setCurrentStepResult(stepResults[currentStepIndex + 1] || null);
                  }
                }}
                disabled={currentStepIndex === steps.length - 1}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: currentStepIndex === steps.length - 1 ? '#f3f4f6' : 'white',
                  color: currentStepIndex === steps.length - 1 ? '#9ca3af' : '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: currentStepIndex === steps.length - 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (currentStepIndex < steps.length - 1) {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentStepIndex < steps.length - 1) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                Next Step
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Column - Results Only */}
          <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Results Header with Export Buttons */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>
                  📊 Execution Results
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>View agent execution output and analysis</p>
              </div>

              {/* Export Buttons */}
              {currentStepResult && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {/* Export as JSON */}
                  <button
                    onClick={() => {
                      const dataStr = JSON.stringify(currentStepResult, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${workflow.workflow_name}_Step${currentStepIndex + 1}_${currentStep.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'white',
                      color: '#3b82f6',
                      border: '1px solid #3b82f6',
                      borderRadius: '0.375rem',
                      fontSize: '0.8125rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#3b82f6';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.color = '#3b82f6';
                    }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    JSON
                  </button>

                  {/* Export as CSV */}
                  <button
                    onClick={() => {
                      // Convert JSON to CSV
                      const convertToCSV = (data: any): string => {
                        // Handle different result structures
                        if (data.result?.diff_report) {
                          // Regulatory Diff results
                          const report = data.result.diff_report;
                          let csv = 'Field Type,Field Name,Old Value,New Value,Status\n';

                          // Matching fields
                          if (report.matching_fields) {
                            report.matching_fields.forEach((field: any) => {
                              csv += `Matching,"${field.name || field}","${field.value || ''}","${field.value || ''}",Matched\n`;
                            });
                          }

                          // Partial matches
                          if (report.partial_matches) {
                            report.partial_matches.forEach((field: any) => {
                              csv += `Partial,"${field.name || field.field_name}","${field.old_value || ''}","${field.new_value || ''}",Partial Match\n`;
                            });
                          }

                          // Missing fields
                          if (report.missing_fields) {
                            report.missing_fields.forEach((field: any) => {
                              csv += `Missing,"${field.name || field}","${field.value || ''}","",Missing\n`;
                            });
                          }

                          return csv;
                        } else if (Array.isArray(data)) {
                          // Array of objects
                          const headers = Object.keys(data[0] || {});
                          let csv = headers.join(',') + '\n';
                          data.forEach((row: any) => {
                            csv += headers.map(h => `"${row[h] || ''}"`).join(',') + '\n';
                          });
                          return csv;
                        } else {
                          // Generic object - convert to key-value pairs
                          let csv = 'Key,Value\n';
                          const flattenObject = (obj: any, prefix = '') => {
                            Object.keys(obj).forEach(key => {
                              const value = obj[key];
                              const newKey = prefix ? `${prefix}.${key}` : key;
                              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                flattenObject(value, newKey);
                              } else {
                                csv += `"${newKey}","${JSON.stringify(value)}"\n`;
                              }
                            });
                          };
                          flattenObject(data);
                          return csv;
                        }
                      };

                      const csvContent = convertToCSV(currentStepResult);
                      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(csvBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${workflow.workflow_name}_Step${currentStepIndex + 1}_${currentStep.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'white',
                      color: '#10b981',
                      border: '1px solid #10b981',
                      borderRadius: '0.375rem',
                      fontSize: '0.8125rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#10b981';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.color = '#10b981';
                    }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV
                  </button>

                  {/* Functional Specification specific buttons - Download Markdown and Publish */}
                  {currentStep.name === 'Functional Specification' && (
                    <>
                      <button
                        onClick={async () => {
                          const toastId = showToast.loading('Downloading report...');
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch(
                              `${API_BASE_URL}/api/ba/${workflow.id}/gap-analysis-report/download?format=markdown`,
                              {
                                headers: { 'Authorization': `Bearer ${token}` }
                              }
                            );

                            if (!response.ok) {
                              const errorData = await response.json().catch(() => ({}));
                              throw new Error(errorData.detail || 'Failed to download report');
                            }

                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${workflow.workflow_name}_GapAnalysis_${new Date().toISOString().split('T')[0]}.md`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);

                            showToast.dismiss(toastId);
                            showToast.success('Report downloaded successfully!');
                          } catch (error: any) {
                            console.error('Download failed:', error);
                            showToast.dismiss(toastId);
                            showToast.error(error.message || 'Failed to download Functional Specification report');
                          }
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'white',
                          color: '#8b5cf6',
                          border: '1px solid #8b5cf6',
                          borderRadius: '0.375rem',
                          fontSize: '0.8125rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#8b5cf6';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.color = '#8b5cf6';
                        }}
                      >
                        <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Markdown
                      </button>

                      <button
                        onClick={() => {
                          // Set default values and open dialog
                          setPublishTitle(`${workflow.workflow_name} - Functional Specification Report`);
                          setPublishDescription('');
                          setPublishDialogOpen(true);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'white',
                          color: '#059669',
                          border: '1px solid #059669',
                          borderRadius: '0.375rem',
                          fontSize: '0.8125rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#059669';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.color = '#059669';
                        }}
                      >
                        <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Publish Report
                      </button>
                    </>
                  )}

                </div>
              )}
            </div>

            {/* Scrollable Results Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: '#f8fafc' }}>
              {runningAgent ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#64748b' }}>
                  <svg style={{ width: '48px', height: '48px', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>Running {currentStep.name}...</p>
                </div>
              ) : currentStepResult ? (
                    currentStep.name === 'Comparison' ? (
                      <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: '#f8fafc',
                        borderRadius: '0.5rem',
                        border: '2px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '2px solid #e2e8f0' }}>
                          <svg style={{ width: '24px', height: '24px', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                            Comparison Analysis - Detailed Field Comparison
                          </p>
                        </div>
                        
                        {currentStepResult.result?.table_comparison && (
                          <div style={{ marginBottom: '1rem' }}>
                            {/* Summary Statistics Cards */}
                            <div style={{ marginBottom: '1.5rem' }}>
                              <h4 style={{
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#0f172a',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                paddingBottom: '0.5rem',
                                borderBottom: '2px solid #cbd5e1'
                              }}>
                                <span style={{ fontSize: '1.25rem' }}>📊</span> Comparison Statistics
                              </h4>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '0.75rem',
                                marginBottom: '1rem'
                              }}>
                                {/* Total Fields */}
                                <div style={{
                                  background: 'white',
                                  borderRadius: '0.5rem',
                                  padding: '0.75rem',
                                  border: '2px solid #e0e7ff',
                                  textAlign: 'center'
                                }}>
                                  <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    color: '#3730a3',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {currentStepResult.result.table_comparison.total_fields || 0}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                    Total Fields
                                  </div>
                                </div>

                                {/* Matching Fields */}
                                <div style={{
                                  background: 'white',
                                  borderRadius: '0.5rem',
                                  padding: '0.75rem',
                                  border: '2px solid #86efac',
                                  textAlign: 'center'
                                }}>
                                  <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    color: '#16a34a',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {currentStepResult.result.table_comparison.matching_fields || 0}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                    Matching Fields
                                  </div>
                                </div>

                                {/* Partial Match */}
                                <div style={{
                                  background: 'white',
                                  borderRadius: '0.5rem',
                                  padding: '0.75rem',
                                  border: '2px solid #fcd34d',
                                  textAlign: 'center'
                                }}>
                                  <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    color: '#d97706',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {currentStepResult.result.table_comparison.partial_matches || 0}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                    Partial Match
                                  </div>
                                </div>

                                {/* New Lines Added */}
                                <div style={{
                                  background: 'white',
                                  borderRadius: '0.5rem',
                                  padding: '0.75rem',
                                  border: '2px solid #93c5fd',
                                  textAlign: 'center'
                                }}>
                                  <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    color: '#2563eb',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {currentStepResult.result.table_comparison.new_in_doc2 || 0}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                    New Lines Added
                                  </div>
                                </div>

                                {/* Lines Removed */}
                                <div style={{
                                  background: 'white',
                                  borderRadius: '0.5rem',
                                  padding: '0.75rem',
                                  border: '2px solid #fca5a5',
                                  textAlign: 'center'
                                }}>
                                  <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    color: '#dc2626',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {currentStepResult.result.table_comparison.new_in_doc1 || 0}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                    Lines Removed
                                  </div>
                                </div>

                                {/* Match Percentage */}
                                <div style={{
                                  background: 'white',
                                  borderRadius: '0.5rem',
                                  padding: '0.75rem',
                                  border: '2px solid #c4b5fd',
                                  textAlign: 'center'
                                }}>
                                  <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    color: '#7c3aed',
                                    marginBottom: '0.25rem'
                                  }}>
                                    {currentStepResult.result.table_comparison.match_percentage_tables || 0}%
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                    Match %
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Legacy support for old diff_report structure */}
                        {currentStepResult.result?.diff_report && !currentStepResult.result?.statistics && (
                          <div style={{ marginBottom: '1rem' }}>
                            {/* Summary Statistics Cards */}
                            {currentStepResult.result.diff_report.summary && (
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{
                                  fontSize: '0.95rem',
                                  fontWeight: '700',
                                  color: '#0f172a',
                                  marginBottom: '1rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  paddingBottom: '0.5rem',
                                  borderBottom: '2px solid #cbd5e1'
                                }}>
                                  <span style={{ fontSize: '1.25rem' }}>📊</span> Summary Statistics
                                </h4>
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                  gap: '0.75rem',
                                  marginBottom: '1rem'
                                }}>
                                  {/* Total Required Fields */}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem',
                                    border: '2px solid #e0e7ff',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{
                                      fontSize: '1.5rem',
                                      fontWeight: '700',
                                      color: '#3730a3',
                                      marginBottom: '0.25rem'
                                    }}>
                                      {currentStepResult.result.diff_report.summary.total_required_fields || currentStepResult.result.diff_report.summary.total_fields || 0}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                      Total Required Fields
                                    </div>
                                  </div>

                                  {/* Matching */}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem',
                                    border: '2px solid #86efac',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{
                                      fontSize: '1.5rem',
                                      fontWeight: '700',
                                      color: '#16a34a',
                                      marginBottom: '0.25rem'
                                    }}>
                                      {currentStepResult.result.diff_report.summary.matching_fields || currentStepResult.result.diff_report.summary.unchanged_fields || 0}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                      Matching
                                    </div>
                                  </div>

                                  {/* Partial */}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem',
                                    border: '2px solid #fcd34d',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{
                                      fontSize: '1.5rem',
                                      fontWeight: '700',
                                      color: '#d97706',
                                      marginBottom: '0.25rem'
                                    }}>
                                      {currentStepResult.result.diff_report.summary.partial_matches || (currentStepResult.result.diff_report.modified_fields?.length || 0)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                      Partial
                                    </div>
                                  </div>

                                  {/* Missing */}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem',
                                    border: '2px solid #fca5a5',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{
                                      fontSize: '1.5rem',
                                      fontWeight: '700',
                                      color: '#dc2626',
                                      marginBottom: '0.25rem'
                                    }}>
                                      {currentStepResult.result.diff_report.summary.missing_fields || (currentStepResult.result.diff_report.removed_fields?.length || 0)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                      Missing
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Matching Fields Table */}
                            {currentStepResult.result.diff_report.matching_fields?.length > 0 && (
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ 
                                  fontSize: '0.95rem', 
                                  fontWeight: '700', 
                                  color: '#059669',
                                  marginBottom: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  paddingBottom: '0.5rem',
                                  borderBottom: '2px solid #a7f3d0'
                                }}>
                                  <span style={{ fontSize: '1.25rem' }}>✅</span> Matching Fields ({currentStepResult.result.diff_report.matching_fields.length})
                                </h4>
                                <div style={{ overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '0.5rem' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: 'white' }}>
                                    <thead>
                                      <tr style={{ background: '#d1fae5', borderBottom: '2px solid #6ee7b7' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Field Name</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Field Path</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700' }}>Value</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700' }}>Description</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {currentStepResult.result.diff_report.matching_fields.map((field: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                          <td style={{ padding: '0.75rem', color: '#059669', fontWeight: '600', whiteSpace: 'nowrap' }}>{field.field_name || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{field.field_path || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#1e293b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{field.value || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{field.type || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>{field.description || 'N/A'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            
                            {/* Partial Matches Table */}
                            {currentStepResult.result.diff_report.partial_matches?.length > 0 && (
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ 
                                  fontSize: '0.95rem', 
                                  fontWeight: '700', 
                                  color: '#d97706',
                                  marginBottom: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  paddingBottom: '0.5rem',
                                  borderBottom: '2px solid #fcd34d'
                                }}>
                                  <span style={{ fontSize: '1.25rem' }}>🔄</span> Partial Matches ({currentStepResult.result.diff_report.partial_matches.length})
                                </h4>
                                <div style={{ overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '0.5rem' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: 'white' }}>
                                    <thead>
                                      <tr style={{ background: '#fef3c7', borderBottom: '2px solid #fcd34d' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#92400e', fontWeight: '700', whiteSpace: 'nowrap' }}>Field Name</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#92400e', fontWeight: '700', whiteSpace: 'nowrap' }}>Field Path</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#92400e', fontWeight: '700' }}>Old Value</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#92400e', fontWeight: '700' }}>New Value</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#92400e', fontWeight: '700', whiteSpace: 'nowrap' }}>Change Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#92400e', fontWeight: '700', whiteSpace: 'nowrap' }}>Risk Level</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {currentStepResult.result.diff_report.partial_matches.map((field: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                          <td style={{ padding: '0.75rem', color: '#d97706', fontWeight: '600', whiteSpace: 'nowrap' }}>{field.field_name || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{field.field_path || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#dc2626', textDecoration: 'line-through', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {typeof field.old_value === 'object' ? JSON.stringify(field.old_value) : field.old_value || 'N/A'}
                                          </td>
                                          <td style={{ padding: '0.75rem', color: '#059669', fontWeight: '600', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {typeof field.new_value === 'object' ? JSON.stringify(field.new_value) : field.new_value || 'N/A'}
                                          </td>
                                          <td style={{ padding: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{field.change_type || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                                            <span style={{
                                              padding: '0.25rem 0.5rem',
                                              borderRadius: '0.25rem',
                                              fontSize: '0.7rem',
                                              fontWeight: '600',
                                              background: field.risk_level === 'critical' ? '#fee2e2' : 
                                                         field.risk_level === 'high' ? '#fed7aa' :
                                                         field.risk_level === 'medium' ? '#fef3c7' : '#dbeafe',
                                              color: field.risk_level === 'critical' ? '#991b1b' :
                                                     field.risk_level === 'high' ? '#9a3412' :
                                                     field.risk_level === 'medium' ? '#92400e' : '#1e40af'
                                            }}>
                                              {field.risk_level?.toUpperCase() || 'LOW'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            
                            {/* Missing Fields Table */}
                            {currentStepResult.result.diff_report.missing_fields?.length > 0 && (
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ 
                                  fontSize: '0.95rem', 
                                  fontWeight: '700', 
                                  color: '#dc2626',
                                  marginBottom: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  paddingBottom: '0.5rem',
                                  borderBottom: '2px solid #fca5a5'
                                }}>
                                  <span style={{ fontSize: '1.25rem' }}>❌</span> Missing Fields ({currentStepResult.result.diff_report.missing_fields.length})
                                </h4>
                                <div style={{ overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '0.5rem' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: 'white' }}>
                                    <thead>
                                      <tr style={{ background: '#fee2e2', borderBottom: '2px solid #fca5a5' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#991b1b', fontWeight: '700', whiteSpace: 'nowrap' }}>Field Name</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#991b1b', fontWeight: '700', whiteSpace: 'nowrap' }}>Field Path</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#991b1b', fontWeight: '700' }}>Required Value</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#991b1b', fontWeight: '700', whiteSpace: 'nowrap' }}>Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#991b1b', fontWeight: '700' }}>Compliance Risk</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {currentStepResult.result.diff_report.missing_fields.map((field: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                          <td style={{ padding: '0.75rem', color: '#dc2626', fontWeight: '600', whiteSpace: 'nowrap' }}>{field.field_name || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{field.field_path || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#1e293b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {typeof field.required_value === 'object' ? JSON.stringify(field.required_value) : field.required_value || 'N/A'}
                                          </td>
                                          <td style={{ padding: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{field.type || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#991b1b', lineHeight: '1.4', fontSize: '0.75rem' }}>{field.compliance_risk || 'N/A'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            
                            {/* Added Fields Table */}
                            {currentStepResult.result.diff_report.added_fields?.length > 0 && (
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ 
                                  fontSize: '0.95rem', 
                                  fontWeight: '700', 
                                  color: '#059669',
                                  marginBottom: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  paddingBottom: '0.5rem',
                                  borderBottom: '2px solid #6ee7b7'
                                }}>
                                  <span style={{ fontSize: '1.25rem' }}>➕</span> Added Fields ({currentStepResult.result.diff_report.added_fields.length})
                                </h4>
                                <div style={{ overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '0.5rem' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: 'white' }}>
                                    <thead>
                                      <tr style={{ background: '#d1fae5', borderBottom: '2px solid #6ee7b7' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Field Name</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Field Path</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700' }}>Value</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700' }}>Description</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Priority</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {currentStepResult.result.diff_report.added_fields.map((field: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                          <td style={{ padding: '0.75rem', color: '#059669', fontWeight: '600', whiteSpace: 'nowrap' }}>{field.field_name || field.name || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{field.field_path || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#1e293b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {typeof field.value === 'object' ? JSON.stringify(field.value) : field.value || 'N/A'}
                                          </td>
                                          <td style={{ padding: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{field.type || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>{field.description || 'N/A'}</td>
                                          <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                                            <span style={{
                                              padding: '0.25rem 0.5rem',
                                              borderRadius: '0.25rem',
                                              fontSize: '0.7rem',
                                              fontWeight: '600',
                                              background: field.implementation_priority === 'critical' ? '#fee2e2' : 
                                                         field.implementation_priority === 'high' ? '#fed7aa' :
                                                         field.implementation_priority === 'medium' ? '#fef3c7' : '#dbeafe',
                                              color: field.implementation_priority === 'critical' ? '#991b1b' :
                                                     field.implementation_priority === 'high' ? '#9a3412' :
                                                     field.implementation_priority === 'medium' ? '#92400e' : '#1e40af'
                                            }}>
                                              {field.implementation_priority?.toUpperCase() || 'LOW'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            
                            {/* Results Table - Removed Fields */}
                            {currentStepResult.result.diff_report.removed_fields?.length > 0 && (
                              <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ 
                                  fontSize: '0.875rem', 
                                  fontWeight: '600', 
                                  color: '#991b1b',
                                  marginBottom: '0.5rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}>
                                  <span style={{ fontSize: '1rem' }}>➖</span> Removed Fields ({currentStepResult.result.diff_report.removed_fields.length})
                                </h4>
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead>
                                      <tr style={{ background: '#fee2e2', borderBottom: '2px solid #fca5a5' }}>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#991b1b', fontWeight: '600' }}>Field Name</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#991b1b', fontWeight: '600' }}>Type</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#991b1b', fontWeight: '600' }}>Description</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {currentStepResult.result.diff_report.removed_fields.map((field: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                          <td style={{ padding: '0.5rem', color: '#991b1b', fontWeight: '500', textDecoration: 'line-through' }}>{field.name || field.field_name || field}</td>
                                          <td style={{ padding: '0.5rem', color: '#64748b' }}>{field.type || field.data_type || 'N/A'}</td>
                                          <td style={{ padding: '0.5rem', color: '#64748b' }}>{field.description || 'N/A'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            
                            {/* Results Table - Modified Fields */}
                            {currentStepResult.result.diff_report.modified_fields?.length > 0 && (
                              <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ 
                                  fontSize: '0.875rem', 
                                  fontWeight: '600', 
                                  color: '#92400e',
                                  marginBottom: '0.5rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}>
                                  <span style={{ fontSize: '1rem' }}>🔄</span> Modified Fields ({currentStepResult.result.diff_report.modified_fields.length})
                                </h4>
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead>
                                      <tr style={{ background: '#fef3c7', borderBottom: '2px solid #fcd34d' }}>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#92400e', fontWeight: '600' }}>Field Name</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#92400e', fontWeight: '600' }}>Change Type</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#92400e', fontWeight: '600' }}>Old Value</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#92400e', fontWeight: '600' }}>New Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {currentStepResult.result.diff_report.modified_fields.map((field: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                          <td style={{ padding: '0.5rem', color: '#92400e', fontWeight: '500' }}>{field.name || field.field_name || field}</td>
                                          <td style={{ padding: '0.5rem', color: '#64748b' }}>{field.change_type || 'Modified'}</td>
                                          <td style={{ padding: '0.5rem', color: '#dc2626', textDecoration: 'line-through' }}>{JSON.stringify(field.old_value || field.old || 'N/A')}</td>
                                          <td style={{ padding: '0.5rem', color: '#16a34a', fontWeight: '500' }}>{JSON.stringify(field.new_value || field.new || 'N/A')}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Complete Raw Result (Collapsible) */}
                        <details style={{ marginTop: '1rem' }}>
                          <summary style={{
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#64748b',
                            padding: '0.5rem',
                            background: 'white',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb'
                          }}>
                            📄 View Complete Raw Result
                          </summary>
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            background: 'white',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb',
                            maxHeight: '300px',
                            overflow: 'auto'
                          }}>
                            <pre style={{
                              fontSize: '0.7rem',
                              color: '#374151',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              margin: 0,
                              fontFamily: 'monospace'
                            }}>
                              {JSON.stringify(currentStepResult, null, 2)}
                            </pre>
                          </div>
                        </details>
                      </div>
                    ) : currentStep.name === 'Field Mapping' ? (
                      <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: '#f8fafc',
                        borderRadius: '0.5rem',
                        border: '2px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '2px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg style={{ width: '24px', height: '24px', color: '#8b5cf6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <p style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                              Field Mapping - Field-Level Data Mapping
                            </p>
                          </div>
                          {currentStepResult.result?.unmapped_source?.length > 0 && (
                            <button
                              onClick={() => setShowMappingEditor(!showMappingEditor)}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              {showMappingEditor ? 'Hide' : 'Show'} Manual Mapping Editor
                            </button>
                          )}
                        </div>

                        {/* Mapping Statistics */}
                        {currentStepResult.result?.mapping_statistics && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{
                              fontSize: '0.95rem',
                              fontWeight: '700',
                              color: '#0f172a',
                              marginBottom: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              paddingBottom: '0.5rem',
                              borderBottom: '2px solid #cbd5e1'
                            }}>
                              <span style={{ fontSize: '1.25rem' }}>📊</span> Mapping Statistics
                            </h4>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                              gap: '0.75rem',
                              marginBottom: '1rem'
                            }}>
                              <div style={{
                                background: 'white',
                                borderRadius: '0.5rem',
                                padding: '0.75rem',
                                border: '2px solid #e0e7ff',
                                textAlign: 'center'
                              }}>
                                <div style={{
                                  fontSize: '1.5rem',
                                  fontWeight: '700',
                                  color: '#3730a3',
                                  marginBottom: '0.25rem'
                                }}>
                                  {currentStepResult.result.mapping_statistics.mapped_count || 0}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                  Mapped Fields
                                </div>
                              </div>

                              <div style={{
                                background: 'white',
                                borderRadius: '0.5rem',
                                padding: '0.75rem',
                                border: '2px solid #86efac',
                                textAlign: 'center'
                              }}>
                                <div style={{
                                  fontSize: '1.5rem',
                                  fontWeight: '700',
                                  color: '#16a34a',
                                  marginBottom: '0.25rem'
                                }}>
                                  {currentStepResult.result.mapping_statistics.automatic_mappings_count || 0}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                  Automatic
                                </div>
                              </div>

                              <div style={{
                                background: 'white',
                                borderRadius: '0.5rem',
                                padding: '0.75rem',
                                border: '2px solid #a78bfa',
                                textAlign: 'center'
                              }}>
                                <div style={{
                                  fontSize: '1.5rem',
                                  fontWeight: '700',
                                  color: '#7c3aed',
                                  marginBottom: '0.25rem'
                                }}>
                                  {currentStepResult.result.mapping_statistics.manual_mappings_count || 0}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                  Manual
                                </div>
                              </div>

                              <div style={{
                                background: 'white',
                                borderRadius: '0.5rem',
                                padding: '0.75rem',
                                border: '2px solid #fca5a5',
                                textAlign: 'center'
                              }}>
                                <div style={{
                                  fontSize: '1.5rem',
                                  fontWeight: '700',
                                  color: '#dc2626',
                                  marginBottom: '0.25rem'
                                }}>
                                  {currentStepResult.result.mapping_statistics.unmapped_datamodel_count ||
                                   currentStepResult.result.mapping_statistics.unmapped_doc_a_count || 0}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                  Unmapped Source
                                </div>
                              </div>

                              <div style={{
                                background: 'white',
                                borderRadius: '0.5rem',
                                padding: '0.75rem',
                                border: '2px solid #fbbf24',
                                textAlign: 'center'
                              }}>
                                <div style={{
                                  fontSize: '1.5rem',
                                  fontWeight: '700',
                                  color: '#d97706',
                                  marginBottom: '0.25rem'
                                }}>
                                  {currentStepResult.result.mapping_statistics.unmapped_document_count ||
                                   currentStepResult.result.mapping_statistics.unmapped_doc_b_count || 0}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                  Unmapped Target
                                </div>
                              </div>

                              <div style={{
                                background: 'white',
                                borderRadius: '0.5rem',
                                padding: '0.75rem',
                                border: '2px solid #60a5fa',
                                textAlign: 'center'
                              }}>
                                <div style={{
                                  fontSize: '1.5rem',
                                  fontWeight: '700',
                                  color: '#2563eb',
                                  marginBottom: '0.25rem'
                                }}>
                                  {currentStepResult.result.mapping_statistics.mapping_coverage || 0}%
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                  Coverage
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Mapping Table */}
                        {currentStepResult.result?.mappings?.length > 0 && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{
                              fontSize: '0.95rem',
                              fontWeight: '700',
                              color: '#059669',
                              marginBottom: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              paddingBottom: '0.5rem',
                              borderBottom: '2px solid #a7f3d0'
                            }}>
                              <span style={{ fontSize: '1.25rem' }}>🔗</span> Field Mappings ({currentStepResult.result.mappings.length})
                            </h4>
                            <div style={{ overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '0.5rem' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: 'white' }}>
                                <thead>
                                  <tr style={{ background: '#d1fae5', borderBottom: '2px solid #6ee7b7' }}>
                                    {currentStepResult.result.comparison_mode === 'datamodel' ? (
                                      <>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Data Model Field</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700' }}>→</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Document Column</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Table #</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700' }}>Sample Values</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Confidence</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Type</th>
                                      </>
                                    ) : (
                                      <>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Doc A Column</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Table #</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700' }}>→</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Doc B Column</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Table #</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700' }}>Sample Values A</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700' }}>Sample Values B</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Confidence</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#065f46', fontWeight: '700', whiteSpace: 'nowrap' }}>Type</th>
                                      </>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentStepResult.result.mappings.map((mapping: any, idx: number) => {
                                    const confidence = mapping.confidence_score || 0;
                                    const confidenceColor = confidence >= 90 ? '#16a34a' : confidence >= 70 ? '#d97706' : '#dc2626';
                                    const confidenceBg = confidence >= 90 ? '#d1fae5' : confidence >= 70 ? '#fef3c7' : '#fee2e2';

                                    return currentStepResult.result.comparison_mode === 'datamodel' ? (
                                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                        <td style={{ padding: '0.75rem', color: '#1e293b', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                          {mapping.datamodel_table}.{mapping.datamodel_field}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.75rem' }}>{mapping.datamodel_type}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '1.2rem' }}>→</td>
                                        <td style={{ padding: '0.75rem', color: '#059669', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                          {mapping.document_column}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                                          Table {mapping.document_table}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {mapping.sample_values?.slice(0, 3).join(', ')}
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                          <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            background: confidenceBg,
                                            color: confidenceColor,
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                          }}>
                                            {confidence.toFixed(1)}%
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                          <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            background: mapping.is_manual ? '#e9d5ff' : '#dbeafe',
                                            color: mapping.is_manual ? '#7c3aed' : '#2563eb',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                          }}>
                                            {mapping.is_manual ? 'Manual' : 'Auto'}
                                          </span>
                                        </td>
                                      </tr>
                                    ) : (
                                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                        <td style={{ padding: '0.75rem', color: '#1e293b', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                          {mapping.doc_a_column}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                                          Table {mapping.doc_a_table}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '1.2rem' }}>→</td>
                                        <td style={{ padding: '0.75rem', color: '#059669', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                          {mapping.doc_b_column}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                                          Table {mapping.doc_b_table}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.75rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {mapping.doc_a_sample_values?.slice(0, 2).join(', ')}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.75rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {mapping.doc_b_sample_values?.slice(0, 2).join(', ')}
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                          <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            background: confidenceBg,
                                            color: confidenceColor,
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                          }}>
                                            {confidence.toFixed(1)}%
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                          <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            background: mapping.is_manual ? '#e9d5ff' : '#dbeafe',
                                            color: mapping.is_manual ? '#7c3aed' : '#2563eb',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                          }}>
                                            {mapping.is_manual ? 'Manual' : 'Auto'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Unmapped Fields */}
                        {(currentStepResult.result?.unmapped_source?.length > 0 || currentStepResult.result?.unmapped_target?.length > 0) && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{
                              fontSize: '0.95rem',
                              fontWeight: '700',
                              color: '#dc2626',
                              marginBottom: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              paddingBottom: '0.5rem',
                              borderBottom: '2px solid #fca5a5'
                            }}>
                              <span style={{ fontSize: '1.25rem' }}>⚠️</span> Unmapped Fields - Requires Attention
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              {/* Unmapped Source */}
                              {currentStepResult.result.unmapped_source?.length > 0 && (
                                <div>
                                  <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#991b1b', marginBottom: '0.5rem' }}>
                                    Source ({currentStepResult.result.unmapped_source.length})
                                  </h5>
                                  <div style={{ background: 'white', borderRadius: '0.375rem', border: '2px solid #fca5a5', maxHeight: '300px', overflow: 'auto' }}>
                                    {currentStepResult.result.unmapped_source.map((field: any, idx: number) => (
                                      <div key={idx} style={{
                                        padding: '0.75rem',
                                        borderBottom: idx < currentStepResult.result.unmapped_source.length - 1 ? '1px solid #fee2e2' : 'none'
                                      }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#991b1b' }}>
                                          {field.table ? `${field.table}.${field.field_name}` :
                                           field.column_name || field.field_name}
                                        </div>
                                        {field.description && (
                                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                            {field.description}
                                          </div>
                                        )}
                                        {field.sample_values && (
                                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                            Samples: {field.sample_values.slice(0, 3).join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Unmapped Target */}
                              {currentStepResult.result.unmapped_target?.length > 0 && (
                                <div>
                                  <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d97706', marginBottom: '0.5rem' }}>
                                    Target ({currentStepResult.result.unmapped_target.length})
                                  </h5>
                                  <div style={{ background: 'white', borderRadius: '0.375rem', border: '2px solid #fbbf24', maxHeight: '300px', overflow: 'auto' }}>
                                    {currentStepResult.result.unmapped_target.map((field: any, idx: number) => (
                                      <div key={idx} style={{
                                        padding: '0.75rem',
                                        borderBottom: idx < currentStepResult.result.unmapped_target.length - 1 ? '1px solid #fef3c7' : 'none'
                                      }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d97706' }}>
                                          {field.column_name || field.field_name}
                                          {field.table_number && ` (Table ${field.table_number})`}
                                        </div>
                                        {field.sample_values && (
                                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                            Samples: {field.sample_values.slice(0, 3).join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Manual Mapping Editor */}
                        {showMappingEditor && currentStepResult.result?.unmapped_source?.length > 0 && (
                          <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '0.5rem',
                            border: '2px solid #8b5cf6'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <h4 style={{
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#7c3aed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                margin: 0
                              }}>
                                <span style={{ fontSize: '1.25rem' }}>✏️</span> Manual Mapping Editor
                              </h4>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => {
                                    setEditingMapping({
                                      source: null,
                                      target: null,
                                      isNew: true
                                    });
                                  }}
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    background: '#8b5cf6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem'
                                  }}
                                >
                                  <span style={{ fontSize: '1rem' }}>+</span> Add Mapping
                                </button>
                              </div>
                            </div>

                            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                              Create manual mappings for unmapped fields. Click "Add Mapping" to create a new mapping or edit existing ones.
                            </p>

                            {/* Current Manual Mappings List */}
                            {manualMappings.length > 0 && (
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h5 style={{
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  color: '#475569',
                                  marginBottom: '0.75rem'
                                }}>
                                  Current Manual Mappings ({manualMappings.length})
                                </h5>
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <thead>
                                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Source Field</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Target Field</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'center', color: '#475569', fontWeight: '600' }}>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {manualMappings.map((mapping: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                          <td style={{ padding: '0.5rem', color: '#1e293b', fontWeight: '500' }}>
                                            {currentStepResult.result.comparison_mode === 'datamodel'
                                              ? `${mapping.datamodel_table}.${mapping.datamodel_field}`
                                              : `Table ${mapping.doc_a_table}.${mapping.doc_a_column}`
                                            }
                                          </td>
                                          <td style={{ padding: '0.5rem', color: '#1e293b' }}>
                                            {currentStepResult.result.comparison_mode === 'datamodel'
                                              ? `Table ${mapping.document_table}.${mapping.document_column}`
                                              : `Table ${mapping.doc_b_table}.${mapping.doc_b_column}`
                                            }
                                          </td>
                                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                              <button
                                                onClick={() => {
                                                  setEditingMapping({ ...mapping, index: idx, isNew: false });
                                                }}
                                                style={{
                                                  padding: '0.25rem 0.5rem',
                                                  background: '#60a5fa',
                                                  color: 'white',
                                                  border: 'none',
                                                  borderRadius: '0.25rem',
                                                  fontSize: '0.75rem',
                                                  cursor: 'pointer'
                                                }}
                                              >
                                                Edit
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setManualMappings(prev => prev.filter((_, i) => i !== idx));
                                                }}
                                                style={{
                                                  padding: '0.25rem 0.5rem',
                                                  background: '#ef4444',
                                                  color: 'white',
                                                  border: 'none',
                                                  borderRadius: '0.25rem',
                                                  fontSize: '0.75rem',
                                                  cursor: 'pointer'
                                                }}
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Mapping Form */}
                            {editingMapping && (
                              <div style={{
                                background: '#f8fafc',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                border: '2px solid #8b5cf6',
                                marginBottom: '1rem'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                  <h5 style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#7c3aed',
                                    margin: 0
                                  }}>
                                    {editingMapping.isNew ? 'Create New Mapping' : 'Edit Mapping'}
                                  </h5>
                                  <button
                                    onClick={() => setEditingMapping(null)}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#64748b',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '0.25rem',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                  {/* Source Field Selection */}
                                  <div>
                                    <label style={{
                                      display: 'block',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      color: '#475569',
                                      marginBottom: '0.5rem'
                                    }}>
                                      Source Field (Unmapped)
                                    </label>
                                    <select
                                      value={editingMapping.source ? JSON.stringify(editingMapping.source) : ''}
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          setEditingMapping({
                                            ...editingMapping,
                                            source: JSON.parse(e.target.value)
                                          });
                                        }
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        borderRadius: '0.375rem',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.8rem',
                                        background: 'white'
                                      }}
                                    >
                                      <option value="">Select source field...</option>
                                      {currentStepResult.result?.unmapped_source?.map((field: any, idx: number) => (
                                        <option key={idx} value={JSON.stringify(field)}>
                                          {currentStepResult.result.comparison_mode === 'datamodel'
                                            ? `${field.table}.${field.field_name} (${field.field_type})`
                                            : `Table ${field.table_number}.${field.column_name}`
                                          }
                                        </option>
                                      ))}
                                    </select>
                                    {editingMapping.source && (
                                      <div style={{
                                        marginTop: '0.5rem',
                                        padding: '0.5rem',
                                        background: 'white',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        color: '#64748b'
                                      }}>
                                        <strong>Details:</strong>
                                        {currentStepResult.result.comparison_mode === 'datamodel' ? (
                                          <>
                                            <div>Type: {editingMapping.source.field_type}</div>
                                            <div>Description: {editingMapping.source.description || 'N/A'}</div>
                                          </>
                                        ) : (
                                          <div>Sample Values: {editingMapping.source.sample_values?.slice(0, 3).join(', ') || 'N/A'}</div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Target Field Selection */}
                                  <div>
                                    <label style={{
                                      display: 'block',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      color: '#475569',
                                      marginBottom: '0.5rem'
                                    }}>
                                      Target Field (Unmapped)
                                    </label>
                                    <select
                                      value={editingMapping.target ? JSON.stringify(editingMapping.target) : ''}
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          setEditingMapping({
                                            ...editingMapping,
                                            target: JSON.parse(e.target.value)
                                          });
                                        }
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        borderRadius: '0.375rem',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.8rem',
                                        background: 'white'
                                      }}
                                    >
                                      <option value="">Select target field...</option>
                                      {currentStepResult.result?.unmapped_target?.map((field: any, idx: number) => (
                                        <option key={idx} value={JSON.stringify(field)}>
                                          {currentStepResult.result.comparison_mode === 'datamodel'
                                            ? `Table ${field.table_number}.${field.column_name}`
                                            : `Table ${field.table_number}.${field.column_name}`
                                          }
                                        </option>
                                      ))}
                                    </select>
                                    {editingMapping.target && (
                                      <div style={{
                                        marginTop: '0.5rem',
                                        padding: '0.5rem',
                                        background: 'white',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        color: '#64748b'
                                      }}>
                                        <strong>Details:</strong>
                                        <div>Sample Values: {editingMapping.target.sample_values?.slice(0, 3).join(', ') || 'N/A'}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Save Button */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => {
                                      if (!editingMapping.source || !editingMapping.target) {
                                        alert('Please select both source and target fields');
                                        return;
                                      }

                                      const newMapping = currentStepResult.result.comparison_mode === 'datamodel'
                                        ? {
                                            datamodel_table: editingMapping.source.table,
                                            datamodel_field: editingMapping.source.field_name,
                                            document_table: editingMapping.target.table_number,
                                            document_column: editingMapping.target.column_name
                                          }
                                        : {
                                            doc_a_table: editingMapping.source.table_number,
                                            doc_a_column: editingMapping.source.column_name,
                                            doc_b_table: editingMapping.target.table_number,
                                            doc_b_column: editingMapping.target.column_name
                                          };

                                      if (editingMapping.isNew) {
                                        setManualMappings(prev => [...prev, newMapping]);
                                      } else {
                                        setManualMappings(prev => prev.map((m, i) =>
                                          i === editingMapping.index ? newMapping : m
                                        ));
                                      }
                                      setEditingMapping(null);
                                    }}
                                    disabled={!editingMapping.source || !editingMapping.target}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      background: editingMapping.source && editingMapping.target ? '#10b981' : '#94a3b8',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.85rem',
                                      fontWeight: '600',
                                      cursor: editingMapping.source && editingMapping.target ? 'pointer' : 'not-allowed'
                                    }}
                                  >
                                    {editingMapping.isNew ? 'Add Mapping' : 'Update Mapping'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Apply Manual Mappings Button */}
                            {manualMappings.length > 0 && (
                              <div style={{
                                padding: '1rem',
                                background: '#f0fdf4',
                                borderRadius: '0.5rem',
                                border: '2px solid #86efac'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#15803d', margin: 0, marginBottom: '0.25rem' }}>
                                      Ready to apply {manualMappings.length} manual mapping(s)
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: '#166534', margin: 0 }}>
                                      Click "Re-run with Manual Mappings" to execute Field Mapping with your manual mappings
                                    </p>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      try {
                                        setIsProcessing(true);
                                        const parserResults = stepResults[0];
                                        const diffResults = stepResults[1];

                                        const context = {
                                          parser_results: parserResults.result,
                                          regulatory_diff: diffResults.result,
                                          manual_mappings: manualMappings,
                                          confidence_threshold: inputValues.confidence_threshold || 60
                                        };

                                        const result = await workflowService.executeDictionaryMapping(workflow.id, context);

                                        setStepResults(prev => ({
                                          ...prev,
                                          2: { result, timestamp: new Date().toISOString() },
                                        }));

                                        setIsProcessing(false);
                                        alert('Field Mapping re-executed successfully with manual mappings!');
                                      } catch (error: any) {
                                        setIsProcessing(false);
                                        setError(error.response?.data?.detail || error.message || 'Failed to re-execute Field Mapping');
                                      }
                                    }}
                                    disabled={isProcessing}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      background: '#16a34a',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.85rem',
                                      fontWeight: '600',
                                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {isProcessing ? 'Re-running...' : 'Re-run with Manual Mappings'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Instructions */}
                            <div style={{
                              marginTop: '1rem',
                              padding: '0.75rem',
                              background: '#eff6ff',
                              borderRadius: '0.375rem',
                              border: '1px solid #bfdbfe'
                            }}>
                              <p style={{ fontSize: '0.75rem', color: '#1e40af', margin: 0, marginBottom: '0.5rem', fontWeight: '600' }}>
                                💡 How to use:
                              </p>
                              <ul style={{ fontSize: '0.75rem', color: '#1e40af', margin: 0, paddingLeft: '1.25rem' }}>
                                <li>Click "Add Mapping" to create a new manual mapping</li>
                                <li>Select a source field from unmapped sources</li>
                                <li>Select a target field from unmapped targets</li>
                                <li>Review the field details to ensure correct mapping</li>
                                <li>Click "Add Mapping" to save</li>
                                <li>Once done, click "Re-run with Manual Mappings" to apply</li>
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Complete Raw Result */}
                        <details style={{ marginTop: '1rem' }}>
                          <summary style={{
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#64748b',
                            padding: '0.5rem',
                            background: 'white',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb'
                          }}>
                            📄 View Complete Raw Result
                          </summary>
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            background: 'white',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb',
                            maxHeight: '300px',
                            overflow: 'auto'
                          }}>
                            <pre style={{
                              fontSize: '0.7rem',
                              color: '#374151',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              margin: 0,
                              fontFamily: 'monospace'
                            }}>
                              {JSON.stringify(currentStepResult, null, 2)}
                            </pre>
                          </div>
                        </details>
                      </div>
                    ) : currentStep.name === 'Functional Specification' ? (
                      <div style={{
                        marginTop: '1.5rem',
                        padding: '1.5rem',
                        background: 'white',
                        borderRadius: '0.5rem',
                        border: '2px solid #e2e8f0'
                      }}>
                        {/* Functional Specification Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e2e8f0' }}>
                          <svg style={{ width: '28px', height: '28px', color: '#059669' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <div>
                            <p style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                              Functional Specification Report Generated
                            </p>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                              Comprehensive analysis complete with findings and recommendations
                            </p>
                          </div>
                        </div>

                        {/* Gap Summary Cards */}
                        {currentStepResult.result?.gap_summary && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              📊 Gap Summary
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                              {/* Total Gaps */}
                              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '2px solid #e2e8f0' }}>
                                <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0, marginBottom: '0.25rem', fontWeight: '600' }}>Total Gaps</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                  {currentStepResult.result.gap_summary.total_gaps || 0}
                                </p>
                              </div>

                              {/* Critical */}
                              {currentStepResult.result.gap_summary.critical > 0 && (
                                <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '0.5rem', border: '2px solid #fecaca' }}>
                                  <p style={{ fontSize: '0.7rem', color: '#991b1b', margin: 0, marginBottom: '0.25rem', fontWeight: '600' }}>🔴 Critical</p>
                                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626', margin: 0 }}>
                                    {currentStepResult.result.gap_summary.critical}
                                  </p>
                                </div>
                              )}

                              {/* High */}
                              {currentStepResult.result.gap_summary.high > 0 && (
                                <div style={{ padding: '0.75rem', background: '#fff7ed', borderRadius: '0.5rem', border: '2px solid #fed7aa' }}>
                                  <p style={{ fontSize: '0.7rem', color: '#9a3412', margin: 0, marginBottom: '0.25rem', fontWeight: '600' }}>🟠 High</p>
                                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ea580c', margin: 0 }}>
                                    {currentStepResult.result.gap_summary.high}
                                  </p>
                                </div>
                              )}

                              {/* Medium */}
                              {currentStepResult.result.gap_summary.medium > 0 && (
                                <div style={{ padding: '0.75rem', background: '#fefce8', borderRadius: '0.5rem', border: '2px solid #fde047' }}>
                                  <p style={{ fontSize: '0.7rem', color: '#854d0e', margin: 0, marginBottom: '0.25rem', fontWeight: '600' }}>🟡 Medium</p>
                                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ca8a04', margin: 0 }}>
                                    {currentStepResult.result.gap_summary.medium}
                                  </p>
                                </div>
                              )}

                              {/* Low */}
                              {currentStepResult.result.gap_summary.low > 0 && (
                                <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem', border: '2px solid #bfdbfe' }}>
                                  <p style={{ fontSize: '0.7rem', color: '#1e40af', margin: 0, marginBottom: '0.25rem', fontWeight: '600' }}>🔵 Low</p>
                                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2563eb', margin: 0 }}>
                                    {currentStepResult.result.gap_summary.low}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Report Preview */}
                        {currentStepResult.result?.report_content && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              📄 Report Preview
                            </h4>
                            <div style={{
                              padding: '1rem',
                              background: '#f8fafc',
                              borderRadius: '0.5rem',
                              border: '1px solid #e2e8f0',
                              maxHeight: '400px',
                              overflow: 'auto',
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                            }}>
                              <pre style={{
                                fontSize: '0.75rem',
                                color: '#334155',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                margin: 0,
                                lineHeight: '1.6'
                              }}>
                                {currentStepResult.result.report_content.substring(0, 3000)}
                                {currentStepResult.result.report_content.length > 3000 && '\n\n... (Report continues. Download full report using buttons above)'}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {currentStepResult.result?.recommendations?.length > 0 && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              💡 Top Recommendations ({currentStepResult.result.recommendations.length})
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {currentStepResult.result.recommendations.slice(0, 5).map((rec: any, idx: number) => (
                                <div key={idx} style={{
                                  padding: '0.75rem',
                                  background: rec.priority === 'high' || rec.priority === 'critical' ? '#fef2f2' : '#f0fdf4',
                                  borderRadius: '0.5rem',
                                  border: `2px solid ${rec.priority === 'high' || rec.priority === 'critical' ? '#fecaca' : '#bbf7d0'}`
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: '700',
                                      color: rec.priority === 'high' || rec.priority === 'critical' ? '#dc2626' : '#16a34a',
                                      textTransform: 'uppercase',
                                      padding: '0.125rem 0.5rem',
                                      background: 'white',
                                      borderRadius: '0.25rem'
                                    }}>
                                      {rec.priority || 'Medium'}
                                    </span>
                                    {rec.category && (
                                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
                                        {rec.category}
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ fontSize: '0.8rem', color: '#1e293b', margin: 0, fontWeight: '600', marginBottom: '0.25rem' }}>
                                    {rec.recommendation}
                                  </p>
                                  {rec.rationale && (
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                                      {rec.rationale}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                            {currentStepResult.result.recommendations.length > 5 && (
                              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem', fontStyle: 'italic' }}>
                                ... and {currentStepResult.result.recommendations.length - 5} more recommendations. Download the full report to view all.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{
                          padding: '1rem',
                          background: '#f0fdf4',
                          borderRadius: '0.5rem',
                          border: '1px solid #bbf7d0'
                        }}>
                          <p style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600', margin: 0, marginBottom: '0.5rem' }}>
                            ✅ Next Steps
                          </p>
                          <ul style={{ fontSize: '0.75rem', color: '#166534', margin: 0, paddingLeft: '1.25rem' }}>
                            <li>Download the full report using "Download Markdown" or "JSON" buttons above</li>
                            <li>Click "Publish Report" to make it available in the Reports page</li>
                            <li>Review recommendations and prioritize remediation actions</li>
                            <li>Share the report with stakeholders for alignment</li>
                          </ul>
                        </div>

                        {/* Complete Raw Result */}
                        <details style={{ marginTop: '1rem' }}>
                          <summary style={{
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#64748b',
                            padding: '0.5rem',
                            background: 'white',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb'
                          }}>
                            📄 View Complete Raw Result
                          </summary>
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            background: 'white',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb',
                            maxHeight: '300px',
                            overflow: 'auto'
                          }}>
                            <pre style={{
                              fontSize: '0.7rem',
                              color: '#374151',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              margin: 0,
                              fontFamily: 'monospace'
                            }}>
                              {JSON.stringify(currentStepResult, null, 2)}
                            </pre>
                          </div>
                        </details>
                      </div>
                    ) : currentStep.name === 'Assign to Developer' ? (
                      <div style={{
                        marginTop: '1.5rem',
                        padding: '1.5rem',
                        background: 'white',
                        borderRadius: '0.5rem',
                        border: '2px solid #10b981'
                      }}>
                        {/* Assignment Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #d1fae5' }}>
                          <svg style={{ width: '32px', height: '32px', color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                              Workflow Assignment Summary
                            </p>
                            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                              Ready for developer implementation
                            </p>
                          </div>
                        </div>

                        {/* Comparison Summary */}
                        {stepResults[1]?.result?.diff_report && (
                          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef9ec', borderRadius: '0.5rem', border: '1px solid #fde68a' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#92400e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              📋 Comparison Status
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                              <div style={{ padding: '0.5rem', background: 'white', borderRadius: '0.375rem' }}>
                                <p style={{ fontSize: '0.65rem', color: '#64748b', margin: 0, marginBottom: '0.25rem' }}>Total Fields</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                  {stepResults[1].result.statistics?.total_fields || 0}
                                </p>
                              </div>
                              <div style={{ padding: '0.5rem', background: 'white', borderRadius: '0.375rem' }}>
                                <p style={{ fontSize: '0.65rem', color: '#64748b', margin: 0, marginBottom: '0.25rem' }}>Matched</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669', margin: 0 }}>
                                  {stepResults[1].result.statistics?.matching_fields || 0}
                                </p>
                              </div>
                              <div style={{ padding: '0.5rem', background: 'white', borderRadius: '0.375rem' }}>
                                <p style={{ fontSize: '0.65rem', color: '#64748b', margin: 0, marginBottom: '0.25rem' }}>Partial</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#d97706', margin: 0 }}>
                                  {stepResults[1].result.statistics?.partial_match || 0}
                                </p>
                              </div>
                              <div style={{ padding: '0.5rem', background: 'white', borderRadius: '0.375rem' }}>
                                <p style={{ fontSize: '0.65rem', color: '#64748b', margin: 0, marginBottom: '0.25rem' }}>Not Matched</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc2626', margin: 0 }}>
                                  {stepResults[1].result.statistics?.not_match || stepResults[1].result.statistics?.not_matched_data || 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Functional Specification Summary */}
                        {stepResults[3]?.result?.gap_summary && (
                          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#991b1b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              🔍 Functional Specification Summary
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                              <div style={{ padding: '0.5rem', background: 'white', borderRadius: '0.375rem' }}>
                                <p style={{ fontSize: '0.65rem', color: '#64748b', margin: 0, marginBottom: '0.25rem' }}>Total Gaps</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                  {stepResults[3].result.gap_summary.total_gaps || 0}
                                </p>
                              </div>
                              {stepResults[3].result.gap_summary.critical > 0 && (
                                <div style={{ padding: '0.5rem', background: '#fef2f2', borderRadius: '0.375rem', border: '1px solid #fecaca' }}>
                                  <p style={{ fontSize: '0.65rem', color: '#991b1b', margin: 0, marginBottom: '0.25rem' }}>🔴 Critical</p>
                                  <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc2626', margin: 0 }}>
                                    {stepResults[3].result.gap_summary.critical}
                                  </p>
                                </div>
                              )}
                              {stepResults[3].result.gap_summary.high > 0 && (
                                <div style={{ padding: '0.5rem', background: '#fff7ed', borderRadius: '0.375rem', border: '1px solid #fed7aa' }}>
                                  <p style={{ fontSize: '0.65rem', color: '#9a3412', margin: 0, marginBottom: '0.25rem' }}>🟠 High</p>
                                  <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ea580c', margin: 0 }}>
                                    {stepResults[3].result.gap_summary.high}
                                  </p>
                                </div>
                              )}
                              {stepResults[3].result.gap_summary.medium > 0 && (
                                <div style={{ padding: '0.5rem', background: '#fefce8', borderRadius: '0.375rem', border: '1px solid #fef08a' }}>
                                  <p style={{ fontSize: '0.65rem', color: '#92400e', margin: 0, marginBottom: '0.25rem' }}>🟡 Medium</p>
                                  <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#d97706', margin: 0 }}>
                                    {stepResults[3].result.gap_summary.medium}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div style={{ padding: '0.75rem', background: 'white', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, marginBottom: '0.25rem' }}>
                                <strong>Recommendations:</strong> {stepResults[3].result.recommendations?.length || 0} action items identified
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Assignment Info */}
                        {currentStepResult?.result?.assigned_to && (
                          <div style={{ padding: '1rem', background: '#d1fae5', borderRadius: '0.5rem', border: '1px solid #6ee7b7' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#065f46', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              ✅ Assignment Complete
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: '#065f46', margin: 0 }}>
                              <strong>Assigned to:</strong> {currentStepResult.result.assigned_to?.username || 'Developer'}
                            </p>
                            {currentStepResult.result.priority && (
                              <p style={{ fontSize: '0.8rem', color: '#065f46', margin: 0, marginTop: '0.25rem' }}>
                                <strong>Priority:</strong> {currentStepResult.result.priority.toUpperCase()}
                              </p>
                            )}
                            {currentStepResult.result.assignment_notes && (
                              <p style={{ fontSize: '0.75rem', color: '#047857', margin: 0, marginTop: '0.5rem', fontStyle: 'italic' }}>
                                "{currentStepResult.result.assignment_notes}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Next Steps */}
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                          <p style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600', margin: 0, marginBottom: '0.5rem' }}>
                            🚀 Next Steps for Developer
                          </p>
                          <ul style={{ fontSize: '0.75rem', color: '#166534', margin: 0, paddingLeft: '1.25rem' }}>
                            <li>Review all Functional Specification findings and recommendations</li>
                            <li>Analyze structured requirements for implementation planning</li>
                            <li>Design schema changes based on Comparison results</li>
                            <li>Proceed with Schema Analyzer, SQL Generator, and ETL Generator steps</li>
                            <li>Implement deterministic mappings for data transformations</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '1rem',
                        background: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <svg style={{ width: '20px', height: '20px', color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#166534' }}>
                            Execution Completed Successfully
                          </p>
                        </div>
                        <div style={{
                          padding: '0.75rem',
                          background: '#f8fafc',
                          borderRadius: '0.375rem',
                          maxHeight: '400px',
                          overflow: 'auto',
                          border: '1px solid #e5e7eb'
                        }}>
                          <pre style={{
                            fontSize: '0.75rem',
                            color: '#374151',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            margin: 0,
                            fontFamily: 'monospace'
                          }}>
                            {JSON.stringify(currentStepResult, null, 2)}
                          </pre>
                        </div>
                    </div>
                  )
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem',
                    color: '#94a3b8'
                  }}>
                    <svg style={{ width: '64px', height: '64px', marginBottom: '1rem', opacity: 0.3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>No Results Yet</p>
                    <p style={{ fontSize: '0.75rem', textAlign: 'center', maxWidth: '300px' }}>
                      Run the agent to see execution output and analysis
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Publish Report Dialog */}
      {publishDialogOpen && (
        <div className="wfp-modal-overlay" onClick={() => setPublishDialogOpen(false)}>
          <div className="wfp-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wfp-modal-header">
              <h2 className="wfp-modal-title">Publish Functional Specification Report</h2>
              <button className="wfp-modal-close" onClick={() => setPublishDialogOpen(false)}>
                <svg className="wfp-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="wfp-modal-body">
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                Provide a title and description for your report. Published reports will be visible in the Reports page.
              </p>

              <div className="wfp-form-group">
                <Label htmlFor="publish-title" className="wfp-form-label">Report Title</Label>
                <Input
                  id="publish-title"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="Enter report title"
                  className="wfp-form-input"
                />
              </div>

              <div className="wfp-form-group">
                <Label htmlFor="publish-description" className="wfp-form-label">Description (Optional)</Label>
                <textarea
                  id="publish-description"
                  value={publishDescription}
                  onChange={(e) => setPublishDescription(e.target.value)}
                  placeholder="Enter report description"
                  rows={3}
                  className="wfp-form-textarea"
                />
              </div>
            </div>

            <div className="wfp-modal-footer">
              <Button
                onClick={() => setPublishDialogOpen(false)}
                disabled={isPublishing}
                className="wfp-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setIsPublishing(true);
                  try {
                    const token = localStorage.getItem('token');

                    console.log('Publishing Functional Specification report...');
                    console.log('Workflow ID:', workflow.id);
                    console.log('Title:', publishTitle);
                    console.log('Description:', publishDescription);

                    const response = await fetch(
                      `${API_BASE_URL}/api/ba/${workflow.id}/gap-analysis-report/publish`,
                      {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          title: publishTitle || undefined,
                          description: publishDescription || undefined
                        })
                      }
                    );

                    console.log('Response status:', response.status);

                    let result;
                    try {
                      result = await response.json();
                      console.log('Response data:', result);
                    } catch (jsonError) {
                      console.error('Failed to parse JSON response:', jsonError);
                      throw new Error('Invalid response from server');
                    }

                    if (!response.ok) {
                      console.error('Publish failed with error:', result);
                      throw new Error(result.detail || result.message || 'Failed to publish report');
                    }

                    console.log('Publish successful!');
                    showToast.success('Report published successfully! You can view it in the Reports page.');

                    // Close dialog and reset form
                    setPublishDialogOpen(false);
                    setPublishTitle('');
                    setPublishDescription('');

                    // Do NOT call onClose() - stay on the workflow page
                  } catch (error: any) {
                    console.error('Publish failed with exception:', error);
                    showToast.error(error.message || 'Failed to publish Functional Specification report. Please try again.');
                    // Keep dialog open on error so user can retry
                  } finally {
                    setIsPublishing(false);
                  }
                }}
                disabled={isPublishing || !publishTitle.trim()}
                className="wfp-submit-btn"
              >
                {isPublishing ? 'Publishing...' : 'Publish Report'}
              </Button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
