/**
 * Analyst Workflow Overlay Component
 *
 * Handles Analyst/Reviewer workflow execution with 6 steps:
 * 1. Validation
 * 2. Anomaly Detection
 * 3. Variance Explanation
 * 4. Cross Report Reconciliation
 * 5. Audit Pack Generator
 * 6. PSD CSV Generator
 */

import React from 'react';
import { WorkflowExecutionOverlay as BaseOverlay } from '../../WorkflowExecutionOverlay';
import { Workflow } from '@/types';

interface AnalystWorkflowOverlayProps {
  workflow: Workflow;
  initialStepIndex?: number;
  onClose: () => void;
  executionMode?: 'quick' | 'full';
}

export const AnalystWorkflowOverlay: React.FC<AnalystWorkflowOverlayProps> = ({
  workflow,
  initialStepIndex = 0,
  onClose,
  executionMode = 'quick'
}) => {
  // Ensure workflow type is set correctly
  // Handle both 'analyst' and 'reviewer' types
  const analystWorkflow = {
    ...workflow,
    workflow_type: workflow.workflow_type === 'reviewer' ? 'reviewer' : 'analyst'
  };

  return (
    <BaseOverlay
      workflow={analystWorkflow}
      initialStepIndex={initialStepIndex}
      onClose={onClose}
      executionMode={executionMode}
    />
  );
};

export default AnalystWorkflowOverlay;
