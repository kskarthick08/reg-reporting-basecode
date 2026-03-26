export type ProjectOption = {
  value: string;
  label: string;
};

export const PROJECT_OPTIONS: ProjectOption[] = [
  { value: "demo-local", label: "local-workspace" },
  { value: "demo-qa", label: "qa-workspace" },
  { value: "demo-prod-like", label: "preprod-workspace" },
];

export const DEFAULT_PROJECT_ID = PROJECT_OPTIONS[0].value;

/**
 * Keep legacy project IDs working while presenting cleaner workspace labels in the UI.
 */
export function projectLabel(projectId?: string | null): string {
  const rawValue = String(projectId || "").trim();
  if (!rawValue) return "";
  return PROJECT_OPTIONS.find((option) => option.value === rawValue)?.label || rawValue;
}

export function projectOptionsWithCurrent(projectId?: string | null): ProjectOption[] {
  const rawValue = String(projectId || "").trim();
  if (!rawValue || PROJECT_OPTIONS.some((option) => option.value === rawValue)) {
    return PROJECT_OPTIONS;
  }
  return [{ value: rawValue, label: rawValue }, ...PROJECT_OPTIONS];
}
