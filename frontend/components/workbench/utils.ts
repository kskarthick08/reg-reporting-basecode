import type { GapRow } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:18000";

export async function parseJson(res: Response) {
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    return { raw: txt };
  }
}

export function extractApiError(json: any, fallback = "Request failed"): string {
  if (!json) return fallback;
  if (typeof json.detail === "string" && json.detail.trim()) return json.detail.trim();
  if (json.detail && typeof json.detail === "object" && typeof json.detail.message === "string" && json.detail.message.trim()) {
    return json.detail.message.trim();
  }
  if (Array.isArray(json.detail) && json.detail.length) {
    const first = json.detail[0];
    if (typeof first === "string") return first;
    if (first && typeof first.msg === "string") return first.msg;
  }
  if (typeof json.error === "string" && json.error.trim()) return json.error.trim();
  if (typeof json.message === "string" && json.message.trim()) return json.message.trim();
  if (typeof json.raw === "string" && json.raw.trim()) return json.raw.trim();
  return fallback;
}

export function extractGapRows(json: any): GapRow[] {
  if (Array.isArray(json?.rows)) return json.rows;
  if (Array.isArray(json?.output_json?.rows)) return json.output_json.rows;
  if (Array.isArray(json?.data?.rows)) return json.data.rows;
  return [];
}

export function extractGapDiagnostics(json: any): Record<string, any> | null {
  if (json?.diagnostics && typeof json.diagnostics === "object") return json.diagnostics;
  if (json?.output_json?.diagnostics && typeof json.output_json.diagnostics === "object") return json.output_json.diagnostics;
  if (json?.data?.diagnostics && typeof json.data.diagnostics === "object") return json.data.diagnostics;
  return null;
}

export function formatStatus(status: string) {
  const s = String(status || "").toLowerCase();
  if (s.includes("full")) return "FULL";
  if (s.includes("partial")) return "PARTIAL";
  if (s.includes("missing")) return "MISSING";
  return status || "-";
}

export function formatConfidence(v: number) {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  return n.toFixed(2);
}
