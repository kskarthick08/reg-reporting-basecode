/**
 * Stage Work Area Component
 *
 * Main work area showing stage-specific steps and actions.
 * Displays only the steps belonging to the current stage.
 *
 * Features:
 * - Stage-specific step list
 * - Step execution controls
 * - Stage progress tracking
 * - Submit/Return action buttons
 * - Stage artifacts summary
 */

import React, { useEffect, useState } from 'react';
import { Play, CheckCircle, Clock, AlertCircle, Package, Send, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWorkflowStageStore } from '@/store/workflowStageStore';
import { StageInfo, WorkflowStep, getStageDisplayName } from '@/services/workflowStageService';

// ============================================================================
// Types
// ============================================================================

interface StageWorkAreaProps {
  workflowId: string;
  stageInfo: StageInfo;
  onStepExecute?: (stepId: string) => void;
  onStageSubmit?: () => void;
  onStageReturn?: () => void;
  canSubmit?: boolean;
  canReturn?: boolean;
  isCurrentUserAssigned?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const StageWorkArea: React.FC<StageWorkAreaProps> = ({
  workflowId,
  stageInfo,
  onStepExecute,
  onStageSubmit,
  onStageReturn,
  canSubmit = false,
  canReturn = false,
  isCurrentUserAssigned = true,
}) => {
  const { stageSteps, stageArtifacts, isLoadingSteps, fetchStageSteps, fetchStageArtifacts } =
    useWorkflowStageStore();

  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  useEffect(() => {
    if (workflowId && stageInfo.current_stage) {
      fetchStageSteps(workflowId, stageInfo.current_stage);
      fetchStageArtifacts(workflowId, stageInfo.current_stage);
    }
  }, [workflowId, stageInfo.current_stage]);

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'skipped':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <Play className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      completed: { label: 'Completed', variant: 'default' },
      in_progress: { label: 'In Progress', variant: 'secondary' },
      pending: { label: 'Pending', variant: 'outline' },
      skipped: { label: 'Skipped', variant: 'outline' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentStageArtifacts = stageArtifacts[stageInfo.current_stage];

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {getStageDisplayName(stageInfo.current_stage)} Stage
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Complete all steps below to submit this stage
            </p>
          </div>
          <div className="text-right">
            <Badge
              variant={
                stageInfo.stage_status === 'completed'
                  ? 'default'
                  : stageInfo.stage_status === 'in_progress'
                  ? 'secondary'
                  : 'outline'
              }
              className="text-lg px-4 py-2"
            >
              {stageInfo.stage_status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span className="font-semibold">
              {stageInfo.stage_progress.steps_completed} / {stageInfo.stage_progress.total_steps}{' '}
              steps completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stageInfo.stage_progress.completion_percentage}%` }}
            />
          </div>
        </div>

        {/* Assignee Info */}
        {stageInfo.current_assignee && (
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <span className="font-medium mr-2">Assigned to:</span>
            <span>{stageInfo.current_assignee.username}</span>
            {!isCurrentUserAssigned && (
              <Badge variant="outline" className="ml-2">
                View Only
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Steps List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage Steps</h3>

        {isLoadingSteps ? (
          <div className="text-center py-8 text-gray-500">Loading steps...</div>
        ) : stageSteps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No steps defined for this stage</div>
        ) : (
          <div className="space-y-3">
            {stageSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  selectedStep === step.id
                    ? 'border-blue-500 bg-blue-50'
                    : step.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => setSelectedStep(step.id)}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Step Number */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                    {step.step_order}
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">{getStepStatusIcon(step.status)}</div>

                  {/* Step Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {step.step_name}
                    </h4>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                      {step.started_at && (
                        <span>Started: {formatDate(step.started_at)}</span>
                      )}
                      {step.completed_at && (
                        <span>Completed: {formatDate(step.completed_at)}</span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">{getStepStatusBadge(step.status)}</div>

                  {/* Execute Button */}
                  {isCurrentUserAssigned &&
                    step.status !== 'completed' &&
                    onStepExecute && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStepExecute(step.id);
                        }}
                        disabled={step.status === 'in_progress'}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Execute
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Stage Artifacts */}
      {currentStageArtifacts && (
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Package className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Stage Artifacts</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(currentStageArtifacts.artifacts).map(([key, value]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{value as number}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stage Actions */}
      {isCurrentUserAssigned && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage Actions</h3>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {stageInfo.can_submit ? (
                <p className="text-green-600 font-medium">
                  ✓ All steps completed. Ready to submit to next stage.
                </p>
              ) : (
                <p>Complete all steps above to enable submission.</p>
              )}
            </div>

            <div className="flex space-x-3">
              {canReturn && onStageReturn && (
                <Button variant="outline" onClick={onStageReturn}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Return for Rework
                </Button>
              )}

              {onStageSubmit && (
                <Button
                  onClick={onStageSubmit}
                  disabled={!canSubmit || !stageInfo.can_submit}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Stage
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default StageWorkArea;
