import type { WorkflowItem, WorkflowVersionCreateInput } from "../types";
import { API_BASE, extractApiError, parseJson } from "../utils";
import { PERSONA_ACTOR } from "../workbenchConstants";
import type { UseWorkbenchActionsArgs } from "./types";
import { clearAllAgentState, loadWorkflowGapData, loadWorkflowXmlValidation, setPersonaTab } from "./workflowStateHelpers";

type WorkflowActionDeps = {
  loadArtifacts: (showToast?: boolean) => Promise<void>;
};

export function createWorkflowActions(args: UseWorkbenchActionsArgs, deps: WorkflowActionDeps) {
  async function enrichWorkflow(workflow: WorkflowItem): Promise<WorkflowItem> {
    try {
      const qRes = await fetch(
        `${API_BASE}/v1/workflows/${workflow.id}/quality-summary?persona=${encodeURIComponent(args.persona || "")}`
      );
      const qJson = await parseJson(qRes);
      if (qRes.ok) return { ...workflow, quality_summary: qJson };
    } catch {
      // Keep workflow list usable even if quality summary call fails.
    }

    return { ...workflow, quality_summary: null };
  }

  async function fetchWorkflows(): Promise<WorkflowItem[]> {
    if (!args.persona) return [];
    try {
      const res = await fetch(`${API_BASE}/v1/workflows?project_id=${encodeURIComponent(args.projectId)}&persona=${encodeURIComponent(args.persona)}`);
      const json = await parseJson(res);
      if (!res.ok) throw new Error(extractApiError(json, "Failed to load workflows"));
      const items: WorkflowItem[] = Array.isArray(json.items) ? json.items : [];
      return await Promise.all(items.map(enrichWorkflow));
    } catch (e) {
      args.addToast("error", String(e).replace(/^Error:\s*/, ""));
      return [];
    }
  }

  async function syncWorkflows(showToast = false): Promise<WorkflowItem[]> {
    const workflows = await fetchWorkflows();
    args.setWorkflows(workflows);
    if (showToast) args.addToast("success", "Workflows refreshed.");
    return workflows;
  }

  async function loadWorkflows(showToast = false): Promise<void> {
    try {
      await syncWorkflows(showToast);
    } catch (e) {
      args.addToast("error", String(e).replace(/^Error:\s*/, ""));
    }
  }

  async function refreshAndOpenWorkflow(createdId: number, fallbackWorkflow?: WorkflowItem): Promise<void> {
    const workflows = await syncWorkflows();
    const createdWorkflow = workflows.find((workflow) => workflow.id === createdId) || fallbackWorkflow;
    if (createdWorkflow) {
      await openWorkflow(createdWorkflow);
    }
  }

  async function createWorkflow() {
    if (!args.persona || args.persona !== "BA") return;
    const name = args.workflowName.trim();
    if (!name) {
      args.setWorkflowNameError("Workflow name is required.");
      return;
    }
    args.setWorkflowNameError("");
    args.setWorkflowBusy(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${API_BASE}/v1/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          project_id: args.projectId,
          name,
          psd_version: args.workflowPsdVersion.trim() || undefined,
          actor: PERSONA_ACTOR[args.persona],
          assigned_ba: "ba.user",
          assigned_dev: "dev.user",
          assigned_reviewer: "reviewer.user"
        })
      });
      clearTimeout(timer);
      const json = await parseJson(res);
      if (!res.ok) throw new Error(extractApiError(json, "Workflow creation failed"));
      args.setWorkflowName("");
      args.setWorkflowPsdVersion("");
      const createdId = Number(json?.workflow?.id || 0);
      if (createdId) {
        await refreshAndOpenWorkflow(createdId, json?.workflow as WorkflowItem | undefined);
      } else {
        await syncWorkflows();
      }
      args.addToast("success", "Workflow created.");
    } catch (e) {
      const err = String(e).includes("AbortError") ? "Workflow creation timed out. Check backend service and try again." : String(e).replace(/^Error:\s*/, "");
      args.setWorkflowNameError(err);
      args.addToast("error", err);
    } finally {
      args.setWorkflowBusy(false);
    }
  }

  async function createWorkflowVersion(input: WorkflowVersionCreateInput) {
    if (!args.persona || args.persona !== "BA") return;
    const name = input.name.trim();
    if (!name) return;
    args.setWorkflowBusy(true);
    try {
      const res = await fetch(`${API_BASE}/v1/workflows/${input.workflowId}/create-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: PERSONA_ACTOR[args.persona],
          name,
          psd_version: input.psdVersion || undefined,
          reuse_latest_gap_run: input.reuseLatestGapRun,
          reuse_functional_spec: input.reuseFunctionalSpec,
          clone_unresolved_only: input.cloneUnresolvedOnly
        })
      });
      const json = await parseJson(res);
      if (!res.ok) throw new Error(extractApiError(json, "Workflow version creation failed"));
      const createdId = Number(json?.workflow?.id || 0);
      if (createdId) {
        await refreshAndOpenWorkflow(createdId, json?.workflow as WorkflowItem | undefined);
      } else {
        await syncWorkflows();
      }
      args.addToast("success", "Workflow version created.");
    } catch (e) {
      args.addToast("error", String(e).replace(/^Error:\s*/, ""));
    } finally {
      args.setWorkflowBusy(false);
    }
  }

  async function openWorkflow(wf: WorkflowItem) {
    const workflowId = wf.id;
    
    // CRITICAL: Clear all agent state FIRST to prevent data leakage between workflows
    args.setActiveWorkflowId(workflowId);
    clearAllAgentState(args);
    
    // Set persona-specific tab
    setPersonaTab(args);
    
    // Set workflow-level run IDs (for display purposes)
    args.setGapRunId(wf.latest_gap_run_id || null);
    args.setSqlRunId(wf.latest_sql_run_id || null);
    args.setXmlRunId(wf.latest_xml_run_id || null);
    args.setReportXmlArtifactId(wf.latest_report_xml_artifact_id || "");
    args.setReportXmlLinked(Boolean(wf.latest_report_xml_artifact_id));
    
    // Load BA gap analysis data with race condition protection
    if (wf.latest_gap_run_id) {
      await loadWorkflowGapData(args, workflowId, wf.latest_gap_run_id);
    }
    
    // Load XML validation data with race condition protection
    if (wf.latest_xml_run_id) {
      await loadWorkflowXmlValidation(args, workflowId, wf.latest_xml_run_id);
    }
    
    // Load artifacts for this workflow
    await deps.loadArtifacts();
  }

  async function submitCurrentStage(): Promise<WorkflowItem | null> {
    if (!args.persona || !args.currentWorkflow) return null;
    args.setWorkflowBusy(true);
    try {
      const res = await fetch(`${API_BASE}/v1/workflows/${args.currentWorkflow.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: PERSONA_ACTOR[args.persona], comment: args.workflowComment.trim() || undefined })
      });
      const json = await parseJson(res);
      if (!res.ok) throw new Error(extractApiError(json, "Submit stage failed"));
      args.setWorkflowComment("");
      await loadWorkflows();
      const nextStage = String(json?.workflow?.current_stage || "");
      args.addToast("success", `Stage submitted. Current stage: ${nextStage}`);
      args.pushAudit("success", `Workflow submitted to ${nextStage}.`);
      return json?.workflow || null;
    } catch (e) {
      args.addToast("error", String(e).replace(/^Error:\s*/, ""));
      return null;
    } finally {
      args.setWorkflowBusy(false);
    }
  }

  async function sendBackStage() {
    if (!args.persona || !args.currentWorkflow) return;
    const reasonCode = args.sendBackReasonCode.trim();
    const reasonDetail = args.sendBackReasonDetail.trim();
    if (!reasonCode) {
      args.addToast("error", "Select a send-back reason.");
      return;
    }
    if (reasonDetail.length < 10) {
      args.addToast("error", "Send-back detail must be at least 10 characters.");
      return;
    }
    args.setWorkflowBusy(true);
    try {
      const targetStage = args.currentWorkflow.current_stage === "REVIEWER" ? "DEV" : "BA";
      const res = await fetch(`${API_BASE}/v1/workflows/${args.currentWorkflow.id}/send-back`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: PERSONA_ACTOR[args.persona],
          target_stage: targetStage,
          comment: args.workflowComment.trim() || undefined,
          reason_code: reasonCode,
          reason_detail: reasonDetail
        })
      });
      const json = await parseJson(res);
      if (!res.ok) throw new Error(extractApiError(json, "Send back failed"));
      args.setWorkflowComment("");
      args.setSendBackReasonCode("");
      args.setSendBackReasonDetail("");
      await loadWorkflows();
      args.addToast("success", "Workflow sent back.");
    } catch (e) {
      args.addToast("error", String(e).replace(/^Error:\s*/, ""));
    } finally {
      args.setWorkflowBusy(false);
    }
  }

  async function saveFunctionalSpec(format: "json" | "csv", autoAdvance = false) {
    if (!args.persona || !args.currentWorkflow || !args.gapRunId) return;
    args.setWorkflowBusy(true);
    try {
      const res = await fetch(`${API_BASE}/v1/workflows/${args.currentWorkflow.id}/functional-spec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: PERSONA_ACTOR[args.persona],
          gap_run_id: args.gapRunId,
          store_format: format,
          auto_advance: autoAdvance
        })
      });
      const json = await parseJson(res);
      if (!res.ok) throw new Error(extractApiError(json, "Save functional spec failed"));
      await loadWorkflows();
      args.addToast("success", `Functional spec saved as ${format.toUpperCase()}.`);
    } catch (e) {
      args.addToast("error", String(e).replace(/^Error:\s*/, ""));
    } finally {
      args.setWorkflowBusy(false);
    }
  }

  async function updateBaGapWaivers(waivers: Record<string, any>, comment?: string) {
    if (!args.persona || !args.currentWorkflow) return;
    args.setWorkflowBusy(true);
    try {
      const res = await fetch(`${API_BASE}/v1/workflow/${args.currentWorkflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ba_gap_waivers_json: waivers,
          actor: PERSONA_ACTOR[args.persona],
          comment: comment || "Updated BA gap waivers"
        })
      });
      const json = await parseJson(res);
      if (!res.ok) throw new Error(extractApiError(json, "Update BA waivers failed"));
      await loadWorkflows();
      args.addToast("success", "BA gap waivers updated.");
    } catch (e) {
      args.addToast("error", String(e).replace(/^Error:\s*/, ""));
    } finally {
      args.setWorkflowBusy(false);
    }
  }

  return {
    loadWorkflows,
    createWorkflow,
    createWorkflowVersion,
    openWorkflow,
    submitCurrentStage,
    sendBackStage,
    saveFunctionalSpec,
    updateBaGapWaivers
  };
}
