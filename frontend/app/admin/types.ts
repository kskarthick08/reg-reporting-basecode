export type ArtifactItem = {
  id: number;
  kind: string;
  filename: string;
  display_name?: string;
  content_type?: string;
  created_at?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

export type InstructionItem = {
  agent_key: string;
  current_instruction: string;
  version: number;
  updated_by?: string | null;
  updated_at?: string | null;
  is_default?: boolean;
};

export type AuditItem = {
  id: number;
  action: string;
  target_type: string;
  target_id?: string | null;
  project_id?: string | null;
  actor?: string | null;
  created_at?: string | null;
};

export type AdminWorkflowItem = {
  id: number;
  display_id?: string;
  project_id: string;
  name: string;
  psd_version?: string | null;
  current_stage: "BA" | "DEV" | "REVIEWER" | "COMPLETED";
  status: string;
  assigned_ba?: string | null;
  assigned_dev?: string | null;
  assigned_reviewer?: string | null;
  current_assignee?: string | null;
  started_by?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type InstructionHistoryItem = {
  version: number;
  updated_by?: string;
  created_at?: string;
};

export type GitHubIntegrationConfig = {
  enabled: boolean;
  repo_url: string;
  branch: string;
  base_path: string;
  token_configured: boolean;
  token_masked?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
};
