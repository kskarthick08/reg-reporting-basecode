import { createAgentRunActionsAsync } from "./actions/agentRunActionsAsync";
import { createArtifactActions } from "./actions/artifactActions";
import { createChatActions } from "./actions/chatActions";
import type { UseWorkbenchActionsArgs } from "./actions/types";
import { refreshServiceHealthState } from "./health/serviceHealth";
import { createWorkflowActions } from "./actions/workflowActions";
import { refreshGapAnalysisData } from "./actions/workflowStateHelpers";

export function useWorkbenchActions(args: UseWorkbenchActionsArgs) {
  async function refreshServiceHealth() {
    await refreshServiceHealthState(args);
  }
  const artifactActions = createArtifactActions(args);
  const workflowActions = createWorkflowActions(args, { loadArtifacts: artifactActions.loadArtifacts });
  const agentRunActions = createAgentRunActionsAsync(args, {
    loadWorkflows: workflowActions.loadWorkflows,
    loadArtifacts: artifactActions.loadArtifacts
  });
  const chatActions = createChatActions(args);

  async function handleGapRowUpdate(newRunId: number): Promise<void> {
    await workflowActions.loadWorkflows();
    await refreshGapAnalysisData(args, newRunId);
  }

  return {
    refreshServiceHealth,
    handleGapRowUpdate,
    ...artifactActions,
    ...workflowActions,
    ...agentRunActions,
    ...chatActions
  };
}

export type WorkbenchActions = ReturnType<typeof useWorkbenchActions>;
