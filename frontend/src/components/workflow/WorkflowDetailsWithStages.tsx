/**
 * Enhanced Workflow Details Component with Multi-Stage Support
 *
 * Integrated view showing:
 * - Stage progression stepper
 * - Stage-specific work area
 * - Stage transition history
 * - Submit/Return dialogs
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Info } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

// Import stage components
import WorkflowStageStepper from './WorkflowStageStepper';
import StageWorkArea from './StageWorkArea';
import StageSubmitDialog from './StageSubmitDialog';

// Import services and store
import { useWorkflowStageStore } from '@/store/workflowStageStore';
import { getCompletedStages, StageEnum } from '@/services/workflowStageService';
import { workflowService } from '@/services/workflowService';
import { AGENT_HIERARCHIES } from '@/utils/workflowHelpers';

// Types
interface Workflow {
  id: string;
  workflow_id: string;
  workflow_name: string;
  workflow_type: string;
  status: string;
  description?: string;
  current_stage?: string;
  stage_status?: string;
  ba_assignee?: { id: string; username: string; email: string } | null;
  developer_assignee?: { id: string; username: string; email: string } | null;
  reviewer_assignee?: { id: string; username: string; email: string } | null;
  ba_stage_completed_at?: string | null;
  developer_stage_completed_at?: string | null;
  reviewer_stage_completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkflowDetailsWithStagesProps {
  workflow: Workflow;
  currentUserId?: string;
  onExecuteStep?: (stepId: string) => void;
  onRefresh?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const WorkflowDetailsWithStages: React.FC<WorkflowDetailsWithStagesProps> = ({
  workflow,
  currentUserId,
  onExecuteStep,
  onRefresh,
}) => {
  const {
    currentStage,
    validationResults,
    isLoadingStage,
    isSubmitting,
    isReturning,
    fetchCurrentStage,
    validateCurrentStage,
    submitCurrentStage,
    returnToPreviousStage,
    clearStageData,
  } = useWorkflowStageStore();

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // Check if workflow has stage support
  const hasStageSupport = workflow.current_stage !== undefined;

  // Check if current user is assigned to current stage
  const isCurrentUserAssigned = currentUserId && currentStage?.current_assignee?.id === currentUserId;

  useEffect(() => {
    if (hasStageSupport && workflow.id) {
      fetchCurrentStage(workflow.id);
    }

    return () => {
      clearStageData();
    };
  }, [workflow.id, hasStageSupport]);

  const handleStageSubmit = async () => {
    if (!currentStage) return;

    // Validate before opening dialog
    try {
      const validation = await validateCurrentStage(workflow.id, currentStage.current_stage);

      if (!validation.is_valid) {
        // Show validation errors
        return;
      }

      // Fetch available users for next stage
      // TODO: Fetch users by role for next stage
      setAvailableUsers([
        // Mock data - replace with actual API call
        { id: '1', username: 'developer1', email: 'dev1@example.com', role_name: 'Developer' },
        { id: '2', username: 'developer2', email: 'dev2@example.com', role_name: 'Developer' },
      ]);

      setSubmitDialogOpen(true);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleSubmitConfirm = async (userId: string, comments: string) => {
    try {
      await submitCurrentStage(workflow.id, {
        to_user_id: userId,
        comments,
      });

      setSubmitDialogOpen(false);

      // Refresh workflow data
      if (onRefresh) {
        onRefresh();
      }

      // Show success message
      alert('Stage submitted successfully!');
    } catch (error: any) {
      console.error('Submit failed:', error);
      alert(error.response?.data?.detail || 'Failed to submit stage');
    }
  };

  const handleStageReturn = async () => {
    // TODO: Implement return dialog
    setReturnDialogOpen(true);
  };

  const handlePauseWorkflow = async () => {
    setIsPausing(true);
    try {
      if (workflow.current_stage === 'business_analyst') {
        await workflowService.pauseBAWorkflow(workflow.id);
      } else if (workflow.current_stage === 'developer') {
        await workflowService.pauseDeveloperWorkflow(workflow.id);
      } else if (workflow.current_stage === 'reviewer') {
        await workflowService.pauseReviewerWorkflow(workflow.id);
      }

      alert('Workflow paused successfully!');
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Pause failed:', error);
      alert(error.response?.data?.detail || 'Failed to pause workflow');
    } finally {
      setIsPausing(false);
    }
  };

  const handleResumeWorkflow = async () => {
    setIsResuming(true);
    try {
      if (workflow.current_stage === 'business_analyst') {
        await workflowService.resumeBAWorkflow(workflow.id);
      } else if (workflow.current_stage === 'developer') {
        await workflowService.resumeDeveloperWorkflow(workflow.id);
      } else if (workflow.current_stage === 'reviewer') {
        await workflowService.resumeReviewerWorkflow(workflow.id);
      }

      alert('Workflow resumed successfully!');
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Resume failed:', error);
      alert(error.response?.data?.detail || 'Failed to resume workflow');
    } finally {
      setIsResuming(false);
    }
  };

  const completedStages = hasStageSupport ? getCompletedStages(workflow) : [];

  if (!hasStageSupport) {
    // Legacy workflow without stage support - show simplified view
    return (
      <div className="p-6 space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              This workflow was created before multi-stage support. It will function normally but
              without stage-specific features.
            </p>
          </div>
        </Alert>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Workflow Information</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Name:</span>
              <p className="font-medium">{workflow.workflow_name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Type:</span>
              <p className="font-medium capitalize">{workflow.workflow_type.replace('_', ' ')}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Status:</span>
              <Badge>{workflow.status}</Badge>
            </div>
            <div>
              <span className="text-sm text-gray-600">Description:</span>
              <p className="text-sm">{workflow.description || 'No description provided'}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoadingStage) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow stage information...</p>
        </div>
      </div>
    );
  }

  if (!currentStage) {
    return (
      <div className="p-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="ml-3">
            <p className="text-sm text-red-800">
              Failed to load stage information. Please refresh the page.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0' }}>
      {/* Top Section: Workflow Details */}
      <div className="wfp-details-info-section">
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>Name</p>
          <p style={{ fontSize: '1rem', fontWeight: '500' }}>{workflow.workflow_name}</p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{workflow.workflow_id}</p>
        </div>

        {/* Pause/Resume Controls */}
        {(workflow.current_stage === 'business_analyst' || workflow.current_stage === 'developer' || workflow.current_stage === 'reviewer') && isCurrentUserAssigned && (
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            {workflow.stage_status !== 'paused' ? (
              <Button
                onClick={handlePauseWorkflow}
                disabled={isPausing || workflow.status === 'completed'}
                variant="outline"
                size="sm"
                style={{ fontSize: '0.75rem' }}
              >
                {isPausing ? 'Pausing...' : 'Pause Workflow'}
              </Button>
            ) : (
              <Button
                onClick={handleResumeWorkflow}
                disabled={isResuming}
                variant="default"
                size="sm"
                style={{ fontSize: '0.75rem' }}
              >
                {isResuming ? 'Resuming...' : 'Resume Workflow'}
              </Button>
            )}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>Type</p>
          <p style={{ fontSize: '1rem', fontWeight: '500', textTransform: 'capitalize' }}>{workflow.workflow_type?.replace('_', ' ')}</p>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>Status</p>
          <Badge
            variant={workflow.status === 'completed' ? 'default' : 'secondary'}
            className="text-sm"
          >
            {workflow.status.toUpperCase()}
          </Badge>
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>Description</p>
          <p style={{ fontSize: '0.875rem' }}>{workflow.description || 'No description provided'}</p>
        </div>
      </div>

      {/* Agents & Tools Used Section - Only Current Stage */}
      <div className="wfp-details-steps-section">
        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem' }}>
          Agents & Tools Used
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {workflow.current_stage === 'business_analyst' && (
            <>
              {AGENT_HIERARCHIES.business_analyst.subAgents.map((agent, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.625rem 0.75rem',
                    background: '#fef3c7',
                    borderRadius: '0.375rem',
                    border: '1px solid #fcd34d'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }}></div>
                      <p style={{ fontSize: '0.75rem', color: '#78350f', margin: 0, fontWeight: '600' }}>{agent.name}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: '#92400e', marginLeft: '1rem', margin: 0, fontStyle: 'italic' }}>
                    {agent.tools.join(' • ')}
                  </p>
                </div>
              ))}
            </>
          )}

          {workflow.current_stage === 'developer' && (
            <>
              {AGENT_HIERARCHIES.developer.subAgents.map((agent, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.625rem 0.75rem',
                    background: '#ddd6fe',
                    borderRadius: '0.375rem',
                    border: '1px solid #c4b5fd'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed' }}></div>
                      <p style={{ fontSize: '0.75rem', color: '#5b21b6', margin: 0, fontWeight: '600' }}>{agent.name}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: '#6d28d9', marginLeft: '1rem', margin: 0, fontStyle: 'italic' }}>
                    {agent.tools.join(' • ')}
                  </p>
                </div>
              ))}
            </>
          )}

          {workflow.current_stage === 'reviewer' && (
            <>
              {AGENT_HIERARCHIES.reviewer.subAgents.map((agent, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.625rem 0.75rem',
                    background: '#dbeafe',
                    borderRadius: '0.375rem',
                    border: '1px solid #93c5fd'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1e40af' }}></div>
                      <p style={{ fontSize: '0.75rem', color: '#1e3a8a', margin: 0, fontWeight: '600' }}>{agent.name}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: '#1e40af', marginLeft: '1rem', margin: 0, fontStyle: 'italic' }}>
                    {agent.tools.join(' • ')}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Submit Dialog */}
      {submitDialogOpen && currentStage && (
        <StageSubmitDialog
          isOpen={submitDialogOpen}
          workflowId={workflow.id}
          stageInfo={currentStage}
          validationResults={validationResults}
          availableUsers={availableUsers}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmitConfirm}
          onClose={() => setSubmitDialogOpen(false)}
        />
      )}
    </div>
  );
};

export default WorkflowDetailsWithStages;
