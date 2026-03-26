import type { UseWorkbenchActionsArgs } from "../actions/types";
import { API_BASE, extractApiError, parseJson } from "../utils";

const HEALTH_RETRY_DELAYS_MS = [0, 1200, 2500];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeBackendStatus(snapshot: any): string {
  if (!snapshot) return "Backend health data is unavailable.";
  if (snapshot.status === "ready") return "";
  if (snapshot.status === "degraded") {
    if (snapshot?.dependencies?.llm?.ok === false) {
      return "API is reachable, but the AI endpoint is offline. Workflow navigation still works.";
    }
    if (snapshot?.dependencies?.database?.schema?.complete === false) {
      return "API is reachable, but the database schema is incomplete. Check migrations before inviting users.";
    }
    if (snapshot?.dependencies?.database?.vector_installed === false) {
      return "API is reachable, but pgvector is unavailable. Vector-assisted matching will be degraded.";
    }
    return "API is reachable, but one or more dependencies are degraded.";
  }

  const startupErrors = snapshot?.startup?.errors;
  if (Array.isArray(startupErrors) && startupErrors.length > 0) {
    return `API startup failed: ${startupErrors[0]}`;
  }

  const dbError = snapshot?.dependencies?.database?.error;
  if (dbError) {
    return `API cannot reach the database: ${dbError}`;
  }

  return "API is unavailable. Check the backend process, database, and network path.";
}

export async function refreshServiceHealthState(args: Pick<UseWorkbenchActionsArgs, "setBackendUp" | "setBackendStatusText" | "setLlmUp">) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < HEALTH_RETRY_DELAYS_MS.length; attempt += 1) {
    const delayMs = HEALTH_RETRY_DELAYS_MS[attempt];
    if (delayMs > 0) {
      args.setBackendStatusText(`Backend unavailable. Retrying connection check (${attempt + 1}/${HEALTH_RETRY_DELAYS_MS.length})...`);
      await wait(delayMs);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${API_BASE}/health`, {
        cache: "no-store",
        signal: controller.signal
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(extractApiError(payload, `Health endpoint failed with status ${response.status}`));
      }

      const backendReady = Boolean(payload?.ready ?? payload?.ok ?? response.ok);
      args.setBackendUp(backendReady);
      args.setLlmUp(Boolean(payload?.llm_up));
      args.setBackendStatusText(describeBackendStatus(payload));
      return;
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  args.setBackendUp(false);
  args.setLlmUp(false);
  const errorText = lastError instanceof Error ? lastError.message : "Unable to reach the backend health endpoint.";
  args.setBackendStatusText(`API is unavailable. ${errorText}`);
}
