/**
 * Workflow Stage Store (Zustand)
 *
 * State management for workflow stage operations:
 * - Current stage information
 * - Stage transitions history
 * - Stage artifacts
 * - Stage validation results
 */

import { create } from 'zustand';
import {
  getCurrentStage,
  getStageSteps,
  getStageArtifacts,
  submitStage,
  returnStage,
  validateStage,
  getStageTransitions,
  StageInfo,
  StageTransition,
  StageArtifacts,
  WorkflowStep,
  ValidationResult,
  StageSubmitRequest,
  StageReturnRequest,
  StageSubmitResponse,
  StageReturnResponse,
} from '../services/workflowStageService';

// ============================================================================
// Store State Interface
// ============================================================================

interface WorkflowStageState {
  // Current state
  currentStage: StageInfo | null;
  stageSteps: WorkflowStep[];
  stageTransitions: StageTransition[];
  stageArtifacts: Record<string, StageArtifacts>;
  validationResults: ValidationResult | null;

  // Loading states
  isLoadingStage: boolean;
  isLoadingSteps: boolean;
  isLoadingTransitions: boolean;
  isLoadingArtifacts: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  isReturning: boolean;

  // Error states
  error: string | null;

  // Actions
  fetchCurrentStage: (workflowId: string) => Promise<void>;
  fetchStageSteps: (workflowId: string, stage: string) => Promise<void>;
  fetchStageTransitions: (workflowId: string) => Promise<void>;
  fetchStageArtifacts: (workflowId: string, stage: string) => Promise<void>;
  validateCurrentStage: (workflowId: string, stage: string) => Promise<ValidationResult>;
  submitCurrentStage: (
    workflowId: string,
    request: StageSubmitRequest
  ) => Promise<StageSubmitResponse>;
  returnToPreviousStage: (
    workflowId: string,
    request: StageReturnRequest
  ) => Promise<StageReturnResponse>;
  clearStageData: () => void;
  setError: (error: string | null) => void;
}

// ============================================================================
// Zustand Store
// ============================================================================

export const useWorkflowStageStore = create<WorkflowStageState>((set, get) => ({
  // Initial state
  currentStage: null,
  stageSteps: [],
  stageTransitions: [],
  stageArtifacts: {},
  validationResults: null,

  isLoadingStage: false,
  isLoadingSteps: false,
  isLoadingTransitions: false,
  isLoadingArtifacts: false,
  isValidating: false,
  isSubmitting: false,
  isReturning: false,

  error: null,

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Fetch current stage information
   */
  fetchCurrentStage: async (workflowId: string) => {
    set({ isLoadingStage: true, error: null });
    try {
      const stageInfo = await getCurrentStage(workflowId);
      set({ currentStage: stageInfo, isLoadingStage: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Failed to fetch current stage';
      set({ error: errorMessage, isLoadingStage: false });
      throw error;
    }
  },

  /**
   * Fetch steps for a specific stage
   */
  fetchStageSteps: async (workflowId: string, stage: string) => {
    set({ isLoadingSteps: true, error: null });
    try {
      const steps = await getStageSteps(workflowId, stage);
      set({ stageSteps: steps, isLoadingSteps: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Failed to fetch stage steps';
      set({ error: errorMessage, isLoadingSteps: false });
      throw error;
    }
  },

  /**
   * Fetch stage transition history
   */
  fetchStageTransitions: async (workflowId: string) => {
    set({ isLoadingTransitions: true, error: null });
    try {
      const transitions = await getStageTransitions(workflowId);
      set({ stageTransitions: transitions, isLoadingTransitions: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Failed to fetch stage transitions';
      set({ error: errorMessage, isLoadingTransitions: false });
      throw error;
    }
  },

  /**
   * Fetch artifacts for a specific stage
   */
  fetchStageArtifacts: async (workflowId: string, stage: string) => {
    set({ isLoadingArtifacts: true, error: null });
    try {
      const artifacts = await getStageArtifacts(workflowId, stage);
      set((state) => ({
        stageArtifacts: {
          ...state.stageArtifacts,
          [stage]: artifacts,
        },
        isLoadingArtifacts: false,
      }));
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Failed to fetch stage artifacts';
      set({ error: errorMessage, isLoadingArtifacts: false });
      throw error;
    }
  },

  /**
   * Validate current stage completion
   */
  validateCurrentStage: async (workflowId: string, stage: string) => {
    set({ isValidating: true, error: null });
    try {
      const validationResult = await validateStage(workflowId, stage);
      set({ validationResults: validationResult, isValidating: false });
      return validationResult;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Failed to validate stage';
      set({ error: errorMessage, isValidating: false });
      throw error;
    }
  },

  /**
   * Submit current stage to next persona
   */
  submitCurrentStage: async (workflowId: string, request: StageSubmitRequest) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await submitStage(workflowId, request);

      // Refresh stage information after submission
      await get().fetchCurrentStage(workflowId);
      await get().fetchStageTransitions(workflowId);

      set({ isSubmitting: false });
      return response;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Failed to submit stage';
      set({ error: errorMessage, isSubmitting: false });
      throw error;
    }
  },

  /**
   * Return workflow to previous stage for rework
   */
  returnToPreviousStage: async (workflowId: string, request: StageReturnRequest) => {
    set({ isReturning: true, error: null });
    try {
      const response = await returnStage(workflowId, request);

      // Refresh stage information after return
      await get().fetchCurrentStage(workflowId);
      await get().fetchStageTransitions(workflowId);

      set({ isReturning: false });
      return response;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || error.message || 'Failed to return stage';
      set({ error: errorMessage, isReturning: false });
      throw error;
    }
  },

  /**
   * Clear all stage data
   */
  clearStageData: () => {
    set({
      currentStage: null,
      stageSteps: [],
      stageTransitions: [],
      stageArtifacts: {},
      validationResults: null,
      error: null,
    });
  },

  /**
   * Set error message
   */
  setError: (error: string | null) => {
    set({ error });
  },
}));

// Optimized selectors to prevent unnecessary re-renders
export const selectCurrentStage = (state: WorkflowStageState) => state.currentStage;
export const selectStageSteps = (state: WorkflowStageState) => state.stageSteps;
export const selectStageTransitions = (state: WorkflowStageState) => state.stageTransitions;
export const selectStageArtifacts = (state: WorkflowStageState) => state.stageArtifacts;
export const selectValidationResults = (state: WorkflowStageState) => state.validationResults;
export const selectIsLoadingStage = (state: WorkflowStageState) => state.isLoadingStage;
export const selectIsValidating = (state: WorkflowStageState) => state.isValidating;
export const selectIsSubmitting = (state: WorkflowStageState) => state.isSubmitting;
export const selectError = (state: WorkflowStageState) => state.error;

// Composed selectors
export const selectIsAnyLoading = (state: WorkflowStageState) =>
  state.isLoadingStage ||
  state.isLoadingSteps ||
  state.isLoadingTransitions ||
  state.isLoadingArtifacts ||
  state.isValidating ||
  state.isSubmitting ||
  state.isReturning;

export const selectCurrentStageName = (state: WorkflowStageState) => state.currentStage?.stage;
export const selectCurrentStageStatus = (state: WorkflowStageState) => state.currentStage?.status;

export default useWorkflowStageStore;
