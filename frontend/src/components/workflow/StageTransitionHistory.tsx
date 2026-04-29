/**
 * Stage Transition History Component
 *
 * Timeline view of all stage transitions for audit trail.
 *
 * Features:
 * - Chronological timeline of transitions
 * - Transition type badges (submit/return/approve)
 * - User who performed transition
 * - Comments and validation results
 * - Artifacts created in each stage
 */

import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  User,
  MessageSquare,
  Package,
} from 'lucide-react';
import { useWorkflowStageStore } from '@/store/workflowStageStore';
import { StageTransition, getStageDisplayName } from '@/services/workflowStageService';

// ============================================================================
// Types
// ============================================================================

interface StageTransitionHistoryProps {
  workflowId: string;
}

// ============================================================================
// Component
// ============================================================================

export const StageTransitionHistory: React.FC<StageTransitionHistoryProps> = ({ workflowId }) => {
  const { stageTransitions, isLoadingTransitions, fetchStageTransitions } =
    useWorkflowStageStore();

  useEffect(() => {
    if (workflowId) {
      fetchStageTransitions(workflowId);
    }
  }, [workflowId]);

  const getTransitionIcon = (type: string) => {
    switch (type) {
      case 'submit':
        return <ArrowRight className="w-5 h-5 text-blue-600" />;
      case 'return':
        return <ArrowLeft className="w-5 h-5 text-orange-600" />;
      case 'approve':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTransitionBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      submit: { label: 'Submitted', className: 'bg-blue-100 text-blue-800' },
      return: { label: 'Returned', className: 'bg-orange-100 text-orange-800' },
      approve: { label: 'Approved', className: 'bg-green-100 text-green-800' },
    };

    const { label, className } = config[type] || {
      label: type,
      className: 'bg-gray-100 text-gray-800',
    };

    return <Badge className={className}>{label}</Badge>;
  };

  const getValidationBadge = (passed: boolean) => {
    return passed ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Validated
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Issues Found</Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoadingTransitions) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-gray-500">Loading transition history...</div>
      </Card>
    );
  }

  if (stageTransitions.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage Transition History</h3>
        <div className="text-center py-8 text-gray-500">No stage transitions yet</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Stage Transition History</h3>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Transitions */}
        <div className="space-y-8">
          {stageTransitions.map((transition, index) => (
            <div key={transition.id} className="relative pl-14">
              {/* Timeline Node */}
              <div className="absolute left-0 top-0 w-12 h-12 rounded-full bg-white border-4 border-gray-200 flex items-center justify-center shadow-sm">
                {getTransitionIcon(transition.transition_type)}
              </div>

              {/* Transition Card */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getTransitionBadge(transition.transition_type)}
                      {getValidationBadge(transition.validation_passed)}
                    </div>
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {getStageDisplayName(transition.from_stage)}
                      </span>
                      <ArrowRight className="w-4 h-4 mx-2 text-gray-400" />
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                        {getStageDisplayName(transition.to_stage)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(transition.created_at)}</div>
                </div>

                {/* User Info */}
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <User className="w-4 h-4 mr-2" />
                  <span className="font-medium">{transition.transitioned_by.username}</span>
                  <span className="mx-2">•</span>
                  <span>{transition.transitioned_by.email}</span>
                  {transition.transitioned_by.role_name && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-blue-600">{transition.transitioned_by.role_name}</span>
                    </>
                  )}
                </div>

                {/* Comments */}
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="flex items-start">
                    <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {transition.comments}
                    </p>
                  </div>
                </div>

                {/* Validation Errors */}
                {transition.validation_errors && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-red-800 mb-2">Issues Found:</p>
                    {transition.validation_errors.issues_found && (
                      <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                        {transition.validation_errors.issues_found.map(
                          (issue: string, idx: number) => (
                            <li key={idx}>{issue}</li>
                          )
                        )}
                      </ul>
                    )}
                  </div>
                )}

                {/* Stage Artifacts */}
                {transition.stage_artifacts &&
                  Object.keys(transition.stage_artifacts).length > 0 && (
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center mb-2">
                        <Package className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-700">
                          Artifacts Created:
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(transition.stage_artifacts).map(([key, value]) => (
                          <div
                            key={key}
                            className="bg-gray-50 rounded px-2 py-1 text-center"
                          >
                            <div className="text-sm font-bold text-blue-600">{value as number}</div>
                            <div className="text-xs text-gray-600 truncate">
                              {key.replace(/_/g, ' ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default StageTransitionHistory;
