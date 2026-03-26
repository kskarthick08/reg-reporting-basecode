"""
Manager Dashboard Routes
Provides analytics and metrics endpoints for managers.
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.services.manager_analytics_service import (
    calculate_cycle_times,
    calculate_dashboard_metrics,
    get_activity_capture_metrics,
    get_artifact_metrics,
    get_quality_metrics,
    get_recent_activity,
    get_run_metrics,
    get_team_performance,
    get_workflow_pipeline_status,
)

router = APIRouter()


def get_db():
    """Yield a database session for request handlers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DashboardMetricsResponse(BaseModel):
    ok: bool = True
    data_sources: list[str]
    metrics: dict
    pipeline: dict
    cycle_times: dict
    artifacts: dict
    runs: dict
    quality: dict
    activity_capture: dict
    recent_activity: list


@router.get("/v1/manager/dashboard", response_model=DashboardMetricsResponse)
def get_manager_dashboard(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive dashboard metrics for managers.
    Combines all analytics into a single response for efficiency.
    """
    metrics = calculate_dashboard_metrics(db, project_id)
    pipeline = get_workflow_pipeline_status(db, project_id)
    cycle_times = calculate_cycle_times(db, project_id)
    artifacts = get_artifact_metrics(db, project_id)
    runs = get_run_metrics(db, project_id)
    quality = get_quality_metrics(db, project_id)
    activity_capture = get_activity_capture_metrics(db, project_id)
    recent_activity = get_recent_activity(db, project_id, limit=10)

    return {
        "ok": True,
        "data_sources": [
            "workflows",
            "artifacts",
            "analysis_runs",
            "workflow_stage_history",
            "workflow_action_logs",
        ],
        "metrics": metrics,
        "pipeline": pipeline,
        "cycle_times": cycle_times,
        "artifacts": artifacts,
        "runs": runs,
        "quality": quality,
        "activity_capture": activity_capture,
        "recent_activity": recent_activity,
    }


@router.get("/v1/manager/metrics")
def get_summary_metrics(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get executive summary metrics only."""
    return {
        "ok": True,
        "data": calculate_dashboard_metrics(db, project_id),
    }


@router.get("/v1/manager/pipeline")
def get_pipeline_status(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get workflow pipeline status."""
    return {
        "ok": True,
        "data": get_workflow_pipeline_status(db, project_id),
    }


@router.get("/v1/manager/cycle-times")
def get_cycle_times(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get average cycle times by stage."""
    return {
        "ok": True,
        "data": calculate_cycle_times(db, project_id),
    }


@router.get("/v1/manager/runs")
@router.get("/v1/manager/ai-metrics")
def get_run_summary(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get persisted analysis run metrics."""
    return {
        "ok": True,
        "data": get_run_metrics(db, project_id),
    }


@router.get("/v1/manager/quality")
def get_quality_stats(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get quality and accuracy metrics."""
    return {
        "ok": True,
        "data": get_quality_metrics(db, project_id),
    }


@router.get("/v1/manager/activity-capture")
def get_activity_capture(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get workflow activity capture coverage."""
    return {
        "ok": True,
        "data": get_activity_capture_metrics(db, project_id),
    }


@router.get("/v1/manager/team")
def get_team_stats(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get observed actor activity without persona inference."""
    return {
        "ok": True,
        "data": get_team_performance(db, project_id),
    }


@router.get("/v1/manager/artifacts")
def get_artifact_summary(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get persisted artifact inventory metrics."""
    return {
        "ok": True,
        "data": get_artifact_metrics(db, project_id),
    }


@router.get("/v1/manager/activity")
def get_activity(
    project_id: str | None = Query(None),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get recent workflow activity."""
    return {
        "ok": True,
        "data": get_recent_activity(db, project_id, limit),
    }
