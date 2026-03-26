"""
Job management API routes for background task monitoring and control.
"""
import asyncio
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.deps import get_db
from app.services import job_service
from app.services.job_worker import JOB_PROGRESS_STEPS, JOB_TYPE_HANDLERS, execute_job_with_progress

router = APIRouter()


def get_stream_jobs(
    *,
    actor: Optional[str] = None,
    project_id: Optional[str] = None,
    workflow_id: Optional[int] = None,
    active_only: bool = False,
) -> list[dict]:
    """Fetch job snapshots for SSE without holding a DB session open."""
    db = SessionLocal()
    try:
        if active_only:
            jobs = job_service.get_active_jobs(db, project_id=project_id)
            if workflow_id is not None:
                jobs = [job for job in jobs if job.workflow_id == workflow_id]
        else:
            jobs = job_service.get_jobs(
                db,
                project_id=project_id,
                workflow_id=workflow_id,
                actor=actor,
                limit=100,
            )
        return [job_service.serialize_job(job) for job in jobs]
    finally:
        db.close()


@router.get("/jobs/by-actor/{actor}")
def get_jobs_by_actor(
    actor: str,
    project_id: Optional[str] = Query(None),
    workflow_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Get jobs for a specific actor (BA, DEV, Reviewer, etc.)."""
    jobs = job_service.get_jobs(
        db,
        project_id=project_id,
        workflow_id=workflow_id,
        actor=actor,
        limit=limit,
    )
    
    return [job_service.serialize_job(job) for job in jobs]


@router.get("/jobs/stream/{actor}")
async def stream_jobs_by_actor(
    actor: str,
    project_id: Optional[str] = Query(None),
    workflow_id: Optional[int] = Query(None),
):
    """SSE stream for jobs by actor."""
    
    async def event_generator():
        """Handle the event generator API request."""
        last_jobs_state = {}
        
        try:
            while True:
                jobs = get_stream_jobs(
                    actor=actor,
                    project_id=project_id,
                    workflow_id=workflow_id,
                )
                
                for job in jobs:
                    job_key = f"{job['id']}"
                    current_state = f"{job['status']}:{job['progress_pct']}"
                    
                    if job_key not in last_jobs_state or last_jobs_state[job_key] != current_state:
                        last_jobs_state[job_key] = current_state
                        import json
                        yield f"data: {json.dumps(job)}\n\n"
                
                await asyncio.sleep(1)
                
        except asyncio.CancelledError:
            pass
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/jobs/active")
def get_active_jobs_simple(
    project_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get active jobs (simpler endpoint for frontend)."""
    jobs = job_service.get_active_jobs(db, project_id=project_id)
    return [job_service.serialize_job(job) for job in jobs]


@router.get("/v1/jobs/stream")
async def stream_job_updates(
    project_id: Optional[str] = Query(None),
    workflow_id: Optional[int] = Query(None),
):
    """
    Server-Sent Events (SSE) endpoint for real-time job updates.
    Streams job status changes to connected clients.
    """
    
    async def event_generator():
        """Generate SSE events for job updates."""
        import json
        last_jobs_state = {}
        
        try:
            while True:
                jobs = get_stream_jobs(
                    project_id=project_id,
                    workflow_id=workflow_id,
                    active_only=True,
                )
                
                for job in jobs:
                    job_key = f"{job['id']}"
                    current_state = f"{job['status']}:{job['progress_pct']}"
                    
                    if job_key not in last_jobs_state or last_jobs_state[job_key] != current_state:
                        last_jobs_state[job_key] = current_state
                        yield f"data: {json.dumps(job)}\n\n"
                
                active_job_ids = {str(job["id"]) for job in jobs}
                last_jobs_state = {k: v for k, v in last_jobs_state.items() if k in active_job_ids}
                await asyncio.sleep(1)
                
        except asyncio.CancelledError:
            pass
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/v1/jobs/{job_id}")
def get_job_status(job_id: int, db: Session = Depends(get_db)):
    """Get status of a specific job."""
    job = job_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job_not_found")
    
    return {"ok": True, "job": job_service.serialize_job(job)}


@router.get("/v1/jobs")
def list_jobs(
    project_id: Optional[str] = Query(None),
    workflow_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List jobs with optional filters."""
    jobs = job_service.get_jobs(
        db,
        project_id=project_id,
        workflow_id=workflow_id,
        status=status,
        job_type=job_type,
        limit=limit,
    )
    
    return {
        "ok": True,
        "jobs": [job_service.serialize_job(job) for job in jobs],
        "count": len(jobs),
    }


@router.get("/v1/jobs/active")
def list_active_jobs(
    project_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get all active (pending/running) jobs."""
    jobs = job_service.get_active_jobs(db, project_id=project_id)
    
    return {
        "ok": True,
        "jobs": [job_service.serialize_job(job) for job in jobs],
        "count": len(jobs),
    }


@router.post("/v1/jobs/{job_id}/cancel")
def cancel_job(job_id: int, db: Session = Depends(get_db)):
    """Cancel a pending or running job."""
    job = job_service.cancel_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job_not_found")
    
    return {"ok": True, "job": job_service.serialize_job(job)}


def start_background_job(
    background_tasks: BackgroundTasks,
    db: Session,
    job_type: str,
    project_id: str,
    request_data: dict,
    workflow_id: Optional[int] = None,
    actor: Optional[str] = None,
) -> int:
    """
    Helper to create and start a background job.
    Returns the job ID immediately while processing continues in background.
    """
    # Create job in database
    job = job_service.create_job(
        db,
        job_type=job_type,
        project_id=project_id,
        input_json={"request_data": request_data},
        workflow_id=workflow_id,
        actor=actor,
    )
    
    # Get job handler and progress steps
    job_func = JOB_TYPE_HANDLERS.get(job_type)
    if not job_func:
        raise ValueError(f"Unknown job type: {job_type}")
    
    progress_steps = JOB_PROGRESS_STEPS.get(job_type)
    
    # Start background execution
    background_tasks.add_task(
        execute_job_with_progress,
        job_id=job.id,
        job_func=job_func,
        job_args={"request_data": request_data},
        progress_steps=progress_steps,
    )
    
    return job.id
