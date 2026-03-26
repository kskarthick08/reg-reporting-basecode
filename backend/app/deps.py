from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import AdminAuditLog, AgentInstruction


def get_db():
    """Yield a database session for request handlers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_admin(request: Request):
    """Ensure the current request is authorized for admin actions."""
    configured = (settings.admin_api_key or "").strip()
    if not configured:
        return
    provided = request.headers.get("x-admin-key", "").strip()
    if not provided or provided != configured:
        raise HTTPException(status_code=403, detail="admin_forbidden")


def record_admin_audit(
    db: Session,
    action: str,
    target_type: str,
    target_id: str | None = None,
    project_id: str | None = None,
    actor: str | None = None,
    details: dict | None = None,
):
    """Record an admin audit entry for the current request."""
    db.add(
        AdminAuditLog(
            action=action,
            target_type=target_type,
            target_id=target_id,
            project_id=project_id,
            actor=actor,
            details_json=details or {},
        )
    )


def active_instruction(db: Session, agent_key: str, fallback: str) -> str:
    """Return the active instruction text for the requested agent."""
    row = (
        db.query(AgentInstruction)
        .filter(AgentInstruction.agent_key == agent_key)
        .order_by(AgentInstruction.version.desc(), AgentInstruction.id.desc())
        .first()
    )
    if row and (row.instruction or "").strip():
        return row.instruction
    return fallback
