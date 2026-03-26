import { useMemo } from "react";

import { artifactDisplayName } from "./artifactLabels";
import type { AgentTab, Artifact, BAAnalysisMode, GapRow, Persona, WorkflowItem } from "./types";

type Args = {
  artifacts: Artifact[];
  workflows: WorkflowItem[];
  activeWorkflowId: number | null;
  persona: Persona | "";
  baMode: BAAnalysisMode;
  activeAgentTab: AgentTab;
  fcaArtifactId: number | "";
  modelArtifactId: number | "";
  dataArtifactId: number | "";
  reportXmlArtifactId: number | "";
  xsdArtifactId: number | "";
  compareBaselineId: number | "";
  compareChangedId: number | "";
  gapRunId: number | null;
  gapRows: GapRow[];
  sqlRunId: number | null;
  xmlRunId: number | null;
  reportXmlLinked: boolean;
};

export function useWorkbenchDerived(args: Args) {
  const artifactsById = useMemo(() => new Map(args.artifacts.map((artifact) => [artifact.id, artifact])), [args.artifacts]);
  const fcaOptions = useMemo(() => args.artifacts.filter((a) => a.kind === "fca"), [args.artifacts]);
  const modelOptions = useMemo(() => args.artifacts.filter((a) => a.kind === "data_model"), [args.artifacts]);
  const dataOptions = useMemo(() => args.artifacts.filter((a) => a.kind === "data"), [args.artifacts]);
  const reportXmlOptions = useMemo(
    () => args.artifacts.filter((a) => ["report_xml", "generated_xml"].includes(String(a.kind || "").toLowerCase())),
    [args.artifacts]
  );
  const xsdOptions = useMemo(() => args.artifacts.filter((a) => a.kind === "xsd"), [args.artifacts]);
  const currentWorkflow = useMemo(() => args.workflows.find((w) => w.id === args.activeWorkflowId) || null, [args.workflows, args.activeWorkflowId]);
  const compareBaselineName = useMemo(() => artifactDisplayName(fcaOptions.find((a) => a.id === Number(args.compareBaselineId))) || "", [fcaOptions, args.compareBaselineId]);
  const compareChangedName = useMemo(() => artifactDisplayName(fcaOptions.find((a) => a.id === Number(args.compareChangedId))) || "", [fcaOptions, args.compareChangedId]);
  const selectedFcaName = useMemo(() => artifactDisplayName(fcaOptions.find((a) => a.id === Number(args.fcaArtifactId))) || "", [fcaOptions, args.fcaArtifactId]);
  const selectedModelName = useMemo(() => artifactDisplayName(modelOptions.find((a) => a.id === Number(args.modelArtifactId))) || "", [modelOptions, args.modelArtifactId]);
  const selectedDataName = useMemo(() => artifactDisplayName(dataOptions.find((a) => a.id === Number(args.dataArtifactId))) || "", [dataOptions, args.dataArtifactId]);
  const selectedReportXmlName = useMemo(
    () => artifactDisplayName(reportXmlOptions.find((a) => a.id === Number(args.reportXmlArtifactId))) || "",
    [reportXmlOptions, args.reportXmlArtifactId]
  );
  const selectedXsdName = useMemo(() => artifactDisplayName(xsdOptions.find((a) => a.id === Number(args.xsdArtifactId))) || "", [xsdOptions, args.xsdArtifactId]);
  const functionalSpecName = useMemo(
    () => artifactDisplayName(currentWorkflow?.functional_spec_artifact_id ? artifactsById.get(currentWorkflow.functional_spec_artifact_id) || null : null) || "",
    [artifactsById, currentWorkflow]
  );
  const linkedReportXmlName = useMemo(
    () => artifactDisplayName(currentWorkflow?.latest_report_xml_artifact_id ? artifactsById.get(currentWorkflow.latest_report_xml_artifact_id) || null : null) || "",
    [artifactsById, currentWorkflow]
  );
  const showWorkflowHome = Boolean(args.persona) && !args.activeWorkflowId;
  const showLogin = !args.persona;

  const baReady = Boolean(args.fcaArtifactId && args.modelArtifactId);
  const devReady = Boolean(args.gapRunId && args.modelArtifactId);
  const devXmlReady = Boolean(args.dataArtifactId && args.xsdArtifactId && args.fcaArtifactId && currentWorkflow?.functional_spec_artifact_id);
  const revReady = Boolean(args.reportXmlArtifactId && args.xsdArtifactId && args.fcaArtifactId && args.modelArtifactId && args.dataArtifactId && currentWorkflow?.functional_spec_artifact_id);
  const uploadCount = args.artifacts.length;
  const validationCount = args.gapRows.length;
  const reportCount = [args.gapRunId, args.sqlRunId, args.xmlRunId].filter(Boolean).length;
  const pendingCount = args.gapRows.filter((r) => String(r.status || "").toLowerCase().includes("missing")).length;
  const stageFlags = { ba: Boolean(args.gapRunId), dev: Boolean(args.sqlRunId && args.reportXmlLinked), rev: Boolean(args.xmlRunId) };
  const activeOutputTitle =
    args.activeAgentTab === "ba"
      ? args.baMode === "psd_psd"
        ? "PSD Version Comparison"
        : "Regulatory Mapping Specification Coverage"
      : args.activeAgentTab === "dev"
        ? "SQL Extraction Output"
        : "Submission XML Validation Output";
  const allowedTabs: AgentTab[] = args.persona === "BA" ? ["ba"] : args.persona === "DEV" ? ["dev"] : ["rev"];

  return {
    fcaOptions,
    modelOptions,
    dataOptions,
    reportXmlOptions,
    xsdOptions,
    compareBaselineName,
    compareChangedName,
    selectedFcaName,
    selectedModelName,
    selectedDataName,
    selectedReportXmlName,
    selectedXsdName,
    functionalSpecName,
    linkedReportXmlName,
    currentWorkflow,
    showWorkflowHome,
    showLogin,
    baReady,
    devReady,
    devXmlReady,
    revReady,
    uploadCount,
    validationCount,
    reportCount,
    pendingCount,
    stageFlags,
    activeOutputTitle,
    allowedTabs
  };
}

export type WorkbenchDerived = ReturnType<typeof useWorkbenchDerived>;
