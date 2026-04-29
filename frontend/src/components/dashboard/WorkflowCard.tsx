/**
 * Workflow Card Component for Dashboard
 *
 * Compact card showing workflow summary with quick actions
 */

import React from 'react';
import { Workflow } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, User } from 'lucide-react';
import { getStageDisplayName } from '@/services/workflowStageService';

interface WorkflowCardProps {
  workflow: Workflow;
  onView: (workflow: Workflow) => void;
  showStage?: boolean;
  compact?: boolean;
}

const WorkflowCardComponent: React.FC<WorkflowCardProps> = ({
  workflow,
  onView,
  showStage = true,
  compact = false,
}) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.draft;
  };

  const getStageColor = (stage?: string) => {
    if (!stage) return 'bg-gray-100 text-gray-800';
    const colors: Record<string, string> = {
      business_analyst: 'bg-purple-100 text-purple-800',
      developer: 'bg-blue-100 text-blue-800',
      reviewer: 'bg-green-100 text-green-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = (now.getTime() - past.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return past.toLocaleDateString();
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
      onClick={() => onView(workflow)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
            {workflow.workflow_name}
          </h3>
          <p className="text-xs text-gray-500 font-mono">
            {workflow.workflow_id}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="ml-2 h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onView(workflow);
          }}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Description */}
      {!compact && workflow.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {workflow.description}
        </p>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Badge className={getStatusColor(workflow.status)}>
          {workflow.status.replace('_', ' ').toUpperCase()}
        </Badge>

        {showStage && workflow.current_stage && (
          <Badge className={getStageColor(workflow.current_stage)}>
            {getStageDisplayName(workflow.current_stage)}
          </Badge>
        )}

        <Badge variant="outline" className="text-xs">
          {workflow.workflow_type.replace('_', ' ')}
        </Badge>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          {workflow.assignee && (
            <div className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>{workflow.assignee.username}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{getTimeAgo(workflow.updated_at)}</span>
          </div>
        </div>

        {/* Stage progress */}
        {workflow.current_stage && (
          <div className="text-xs font-medium text-blue-600">
            {workflow.stage_status === 'in_progress' && '▶ In Progress'}
            {workflow.stage_status === 'completed' && '✓ Completed'}
            {workflow.stage_status === 'not_started' && '○ Not Started'}
          </div>
        )}
      </div>
    </div>
  );
};

// Memoized export with custom comparison to prevent unnecessary re-renders
export const WorkflowCard = React.memo(WorkflowCardComponent, (prevProps, nextProps) => {
  // Only re-render if workflow data or handlers actually changed
  return (
    prevProps.workflow.id === nextProps.workflow.id &&
    prevProps.workflow.workflow_name === nextProps.workflow.workflow_name &&
    prevProps.workflow.status === nextProps.workflow.status &&
    prevProps.workflow.current_stage === nextProps.workflow.current_stage &&
    prevProps.workflow.stage_status === nextProps.workflow.stage_status &&
    prevProps.workflow.updated_at === nextProps.workflow.updated_at &&
    prevProps.showStage === nextProps.showStage &&
    prevProps.compact === nextProps.compact
  );
});
