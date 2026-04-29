/**
 * WorkflowProgressBar Component
 *
 * Reusable progress indicator for workflow execution with smooth animations.
 */

import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  name: string;
  order: number;
}

interface WorkflowProgressBarProps {
  steps: Step[];
  currentStep: number;
  completedSteps?: number[];
  className?: string;
}

export const WorkflowProgressBar: React.FC<WorkflowProgressBarProps> = ({
  steps,
  currentStep,
  completedSteps = [],
  className
}) => {
  const getStepStatus = (index: number): 'completed' | 'current' | 'pending' => {
    if (completedSteps.includes(index) || index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Progress percentage */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">Workflow Progress</span>
          <span className="text-gray-600">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="relative">
        {/* Connection lines */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10" />

        <div className="flex justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index);

            return (
              <div
                key={step.name}
                className="flex flex-col items-center"
                style={{ width: `${100 / steps.length}%` }}
              >
                {/* Step icon */}
                <div className="relative">
                  {status === 'completed' && (
                    <CheckCircle2
                      className="w-10 h-10 text-green-600 transition-all duration-300"
                      fill="currentColor"
                    />
                  )}
                  {status === 'current' && (
                    <div className="relative">
                      <Circle className="w-10 h-10 text-blue-600" fill="currentColor" />
                      <Loader2 className="w-6 h-6 text-white absolute top-2 left-2 animate-spin" />
                    </div>
                  )}
                  {status === 'pending' && (
                    <Circle className="w-10 h-10 text-gray-300" />
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    'mt-2 text-xs text-center font-medium transition-colors duration-200',
                    status === 'completed' && 'text-green-600',
                    status === 'current' && 'text-blue-600',
                    status === 'pending' && 'text-gray-400'
                  )}
                >
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
