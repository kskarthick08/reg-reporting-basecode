/**
 * Workflow Stage Stepper Component
 *
 * Visual indicator showing workflow progression through stages:
 * BA Stage → Developer Stage → Reviewer Stage
 *
 * Features:
 * - Visual progression indicator
 * - Stage status badges (completed/in progress/not started)
 * - Stage assignee display
 * - Click to view stage details
 */

import React from 'react';
import { CheckCircle2, Circle, Clock, User } from 'lucide-react';
import { getStageDisplayName } from '@/services/workflowStageService';

// ============================================================================
// Types
// ============================================================================

interface StageStepperProps {
  currentStage: string;
  stageStatus: string;
  completedStages: string[];
  baAssignee?: { username: string } | null;
  developerAssignee?: { username: string } | null;
  reviewerAssignee?: { username: string } | null;
  baCompletedAt?: string | null;
  developerCompletedAt?: string | null;
  reviewerCompletedAt?: string | null;
  onStageClick?: (stage: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const WorkflowStageStepper: React.FC<StageStepperProps> = ({
  currentStage,
  stageStatus,
  completedStages,
  baAssignee,
  developerAssignee,
  reviewerAssignee,
  baCompletedAt,
  developerCompletedAt,
  reviewerCompletedAt,
  onStageClick,
}) => {
  const stages = [
    {
      key: 'business_analyst',
      label: 'Business Analyst',
      assignee: baAssignee,
      completedAt: baCompletedAt,
    },
    {
      key: 'developer',
      label: 'Developer',
      assignee: developerAssignee,
      completedAt: developerCompletedAt,
    },
    {
      key: 'reviewer',
      label: 'Reviewer',
      assignee: reviewerAssignee,
      completedAt: reviewerCompletedAt,
    },
  ];

  const getStageState = (stageKey: string) => {
    if (completedStages.includes(stageKey)) {
      return 'completed';
    }
    if (stageKey === currentStage) {
      return 'in_progress';
    }
    return 'not_started';
  };

  const getStageIcon = (state: string) => {
    switch (state) {
      case 'completed':
        return <CheckCircle2 className="w-8 h-8 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-8 h-8 text-blue-600 animate-pulse" />;
      default:
        return <Circle className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStageStyle = (state: string) => {
    switch (state) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'in_progress':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ▶ In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            ○ Not Started
          </span>
        );
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Workflow Progress</h3>

      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200" style={{ zIndex: 0 }}>
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{
              width: `${(completedStages.length / stages.length) * 100}%`,
            }}
          />
        </div>

        {/* Stage Steps */}
        <div className="relative flex justify-between" style={{ zIndex: 1 }}>
          {stages.map((stage, index) => {
            const state = getStageState(stage.key);
            const isClickable = onStageClick && state !== 'not_started';

            return (
              <div
                key={stage.key}
                className={`flex flex-col items-center ${index !== stages.length - 1 ? 'flex-1' : ''}`}
              >
                {/* Stage Icon Container */}
                <div
                  className={`relative flex items-center justify-center w-16 h-16 rounded-full border-4 ${getStageStyle(
                    state
                  )} transition-all duration-300 ${
                    isClickable ? 'cursor-pointer hover:shadow-lg' : ''
                  }`}
                  onClick={() => isClickable && onStageClick && onStageClick(stage.key)}
                >
                  {getStageIcon(state)}
                </div>

                {/* Stage Card */}
                <div className="mt-4 w-48 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                  {/* Stage Name and Status */}
                  <div className="text-center mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      {stage.label}
                    </h4>
                    <div className="flex justify-center">{getStatusBadge(state)}</div>
                  </div>

                  {/* Assignee */}
                  {stage.assignee && (
                    <div className="flex items-center justify-center text-xs text-gray-600 mb-1 mt-2">
                      <User className="w-3 h-3 mr-1" />
                      <span className="truncate">{stage.assignee.username}</span>
                    </div>
                  )}

                  {/* Completion Date */}
                  {stage.completedAt && state === 'completed' && (
                    <div className="text-center text-xs text-gray-500 mt-1">
                      {formatDate(stage.completedAt)}
                    </div>
                  )}

                  {/* Current Status Message */}
                  {state === 'in_progress' && (
                    <div className="text-center text-xs text-blue-600 mt-2 font-medium">
                      {stageStatus === 'pending_submission'
                        ? 'Ready to Submit'
                        : 'In Progress'}
                    </div>
                  )}
                </div>

                {/* Connector Arrow (except for last stage) */}
                {index < stages.length - 1 && (
                  <div className="absolute left-full top-8 w-full h-1 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall Status Message */}
      <div className="mt-6 text-center">
        {completedStages.length === stages.length ? (
          <p className="text-sm font-medium text-green-600">
            ✓ All stages completed! Workflow is ready for final review.
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            Currently in <span className="font-semibold">{getStageDisplayName(currentStage)}</span>{' '}
            stage •{' '}
            <span className="font-semibold">
              {completedStages.length} of {stages.length}
            </span>{' '}
            stages completed
          </p>
        )}
      </div>
    </div>
  );
};

export default WorkflowStageStepper;
