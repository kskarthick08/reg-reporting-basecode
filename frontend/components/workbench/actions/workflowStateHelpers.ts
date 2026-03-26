/**
 * Workflow State Management Helpers
 * Handles clearing and loading workflow-specific state to prevent data leakage between workflows
 */

import type { UseWorkbenchActionsArgs } from "./types";
import { API_BASE, extractGapDiagnostics, extractGapRows, parseJson } from "../utils";

/**
 * Clears ALL agent output state to prevent data contamination when switching workflows
 * CRITICAL: Must be called BEFORE loading new workflow data
 */
export function clearAllAgentState(args: UseWorkbenchActionsArgs): void {
  // Clear BA (Business Analyst) state
  args.setGapRunId(null);
  args.setGapRows([]);
  args.setGapDiagnostics(null);
  args.setFcaArtifactId("");
  args.setModelArtifactId("");
  args.setDataArtifactId("");

  // Clear Developer state
  args.setSqlRunId(null);
  args.setSqlScript("");

  // Clear Reviewer state
  args.setXmlRunId(null);
  args.setXmlValidation(null);
  args.setReportXmlArtifactId("");
  args.setReportXmlPreview("");
  args.setXsdArtifactId("");
  args.setReportXmlLinked(false);

  // Clear UI state
  args.setSendBackReasonCode("");
  args.setSendBackReasonDetail("");
  args.setRemediationStatuses(["Missing", "Partial Match"]);
  args.setRemediationArtifactIds([]);
  args.setRemediationUserContext("");
}

/**
 * Loads BA gap analysis data for a workflow with race condition protection
 */
export async function loadWorkflowGapData(
  args: UseWorkbenchActionsArgs,
  workflowId: number,
  gapRunId: number
): Promise<void> {
  try {
    const runRes = await fetch(
      `${API_BASE}/v1/gap-analysis/${gapRunId}?workflow_id=${encodeURIComponent(String(workflowId))}&project_id=${encodeURIComponent(args.projectId)}`
    );
    const runJson = await parseJson(runRes);

    // Race condition check: Only reject if user switched to a DIFFERENT workflow (not null during initial load)
    if (args.activeWorkflowId !== null && args.activeWorkflowId !== workflowId) {
      console.warn(`[WorkflowState] Ignoring gap data for workflow ${workflowId} - user switched to ${args.activeWorkflowId}`);
      return;
    }

    if (runRes.ok) {
      const runWorkflowId = Number(runJson?.input_json?.workflow_id || 0);
      if (runWorkflowId > 0 && runWorkflowId !== workflowId) {
        console.warn(`[WorkflowState] Rejected gap data for workflow ${workflowId} - run belongs to ${runWorkflowId}`);
        return;
      }
      args.setGapRows(extractGapRows(runJson));
      args.setGapDiagnostics(extractGapDiagnostics(runJson));

      const input = runJson?.input_json || {};
      const fcaId = Number(input?.fca_artifact_id || 0);
      const dmId = Number(input?.data_model_artifact_id || 0);

      if (fcaId > 0) args.setFcaArtifactId(fcaId);
      if (dmId > 0) args.setModelArtifactId(dmId);
    }
  } catch (error) {
    // Data already cleared by clearAllAgentState, no action needed
    console.error(`[WorkflowState] Failed to load gap data for workflow ${workflowId}:`, error);
  }
}

/**
 * Loads XML validation data for a workflow with race condition protection
 */
export async function loadWorkflowXmlValidation(
  args: UseWorkbenchActionsArgs,
  workflowId: number,
  xmlRunId: number
): Promise<void> {
  try {
    const validationRes = await fetch(`${API_BASE}/v1/xml/validation/${xmlRunId}`);
    const validationJson = await parseJson(validationRes);

    // Race condition check: Only reject if user switched to a DIFFERENT workflow (not null during initial load)
    if (args.activeWorkflowId !== null && args.activeWorkflowId !== workflowId) {
      console.warn(`[WorkflowState] Ignoring XML validation for workflow ${workflowId} - user switched to ${args.activeWorkflowId}`);
      return;
    }

    if (validationRes.ok) {
      const xsdPass = Boolean(validationJson?.xsd_validation?.pass);
      const rulePass = Boolean(validationJson?.rule_checks?.passed);
      const gatePassed =
        validationJson?.gate_status?.passed ??
        validationJson?.gate_status?.pass ??
        (validationJson?.display?.status === "PASS" ? true : undefined);

      if (validationJson?.report_xml_artifact_id) {
        args.setReportXmlArtifactId(Number(validationJson.report_xml_artifact_id));
      }
      if (validationJson?.xsd_artifact_id) {
        args.setXsdArtifactId(Number(validationJson.xsd_artifact_id));
      }
      if (validationJson?.fca_artifact_id) {
        args.setFcaArtifactId(Number(validationJson.fca_artifact_id));
      }
      if (validationJson?.data_model_artifact_id) {
        args.setModelArtifactId(Number(validationJson.data_model_artifact_id));
      }

      args.setXmlValidation({
        run_id: xmlRunId,
        pass: typeof gatePassed === "boolean" ? gatePassed : xsdPass && rulePass,
        errors: Array.isArray(validationJson?.xsd_validation?.errors) ? validationJson.xsd_validation.errors : [],
        error_details: Array.isArray(validationJson?.xsd_validation?.error_details) ? validationJson.xsd_validation.error_details : [],
        display: validationJson?.display || undefined,
        gate_status: validationJson?.gate_status || undefined,
        ai_review: validationJson?.ai_review || {},
        rule_checks: validationJson?.rule_checks || {},
        analysis_meta: validationJson?.analysis_meta || undefined
      });
    }
  } catch (error) {
    // Data already cleared by clearAllAgentState, no action needed
    console.error(`[WorkflowState] Failed to load XML validation for workflow ${workflowId}:`, error);
  }
}

/**
 * Sets the appropriate persona tab when opening a workflow
 */
export function setPersonaTab(args: UseWorkbenchActionsArgs): void {
  if (!args.persona) return;

  const tab = args.persona === "BA" ? "ba" : args.persona === "DEV" ? "dev" : "rev";
  args.setActiveAgentTab(tab);
}

/**
 * Refreshes gap analysis data after a manual edit
 */
export async function refreshGapAnalysisData(
  args: UseWorkbenchActionsArgs,
  newRunId: number
): Promise<void> {
  if (!args.activeWorkflowId) return;

  try {
    // Fetch updated gap data
    const runRes = await fetch(
      `${API_BASE}/v1/gap-analysis/${newRunId}?workflow_id=${encodeURIComponent(String(args.activeWorkflowId))}&project_id=${encodeURIComponent(args.projectId)}`
    );
    const runJson = await parseJson(runRes);

    if (runRes.ok) {
      const runWorkflowId = Number(runJson?.input_json?.workflow_id || 0);
      if (runWorkflowId > 0 && runWorkflowId !== args.activeWorkflowId) {
        console.warn(`[WorkflowState] Rejected refreshed gap data for workflow ${args.activeWorkflowId} - run belongs to ${runWorkflowId}`);
        return;
      }
      args.setGapRunId(newRunId);
      args.setGapRows(extractGapRows(runJson));
      args.setGapDiagnostics(extractGapDiagnostics(runJson));
      args.pushAudit("success", `Gap analysis updated - Run #${newRunId}`);

      // Update workflow record with new gap run ID to persist across page refreshes
      try {
        console.log(`[WorkflowState] Updating workflow ${args.activeWorkflowId} with gap_run_id=${newRunId}`);
        const updateRes = await fetch(`${API_BASE}/v1/workflow/${args.activeWorkflowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gap_run_id: newRunId })
        });
        
        if (updateRes.ok) {
          const updateData = await updateRes.json();
          console.log(`[WorkflowState] Successfully updated workflow:`, updateData);
        } else {
          const errorText = await updateRes.text();
          console.error(`[WorkflowState] Failed to update workflow (${updateRes.status}):`, errorText);
        }
      } catch (workflowUpdateError) {
        console.error(`[WorkflowState] Exception updating workflow with new gap_run_id:`, workflowUpdateError);
        // Non-critical error - data is still displayed correctly
      }
    }
  } catch (error) {
    console.error(`[WorkflowState] Failed to refresh gap data for run ${newRunId}:`, error);
    args.addToast("error", "Failed to refresh gap analysis data");
  }
}
