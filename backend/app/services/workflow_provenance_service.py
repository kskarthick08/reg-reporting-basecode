"""Helpers for proving runs and generated artifacts belong to the active workflow."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.models import AnalysisRun, Artifact, Workflow
from app.services.workflow_action_log_utils import resolve_workflow_for_artifact


def run_workflow_id(run: AnalysisRun | None) -> int | None:
    """Return the workflow id recorded on an analysis run, if present."""
    if not run or not isinstance(run.input_json, dict):
        return None
    value = run.input_json.get("workflow_id")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def run_gap_run_id(run: AnalysisRun | None) -> int | None:
    """Return the source gap run id recorded on an analysis run, if present."""
    if not run or not isinstance(run.input_json, dict):
        return None
    value = run.input_json.get("gap_run_id")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def functional_spec_gap_run_id(artifact: Artifact | None) -> int | None:
    """Return the gap run id embedded in a saved functional specification artifact."""
    if not artifact or not isinstance(artifact.extracted_json, dict):
        return None
    value = artifact.extracted_json.get("gap_run_id")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def ensure_run_belongs_to_workflow(
    workflow: Workflow,
    run: AnalysisRun,
    *,
    expected_run_type: str | None = None,
    detail_code: str = "workflow_run_mismatch",
) -> None:
    """Reject a run when it was created for a different workflow or run type."""
    if expected_run_type and str(run.run_type or "").strip() != expected_run_type:
        raise HTTPException(status_code=422, detail="invalid_run_type_for_workflow")

    owner_workflow_id = run_workflow_id(run)
    if owner_workflow_id is not None and owner_workflow_id != workflow.id:
        raise HTTPException(
            status_code=422,
            detail={
                "code": detail_code,
                "message": "Selected analysis run belongs to a different workflow.",
                "workflow_id": workflow.id,
                "run_id": run.id,
                "run_workflow_id": owner_workflow_id,
            },
        )


def ensure_gap_run_is_current_for_workflow(workflow: Workflow, gap_run: AnalysisRun) -> None:
    """Reject stale gap runs so DEV and BA always use the workflow's latest BA output."""
    ensure_run_belongs_to_workflow(
        workflow,
        gap_run,
        expected_run_type="gap_analysis",
        detail_code="gap_run_workflow_mismatch",
    )
    if workflow.latest_gap_run_id and gap_run.id != workflow.latest_gap_run_id:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "stale_gap_run_for_workflow",
                "message": "Selected gap analysis run is not the workflow's latest BA run.",
                "workflow_id": workflow.id,
                "selected_gap_run_id": gap_run.id,
                "latest_gap_run_id": workflow.latest_gap_run_id,
            },
        )


def ensure_functional_spec_matches_workflow(workflow: Workflow, artifact: Artifact | None) -> None:
    """Reject functional specs that do not belong to the active workflow or latest BA run."""
    if not artifact:
        raise HTTPException(status_code=422, detail="functional_spec_not_found")
    if workflow.functional_spec_artifact_id and artifact.id != workflow.functional_spec_artifact_id:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "functional_spec_workflow_mismatch",
                "message": "Selected functional specification is not the workflow's active spec artifact.",
                "workflow_id": workflow.id,
                "selected_artifact_id": artifact.id,
                "workflow_functional_spec_artifact_id": workflow.functional_spec_artifact_id,
            },
        )

    source_gap_run_id = functional_spec_gap_run_id(artifact)
    if workflow.latest_gap_run_id and source_gap_run_id and source_gap_run_id != workflow.latest_gap_run_id:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "stale_functional_spec_for_workflow",
                "message": "Functional specification does not match the workflow's latest BA gap run.",
                "workflow_id": workflow.id,
                "functional_spec_artifact_id": artifact.id,
                "functional_spec_gap_run_id": source_gap_run_id,
                "latest_gap_run_id": workflow.latest_gap_run_id,
            },
        )


def ensure_xml_artifact_matches_workflow(workflow: Workflow, artifact: Artifact | None) -> None:
    """Reject XML artifacts that are not the workflow's currently linked submission XML."""
    if not artifact:
        raise HTTPException(status_code=422, detail="report_xml_artifact_not_found")
    if workflow.latest_report_xml_artifact_id and artifact.id != workflow.latest_report_xml_artifact_id:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "report_xml_workflow_mismatch",
                "message": "Selected XML artifact is not the workflow's active submission XML.",
                "workflow_id": workflow.id,
                "selected_artifact_id": artifact.id,
                "workflow_report_xml_artifact_id": workflow.latest_report_xml_artifact_id,
            },
        )


def ensure_report_xml_can_be_linked(
    db: Any,
    workflow: Workflow,
    artifact: Artifact,
) -> None:
    """Reject linking a generated XML artifact that already belongs to another workflow."""
    owner = resolve_workflow_for_artifact(db, artifact)
    if owner and owner.id != workflow.id:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "report_xml_owned_by_other_workflow",
                "message": "Selected XML artifact is already associated with a different workflow.",
                "workflow_id": workflow.id,
                "selected_artifact_id": artifact.id,
                "owner_workflow_id": owner.id,
            },
        )


def validation_matches_current_xml(workflow: Workflow, xml_validation_run: AnalysisRun | None) -> bool:
    """Return whether a validation run evaluated the workflow's currently linked XML artifact."""
    if not xml_validation_run or not isinstance(xml_validation_run.output_json, dict):
        return False
    xml_artifact_id = xml_validation_run.output_json.get("report_xml_artifact_id")
    try:
        validated_artifact_id = int(xml_artifact_id) if xml_artifact_id is not None else None
    except (TypeError, ValueError):
        validated_artifact_id = None
    if not workflow.latest_report_xml_artifact_id or not validated_artifact_id:
        return False
    return validated_artifact_id == workflow.latest_report_xml_artifact_id
