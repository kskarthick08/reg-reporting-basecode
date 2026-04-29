/**
 * Workflow Execution Entry Component
 *
 * Main entry point for workflow execution that routes to the appropriate
 * workflow-specific component based on workflow type.
 *
 * This component acts as a router/dispatcher, delegating to:
 * - BAWorkflowOverlay for Business Analyst workflows
 * - DeveloperWorkflowOverlay for Developer workflows
 * - AnalystWorkflowOverlay for Analyst/Reviewer workflows
 */

import React from 'react';
import { Workflow } from '@/types';
import BAWorkflowOverlay from './ba/BAWorkflowOverlay';
import DeveloperWorkflowOverlay from './developer/DeveloperWorkflowOverlay';
import AnalystWorkflowOverlay from './analyst/AnalystWorkflowOverlay';

interface WorkflowExecutionEntryProps {
  workflow: Workflow;
  initialStepIndex?: number;
  onClose: () => void;
  executionMode?: 'quick' | 'full';
  overrideStage?: string; // Optional stage override for clicking stage bubbles
}

/**
 * Router component that delegates to workflow-specific overlays
 * For "Complete" workflows, routes based on current_stage or overrideStage
 */
export const WorkflowExecutionEntry: React.FC<WorkflowExecutionEntryProps> = ({
  workflow,
  initialStepIndex = 0,
  onClose,
  executionMode = 'quick',
  overrideStage
}) => {
  // Determine which workflow component to render based on workflow type and current stage
  const renderWorkflowComponent = () => {
    const workflowType = workflow.workflow_type?.toLowerCase();
    // Use overrideStage if provided, otherwise use workflow.current_stage
    const currentStage = overrideStage || workflow.current_stage;

    // For "Complete" multi-stage workflows, route based on current_stage
    if (workflowType === 'complete') {
      switch (currentStage) {
        case 'business_analyst':
          return (
            <BAWorkflowOverlay
              workflow={workflow}
              initialStepIndex={initialStepIndex}
              onClose={onClose}
              executionMode={executionMode}
            />
          );

        case 'developer':
          return (
            <DeveloperWorkflowOverlay
              workflow={workflow}
              initialStepIndex={initialStepIndex}
              onClose={onClose}
              executionMode={executionMode}
            />
          );

        case 'reviewer':
          return (
            <AnalystWorkflowOverlay
              workflow={workflow}
              initialStepIndex={initialStepIndex}
              onClose={onClose}
              executionMode={executionMode}
            />
          );

        default:
          // Default to BA stage if current_stage is not set
          console.warn(`Unknown current_stage: ${currentStage}, defaulting to BA`);
          return (
            <BAWorkflowOverlay
              workflow={workflow}
              initialStepIndex={initialStepIndex}
              onClose={onClose}
              executionMode={executionMode}
            />
          );
      }
    }

    // For single-stage workflows, route based on workflow_type
    switch (workflowType) {
      case 'business_analyst':
        return (
          <BAWorkflowOverlay
            workflow={workflow}
            initialStepIndex={initialStepIndex}
            onClose={onClose}
            executionMode={executionMode}
          />
        );

      case 'developer':
        return (
          <DeveloperWorkflowOverlay
            workflow={workflow}
            initialStepIndex={initialStepIndex}
            onClose={onClose}
            executionMode={executionMode}
          />
        );

      case 'analyst':
      case 'reviewer':
        return (
          <AnalystWorkflowOverlay
            workflow={workflow}
            initialStepIndex={initialStepIndex}
            onClose={onClose}
            executionMode={executionMode}
          />
        );

      default:
        console.warn(`Unknown workflow type: ${workflowType}, defaulting to BA workflow`);
        return (
          <BAWorkflowOverlay
            workflow={workflow}
            initialStepIndex={initialStepIndex}
            onClose={onClose}
            executionMode={executionMode}
          />
        );
    }
  };

  return <>{renderWorkflowComponent()}</>;
};

export default WorkflowExecutionEntry;
