"""
Gate Configuration API Routes
Admin endpoints for managing workflow stage gate configurations.
"""
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db, record_admin_audit, verify_admin
from app.services.gate_config_service import (
    get_all_gate_configs,
    get_gate_config,
    reset_gate_config,
    upsert_gate_config,
)
from app.services.logging_service import log_system_audit

router = APIRouter()


class GateConfigUpdateRequest(BaseModel):
    """Request model for updating gate configuration."""
    
    gate_enabled: bool | None = None
    
    # BA Gate Settings
    allow_unresolved_missing: bool | None = None
    allow_degraded_quality: bool | None = None
    
    # DEV Gate Settings
    require_sql_validation: bool | None = None
    require_xml_artifact: bool | None = None
    
    # REVIEWER Gate Settings
    min_coverage_score: float | None = Field(None, ge=0.0, le=1.0)
    require_xsd_validation: bool | None = None
    require_rule_checks: bool | None = None
    
    # Metadata
    updated_by: str | None = None


@router.get("/v1/admin/gate-configs")
def admin_list_gate_configs(
    request: Request,
    project_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Retrieve all gate configurations for a project.
    Returns default values if no custom configuration exists.
    """
    verify_admin(request)
    configs = get_all_gate_configs(db, project_id)
    return {"ok": True, "project_id": project_id, "items": configs}


@router.get("/v1/admin/gate-configs/{stage}")
def admin_get_gate_config(
    stage: str,
    request: Request,
    project_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Retrieve gate configuration for a specific stage.
    """
    verify_admin(request)
    config = get_gate_config(db, project_id, stage)
    return {"ok": True, "config": config}


@router.put("/v1/admin/gate-configs/{stage}")
def admin_update_gate_config(
    stage: str,
    req: GateConfigUpdateRequest,
    request: Request,
    project_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Update gate configuration for a specific stage.
    Only provided fields will be updated.
    """
    verify_admin(request)
    
    config = upsert_gate_config(
        db=db,
        project_id=project_id,
        stage=stage,
        gate_enabled=req.gate_enabled,
        allow_unresolved_missing=req.allow_unresolved_missing,
        allow_degraded_quality=req.allow_degraded_quality,
        require_sql_validation=req.require_sql_validation,
        require_xml_artifact=req.require_xml_artifact,
        min_coverage_score=req.min_coverage_score,
        require_xsd_validation=req.require_xsd_validation,
        require_rule_checks=req.require_rule_checks,
        updated_by=req.updated_by or "admin",
    )
    
    record_admin_audit(
        db,
        action="gate_config_update",
        target_type="gate_configuration",
        target_id=f"{project_id}:{stage}",
        project_id=project_id,
        actor=req.updated_by or "admin",
        details={"stage": stage, "config_id": config.get("id")},
    )
    
    # Log to system audit
    log_system_audit(
        db,
        event_type="gate_config_updated",
        event_category="CONFIGURATION",
        severity="info",
        actor=req.updated_by or "admin",
        description=f"Updated gate configuration for stage: {stage}",
        target_type="gate_configuration",
        target_id=f"{project_id}:{stage}",
        details={
            "stage": stage,
            "project_id": project_id,
            "gate_enabled": req.gate_enabled,
            "updated_fields": req.model_dump(exclude_unset=True),
        },
        status="success",
    )
    
    db.commit()
    
    return {"ok": True, "config": config}


@router.delete("/v1/admin/gate-configs/{stage}")
def admin_reset_gate_config(
    stage: str,
    request: Request,
    project_id: str = Query(...),
    actor: str = Query("admin"),
    db: Session = Depends(get_db),
):
    """
    Reset gate configuration to defaults for a specific stage.
    """
    verify_admin(request)
    
    deleted = reset_gate_config(db, project_id, stage)
    
    if deleted:
        record_admin_audit(
            db,
            action="gate_config_reset",
            target_type="gate_configuration",
            target_id=f"{project_id}:{stage}",
            project_id=project_id,
            actor=actor,
            details={"stage": stage},
        )
        
        # Log to system audit
        log_system_audit(
            db,
            event_type="gate_config_reset",
            event_category="CONFIGURATION",
            severity="warning",
            actor=actor,
            description=f"Reset gate configuration to defaults for stage: {stage}",
            target_type="gate_configuration",
            target_id=f"{project_id}:{stage}",
            details={"stage": stage, "project_id": project_id},
            status="success",
        )
        
        db.commit()
    
    return {"ok": True, "deleted": deleted, "stage": stage}
