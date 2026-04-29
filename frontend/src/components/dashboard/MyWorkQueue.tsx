/**
 * My Work Queue Component
 *
 * Shows user's assigned workflows organized by priority
 */

import React from 'react';
import { Workflow } from '@/types';
import { Card } from '@/components/ui/card';
import { WorkflowCard } from './WorkflowCard';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MyWorkQueueProps {
  workflows: Workflow[];
  highPriority: Workflow[];
  isLoading: boolean;
}

export const MyWorkQueue: React.FC<MyWorkQueueProps> = ({
  workflows,
  highPriority,
  isLoading,
}) => {
  const navigate = useNavigate();

  const handleViewWorkflow = (workflow: Workflow) => {
    navigate(`/workflows?id=${workflow.id}`);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  // Categorize workflows
  const awaitingAction = workflows.filter(
    (w) => w.current_stage && w.stage_status === 'in_progress'
  );

  const inProgress = workflows.filter(
    (w) => w.status === 'in_progress' && w.stage_status !== 'in_progress'
  );

  const completed = workflows.filter((w) => w.status === 'completed');

  return (
    <div className="space-y-6">
      {/* High Priority Section */}
      {highPriority.length > 0 && (
        <Card className="p-6 border-l-4 border-l-red-500">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              High Priority ({highPriority.length})
            </h2>
          </div>

          <div className="space-y-3">
            {highPriority.slice(0, 5).map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onView={handleViewWorkflow}
              />
            ))}
          </div>

          {highPriority.length > 5 && (
            <button
              onClick={() => navigate('/workflows')}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View {highPriority.length - 5} more →
            </button>
          )}
        </Card>
      )}

      {/* Awaiting Action Section */}
      {awaitingAction.length > 0 && (
        <Card className="p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Awaiting Your Action ({awaitingAction.length})
            </h2>
          </div>

          <div className="space-y-3">
            {awaitingAction.slice(0, 5).map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onView={handleViewWorkflow}
              />
            ))}
          </div>

          {awaitingAction.length > 5 && (
            <button
              onClick={() => navigate('/workflows')}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View {awaitingAction.length - 5} more →
            </button>
          )}
        </Card>
      )}

      {/* In Progress Section */}
      {inProgress.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              In Progress ({inProgress.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inProgress.slice(0, 6).map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onView={handleViewWorkflow}
                compact
              />
            ))}
          </div>

          {inProgress.length > 6 && (
            <button
              onClick={() => navigate('/workflows')}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View {inProgress.length - 6} more →
            </button>
          )}
        </Card>
      )}

      {/* Recently Completed Section */}
      {completed.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Recently Completed ({completed.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {completed.slice(0, 3).map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onView={handleViewWorkflow}
                compact
              />
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {workflows.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <div className="mb-4">
              <CheckCircle className="h-16 w-16 text-gray-300 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No workflows assigned
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              You don't have any workflows assigned to you at the moment.
            </p>
            <button
              onClick={() => navigate('/workflows')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse All Workflows
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};
