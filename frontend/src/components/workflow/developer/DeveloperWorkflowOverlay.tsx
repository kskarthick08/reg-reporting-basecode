/**
 * Developer Workflow Overlay Component
 *
 * Handles Developer workflow execution with 5 steps:
 * 1. Schema Analyzer
 * 2. SQL Generator
 * 3. Python ETL Generator
 * 4. Deterministic Mapping (XSD/XML)
 * 5. Test Integration
 */

import React from 'react';
import { WorkflowExecutionOverlay as BaseOverlay } from '../../WorkflowExecutionOverlay';
import { Workflow } from '@/types';

interface DeveloperWorkflowOverlayProps {
  workflow: Workflow;
  initialStepIndex?: number;
  onClose: () => void;
  executionMode?: 'quick' | 'full';
}

export const DeveloperWorkflowOverlay: React.FC<DeveloperWorkflowOverlayProps> = ({
  workflow,
  initialStepIndex = 0,
  onClose,
  executionMode = 'quick'
}) => {
  // Ensure workflow type is set correctly
  const developerWorkflow = {
    ...workflow,
    workflow_type: 'developer'
  };

  return (
    <BaseOverlay
      workflow={developerWorkflow}
      initialStepIndex={initialStepIndex}
      onClose={onClose}
      executionMode={executionMode}
    />
  );
};

export default DeveloperWorkflowOverlay;
