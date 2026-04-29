from sqlalchemy import JSON, Column, DateTime, Integer, String, Text, func

from app.db import Base


class JobQueue(Base):
    """
    Job queue for long-running background tasks.
    Enables async processing of BA gap analysis, DEV SQL generation, and Reviewer XML operations.
    """
    __tablename__ = "job_queue"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(50), index=True, nullable=False)  # 'gap_analysis', 'sql_generation', etc.
    status = Column(String(30), index=True, nullable=False, default="pending")  # pending, running, completed, failed, cancelled
    progress_pct = Column(Integer, nullable=False, default=0)  # 0-100
    progress_message = Column(String(255), nullable=True)  # Current step description
    
    workflow_id = Column(Integer, index=True, nullable=True)
    project_id = Column(String(100), index=True, nullable=False)
    actor = Column(String(120), nullable=True)  # User who initiated the job
    
    input_json = Column(JSON, nullable=True)  # Job input parameters
    result_json = Column(JSON, nullable=True)  # Job output/results
    result_artifact_id = Column(Integer, nullable=True)  # Generated artifact ID if applicable
    result_run_id = Column(Integer, nullable=True)  # Analysis run ID if applicable
    
    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
