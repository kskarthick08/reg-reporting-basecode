/**
 * Shared Types for Workflow Execution Components
 *
 * Common interfaces and types used across all workflow overlay components
 */

export interface StepField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'file' | 'checkbox';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  default?: any;
  placeholder?: string;
  description?: string;
  multiple?: boolean;
  accept?: string;
}

export interface StepConfiguration {
  stepName: string;
  description: string;
  fields: StepField[];
}

export interface StepResult {
  result?: any;
  [key: string]: any;
}

export interface WorkflowStep {
  name: string;
  tools: string[];
  phase?: string;
  phaseColor?: string;
}

export interface FormState {
  [key: string]: any;
}

export interface WorkflowExecutionProps {
  workflow: any;
  isOpen: boolean;
  onClose: () => void;
  onWorkflowUpdate?: () => void;
}

export type StepConfigMap = Record<string, StepConfiguration>;
