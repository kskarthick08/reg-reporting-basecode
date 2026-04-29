/**
 * Workflow Helper Functions
 *
 * Shared utilities for workflow operations across the application.
 */

import { Workflow } from '@/types';

export interface StepConfig {
  name: string;
  agent: string;
  description: string;
  order: number;
}

export const WORKFLOW_TYPES = {
  BA: 'business_analyst',
  DEVELOPER: 'developer',
  ANALYST: 'analyst',
  REVIEWER: 'reviewer',
  COMPLETE: 'complete'
} as const;

export const BA_STEPS: StepConfig[] = [
  { name: 'Select Documents', agent: 'DocumentParserAgent', description: 'Parse regulatory documents', order: 0 },
  { name: 'Comparison', agent: 'RegulatoryDiffAgent', description: 'Compare documents', order: 1 },
  { name: 'Field Mapping', agent: 'DictionaryMappingAgent', description: 'Map data fields', order: 2 },
  { name: 'Functional Specification', agent: 'GapAnalysisAgent', description: 'Analyze gaps', order: 3 },
  { name: 'Assign to Developer', agent: 'AssignmentAgent', description: 'Assign workflow to developer', order: 4 }
];

export const DEVELOPER_STEPS: StepConfig[] = [
  { name: 'Schema Generator', agent: 'SchemaGeneratorAgent', description: 'Generate schema from FCA documents', order: 0 },
  { name: 'Schema Analyzer', agent: 'SchemaAnalyzerAgent', description: 'Analyze database schema', order: 1 },
  { name: 'SQL Generator', agent: 'SQLGeneratorAgent', description: 'Generate SQL code', order: 2 },
  { name: 'Python ETL Generator', agent: 'PythonETLGeneratorAgent', description: 'Generate ETL code', order: 3 },
  { name: 'Deterministic Mapping', agent: 'DeterministicMappingAgent', description: 'Generate XSD/XML mappings', order: 4 },
  { name: 'Test Integration', agent: 'TestIntegrationAgent', description: 'Integrate tests', order: 5 },
  { name: 'Assign to Reviewer', agent: 'AssignmentAgent', description: 'Assign workflow to reviewer', order: 6 }
];

export const ANALYST_STEPS: StepConfig[] = [
  { name: 'Validation', agent: 'ValidationAgent', description: 'Validate data', order: 0 },
  { name: 'Anomaly Detection', agent: 'AnomalyDetectionAgent', description: 'Detect anomalies', order: 1 },
  { name: 'Variance Explanation', agent: 'VarianceExplanationAgent', description: 'Explain variances', order: 2 },
  { name: 'Cross-Report Reconciliation', agent: 'CrossReportReconciliationAgent', description: 'Reconcile reports', order: 3 },
  { name: 'Audit Pack Generator', agent: 'AuditPackGeneratorAgent', description: 'Generate audit pack', order: 4 },
  { name: 'PSD CSV Generator', agent: 'PSDCSVGeneratorAgent', description: 'Generate PSD CSV', order: 5 },
  { name: 'Complete Workflow', agent: 'CompletionAgent', description: 'Complete and approve workflow', order: 6 }
];

export const REVIEWER_STEPS: StepConfig[] = [
  { name: 'Code Review', agent: 'CodeReviewAgent', description: 'Review code quality', order: 0 },
  { name: 'Security Scan', agent: 'SecurityScanAgent', description: 'Scan for vulnerabilities', order: 1 },
  { name: 'Quality Check', agent: 'QualityCheckAgent', description: 'Check code quality metrics', order: 2 },
  { name: 'Compliance Check', agent: 'ComplianceCheckAgent', description: 'Verify compliance', order: 3 },
  { name: 'Generate Report', agent: 'ReportGeneratorAgent', description: 'Generate review report', order: 4 },
  { name: 'Submit Review', agent: 'SubmitReviewAgent', description: 'Submit final review', order: 5 }
];

export function getWorkflowSteps(workflowType: string): StepConfig[] {
  switch (workflowType) {
    case WORKFLOW_TYPES.BA:
    case 'business_analyst':
      return BA_STEPS;
    case WORKFLOW_TYPES.DEVELOPER:
    case 'developer':
      return DEVELOPER_STEPS;
    case WORKFLOW_TYPES.ANALYST:
    case 'analyst':
      return ANALYST_STEPS;
    case WORKFLOW_TYPES.REVIEWER:
    case 'reviewer':
      return REVIEWER_STEPS;
    case WORKFLOW_TYPES.COMPLETE:
    case 'complete':
      return BA_STEPS; // Complete pipeline starts with BA
    default:
      return [];
  }
}

export function getStepByIndex(workflowType: string, index: number): StepConfig | undefined {
  const steps = getWorkflowSteps(workflowType);
  return steps[index];
}

export function getStepIndexByName(workflowType: string, stepName: string): number {
  const steps = getWorkflowSteps(workflowType);
  return steps.findIndex(step => step.name === stepName);
}

export function formatWorkflowType(type: string): string {
  switch (type) {
    case WORKFLOW_TYPES.BA:
    case 'business_analyst':
      return 'Business Analyst';
    case WORKFLOW_TYPES.DEVELOPER:
    case 'developer':
      return 'Developer';
    case WORKFLOW_TYPES.ANALYST:
    case 'analyst':
      return 'Analyst';
    case WORKFLOW_TYPES.REVIEWER:
    case 'reviewer':
      return 'Reviewer';
    case WORKFLOW_TYPES.COMPLETE:
    case 'complete':
      return 'Complete Pipeline';
    default:
      return type;
  }
}

export function getNextStep(workflowType: string, currentIndex: number): StepConfig | null {
  const steps = getWorkflowSteps(workflowType);
  return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
}

export function getPreviousStep(workflowType: string, currentIndex: number): StepConfig | null {
  const steps = getWorkflowSteps(workflowType);
  return currentIndex > 0 ? steps[currentIndex - 1] : null;
}

export function isFirstStep(currentIndex: number): boolean {
  return currentIndex === 0;
}

export function isLastStep(workflowType: string, currentIndex: number): boolean {
  const steps = getWorkflowSteps(workflowType);
  return currentIndex === steps.length - 1;
}

export function calculateProgress(workflowType: string, currentIndex: number): number {
  const steps = getWorkflowSteps(workflowType);
  return Math.round(((currentIndex + 1) / steps.length) * 100);
}

export interface WorkflowStatus {
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  currentStep: number;
  completedSteps: number;
  totalSteps: number;
  progress: number;
}

export function getWorkflowStatus(workflow: Workflow, currentStepIndex: number): WorkflowStatus {
  const totalSteps = getWorkflowSteps(workflow.workflow_type).length;

  return {
    status: ['not_started', 'in_progress', 'completed', 'failed'].includes(workflow.status)
      ? (workflow.status as WorkflowStatus['status'])
      : 'not_started',
    currentStep: currentStepIndex,
    completedSteps: currentStepIndex,
    totalSteps,
    progress: calculateProgress(workflow.workflow_type, currentStepIndex)
  };
}

export function validateStepInputs(stepName: string, inputs: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Common validation patterns
  if (stepName === 'Select Documents') {
    if (!inputs.document_2) errors.push('Document selection is required');
  }

  if (stepName === 'Schema Analyzer') {
    if (!inputs.schema_source) errors.push('Schema source is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ReactFlow node generation utilities
import { Node, Edge } from 'reactflow';

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
      { name: 'Schema Analyzer', tools: ['InspectSchema', 'ExecuteQuery', 'AnalyzeCompliance'] },
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
  // Legacy support: map 'analyst' to 'reviewer' for backwards compatibility
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

const NODE_STYLES = {
  supervisor: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: '2px solid #d97706',
    borderRadius: '12px',
    padding: '12px 18px',
    fontSize: '13px',
    fontWeight: 'bold',
    minWidth: '160px',
    textAlign: 'center' as const,
    boxShadow: '0 6px 12px -3px rgba(217, 119, 6, 0.3), 0 3px 6px -2px rgba(217, 119, 6, 0.15)',
  },
  subSupervisor: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    color: 'white',
    border: '2px solid #6d28d9',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: '600',
    minWidth: '130px',
    textAlign: 'center' as const,
    boxShadow: '0 4px 8px -2px rgba(139, 92, 246, 0.25)',
  },
  agent: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: '1.5px solid #1d4ed8',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '10px',
    fontWeight: '600',
    minWidth: '100px',
    textAlign: 'center' as const,
    boxShadow: '0 3px 6px -2px rgba(59, 130, 246, 0.25)',
  },
  tool: {
    background: 'rgba(255, 255, 255, 0.98)',
    border: '1.5px solid #cbd5e1',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '9px',
    fontWeight: '500',
    minWidth: '80px',
    textAlign: 'center' as const,
    color: '#475569',
    boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  stage: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '11px',
    fontWeight: '600',
    minWidth: '100px',
    textAlign: 'center' as const,
    color: '#64748b',
    boxShadow: '0 2px 6px -1px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
  },
  stageActive: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: '2px solid #059669',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '11px',
    fontWeight: '700',
    minWidth: '100px',
    textAlign: 'center' as const,
    color: 'white',
    boxShadow: '0 4px 8px -2px rgba(16, 185, 129, 0.4)',
    cursor: 'pointer',
  },
  stageCompleted: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: '2px solid #1d4ed8',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '11px',
    fontWeight: '600',
    minWidth: '100px',
    textAlign: 'center' as const,
    color: 'white',
    boxShadow: '0 3px 6px -1px rgba(59, 130, 246, 0.3)',
    cursor: 'pointer',
  },
};

const createStageIndicators = (nodes: Node[], edges: Edge[], workflow: Workflow) => {
  const stages = [
    { id: 'stage-start', label: 'START', x: 100 },
    { id: 'stage-1', label: 'Stage 1\nBA', x: 300 },
    { id: 'stage-2', label: 'Stage 2\nDev', x: 550 },
    { id: 'stage-3', label: 'Stage 3\nReviewer', x: 800 },
    { id: 'stage-end', label: 'END', x: 1050 },
  ];

  // Determine current stage for styling
  const currentStage = workflow.current_stage || '';
  let currentStageIndex = 0;
  if (currentStage === 'business_analyst') currentStageIndex = 1;
  else if (currentStage === 'developer') currentStageIndex = 2;
  else if (currentStage === 'reviewer') currentStageIndex = 3;
  else if (workflow.status === 'completed') currentStageIndex = 4;

  stages.forEach((stage, index) => {
    let stageStyle = NODE_STYLES.stage;

    // Determine stage status
    if (index === 0) {
      // START is always completed
      stageStyle = NODE_STYLES.stageCompleted;
    } else if (index === currentStageIndex) {
      // Current active stage
      stageStyle = NODE_STYLES.stageActive;
    } else if (index < currentStageIndex) {
      // Completed stages
      stageStyle = NODE_STYLES.stageCompleted;
    }

    console.log(`Creating stage node: ${stage.id} at (${stage.x}, -100) with label: ${stage.label}`);
    nodes.push({
      id: stage.id,
      type: 'default',
      position: { x: stage.x, y: -100 },
      data: { label: stage.label },
      style: stageStyle,
    });

    // Connect stages with flow arrows - REMOVED
    // if (index > 0) {
    //   edges.push({
    //     id: `stage-flow-${index}`,
    //     source: stages[index - 1].id,
    //     target: stage.id,
    //     animated: index === currentStageIndex,
    //     style: {
    //       stroke: index <= currentStageIndex ? '#10b981' : '#cbd5e1',
    //       strokeWidth: 2,
    //     },
    //     type: 'smoothstep',
    //   });
    // }
  });
};

export const generateWorkflowNodes = (workflow: Workflow, expandedStage: number | null = null): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Normalize workflow type (handle both 'analyst' and 'reviewer')
  let workflowType = workflow.workflow_type || 'business_analyst';
  if (workflowType === 'analyst') {
    workflowType = 'reviewer';
  }

  console.log('generateWorkflowNodes - workflowType:', workflowType, 'expandedStage:', expandedStage);

  const isFullPipeline = workflowType === 'complete';

  // Stage indicators removed - not needed in workflow visualization
  // console.log('Creating stage indicators');
  // createStageIndicators(nodes, edges, workflow);

  // If a specific stage is expanded, show all three stages but filter in generateFullPipelineNodes
  // If no stage is expanded and it's a complete pipeline, show all stages
  // If no stage is expanded and it's a regular workflow, show the single workflow
  if (expandedStage !== null) {
    // User clicked a stage bubble - show all stages in full pipeline mode with filtering
    console.log('Stage expanded, showing full pipeline view with stage', expandedStage);
    nodes.push({
      id: 'supervisor',
      type: 'default',
      position: { x: 600, y: 50 },
      data: { label: 'Full Pipeline Orchestrator' },
      style: NODE_STYLES.supervisor,
    });
    generateFullPipelineNodes(nodes, edges, workflow, expandedStage);
  } else if (isFullPipeline) {
    // Complete pipeline workflow - show all stages
    console.log('Complete pipeline, showing all stages');
    nodes.push({
      id: 'supervisor',
      type: 'default',
      position: { x: 600, y: 50 },
      data: { label: 'Full Pipeline Orchestrator' },
      style: NODE_STYLES.supervisor,
    });
    generateFullPipelineNodes(nodes, edges, workflow, null);
  } else {
    // Regular workflow - show only the current workflow type
    console.log('Regular workflow, showing single workflow');
    const hierarchy = AGENT_HIERARCHIES[workflowType] || AGENT_HIERARCHIES['business_analyst'];
    nodes.push({
      id: 'supervisor',
      type: 'default',
      position: { x: 600, y: 50 },
      data: { label: hierarchy.supervisor },
      style: NODE_STYLES.supervisor,
    });
    generateRegularWorkflowNodes(nodes, edges, hierarchy, workflow);
  }

  return { nodes, edges };
};

const generateFullPipelineNodes = (nodes: Node[], edges: Edge[], workflow: Workflow, expandedStage: number | null = null) => {
  console.log('generateFullPipelineNodes - expandedStage:', expandedStage);

  const supervisorColors = [
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // BA - Amber
    'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', // Developer - Purple
    'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Reviewer - Cyan
  ];

  // Determine current stage
  const currentStage = workflow.current_stage || '';

  // Use AGENT_HIERARCHIES for full pipeline details
  const fullPipelineDetails = [
    AGENT_HIERARCHIES.business_analyst,
    AGENT_HIERARCHIES.developer,
    AGENT_HIERARCHIES.reviewer,
  ];

  fullPipelineDetails.forEach((hierarchy, supIndex) => {
    // If expandedStage is set, only show that stage's details
    if (expandedStage !== null && expandedStage !== supIndex) {
      console.log(`Skipping stage ${supIndex} (${hierarchy.supervisor}), only showing ${expandedStage}`);
      return; // Skip this stage
    }
    console.log(`Showing stage ${supIndex} (${hierarchy.supervisor})`);


    const supervisorId = `supervisor-${supIndex}`;
    const supervisorX = expandedStage !== null ? 600 : 150 + supIndex * 500;

    // Check if this is the current active stage
    let isActiveStage = false;
    if (supIndex === 0 && currentStage === 'business_analyst') isActiveStage = true;
    if (supIndex === 1 && currentStage === 'developer') isActiveStage = true;
    if (supIndex === 2 && currentStage === 'reviewer') isActiveStage = true;

    nodes.push({
      id: supervisorId,
      type: 'default',
      position: { x: supervisorX, y: 250 },
      data: {
        label: hierarchy.supervisor + (isActiveStage ? '\n(In Progress)' : '')
      },
      style: {
        ...NODE_STYLES.subSupervisor,
        background: supervisorColors[supIndex],
        border: isActiveStage ? '3px solid #10b981' : '2px solid #6d28d9',
        boxShadow: isActiveStage
          ? '0 6px 16px -3px rgba(16, 185, 129, 0.5), 0 0 0 3px rgba(16, 185, 129, 0.2)'
          : '0 4px 8px -2px rgba(139, 92, 246, 0.25)',
      },
    });

    edges.push({
      id: `supervisor-${supervisorId}`,
      source: 'supervisor',
      target: supervisorId,
      animated: workflow.status === 'running' || workflow.status === 'in_progress',
      style: {
        stroke: workflow.status === 'running' || workflow.status === 'in_progress' ? '#f59e0b' : '#94a3b8',
        strokeWidth: 3
      },
      type: 'smoothstep',
    });

    // Create sequential edges between supervisors only when not expanded
    if (expandedStage === null && supIndex > 0) {
      const prevSupervisorId = `supervisor-${supIndex - 1}`;
      edges.push({
        id: `flow-${prevSupervisorId}-${supervisorId}`,
        source: prevSupervisorId,
        target: supervisorId,
        animated: workflow.status === 'running' || workflow.status === 'in_progress',
        style: {
          stroke: '#10b981',
          strokeWidth: 2,
          strokeDasharray: '5,5'
        },
        type: 'smoothstep',
        label: '→',
      });
    }

    createSubAgentNodes(nodes, edges, hierarchy.subAgents, supervisorId, supervisorX, workflow);
  });
};

const generateRegularWorkflowNodes = (nodes: Node[], edges: Edge[], hierarchy: Hierarchy, workflow: Workflow) => {
  const subAgentCount = hierarchy.subAgents.length;

  // Calculate optimal spacing based on number of agents
  const canvasWidth = 1400;
  const agentSpacing = Math.min(300, canvasWidth / subAgentCount);
  const totalWidth = (subAgentCount - 1) * agentSpacing;
  const agentStartX = (canvasWidth - totalWidth) / 2;

  hierarchy.subAgents.forEach((agent, agentIndex) => {
    const agentId = `agent-${agentIndex}`;
    const agentX = agentStartX + agentIndex * agentSpacing;

    nodes.push({
      id: agentId,
      type: 'default',
      position: { x: agentX, y: 200 },
      data: { label: agent.name },
      style: {
        ...NODE_STYLES.agent,
        background: `linear-gradient(135deg, ${getAgentColorByIndex(agentIndex, subAgentCount)})`,
      },
    });

    edges.push({
      id: `supervisor-${agentId}`,
      source: 'supervisor',
      target: agentId,
      animated: workflow.status === 'running' || workflow.status === 'in_progress',
      style: {
        stroke: workflow.status === 'running' || workflow.status === 'in_progress' ? '#f59e0b' : '#94a3b8',
        strokeWidth: 3
      },
      type: 'smoothstep',
    });

    createToolNodes(nodes, edges, agent.tools, agentId, agentX, 380, 200, workflow);
  });
};

const createSubAgentNodes = (
  nodes: Node[],
  edges: Edge[],
  subAgents: AgentWithTools[],
  supervisorId: string,
  supervisorX: number,
  workflow: Workflow
) => {
  const subAgentCount = subAgents.length;
  const subAgentSpacing = Math.min(110, 400 / subAgentCount);
  const subAgentStartX = supervisorX - ((subAgentCount - 1) * subAgentSpacing) / 2;

  subAgents.forEach((subAgent, subIndex) => {
    const subAgentId = `${supervisorId}-agent-${subIndex}`;
    const subAgentX = subAgentStartX + subIndex * subAgentSpacing;

    nodes.push({
      id: subAgentId,
      type: 'default',
      position: { x: subAgentX, y: 280 },
      data: { label: subAgent.name },
      style: {
        ...NODE_STYLES.agent,
        background: `linear-gradient(135deg, ${getAgentColorByIndex(subIndex, subAgentCount)})`,
        fontSize: '10px',
        padding: '8px 10px',
        minWidth: '100px',
      },
    });

    edges.push({
      id: `${supervisorId}-${subAgentId}`,
      source: supervisorId,
      target: subAgentId,
      animated: workflow.status === 'running' || workflow.status === 'in_progress',
      style: {
        stroke: workflow.status === 'running' || workflow.status === 'in_progress' ? '#8b5cf6' : '#cbd5e1',
        strokeWidth: 1.5
      },
      type: 'smoothstep',
    });

    createToolNodes(nodes, edges, subAgent.tools, subAgentId, subAgentX, 410, 80, workflow);
  });
};

const createToolNodes = (
  nodes: Node[],
  edges: Edge[],
  tools: string[],
  parentId: string,
  parentX: number,
  yPosition: number,
  maxSpacing: number,
  workflow: Workflow
) => {
  if (tools.length === 0) return;

  const toolCount = tools.length;
  const toolSpacing = Math.min(maxSpacing, 150 / toolCount);
  const toolStartX = parentX - ((toolCount - 1) * toolSpacing) / 2;

  tools.forEach((tool, toolIndex) => {
    const toolId = `${parentId}-tool-${toolIndex}`;
    const toolX = toolStartX + toolIndex * toolSpacing;

    nodes.push({
      id: toolId,
      type: 'default',
      position: { x: toolX, y: yPosition },
      data: { label: tool },
      style: NODE_STYLES.tool,
    });

    edges.push({
      id: `${parentId}-${toolId}`,
      source: parentId,
      target: toolId,
      animated: false,
      style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      type: 'smoothstep',
    });
  });
};

// Helper function to get gradient colors for agents based on their index
const getAgentColorByIndex = (index: number, total: number): string => {
  const colors = [
    '#3b82f6 0%, #2563eb 100%',  // Blue
    '#06b6d4 0%, #0891b2 100%',  // Cyan
    '#8b5cf6 0%, #7c3aed 100%',  // Purple
    '#ec4899 0%, #db2777 100%',  // Pink
    '#10b981 0%, #059669 100%',  // Green
    '#f59e0b 0%, #d97706 100%',  // Amber
  ];
  return colors[index % colors.length];
};

export const getWorkflowStatusBadge = (status: string): string => {
  const statusMap: Record<string, string> = {
    running: 'wfp-badge-running',
    completed: 'wfp-badge-completed',
    failed: 'wfp-badge-failed',
    pending: 'wfp-badge-pending',
  };
  return statusMap[status] || 'wfp-badge-default';
};

export const getWorkflowTypeBadgeColor = (type: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    business_analyst: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    developer: { bg: '#ddd6fe', text: '#5b21b6', border: '#c4b5fd' },
    reviewer: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    analyst: { bg: '#fce7f3', text: '#831843', border: '#f9a8d4' },
    complete: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' }
  };
  return colors[type] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
};

export const getWorkflowStatusColor = (status: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },
    in_progress: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    running: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    completed: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    failed: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    cancelled: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
  };
  return colors[status] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
};

export const formatWorkflowTypeDisplay = (type: string): string => {
  const typeMap: Record<string, string> = {
    business_analyst: 'BA',
    developer: 'Developer',
    reviewer: 'Reviewer',
    analyst: 'Analyst',
    complete: 'Complete'
  };
  return typeMap[type] || type;
};
