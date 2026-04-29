/**
 * BA Workflow Overlay Component
 *
 * Handles Business Analyst workflow execution with 5 steps:
 * 1. Document Parser
 * 2. Regulatory Diff
 * 3. Dictionary Mapping
 * 4. Gap Analysis
 * 5. Assign to Developer
 */

import React from 'react';
import { WorkflowExecutionOverlay as BaseOverlay } from '../../WorkflowExecutionOverlay';
import { Workflow } from '@/types';

interface BAWorkflowOverlayProps {
  workflow: Workflow;
  initialStepIndex?: number;
  onClose: () => void;
  executionMode?: 'quick' | 'full';
}

export const BAWorkflowOverlay: React.FC<BAWorkflowOverlayProps> = ({
  workflow,
  initialStepIndex = 0,
  onClose,
  executionMode = 'quick'
}) => {
  // Ensure workflow type is set correctly
  const baWorkflow = {
    ...workflow,
    workflow_type: 'business_analyst'
  };

  return (
    <BaseOverlay
      workflow={baWorkflow}
      initialStepIndex={initialStepIndex}
      onClose={onClose}
      executionMode={executionMode}
    />
  );
};

export default BAWorkflowOverlay;
