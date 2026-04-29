from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import AnalysisRun, Artifact, Workflow, WorkflowStageHistory
from app.services.logging_service import log_workflow_action
from app.services.workflow_provenance_service import ensure_report_xml_can_be_linked
from app.services.sql_generation_service import generate_sql_core
from app.services.workflow_action_log_utils import resolve_workflow_for_run, workflow_action_log_details
from app.services.workflow_access_service import assert_workflow_stage_access
from app.services.xml_review_orchestration_service import execute_xml_generation
from app.schemas import SqlGenerateRequest, XmlGenerateRequest

router = APIRouter()


class LinkReportXmlRequest(BaseModel):
    project_id: str
    workflow_id: int
    report_xml_artifact_id: int
    actor: str = "dev.user"
    comment: str | None = None


@router.post("/v1/sql/generate")
async def generate_sql(req: SqlGenerateRequest, db: Session = Depends(get_db)):
    """Synchronous SQL generation endpoint (for backward compatibility)."""
    return await generate_sql_core(req, db)


@router.post("/v1/sql/generate-async")
async def generate_sql_async(
    req: SqlGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Asynchronous SQL generation - returns immediately with job_id."""
    from app.api.routes.job_routes import start_background_job
    
    job_id = start_background_job(
        background_tasks=background_tasks,
        db=db,
        job_type="sql_generation",
        project_id=req.project_id,
        request_data=req.dict(),
        workflow_id=req.workflow_id,
        actor="DEV",
    )
    
    return {
        "ok": True,
        "job_id": job_id,
        "message": "SQL generation started in background",
    }


@router.post("/dev/sql/generate/async")
async def generate_sql_async_alias(
    req: SqlGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Alias used by the workbench async action."""
    return await generate_sql_async(req, background_tasks, db)


@router.post("/v1/dev/report-xml/generate")
async def generate_report_xml(req: XmlGenerateRequest, db: Session = Depends(get_db)):
    """Generate submission XML during DEV stage."""
    return await execute_xml_generation(req, db)


@router.post("/v1/dev/report-xml/generate-async")
async def generate_report_xml_async(
    req: XmlGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Generate the report XML async for the API response."""
    from app.api.routes.job_routes import start_background_job

    job_id = start_background_job(
        background_tasks=background_tasks,
        db=db,
        job_type="xml_generation",
        project_id=req.project_id,
        request_data=req.dict(),
        workflow_id=req.workflow_id,
        actor="DEV",
    )

    return {
        "ok": True,
        "job_id": job_id,
        "message": "Submission XML generation started in background",
    }


@router.get("/v1/sql/{run_id}/download")
def download_sql(run_id: int, db: Session = Depends(get_db)):
    """Download the SQL for the API response."""
    run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id, AnalysisRun.run_type == "sql_generation").first()
    if not run or not run.output_artifact_id:
        raise HTTPException(status_code=404, detail="run_not_found")
    art = db.query(Artifact).filter(Artifact.id == run.output_artifact_id, Artifact.is_deleted.is_(False)).first()
    if not art:
        raise HTTPException(status_code=404, detail="artifact_not_found")
    workflow = resolve_workflow_for_run(db, run)
    if workflow:
        log_workflow_action(
            db,
            workflow_id=workflow.id,
            project_id=workflow.project_id,
            action_type="sql_download",
            action_category="DEV",
            actor="user",
            description=f"Downloaded SQL artifact: {art.display_name or art.filename}",
            status="success",
            stage="DEV",
            details=workflow_action_log_details(
                source_type="sql_run",
                source_id=run.id,
                artifact=art,
                run=run,
            ),
        )
        db.commit()
    return FileResponse(Path(art.file_path), filename=art.filename, media_type="application/sql")


@router.post("/v1/dev/report-xml/link")
def link_report_xml(req: LinkReportXmlRequest, db: Session = Depends(get_db)):
    """Attach a submission XML artifact to the active DEV workflow."""
    workflow = assert_workflow_stage_access(
        db,
        project_id=req.project_id,
        workflow_id=req.workflow_id,
        required_stage="DEV",
    )

    report_xml = (
        db.query(Artifact)
        .filter(
            Artifact.id == req.report_xml_artifact_id,
            Artifact.project_id == req.project_id,
            Artifact.is_deleted.is_(False),
        )
        .first()
    )
    if not report_xml:
        raise HTTPException(status_code=404, detail="report_xml_artifact_not_found")

    valid_kind = str(report_xml.kind or "").lower() in {"report_xml", "generated_xml"}
    if not valid_kind:
        raise HTTPException(status_code=422, detail="invalid_report_xml_artifact_kind")
    ensure_report_xml_can_be_linked(db, workflow, report_xml)

    workflow.latest_report_xml_artifact_id = report_xml.id
    db.add(
        WorkflowStageHistory(
            workflow_id=workflow.id,
            project_id=workflow.project_id,
            from_stage=workflow.current_stage,
            to_stage=workflow.current_stage,
            action="report_xml_linked",
            actor=req.actor,
            comment=req.comment or f"Report XML linked: artifact {report_xml.id}",
        )
    )
    db.commit()
    db.refresh(workflow)
    
    # Log the report XML linking
    log_workflow_action(
        db,
        workflow_id=workflow.id,
        project_id=workflow.project_id,
        action_type="report_xml_linked",
        action_category="DEV_ACTION",
        actor=req.actor,
        description=f"Report XML artifact {report_xml.id} linked to workflow",
        status="success",
        stage="DEV",
        details={
            "artifact_id": report_xml.id,
            "artifact_filename": report_xml.filename,
            "comment": req.comment,
        },
    )
    db.commit()
    
    return {"ok": True, "workflow_id": workflow.id, "report_xml_artifact_id": report_xml.id}
