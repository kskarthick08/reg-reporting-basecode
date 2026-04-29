/**
 * Shared Utilities for Workflow Execution
 *
 * Common helper functions used across all workflow overlay components
 */

import { FormState } from './workflowTypes';

/**
 * Convert datetime objects to JSON-serializable format
 */
export const convertDatetimeToJson = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertDatetimeToJson);
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertDatetimeToJson(value);
    }
    return converted;
  }

  return obj;
};

/**
 * Get API base URL from environment
 */
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
};

/**
 * Get authorization headers for API requests
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Export result data as JSON file
 */
export const exportResultAsJson = (result: any, filename: string): void => {
  const dataStr = JSON.stringify(result, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export result data as markdown file
 */
export const exportResultAsMarkdown = (result: any, filename: string): void => {
  let markdown = '';

  if (result.result?.report_content) {
    markdown = result.result.report_content;
  } else if (typeof result === 'string') {
    markdown = result;
  } else {
    // Convert JSON to markdown format
    markdown = `# Workflow Result\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
  }

  const dataBlob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Validate required fields in form state
 */
export const validateRequiredFields = (
  formState: FormState,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } => {
  const missingFields = requiredFields.filter(field => !formState[field]);
  return {
    valid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Load previous step results from workflow history
 */
export const loadStepResultsFromHistory = (workflow: any): Record<number, any> => {
  const stepResults: Record<number, any> = {};

  if (workflow.history && Array.isArray(workflow.history)) {
    workflow.history.forEach((historyItem: any) => {
      if (historyItem.details?.step_name && historyItem.details?.result) {
        const stepIndex = historyItem.details.step_index;
        if (stepIndex !== undefined) {
          stepResults[stepIndex] = historyItem.details.result;
        }
      }
    });
  }

  return stepResults;
};

/**
 * Get workflow type display name
 */
export const getWorkflowTypeDisplay = (workflowType: string): string => {
  const typeMap: Record<string, string> = {
    'business_analyst': 'Business Analyst',
    'developer': 'Developer',
    'reviewer': 'Reviewer',
    'analyst': 'Analyst',
    'complete': 'Complete Pipeline'
  };
  return typeMap[workflowType] || 'Workflow';
};

/**
 * Format workflow type for API endpoints
 */
export const formatWorkflowTypeForApi = (workflowType: string): string => {
  const typeMap: Record<string, string> = {
    'business_analyst': 'ba',
    'developer': 'developer',
    'reviewer': 'reviewer',
    'analyst': 'analyst'
  };
  return typeMap[workflowType] || 'analyst';
};
