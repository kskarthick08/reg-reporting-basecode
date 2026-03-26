"""
Job queue service for managing background job lifecycle.
"""
import traceback
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models_jobs import JobQueue


def create_job(
    db: Session,
    job_type: str,
    project_id: str,
    input_json: Dict[str, Any],
    workflow_id: Optional[int] = None,
    actor: Optional[str] = None,
) -> JobQueue:
    """Create a new job in pending status."""
    job = JobQueue(
        job_type=job_type,
        status="pending",
        progress_pct=0,
        project_id=project_id,
        workflow_id=workflow_id,
        actor=actor,
        input_json=input_json,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_job(db: Session, job_id: int) -> Optional[JobQueue]:
    """Get a job by ID."""
    return db.query(JobQueue).filter(JobQueue.id == job_id).first()


def get_jobs(
    db: Session,
    project_id: Optional[str] = None,
    workflow_id: Optional[int] = None,
    actor: Optional[str] = None,
    status: Optional[str] = None,
    job_type: Optional[str] = None,
    limit: int = 50,
) -> List[JobQueue]:
    """Get jobs with optional filters."""
    query = db.query(JobQueue)
    
    if project_id:
        query = query.filter(JobQueue.project_id == project_id)
    if workflow_id is not None:
        query = query.filter(JobQueue.workflow_id == workflow_id)
    if actor:
        query = query.filter(JobQueue.actor == actor)
    if status:
        query = query.filter(JobQueue.status == status)
    if job_type:
        query = query.filter(JobQueue.job_type == job_type)
    
    return query.order_by(JobQueue.created_at.desc()).limit(limit).all()


def update_job_progress(
    db: Session,
    job_id: int,
    progress_pct: int,
    progress_message: Optional[str] = None,
) -> Optional[JobQueue]:
    """Update job progress percentage and message."""
    job = get_job(db, job_id)
    if not job:
        return None
    
    job.progress_pct = max(0, min(100, progress_pct))
    if progress_message:
        job.progress_message = progress_message
    
    db.commit()
    db.refresh(job)
    return job


def start_job(db: Session, job_id: int) -> Optional[JobQueue]:
    """Mark job as running and set started_at timestamp."""
    job = get_job(db, job_id)
    if not job:
        return None
    
    job.status = "running"
    job.started_at = datetime.utcnow()
    job.progress_pct = 0
    job.progress_message = "Starting..."
    
    db.commit()
    db.refresh(job)
    return job


def complete_job(
    db: Session,
    job_id: int,
    result_json: Optional[Dict[str, Any]] = None,
    result_artifact_id: Optional[int] = None,
    result_run_id: Optional[int] = None,
) -> Optional[JobQueue]:
    """Mark job as completed with results."""
    job = get_job(db, job_id)
    if not job:
        return None
    
    job.status = "completed"
    job.progress_pct = 100
    job.progress_message = "Completed"
    job.completed_at = datetime.utcnow()
    
    if result_json:
        job.result_json = result_json
    if result_artifact_id:
        job.result_artifact_id = result_artifact_id
    if result_run_id:
        job.result_run_id = result_run_id
    
    db.commit()
    db.refresh(job)
    return job


def fail_job(
    db: Session,
    job_id: int,
    error_message: str,
    error_details: Optional[Dict[str, Any]] = None,
) -> Optional[JobQueue]:
    """Mark job as failed with error information."""
    job = get_job(db, job_id)
    if not job:
        return None
    
    job.status = "failed"
    job.completed_at = datetime.utcnow()
    job.error_message = error_message
    
    if error_details:
        job.error_details = error_details
    
    db.commit()
    db.refresh(job)
    return job


def cancel_job(db: Session, job_id: int) -> Optional[JobQueue]:
    """Mark job as cancelled."""
    job = get_job(db, job_id)
    if not job:
        return None
    
    if job.status in ["completed", "failed"]:
        return job  # Cannot cancel completed/failed jobs
    
    job.status = "cancelled"
    job.cancelled_at = datetime.utcnow()
    job.progress_message = "Cancelled by user"
    
    db.commit()
    db.refresh(job)
    return job


def get_active_jobs(db: Session, project_id: Optional[str] = None) -> List[JobQueue]:
    """Get all jobs that are pending or running."""
    query = db.query(JobQueue).filter(JobQueue.status.in_(["pending", "running"]))
    
    if project_id:
        query = query.filter(JobQueue.project_id == project_id)
    
    return query.order_by(JobQueue.created_at.desc()).all()


def serialize_job(job: JobQueue) -> Dict[str, Any]:
    """Convert job to JSON-serializable dict."""
    return {
        "id": job.id,
        "job_type": job.job_type,
        "status": job.status,
        "progress_pct": job.progress_pct,
        "progress_message": job.progress_message,
        "workflow_id": job.workflow_id,
        "project_id": job.project_id,
        "actor": job.actor,
        "input_json": job.input_json,
        "result_json": job.result_json,
        "result_artifact_id": job.result_artifact_id,
        "result_run_id": job.result_run_id,
        "error_message": job.error_message,
        "error_details": job.error_details,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "cancelled_at": job.cancelled_at.isoformat() if job.cancelled_at else None,
    }


def handle_job_exception(db: Session, job_id: int, exc: Exception) -> Optional[JobQueue]:
    """Handle exception during job execution and update job status."""
    error_message = str(exc)
    error_details = {
        "exception_type": type(exc).__name__,
        "traceback": traceback.format_exc(),
    }
    try:
        db.rollback()
    except Exception:
        pass
    return fail_job(db, job_id, error_message, error_details)
