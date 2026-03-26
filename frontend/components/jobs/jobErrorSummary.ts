const MAX_SUMMARY_LENGTH = 220;

function normalizeErrorMessage(message?: string | null): string {
  return String(message || "").replace(/\s+/g, " ").trim();
}

export function summarizeJobError(message?: string | null): string {
  const normalized = normalizeErrorMessage(message);
  if (!normalized) return "";
  const firstLine = normalized.split(/(?<=[:.!?])\s+/)[0] || normalized;
  if (firstLine.length <= MAX_SUMMARY_LENGTH) {
    return firstLine;
  }
  return `${firstLine.slice(0, MAX_SUMMARY_LENGTH - 1).trimEnd()}…`;
}

export function hasExpandedJobError(message?: string | null): boolean {
  const normalized = normalizeErrorMessage(message);
  return Boolean(normalized) && summarizeJobError(normalized) !== normalized;
}

export function fullJobError(message?: string | null): string {
  return normalizeErrorMessage(message);
}
