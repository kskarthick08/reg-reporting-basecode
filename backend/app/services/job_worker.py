"""
Background job worker for executing long-running tasks.
Uses FastAPI BackgroundTasks for async execution.
"""
import asyncio
import logging
from typing import Any, Callable, Dict

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import JobQueue
from app.services import job_service
from app.services.ba_gap_orchestration_service import execute_gap_analysis_core, execute_gap_remediation_core
from app.services.sql_generation_service import generate_sql_core
from app.services.xml_review_orchestration_service import execute_xml_generation, execute_xml_validation
from app.schemas import GapAnalysisRequest, GapRemediationRequest, SqlGenerateRequest, XmlGenerateRequest, XmlValidateRequest

logger = logging.getLogger(__name__)


async def execute_job_with_progress(
    job_id: int,
    job_func: Callable,
    job_args: Dict[str, Any],
    progress_steps: list[tuple[int, str]] = None,
) -> None:
    """
    Execute a job function with progress tracking.
    
    Args:
        job_id: Job queue ID
        job_func: Async function to execute
        job_args: Arguments to pass to job_func
        progress_steps: Optional list of (progress_pct, message) tuples for intermediate updates
    """
    db = SessionLocal()
    try:
        # Start the job
        job_service.start_job(db, job_id)
        
        # Execute with progress tracking if steps provided
        if progress_steps:
            for i, (progress_pct, message) in enumerate(progress_steps):
                if i < len(progress_steps) - 1:
                    job_service.update_job_progress(db, job_id, progress_pct, message)
                    # Allow for partial execution and progress updates
                    await asyncio.sleep(0.1)
        
        # Execute the actual job function
        result = await job_func(db, **job_args)
        
        # Mark as completed with results
        job_service.complete_job(
            db,
            job_id,
            result_json=result.get("result_json"),
            result_artifact_id=result.get("result_artifact_id"),
            result_run_id=result.get("result_run_id"),
        )
        
    except Exception as exc:
        # Handle failure
        job_service.handle_job_exception(db, job_id, exc)
        
    finally:
        db.close()


async def execute_gap_analysis_job(db: Session, **kwargs) -> Dict[str, Any]:
    """Execute gap analysis as background job."""
    req_data = kwargs.get("request_data", {})
    req = GapAnalysisRequest(**req_data)
    result = await execute_gap_analysis_core(req, db)
    return {
        "result_json": result,
        "result_run_id": result.get("run_id") if result.get("ok") else None,
    }


async def execute_gap_remediation_job(db: Session, **kwargs) -> Dict[str, Any]:
    """Execute gap remediation as background job."""
    req_data = kwargs.get("request_data", {})
    req = GapRemediationRequest(**req_data)
    result = await execute_gap_remediation_core(req, db)
    return {
        "result_json": result,
        "result_run_id": result.get("run_id") if result.get("ok") else None,
    }


async def execute_sql_generation_job(db: Session, **kwargs) -> Dict[str, Any]:
    """Execute SQL generation as background job."""
    req_data = kwargs.get("request_data", {})
    req = SqlGenerateRequest(**req_data)
    result = await generate_sql_core(req, db)
    return {
        "result_json": result,
        "result_run_id": result.get("run_id") if result.get("ok") else None,
        "result_artifact_id": result.get("artifact_id") if result.get("ok") else None,
    }


async def execute_xml_generation_job(db: Session, **kwargs) -> Dict[str, Any]:
    """Execute XML generation as background job."""
    req_data = kwargs.get("request_data", {})
    req = XmlGenerateRequest(**req_data)
    result = await execute_xml_generation(req, db)
    return {
        "result_json": result,
        "result_run_id": result.get("run_id") if result.get("ok") else None,
        "result_artifact_id": result.get("artifact_id") if result.get("ok") else None,
    }


async def execute_xml_validation_job(db: Session, **kwargs) -> Dict[str, Any]:
    """Execute XML validation as background job."""
    req_data = kwargs.get("request_data", {})
    req = XmlValidateRequest(**req_data)
    result = await execute_xml_validation(req, db)
    return {
        "result_json": result,
        "result_run_id": result.get("run_id") if result.get("ok") else None,
    }


# Job type to function mapping
JOB_TYPE_HANDLERS = {
    "gap_analysis": execute_gap_analysis_job,
    "gap_remediation": execute_gap_remediation_job,
    "sql_generation": execute_sql_generation_job,
    "xml_generation": execute_xml_generation_job,
    "xml_validation": execute_xml_validation_job,
}


# Progress step definitions for different job types
JOB_PROGRESS_STEPS = {
    "gap_analysis": [
        (10, "Extracting requirement lines"),
        (25, "Vectorizing requirements"),
        (40, "Vectorizing data model"),
        (60, "Matching fields"),
        (85, "Generating analysis"),
    ],
    "gap_remediation": [
        (15, "Loading base analysis"),
        (30, "Filtering target rows"),
        (50, "Processing supplemental context"),
        (75, "Generating remediation"),
    ],
    "sql_generation": [
        (20, "Loading functional specification"),
        (40, "Analyzing data model"),
        (70, "Generating SQL"),
        (90, "Validating output"),
    ],
    "xml_generation": [
        (20, "Loading context"),
        (50, "Generating XML structure"),
        (80, "Validating against XSD"),
    ],
    "xml_validation": [
        (30, "Parsing XML"),
        (60, "Validating schema"),
        (85, "Generating report"),
    ],
}


def get_pending_jobs(db: Session, limit: int = 10) -> list[JobQueue]:
    """Fetch the oldest pending jobs for the polling worker."""
    return (
        db.query(JobQueue)
        .filter(JobQueue.status == "pending")
        .order_by(JobQueue.created_at.asc())
        .limit(limit)
        .all()
    )


async def process_pending_jobs_once(batch_size: int = 10) -> int:
    """Process a single batch of queued jobs."""
    db = SessionLocal()
    try:
        processed = 0
        for job in get_pending_jobs(db, limit=batch_size):
            job_func = JOB_TYPE_HANDLERS.get(job.job_type)
            if job_func is None:
                logger.error("Unsupported job type in queue job_id=%s job_type=%s", job.id, job.job_type)
                job_service.fail_job(db, job.id, f"unsupported_job_type:{job.job_type}")
                continue

            request_data = {}
            if isinstance(job.input_json, dict):
                request_data = job.input_json.get("request_data") or {}

            await execute_job_with_progress(
                job_id=job.id,
                job_func=job_func,
                job_args={"request_data": request_data},
                progress_steps=JOB_PROGRESS_STEPS.get(job.job_type),
            )
            processed += 1

        return processed
    finally:
        db.close()


async def start_job_worker(poll_interval_seconds: float = 5.0) -> None:
    """Poll the job table and execute queued work until cancelled."""
    logger.info("Job worker started poll_interval_seconds=%s", poll_interval_seconds)
    while True:
        try:
            processed = await process_pending_jobs_once()
        except asyncio.CancelledError:
            logger.info("Job worker cancelled")
            raise
        except Exception:
            logger.exception("Job worker iteration failed")
            processed = 0

        if processed == 0:
            await asyncio.sleep(poll_interval_seconds)
