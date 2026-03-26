"""
API routes for logging and audit operations.
Provides endpoints for viewing and downloading logs.
"""

import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Workflow
from app.services.logging_service import (
    format_system_audit_log_as_text,
    format_workflow_log_as_text,
    get_system_audit_logs,
    get_workflow_logs,
    log_workflow_action,
)

router = APIRouter(prefix="/api/logs", tags=["logs"])


class WorkflowLogEntry(BaseModel):
    """Schema for workflow action log entry"""

    id: int
    workflow_id: int
    project_id: str
    action_type: str
    action_category: str
    actor: str | None = None
    description: str
    status: str
    stage: str | None = None
    details_json: dict | None = None
    error_message: str | None = None
    duration_ms: int | None = None
    created_at: str


class WorkflowLogsResponse(BaseModel):
    """Response schema for workflow logs"""

    ok: bool = True
    workflow_id: int
    workflow_name: str | None = None
    total_count: int
    logs: list[WorkflowLogEntry]


class SystemAuditLogEntry(BaseModel):
    """Schema for system audit log entry"""

    id: int
    event_type: str
    event_category: str
    severity: str
    actor: str | None = None
    ip_address: str | None = None
    target_type: str | None = None
    target_id: str | None = None
    project_id: str | None = None
    description: str
    details_json: dict | None = None
    status: str
    error_message: str | None = None
    created_at: str


class SystemAuditLogsResponse(BaseModel):
    """Response schema for system audit logs"""

    ok: bool = True
    total_count: int
    logs: list[SystemAuditLogEntry]


@router.get("/workflows/{workflow_id}", response_model=WorkflowLogsResponse)
def get_workflow_action_logs(
    workflow_id: int,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Get action logs for a specific workflow.
    Returns all persona actions and system events for the workflow.
    """
    # Verify workflow exists
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="workflow_not_found")

    logs = get_workflow_logs(db, workflow_id=workflow_id, limit=limit, offset=offset)

    log_entries = [
        WorkflowLogEntry(
            id=log.id,
            workflow_id=log.workflow_id,
            project_id=log.project_id,
            action_type=log.action_type,
            action_category=log.action_category,
            actor=log.actor,
            description=log.description,
            status=log.status,
            stage=log.stage,
            details_json=log.details_json,
            error_message=log.error_message,
            duration_ms=log.duration_ms,
            created_at=log.created_at.isoformat() if log.created_at else "",
        )
        for log in logs
    ]

    # Get total count for pagination
    from app.models_logging import WorkflowActionLog

    total_count = (
        db.query(WorkflowActionLog).filter(WorkflowActionLog.workflow_id == workflow_id).count()
    )

    return WorkflowLogsResponse(
        workflow_id=workflow_id,
        workflow_name=workflow.name,
        total_count=total_count,
        logs=log_entries,
    )


@router.get("/workflows/{workflow_id}/download")
def download_workflow_logs(
    workflow_id: int,
    db: Session = Depends(get_db),
):
    """
    Download complete workflow action logs as a text file.
    Returns all logs for the workflow in human-readable format.
    """
    # Verify workflow exists
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="workflow_not_found")

    log_workflow_action(
        db,
        workflow_id=workflow.id,
        project_id=workflow.project_id,
        action_type="workflow_logs_download",
        action_category=workflow.current_stage if workflow.current_stage in {"BA", "DEV", "REVIEWER"} else "SYSTEM",
        actor="user",
        description="Downloaded workflow action log export",
        status="success",
        stage=workflow.current_stage,
        details={"source_type": "workflow_action_logs", "source_id": workflow.id},
    )
    db.commit()

    # Get all logs for this workflow (no limit)
    logs = get_workflow_logs(db, workflow_id=workflow_id, limit=10000, offset=0)

    # Format as text
    output = io.StringIO()
    output.write(f"WORKFLOW ACTION LOG\n")
    output.write(f"=" * 80 + "\n")
    output.write(f"Workflow ID: {workflow_id}\n")
    output.write(f"Workflow Name: {workflow.name}\n")
    output.write(f"Project ID: {workflow.project_id}\n")
    output.write(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC\n")
    output.write(f"Total Entries: {len(logs)}\n")
    output.write(f"=" * 80 + "\n\n")

    for log in reversed(logs):  # Show oldest first in downloaded file
        output.write(format_workflow_log_as_text(log))
        output.write("\n")

    output.seek(0)
    filename = f"workflow_{workflow_id}_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.txt"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/audit", response_model=SystemAuditLogsResponse)
def get_system_audit_log_entries(
    project_id: str | None = Query(default=None),
    actor: str | None = Query(default=None),
    event_category: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Get system audit logs with optional filters.
    Admin endpoint for viewing system-wide audit trail.
    """
    # Parse dates
    start_datetime = None
    end_datetime = None
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail="invalid_start_date_format")

    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail="invalid_end_date_format")

    logs = get_system_audit_logs(
        db,
        project_id=project_id,
        actor=actor,
        event_category=event_category,
        severity=severity,
        start_date=start_datetime,
        end_date=end_datetime,
        limit=limit,
        offset=offset,
    )

    log_entries = [
        SystemAuditLogEntry(
            id=log.id,
            event_type=log.event_type,
            event_category=log.event_category,
            severity=log.severity,
            actor=log.actor,
            ip_address=log.ip_address,
            target_type=log.target_type,
            target_id=log.target_id,
            project_id=log.project_id,
            description=log.description,
            details_json=log.details_json,
            status=log.status,
            error_message=log.error_message,
            created_at=log.created_at.isoformat() if log.created_at else "",
        )
        for log in logs
    ]

    # Get total count for pagination
    from app.models_logging import SystemAuditLog

    query = db.query(SystemAuditLog)
    if project_id:
        query = query.filter(SystemAuditLog.project_id == project_id)
    if actor:
        query = query.filter(SystemAuditLog.actor == actor)
    if event_category:
        query = query.filter(SystemAuditLog.event_category == event_category.upper())
    if severity:
        query = query.filter(SystemAuditLog.severity == severity.lower())
    if start_datetime:
        query = query.filter(SystemAuditLog.created_at >= start_datetime)
    if end_datetime:
        query = query.filter(SystemAuditLog.created_at <= end_datetime)

    total_count = query.count()

    return SystemAuditLogsResponse(
        total_count=total_count,
        logs=log_entries,
    )


@router.get("/audit/download")
def download_system_audit_logs(
    project_id: str | None = Query(default=None),
    actor: str | None = Query(default=None),
    event_category: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Download system audit logs as a text file.
    Admin endpoint for downloading filtered audit trail.
    """
    # Parse dates
    start_datetime = None
    end_datetime = None
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail="invalid_start_date_format")

    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail="invalid_end_date_format")

    logs = get_system_audit_logs(
        db,
        project_id=project_id,
        actor=actor,
        event_category=event_category,
        severity=severity,
        start_date=start_datetime,
        end_date=end_datetime,
        limit=10000,
        offset=0,
    )

    # Format as text
    output = io.StringIO()
    output.write(f"SYSTEM AUDIT LOG\n")
    output.write(f"=" * 80 + "\n")
    output.write(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC\n")
    if project_id:
        output.write(f"Project Filter: {project_id}\n")
    if actor:
        output.write(f"Actor Filter: {actor}\n")
    if event_category:
        output.write(f"Category Filter: {event_category}\n")
    if severity:
        output.write(f"Severity Filter: {severity}\n")
    if start_date:
        output.write(f"Start Date: {start_date}\n")
    if end_date:
        output.write(f"End Date: {end_date}\n")
    output.write(f"Total Entries: {len(logs)}\n")
    output.write(f"=" * 80 + "\n\n")

    for log in reversed(logs):  # Show oldest first in downloaded file
        output.write(format_system_audit_log_as_text(log))
        output.write("\n")

    output.seek(0)
    filename = f"system_audit_log_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.txt"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
