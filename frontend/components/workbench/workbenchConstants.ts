import type { AgentTab, Persona } from "./types";

export const CHAT_MODEL_OPTIONS = [
  { value: "gpt-5.1-codex-mini", label: "GPT-5.1 Mini" },
  { value: "eu.anthropic.claude-haiku-4-5-20251001-v1", label: "Claude Haiku 4.5" },
  { value: "eu.anthropic.claude-sonnet-4-5-20250929-v1", label: "Claude Sonnet 4.5" },
  { value: "gpt-5.1-2025-11-13", label: "GPT 5.1" },
  { value: "gpt-5.1", label: "GPT 5.1 Thinking" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
  { value: "gpt-5-mini", label: "GPT-5 Mini" },
  { value: "gpt-5.1-codex", label: "GPT-5.1 codex" },
  { value: "gpt-5.2-chat-latest", label: "Gpt-5.2" },
  { value: "gpt-5.2", label: "Gpt-5.2 Thinking" }
];

export function normalizeChatModel(modelId: string): string {
  if (!modelId) return modelId;
  if (modelId.endsWith(":ntt")) return modelId.slice(0, -4);
  if (modelId.endsWith(":aws-anthropic")) return modelId.replace(":aws-anthropic", "");
  return modelId;
}

export const PERSONA_TO_TAB: Record<Persona, AgentTab> = { BA: "ba", DEV: "dev", REVIEWER: "rev" };
export const PERSONA_ACTOR: Record<Persona, string> = { BA: "ba.user", DEV: "dev.user", REVIEWER: "reviewer.user" };
export const SEND_BACK_REASON_OPTIONS = [
  { value: "MAPPING_GAP", label: "Mapping Gap" },
  { value: "BUSINESS_RULE_MISMATCH", label: "Business Rule Mismatch" },
  { value: "SQL_LOGIC_ISSUE", label: "SQL Logic Issue" },
  { value: "XML_SCHEMA_ERROR", label: "XML Schema Error" },
  { value: "DATA_QUALITY_ISSUE", label: "Data Quality Issue" },
  { value: "OTHER", label: "Other" }
];
