import type { Artifact } from "./types";


export function artifactDisplayName(artifact?: Pick<Artifact, "display_name" | "filename"> | null): string {
  return String(artifact?.display_name || artifact?.filename || "").trim();
}


export function artifactOptionLabel(artifact: Artifact): string {
  return artifactDisplayName(artifact) || `Artifact ${artifact.id}`;
}
