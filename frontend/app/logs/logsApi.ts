/**
 * API client for logging and audit endpoints
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:18000";

export interface WorkflowLogEntry {
  id: number;
  workflow_id: number;
  project_id: string;
  action_type: string;
  action_category: string;
  actor: string | null;
  description: string;
  status: string;
  stage: string | null;
  details_json: Record<string, any> | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface WorkflowLogsResponse {
  ok: boolean;
  workflow_id: number;
  workflow_name: string | null;
  total_count: number;
  logs: WorkflowLogEntry[];
}

export interface SystemAuditLogEntry {
  id: number;
  event_type: string;
  event_category: string;
  severity: string;
  actor: string | null;
  ip_address: string | null;
  target_type: string | null;
  target_id: string | null;
  project_id: string | null;
  description: string;
  details_json: Record<string, any> | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface SystemAuditLogsResponse {
  ok: boolean;
  total_count: number;
  logs: SystemAuditLogEntry[];
}

export interface AuditLogFilters {
  project_id?: string;
  actor?: string;
  event_category?: string;
  severity?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export async function fetchWorkflowLogs(
  workflowId: number,
  limit: number = 100,
  offset: number = 0
): Promise<WorkflowLogsResponse> {
  const response = await fetch(
    `${API_BASE}/api/logs/workflows/${workflowId}?limit=${limit}&offset=${offset}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch workflow logs: ${response.statusText}`);
  }
  return response.json();
}

export async function downloadWorkflowLogs(workflowId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/logs/workflows/${workflowId}/download`
  );
  if (!response.ok) {
    throw new Error(`Failed to download workflow logs: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workflow_${workflowId}_logs_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function fetchSystemAuditLogs(
  filters: AuditLogFilters = {}
): Promise<SystemAuditLogsResponse> {
  const params = new URLSearchParams();
  
  if (filters.project_id) params.append('project_id', filters.project_id);
  if (filters.actor) params.append('actor', filters.actor);
  if (filters.event_category) params.append('event_category', filters.event_category);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());
  
  const response = await fetch(`${API_BASE}/api/logs/audit?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
  }
  return response.json();
}

export async function downloadSystemAuditLogs(filters: AuditLogFilters = {}): Promise<void> {
  const params = new URLSearchParams();
  
  if (filters.project_id) params.append('project_id', filters.project_id);
  if (filters.actor) params.append('actor', filters.actor);
  if (filters.event_category) params.append('event_category', filters.event_category);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  
  const response = await fetch(
    `${API_BASE}/api/logs/audit/download?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(`Failed to download audit logs: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `system_audit_log_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
