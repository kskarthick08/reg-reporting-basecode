"""
Database models for logging and audit trails.
Separates logging concerns from main models.
"""

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text, func

from app.db import Base


class WorkflowActionLog(Base):
    """
    Logs all persona actions within workflows.
    Provides complete audit trail for workflow operations.
    """

    __tablename__ = "workflow_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, index=True, nullable=False)
    project_id = Column(String(100), index=True, nullable=False)
    
    # Action identification
    action_type = Column(String(80), index=True, nullable=False)  # e.g., "gap_analysis", "submit_stage"
    action_category = Column(String(40), index=True, nullable=False)  # e.g., "BA", "DEV", "REVIEWER", "SYSTEM"
    
    # Actor information
    actor = Column(String(120), index=True, nullable=True)  # persona/user who performed action
    
    # Action details
    description = Column(Text, nullable=False)  # Human-readable description
    status = Column(String(40), index=True, nullable=False)  # "success", "failure", "partial"
    
    # Contextual data
    stage = Column(String(40), index=True, nullable=True)  # Workflow stage when action occurred
    details_json = Column(JSON, nullable=True)  # Action-specific metadata
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    
    # Performance tracking
    duration_ms = Column(Integer, nullable=True)  # Action duration in milliseconds
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)


class SystemAuditLog(Base):
    """
    System-wide audit log for administrative and security events.
    Captures events beyond workflow context.
    """

    __tablename__ = "system_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Event classification
    event_type = Column(String(80), index=True, nullable=False)  # e.g., "user_login", "config_change"
    event_category = Column(String(40), index=True, nullable=False)  # e.g., "AUTH", "CONFIG", "DATA"
    severity = Column(String(20), index=True, nullable=False)  # "info", "warning", "error", "critical"
    
    # Actor information
    actor = Column(String(120), index=True, nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)
    
    # Target information
    target_type = Column(String(80), index=True, nullable=True)  # e.g., "workflow", "artifact", "user"
    target_id = Column(String(120), nullable=True)
    
    # Context
    project_id = Column(String(100), index=True, nullable=True)
    description = Column(Text, nullable=False)
    details_json = Column(JSON, nullable=True)
    
    # Result
    status = Column(String(40), index=True, nullable=False)  # "success", "failure"
    error_message = Column(Text, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
