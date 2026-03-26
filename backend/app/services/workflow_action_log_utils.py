"""Utilities for keeping workflow action logs consistent and workflow-aware."""

from __future__ import annotations

from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import AnalysisRun, Artifact, Workflow

VALID_ACTION_CATEGORIES = {"BA", "DEV", "REVIEWER", "SYSTEM"}
VALID_WORKFLOW_STAGES = {"BA", "DEV", "REVIEWER", "COMPLETED"}

_ACTION_CATEGORY_ALIASES = {
    "BA": "BA",
    "BA_ACTION": "BA",
    "BUSINESS_ANALYST": "BA",
    "DEV": "DEV",
    "DEV_ACTION": "DEV",
    "DEVELOPER": "DEV",
    "REVIEWER": "REVIEWER",
    "REVIEWER_ACTION": "REVIEWER",
    "QA": "REVIEWER",
    "SYSTEM": "SYSTEM",
    "SYSTEM_ACTION": "SYSTEM",
    "ADMIN": "SYSTEM",
}

_ACTOR_ALIASES = {
    "BA": "ba.user",
    "BUSINESS_ANALYST": "ba.user",
    "DEV": "dev.user",
    "DEVELOPER": "dev.user",
    "REVIEWER": "reviewer.user",
    "QA": "reviewer.user",
    "SYSTEM": "system",
}

_DEFAULT_ACTORS = {
    "BA": "ba.user",
    "DEV": "dev.user",
    "REVIEWER": "reviewer.user",
    "SYSTEM": "system",
}

_STATUS_ALIASES = {
    "OK": "success",
    "SUCCESS": "success",
    "WARNING": "partial",
    "WARN": "partial",
    "PARTIAL": "partial",
    "FAILURE": "failure",
    "FAILED": "failure",
    "ERROR": "failure",
}

_ARTIFACT_KIND_STAGE = {
    "FCA": "BA",
    "FUNCTIONAL_SPEC": "BA",
    "GENERATED_SQL": "DEV",
    "GENERATED_XML": "REVIEWER",
    "REPORT_XML": "REVIEWER",
}

_RUN_TYPE_STAGE = {
    "GAP_ANALYSIS": "BA",
    "GAP_REMEDIATION": "BA",
    "SQL_GENERATION": "DEV",
    "XML_GENERATION": "REVIEWER",
    "XML_VALIDATION": "REVIEWER",
}

_RUN_TYPE_WORKFLOW_FIELD = {
    "GAP_ANALYSIS": "latest_gap_run_id",
    "GAP_REMEDIATION": "latest_gap_run_id",
    "SQL_GENERATION": "latest_sql_run_id",
    "XML_GENERATION": "latest_xml_run_id",
    "XML_VALIDATION": "latest_xml_run_id",
}


def normalize_action_type(action_type: str) -> str:
    """Store action types in a stable snake_case-ish format."""
    raw = str(action_type or "").strip().replace("-", "_").replace(" ", "_").lower()
    return raw or "unknown_action"


def normalize_action_category(
    action_category: str | None,
    *,
    actor: str | None = None,
    stage: str | None = None,
) -> str:
    """Map legacy categories onto the canonical workflow action taxonomy."""
    raw = str(action_category or "").strip().upper()
    if raw in _ACTION_CATEGORY_ALIASES:
        return _ACTION_CATEGORY_ALIASES[raw]

    stage_value = normalize_stage(stage, action_category=None)
    if stage_value in {"BA", "DEV", "REVIEWER"}:
        return stage_value

    actor_value = str(actor or "").strip().upper()
    if actor_value in _ACTOR_ALIASES:
        mapped_actor = _ACTOR_ALIASES[actor_value]
        if mapped_actor == "ba.user":
            return "BA"
        if mapped_actor == "dev.user":
            return "DEV"
        if mapped_actor == "reviewer.user":
            return "REVIEWER"

    return "SYSTEM"


def normalize_actor(actor: str | None, *, action_category: str) -> str | None:
    """Collapse known role aliases while preserving explicit user identifiers."""
    raw = str(actor or "").strip()
    if not raw:
        return _DEFAULT_ACTORS.get(action_category)

    alias = _ACTOR_ALIASES.get(raw.upper())
    if alias:
        return alias
    return raw


def normalize_status(status: str | None) -> str:
    """Normalize workflow action result values for analytics and filtering."""
    raw = str(status or "").strip().upper()
    return _STATUS_ALIASES.get(raw, "success" if not raw else str(status).strip().lower())


def normalize_stage(stage: str | None, action_category: str | None = None) -> str | None:
    """Normalize workflow stages to the canonical enum used by workflows."""
    raw = str(stage or "").strip().upper()
    if raw in VALID_WORKFLOW_STAGES:
        return raw

    category = str(action_category or "").strip().upper()
    if category in {"BA", "DEV", "REVIEWER"}:
        return category
    return None


def workflow_stage_from_artifact_kind(kind: str | None) -> str | None:
    """Infer the owning workflow stage from an artifact kind when possible."""
    return _ARTIFACT_KIND_STAGE.get(str(kind or "").strip().upper())


def workflow_stage_from_run_type(run_type: str | None) -> str | None:
    """Infer the owning workflow stage from an analysis run type when possible."""
    return _RUN_TYPE_STAGE.get(str(run_type or "").strip().upper())


def resolve_workflow_for_run(db: Session, run: AnalysisRun | None) -> Workflow | None:
    """Resolve a workflow for a run using stored input context or latest-run pointers."""
    if not run:
        return None

    input_json = run.input_json if isinstance(run.input_json, dict) else {}
    workflow_id = input_json.get("workflow_id")
    if workflow_id is not None:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if workflow:
            return workflow

    field_name = _RUN_TYPE_WORKFLOW_FIELD.get(str(run.run_type or "").strip().upper())
    if not field_name:
        return None

    workflow_field = getattr(Workflow, field_name)
    return db.query(Workflow).filter(workflow_field == run.id).order_by(Workflow.updated_at.desc(), Workflow.id.desc()).first()


def resolve_workflow_for_artifact(db: Session, artifact: Artifact | None) -> Workflow | None:
    """Resolve the workflow most directly associated with an artifact."""
    if not artifact:
        return None

    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.project_id == artifact.project_id,
            or_(
                Workflow.functional_spec_artifact_id == artifact.id,
                Workflow.latest_report_xml_artifact_id == artifact.id,
            ),
        )
        .order_by(Workflow.updated_at.desc(), Workflow.id.desc())
        .first()
    )
    if workflow:
        return workflow

    run = (
        db.query(AnalysisRun)
        .filter(
            AnalysisRun.project_id == artifact.project_id,
            AnalysisRun.output_artifact_id == artifact.id,
        )
        .order_by(AnalysisRun.created_at.desc(), AnalysisRun.id.desc())
        .first()
    )
    return resolve_workflow_for_run(db, run)


def workflow_action_log_details(
    *,
    source_type: str,
    source_id: int,
    format: str | None = None,
    artifact: Artifact | None = None,
    run: AnalysisRun | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a compact, consistent details payload for workflow actions."""
    details: dict[str, Any] = {
        "source_type": source_type,
        "source_id": source_id,
    }
    if format:
        details["format"] = str(format).strip().lower()
    if artifact:
        details.update(
            {
                "artifact_id": artifact.id,
                "artifact_kind": artifact.kind,
                "artifact_filename": artifact.filename,
                "artifact_display_name": artifact.display_name or artifact.filename,
            }
        )
    if run:
        details.update(
            {
                "run_id": run.id,
                "run_type": run.run_type,
            }
        )
    if extra:
        details.update(extra)
    return details
