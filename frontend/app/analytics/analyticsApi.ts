/**
 * Analytics Dashboard API Client
 */

import type { AnalyticsDashboardData } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function fetchAnalyticsDashboard(
  projectId?: string | null
): Promise<AnalyticsDashboardData> {
  const url = new URL(`${API_BASE}/v1/manager/dashboard`);
  if (projectId) {
    url.searchParams.set("project_id", projectId);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics dashboard: ${response.statusText}`);
  }

  return response.json();
}
