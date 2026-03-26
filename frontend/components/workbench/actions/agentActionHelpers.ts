/**
 * Agent Action Helpers
 * Provides workflow validation and error handling for agent operations
 */

import type { UseWorkbenchActionsArgs } from "./types";

/**
 * Validates that an agent operation is still relevant for the active workflow
 * Returns true if operation should proceed, false if workflow has changed
 */
export function validateWorkflowContext(
  args: UseWorkbenchActionsArgs,
  operationWorkflowId: number | null,
  operationName: string
): boolean {
  if (args.activeWorkflowId !== operationWorkflowId) {
    console.warn(
      `[AgentAction] Ignoring ${operationName} result - workflow changed from ${operationWorkflowId} to ${args.activeWorkflowId}`
    );
    return false;
  }
  return true;
}

export function ensureWorkflowEditable(args: UseWorkbenchActionsArgs, actionLabel: string): boolean {
  if (args.currentWorkflow && args.currentWorkflow.pending_for_me === false) {
    const message = `${actionLabel} is locked because this workflow has moved to another stage.`;
    args.setMessage(message);
    args.addToast("error", message);
    args.pushAudit("warn", `${actionLabel} blocked for read-only workflow.`);
    return false;
  }
  return true;
}

/**
 * Clears agent output state at the start of an operation
 */
export function clearAgentOutputState(
  args: UseWorkbenchActionsArgs,
  agentType: "BA" | "DEV" | "REVIEWER"
): void {
  switch (agentType) {
    case "BA":
      args.setGapRunId(null);
      args.setGapRows([]);
      args.setGapDiagnostics(null);
      break;
    case "DEV":
      args.setSqlRunId(null);
      args.setSqlScript("");
      break;
    case "REVIEWER":
      args.setXmlRunId(null);
      args.setXmlValidation(null);
      break;
  }
}

/**
 * Handles error messages with workflow context validation
 */
export function handleAgentError(
  args: UseWorkbenchActionsArgs,
  operationWorkflowId: number | null,
  errorMessage: string,
  toastMessage: string,
  auditMessage: string
): void {
  // Only show error if still on same workflow
  if (validateWorkflowContext(args, operationWorkflowId, "error handler")) {
    args.setMessage(errorMessage);
    args.addToast("error", toastMessage);
    args.pushAudit("warn", auditMessage);
  }
}
