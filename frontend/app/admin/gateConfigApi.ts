/**
 * Gate Configuration API Client
 * Handles API calls for gate configuration management.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type GateConfigResponse = {
  ok: boolean;
  project_id?: string;
  items?: any[];
  config?: any;
  deleted?: boolean;
  stage?: string;
};

export async function fetchGateConfigs(
  projectId: string,
  adminKey?: string
): Promise<GateConfigResponse> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (adminKey) headers["x-admin-key"] = adminKey;

  const res = await fetch(`${API_URL}/v1/admin/gate-configs?project_id=${projectId}`, {
    headers,
  });
  return res.json();
}

export async function updateGateConfig(
  projectId: string,
  stage: string,
  updates: any,
  adminKey?: string,
  actor?: string
): Promise<GateConfigResponse> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (adminKey) headers["x-admin-key"] = adminKey;

  const payload = { ...updates, updated_by: actor || "admin" };

  const res = await fetch(
    `${API_URL}/v1/admin/gate-configs/${stage}?project_id=${projectId}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

export async function resetGateConfig(
  projectId: string,
  stage: string,
  adminKey?: string,
  actor?: string
): Promise<GateConfigResponse> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (adminKey) headers["x-admin-key"] = adminKey;

  const res = await fetch(
    `${API_URL}/v1/admin/gate-configs/${stage}?project_id=${projectId}&actor=${actor || "admin"}`,
    {
      method: "DELETE",
      headers,
    }
  );
  return res.json();
}
