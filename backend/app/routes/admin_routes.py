from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.constants import AGENT_DEFAULT_PROMPTS
from app.deps import active_instruction, get_db, record_admin_audit, verify_admin
from app.models import AdminAuditLog, AgentInstruction, Workflow, WorkflowStageHistory
from app.paths import SYNTHETIC_ROOT
from app.services.workflow_service import workflow_display_id
from app.services.parsing_service import load_synthetic_folder_to_db

router = APIRouter()


class InstructionUpdateRequest(BaseModel):
    instruction: str
    updated_by: str | None = None


@router.get("/v1/admin/instructions")
def admin_list_instructions(request: Request, db: Session = Depends(get_db)):
    """Handle the list instructions API request."""
    verify_admin(request)
    items = []
    for key, fallback in AGENT_DEFAULT_PROMPTS.items():
        current = active_instruction(db, key, fallback)
        row = (
            db.query(AgentInstruction)
            .filter(AgentInstruction.agent_key == key)
            .order_by(AgentInstruction.version.desc(), AgentInstruction.id.desc())
            .first()
        )
        items.append(
            {
                "agent_key": key,
                "current_instruction": current,
                "version": row.version if row else 0,
                "updated_by": row.updated_by if row else None,
                "updated_at": row.created_at.isoformat() if row and row.created_at else None,
                "is_default": row is None,
            }
        )
    return {"ok": True, "items": items}


@router.get("/v1/admin/instructions/{agent_key}/history")
def admin_instruction_history(
    agent_key: str,
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Handle the instruction history API request."""
    verify_admin(request)
    rows = (
        db.query(AgentInstruction)
        .filter(AgentInstruction.agent_key == agent_key)
        .order_by(AgentInstruction.version.desc(), AgentInstruction.id.desc())
        .limit(limit)
        .all()
    )
    return {
        "ok": True,
        "agent_key": agent_key,
        "items": [
            {
                "version": r.version,
                "instruction": r.instruction,
                "updated_by": r.updated_by,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.put("/v1/admin/instructions/{agent_key}")
def admin_update_instruction(
    agent_key: str,
    req: InstructionUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Handle the update instruction API request."""
    verify_admin(request)
    latest = (
        db.query(AgentInstruction)
        .filter(AgentInstruction.agent_key == agent_key)
        .order_by(AgentInstruction.version.desc(), AgentInstruction.id.desc())
        .first()
    )
    next_version = (latest.version + 1) if latest else 1
    row = AgentInstruction(
        agent_key=agent_key,
        version=next_version,
        instruction=req.instruction.strip(),
        updated_by=(req.updated_by or "admin").strip(),
    )
    db.add(row)
    record_admin_audit(
        db,
        action="instruction_update",
        target_type="agent_instruction",
        target_id=agent_key,
        actor=row.updated_by,
        details={"version": next_version},
    )
    db.commit()
    return {"ok": True, "agent_key": agent_key, "version": next_version}


@router.get("/v1/admin/audit-logs")
def admin_audit_logs(
    request: Request,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Handle the audit logs API request."""
    verify_admin(request)
    rows = db.query(AdminAuditLog).order_by(AdminAuditLog.id.desc()).limit(limit).all()
    return {
        "ok": True,
        "items": [
            {
                "id": r.id,
                "action": r.action,
                "target_type": r.target_type,
                "target_id": r.target_id,
                "project_id": r.project_id,
                "actor": r.actor,
                "details_json": r.details_json or {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


class SyntheticLoadRequest(BaseModel):
    folder_path: str | None = None
    table_prefix: str = "synthetic_"


@router.post("/v1/admin/synthetic/load")
def admin_load_synthetic_data(
    req: SyntheticLoadRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Handle the load synthetic data API request."""
    verify_admin(request)
    folder = Path(req.folder_path).resolve() if req.folder_path else SYNTHETIC_ROOT.resolve()
    loaded = load_synthetic_folder_to_db(folder, table_prefix=req.table_prefix or "synthetic_")
    record_admin_audit(
        db,
        action="synthetic_load",
        target_type="database",
        target_id=str(folder),
        actor="admin",
        details={"tables_loaded": len(loaded)},
    )
    db.commit()
    return {"ok": True, "folder": str(folder), "tables_loaded": len(loaded), "items": loaded}


@router.get("/v1/admin/workflows")
def admin_list_workflows(
    request: Request,
    project_id: str = Query(...),
    include_inactive: bool = Query(True),
    limit: int = Query(300, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    """Handle the list workflows API request."""
    verify_admin(request)
    query = db.query(Workflow).filter(Workflow.project_id == project_id)
    if not include_inactive:
        query = query.filter(Workflow.is_active.is_(True))
    rows = query.order_by(Workflow.updated_at.desc(), Workflow.id.desc()).limit(limit).all()
    return {
        "ok": True,
        "project_id": project_id,
        "items": [
            {
                "id": row.id,
                "display_id": workflow_display_id(row),
                "project_id": row.project_id,
                "name": row.name,
                "psd_version": row.psd_version,
                "current_stage": row.current_stage,
                "status": row.status,
                "assigned_ba": row.assigned_ba,
                "assigned_dev": row.assigned_dev,
                "assigned_reviewer": row.assigned_reviewer,
                "current_assignee": row.current_assignee,
                "started_by": row.started_by,
                "is_active": bool(row.is_active),
                "parent_workflow_id": row.parent_workflow_id,
                "latest_gap_run_id": row.latest_gap_run_id,
                "latest_sql_run_id": row.latest_sql_run_id,
                "latest_xml_run_id": row.latest_xml_run_id,
                "latest_report_xml_artifact_id": row.latest_report_xml_artifact_id,
                "functional_spec_artifact_id": row.functional_spec_artifact_id,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
            for row in rows
        ],
    }


@router.delete("/v1/admin/workflows/{workflow_id}")
def admin_delete_workflow(
    workflow_id: int,
    request: Request,
    project_id: str = Query(...),
    actor: str = Query("admin"),
    hard_delete: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Handle the delete workflow API request."""
    verify_admin(request)
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id, Workflow.project_id == project_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="workflow_not_found")

    if hard_delete:
        db.query(WorkflowStageHistory).filter(WorkflowStageHistory.workflow_id == workflow.id).delete(synchronize_session=False)
        db.delete(workflow)
        record_admin_audit(
            db,
            action="workflow_hard_delete",
            target_type="workflow",
            target_id=str(workflow_id),
            project_id=project_id,
            actor=actor,
            details={"hard_delete": True},
        )
        db.commit()
        return {"ok": True, "workflow_id": workflow_id, "hard_delete": True}

    previous_stage = workflow.current_stage
    workflow.is_active = False
    workflow.status = "cancelled"
    workflow.current_assignee = None
    db.add(
        WorkflowStageHistory(
            workflow_id=workflow.id,
            project_id=workflow.project_id,
            from_stage=previous_stage,
            to_stage=previous_stage,
            action="admin_delete",
            actor=actor,
            comment="Workflow archived by admin",
        )
    )
    record_admin_audit(
        db,
        action="workflow_soft_delete",
        target_type="workflow",
        target_id=str(workflow_id),
        project_id=project_id,
        actor=actor,
        details={"hard_delete": False},
    )
    db.commit()
    return {"ok": True, "workflow_id": workflow_id, "hard_delete": False}
