"""
Logging service for workflow actions and system audit events.
Provides centralized logging functionality with consistent structure.
"""

import time
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models import SystemAuditLog, WorkflowActionLog
from app.services.workflow_action_log_utils import (
    normalize_action_category,
    normalize_action_type,
    normalize_actor,
    normalize_stage,
    normalize_status,
)


def log_workflow_action(
    db: Session,
    *,
    workflow_id: int,
    project_id: str,
    action_type: str,
    action_category: str,
    description: str,
    actor: str | None = None,
    status: str = "success",
    stage: str | None = None,
    details: dict[str, Any] | None = None,
    error_message: str | None = None,
    duration_ms: int | None = None,
) -> WorkflowActionLog:
    """
    Log a workflow action to the database.

    Args:
        db: Database session
        workflow_id: ID of the workflow
        project_id: Project identifier
        action_type: Type of action (e.g., "gap_analysis", "submit_stage")
        action_category: Category/persona (e.g., "BA", "DEV", "REVIEWER", "SYSTEM")
        description: Human-readable description of the action
        actor: User/persona who performed the action
        status: Action status ("success", "failure", "partial")
        stage: Workflow stage when action occurred
        details: Additional action metadata
        error_message: Error details if action failed
        duration_ms: Action duration in milliseconds

    Returns:
        Created WorkflowActionLog instance
    """
    category_value = normalize_action_category(action_category, actor=actor, stage=stage)
    log_entry = WorkflowActionLog(
        workflow_id=workflow_id,
        project_id=project_id,
        action_type=normalize_action_type(action_type),
        action_category=category_value,
        actor=normalize_actor(actor, action_category=category_value),
        description=description,
        status=normalize_status(status),
        stage=normalize_stage(stage, action_category=category_value),
        details_json=details,
        error_message=error_message,
        duration_ms=duration_ms,
    )
    db.add(log_entry)
    if hasattr(db, "flush"):
        db.flush()  # Get ID without committing
    return log_entry


def log_system_audit(
    db: Session,
    *,
    event_type: str,
    event_category: str,
    description: str,
    severity: str = "info",
    actor: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    project_id: str | None = None,
    details: dict[str, Any] | None = None,
    status: str = "success",
    error_message: str | None = None,
) -> SystemAuditLog:
    """
    Log a system audit event to the database.

    Args:
        db: Database session
        event_type: Type of event (e.g., "user_login", "config_change")
        event_category: Category (e.g., "AUTH", "CONFIG", "DATA")
        description: Human-readable description
        severity: Event severity ("info", "warning", "error", "critical")
        actor: User who triggered the event
        ip_address: IP address of the client
        user_agent: User agent string
        target_type: Type of target affected (e.g., "workflow", "artifact")
        target_id: ID of the target
        project_id: Project identifier
        details: Additional event metadata
        status: Event status ("success", "failure")
        error_message: Error details if event failed

    Returns:
        Created SystemAuditLog instance
    """
    log_entry = SystemAuditLog(
        event_type=event_type,
        event_category=event_category.upper(),
        severity=severity.lower(),
        actor=actor,
        ip_address=ip_address,
        user_agent=user_agent,
        target_type=target_type,
        target_id=target_id,
        project_id=project_id,
        description=description,
        details_json=details,
        status=status,
        error_message=error_message,
    )
    db.add(log_entry)
    db.flush()  # Get ID without committing
    return log_entry


def get_workflow_logs(
    db: Session,
    workflow_id: int,
    limit: int = 1000,
    offset: int = 0,
) -> list[WorkflowActionLog]:
    """
    Retrieve workflow action logs for a specific workflow.

    Args:
        db: Database session
        workflow_id: Workflow ID to filter by
        limit: Maximum number of logs to return
        offset: Number of logs to skip

    Returns:
        List of WorkflowActionLog instances
    """
    return (
        db.query(WorkflowActionLog)
        .filter(WorkflowActionLog.workflow_id == workflow_id)
        .order_by(WorkflowActionLog.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )


def get_system_audit_logs(
    db: Session,
    *,
    project_id: str | None = None,
    actor: str | None = None,
    event_category: str | None = None,
    severity: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    limit: int = 1000,
    offset: int = 0,
) -> list[SystemAuditLog]:
    """
    Retrieve system audit logs with optional filters.

    Args:
        db: Database session
        project_id: Filter by project ID
        actor: Filter by actor
        event_category: Filter by event category
        severity: Filter by severity level
        start_date: Filter logs after this date
        end_date: Filter logs before this date
        limit: Maximum number of logs to return
        offset: Number of logs to skip

    Returns:
        List of SystemAuditLog instances
    """
    query = db.query(SystemAuditLog)

    if project_id:
        query = query.filter(SystemAuditLog.project_id == project_id)
    if actor:
        query = query.filter(SystemAuditLog.actor == actor)
    if event_category:
        query = query.filter(SystemAuditLog.event_category == event_category.upper())
    if severity:
        query = query.filter(SystemAuditLog.severity == severity.lower())
    if start_date:
        query = query.filter(SystemAuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(SystemAuditLog.created_at <= end_date)

    return query.order_by(SystemAuditLog.created_at.desc()).limit(limit).offset(offset).all()


def format_workflow_log_as_text(log: WorkflowActionLog) -> str:
    """
    Format a workflow action log entry as human-readable text.

    Args:
        log: WorkflowActionLog instance

    Returns:
        Formatted text string
    """
    timestamp = log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "N/A"
    actor_str = f" by {log.actor}" if log.actor else ""
    stage_str = f" [Stage: {log.stage}]" if log.stage else ""
    duration_str = f" (Duration: {log.duration_ms}ms)" if log.duration_ms else ""

    text = f"[{timestamp}] {log.action_category} - {log.action_type}{actor_str}{stage_str}\n"
    text += f"  Status: {log.status.upper()}{duration_str}\n"
    text += f"  Description: {log.description}\n"

    if log.details_json:
        text += f"  Details: {log.details_json}\n"

    if log.error_message:
        text += f"  Error: {log.error_message}\n"

    return text


def format_system_audit_log_as_text(log: SystemAuditLog) -> str:
    """
    Format a system audit log entry as human-readable text.

    Args:
        log: SystemAuditLog instance

    Returns:
        Formatted text string
    """
    timestamp = log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "N/A"
    actor_str = f" by {log.actor}" if log.actor else ""
    target_str = f" [{log.target_type}:{log.target_id}]" if log.target_type and log.target_id else ""

    text = f"[{timestamp}] {log.severity.upper()} - {log.event_category} - {log.event_type}{actor_str}{target_str}\n"
    text += f"  Status: {log.status.upper()}\n"
    text += f"  Description: {log.description}\n"

    if log.ip_address:
        text += f"  IP: {log.ip_address}\n"

    if log.details_json:
        text += f"  Details: {log.details_json}\n"

    if log.error_message:
        text += f"  Error: {log.error_message}\n"

    return text


class WorkflowActionTimer:
    """Context manager for timing workflow actions and automatically logging them."""

    def __init__(
        self,
        db: Session,
        workflow_id: int,
        project_id: str,
        action_type: str,
        action_category: str,
        description: str,
        actor: str | None = None,
        stage: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        """Initialize the object state for the surrounding workflow helper."""
        self.db = db
        self.workflow_id = workflow_id
        self.project_id = project_id
        self.action_type = action_type
        self.action_category = action_category
        self.description = description
        self.actor = actor
        self.stage = stage
        self.details = details or {}
        self.start_time = 0
        self.log_entry: WorkflowActionLog | None = None

    def __enter__(self):
        """Enter the context manager and start timing the workflow action."""
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the context manager and finalize workflow timing details."""
        duration_ms = int((time.time() - self.start_time) * 1000)
        status = "failure" if exc_type else "success"
        error_message = str(exc_val) if exc_val else None

        self.log_entry = log_workflow_action(
            self.db,
            workflow_id=self.workflow_id,
            project_id=self.project_id,
            action_type=self.action_type,
            action_category=self.action_category,
            description=self.description,
            actor=self.actor,
            status=status,
            stage=self.stage,
            details=self.details,
            error_message=error_message,
            duration_ms=duration_ms,
        )
        return False  # Don't suppress exceptions
