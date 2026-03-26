import type { ArtifactKind } from "../types";
import { API_BASE, extractApiError, parseJson } from "../utils";
import type { UseWorkbenchActionsArgs } from "./types";

export function createArtifactActions(args: UseWorkbenchActionsArgs) {
  async function loadArtifacts(showToast = false) {
    try {
      const res = await fetch(`${API_BASE}/v1/artifacts?project_id=${encodeURIComponent(args.projectId)}`);
      const json = await parseJson(res);
      if (!res.ok) throw new Error(JSON.stringify(json));
      args.setArtifacts(json.items || []);
      if (showToast) {
        args.addToast("success", "Artifacts refreshed.");
        args.pushAudit("info", "Artifacts list refreshed.");
      }
    } catch {
      args.addToast("error", "Failed to refresh artifacts.");
      args.pushAudit("warn", "Artifacts refresh failed.");
    }
  }

  async function uploadArtifact(kind: ArtifactKind, file: File | null, onSelect?: (id: number) => void) {
    if (!file) return;
    args.setBusy(true);
    args.setMessage("");
    try {
      const fd = new FormData();
      fd.append("project_id", args.projectId);
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/v1/files/upload`, { method: "POST", body: fd });
      const json = await parseJson(res);
      if (!res.ok) throw new Error(extractApiError(json, "Upload failed"));
      if (onSelect) onSelect(Number(json.artifact_id));
      await loadArtifacts();
      const label = String(json.display_name || json.filename || file.name || "artifact");
      args.addToast("success", `Uploaded ${label}`);
      args.pushAudit("success", `Uploaded ${label} as ${kind}.`);
    } catch (e) {
      const err = String(e).replace(/^Error:\s*/, "");
      args.setMessage(`Upload failed: ${err}`);
      args.addToast("error", `Upload failed: ${err}`);
      args.pushAudit("warn", "Upload failed.");
    } finally {
      args.setBusy(false);
    }
  }

  return { loadArtifacts, uploadArtifact };
}
