from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.api.deps import get_db, record_admin_audit, verify_admin
from app.models import AnalysisRun, Artifact, Workflow
from app.services.github_integration_service import (
    get_github_config,
    publish_artifact_to_github,
    serialize_github_config,
    upsert_github_config,
)
from app.services.logging_service import log_system_audit, log_workflow_action
from app.services.workflow_action_log_utils import workflow_action_log_details
from app.services.workflow_gates import evaluate_stage_exit_gate

router = APIRouter()


class GitHubConfigRequest(BaseModel):
    project_id: str
    repo_url: str
    branch: str = "main"
    base_path: str = ""
    enabled: bool = False
    updated_by: str = "admin"
    token: str | None = None


class PublishArtifactRequest(BaseModel):
    project_id: str
    workflow_id: int
    artifact_id: int | None = None
    artifact_role: str | None = None
    actor: str
    stage: str
    commit_message: str | None = None


@router.get("/v1/admin/integrations/github")
def admin_get_github_integration(project_id: str, request: Request, db: Session = Depends(get_db)):
    """Handle the get github integration API request."""
    verify_admin(request)
    return {"ok": True, "config": serialize_github_config(get_github_config(db, project_id))}


@router.put("/v1/admin/integrations/github")
def admin_upsert_github_integration(req: GitHubConfigRequest, request: Request, db: Session = Depends(get_db)):
    """Handle the upsert github integration API request."""
    verify_admin(request)
    row = upsert_github_config(
        db,
        project_id=req.project_id,
        repo_url=req.repo_url,
        branch=req.branch,
        base_path=req.base_path,
        enabled=req.enabled,
        updated_by=req.updated_by,
        token=req.token,
    )
    record_admin_audit(
        db,
        action="github_integration_updated",
        target_type="github_integration",
        target_id=str(row.id),
        project_id=req.project_id,
        actor=req.updated_by,
        details={"enabled": row.enabled, "repo_url": row.repo_url, "branch": row.branch, "base_path": row.base_path},
    )
    log_system_audit(
        db,
        event_type="github_integration_updated",
        event_category="CONFIG",
        severity="info",
        actor=req.updated_by,
        description=f"Updated GitHub integration for project {req.project_id}",
        target_type="github_integration",
        target_id=str(row.id),
        project_id=req.project_id,
        details={"enabled": row.enabled, "repo_url": row.repo_url, "branch": row.branch, "base_path": row.base_path},
        status="success",
    )
    db.commit()
    return {"ok": True, "config": serialize_github_config(row)}


@router.post("/v1/integrations/github/publish")
async def publish_artifact(req: PublishArtifactRequest, db: Session = Depends(get_db)):
    """Publish the artifact for the API response."""
    workflow = (
        db.query(Workflow)
        .filter(Workflow.id == req.workflow_id, Workflow.project_id == req.project_id, Workflow.is_active.is_(True))
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="workflow_not_found")

    artifact_id = req.artifact_id
    role = str(req.artifact_role or "").strip().lower()
    if artifact_id is None:
        if role == "functional_spec":
            artifact_id = workflow.functional_spec_artifact_id
        elif role == "report_xml":
            artifact_id = workflow.latest_report_xml_artifact_id
        elif role == "generated_sql" and workflow.latest_sql_run_id:
            sql_run = (
                db.query(AnalysisRun)
                .filter(
                    AnalysisRun.id == workflow.latest_sql_run_id,
                    AnalysisRun.project_id == workflow.project_id,
                    AnalysisRun.run_type == "sql_generation",
                )
                .first()
            )
            artifact_id = sql_run.output_artifact_id if sql_run else None
    if not artifact_id:
        raise HTTPException(status_code=404, detail="publish_artifact_not_found")

    artifact = (
        db.query(Artifact)
        .filter(Artifact.id == artifact_id, Artifact.project_id == req.project_id, Artifact.is_deleted.is_(False))
        .first()
    )
    if not artifact:
        raise HTTPException(status_code=404, detail="artifact_not_found")

    stage = str(req.stage or "").strip().upper()
    if stage == "REVIEWER" and role == "report_xml":
        gate = evaluate_stage_exit_gate(db, workflow, settings.min_review_coverage_score)
        if not gate.passed:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "review_publish_gate_blocked",
                    "message": "Reviewer can publish XML only when the current review gate passes.",
                    "gate": gate.as_dict(),
                },
            )

    result = await publish_artifact_to_github(
        db,
        project_id=req.project_id,
        workflow=workflow,
        artifact=artifact,
        actor=req.actor,
        stage=stage or req.stage,
        commit_message=req.commit_message,
    )
    log_workflow_action(
        db,
        workflow_id=workflow.id,
        project_id=workflow.project_id,
        action_type="artifact_published_to_github",
        action_category=req.stage,
        actor=req.actor,
        description=f"Published artifact {artifact.display_name or artifact.filename} to GitHub",
        status="success",
        stage=req.stage,
        details=workflow_action_log_details(
            source_type="artifact",
            source_id=artifact.id,
            artifact=artifact,
            extra={"publish_target": "github", **result},
        ),
    )
    log_system_audit(
        db,
        event_type="artifact_published_to_github",
        event_category="DATA_OPERATION",
        severity="info",
        actor=req.actor,
        description=f"Published artifact {artifact.id} to GitHub",
        target_type="artifact",
        target_id=str(artifact.id),
        project_id=req.project_id,
        details={"workflow_id": workflow.id, "stage": req.stage, **result},
        status="success",
    )
    db.commit()
    return result
