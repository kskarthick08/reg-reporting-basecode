/**
 * useWorkflowExecution Hook
 *
 * Shared hook for workflow execution logic across all workflow types.
 * Reduces code duplication and provides consistent execution patterns.
 */

import { useState, useCallback } from 'react';
import { showToast } from '@/lib/toast';

interface ExecutionState {
  running: boolean;
  currentStep: number;
  results: Record<number, any>;
  error: string | null;
}

interface UseWorkflowExecutionOptions {
  onStepComplete?: (stepIndex: number, result: any) => void;
  onComplete?: (results: Record<number, any>) => void;
  onError?: (error: Error, stepIndex: number) => void;
}

export const useWorkflowExecution = (options: UseWorkflowExecutionOptions = {}) => {
  const [state, setState] = useState<ExecutionState>({
    running: false,
    currentStep: 0,
    results: {},
    error: null
  });

  const startExecution = useCallback((initialStep: number = 0) => {
    setState({
      running: true,
      currentStep: initialStep,
      results: {},
      error: null
    });
  }, []);

  const setStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const setStepResult = useCallback((step: number, result: any) => {
    setState(prev => {
      const newResults = { ...prev.results, [step]: result };
      options.onStepComplete?.(step, result);
      return { ...prev, results: newResults };
    });
  }, [options]);

  const completeExecution = useCallback(() => {
    setState(prev => {
      options.onComplete?.(prev.results);
      return { ...prev, running: false };
    });
  }, [options]);

  const setError = useCallback((error: string, stepIndex?: number) => {
    setState(prev => ({ ...prev, error, running: false }));
    if (stepIndex !== undefined && options.onError) {
      options.onError(new Error(error), stepIndex);
    }
  }, [options]);

  const reset = useCallback(() => {
    setState({
      running: false,
      currentStep: 0,
      results: {},
      error: null
    });
  }, []);

  return {
    ...state,
    startExecution,
    setStep,
    setStepResult,
    completeExecution,
    setError,
    reset
  };
};

/**
 * useAgentExecution Hook
 *
 * Handles individual agent execution with loading state and error handling.
 */
export const useAgentExecution = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeAgent = useCallback(async <T,>(
    agentFn: () => Promise<T>,
    options: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      successMessage?: string;
      errorMessage?: string;
    } = {}
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await agentFn();

      if (options.successMessage) {
        showToast.success(options.successMessage);
      }

      options.onSuccess?.(result);
      setLoading(false);
      return result;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Agent execution failed';
      setError(errorMsg);

      if (options.errorMessage) {
        showToast.error(options.errorMessage);
      } else {
        showToast.error(errorMsg);
      }

      options.onError?.(err);
      setLoading(false);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    executeAgent,
    setError,
    clearError: () => setError(null)
  };
};
