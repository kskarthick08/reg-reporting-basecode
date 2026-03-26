"""Analytics helpers backed only by persisted workflow data."""

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Query, Session

from app.models import AnalysisRun, Artifact, Workflow, WorkflowStageHistory
from app.models_logging import WorkflowActionLog

GENERATED_ARTIFACT_KINDS = {"generated_sql", "generated_xml", "functional_spec"}


def _apply_project_filter(query: Query, model: Any, project_id: str | None) -> Query:
    """Handle apply project filter within the service layer."""
    if project_id:
        query = query.filter(model.project_id == project_id)
    return query


def _count_by(query: Query, column: Any) -> dict[str, int]:
    """Handle count by within the service layer."""
    rows = query.with_entities(column, func.count()).group_by(column).all()
    counts: dict[str, int] = {}
    for key, value in rows:
        counts[str(key or "UNKNOWN")] = int(value or 0)
    return counts


def _latest_iso(row: Any, field_name: str = "created_at") -> str | None:
    """Handle latest iso within the service layer."""
    if not row:
        return None
    value = getattr(row, field_name, None)
    return value.isoformat() if value else None


def _distinct_workflow_count(query: Query, model: Any) -> int:
    """Handle distinct workflow count within the service layer."""
    value = query.with_entities(func.count(func.distinct(model.workflow_id))).scalar()
    return int(value or 0)


def calculate_dashboard_metrics(db: Session, project_id: str | None = None) -> dict[str, Any]:
    """High-level factual totals for stored workflow and execution data."""
    workflow_query = _apply_project_filter(db.query(Workflow), Workflow, project_id)
    artifact_query = _apply_project_filter(db.query(Artifact), Artifact, project_id)
    run_query = _apply_project_filter(db.query(AnalysisRun), AnalysisRun, project_id)
    history_query = _apply_project_filter(db.query(WorkflowStageHistory), WorkflowStageHistory, project_id)
    action_query = _apply_project_filter(db.query(WorkflowActionLog), WorkflowActionLog, project_id)

    total_workflows = workflow_query.count()
    active_workflows = workflow_query.filter(Workflow.is_active.is_(True)).count()
    completed_workflows = workflow_query.filter(Workflow.status == "completed").count()
    in_progress_workflows = workflow_query.filter(Workflow.status == "in_progress").count()

    completed = workflow_query.filter(Workflow.status == "completed").all()
    avg_cycle_hours = 0.0
    if completed:
        elapsed_hours = [
            (workflow.updated_at - workflow.created_at).total_seconds() / 3600
            for workflow in completed
            if workflow.updated_at and workflow.created_at
        ]
        if elapsed_hours:
            avg_cycle_hours = round(sum(elapsed_hours) / len(elapsed_hours), 1)

    send_backs = history_query.filter(WorkflowStageHistory.action == "send_back").count()
    submissions = history_query.filter(WorkflowStageHistory.action == "submit").count()
    quality_first_pass_rate = round(((submissions - send_backs) / submissions) * 100, 1) if submissions > 0 else 100.0

    return {
        "total_workflows": total_workflows,
        "active_workflows": active_workflows,
        "completed_workflows": completed_workflows,
        "in_progress_workflows": in_progress_workflows,
        "avg_cycle_time_hours": avg_cycle_hours,
        "total_artifacts": artifact_query.count(),
        "total_analysis_runs": run_query.count(),
        "total_stage_events": history_query.count(),
        "total_action_logs": action_query.count(),
        "quality_first_pass_rate": quality_first_pass_rate,
        "send_back_count": send_backs,
    }


def get_workflow_pipeline_status(db: Session, project_id: str | None = None) -> dict[str, Any]:
    """Current workflow stage distribution."""
    query = _apply_project_filter(
        db.query(Workflow).filter(Workflow.is_active.is_(True)),
        Workflow,
        project_id,
    )
    stage_counts = query.with_entities(Workflow.current_stage, func.count(Workflow.id)).group_by(Workflow.current_stage).all()

    pipeline = {"BA": 0, "DEV": 0, "REVIEWER": 0, "COMPLETED": 0}
    for stage, count in stage_counts:
        pipeline[str(stage)] = int(count or 0)

    stuck_threshold = datetime.utcnow() - timedelta(hours=24)
    stuck_workflows = query.filter(Workflow.updated_at < stuck_threshold).count()
    return {"pipeline": pipeline, "stuck_workflows": stuck_workflows}


def calculate_cycle_times(db: Session, project_id: str | None = None) -> dict[str, Any]:
    """Average elapsed time between recorded stage events."""
    history_query = _apply_project_filter(db.query(WorkflowStageHistory), WorkflowStageHistory, project_id)
    transitions = history_query.order_by(WorkflowStageHistory.workflow_id, WorkflowStageHistory.created_at).all()

    stage_times: dict[str, list[float]] = {"BA": [], "DEV": [], "REVIEWER": []}
    workflow_stages: dict[int, list[WorkflowStageHistory]] = {}

    for transition in transitions:
        workflow_stages.setdefault(int(transition.workflow_id), []).append(transition)

    for events in workflow_stages.values():
        for index in range(len(events) - 1):
            current = events[index]
            next_event = events[index + 1]
            stage = str(current.to_stage or "")
            if stage in stage_times and current.created_at and next_event.created_at:
                hours = (next_event.created_at - current.created_at).total_seconds() / 3600
                stage_times[stage].append(hours)

    return {
        "average_hours_by_stage": {
            stage: round(sum(hours) / len(hours), 1) if hours else 0.0
            for stage, hours in stage_times.items()
        }
    }


def get_artifact_metrics(db: Session, project_id: str | None = None) -> dict[str, Any]:
    """Artifact inventory based on persisted artifact rows."""
    query = _apply_project_filter(db.query(Artifact), Artifact, project_id)
    latest_artifact = query.order_by(Artifact.created_at.desc()).first()
    return {
        "total_artifacts": query.count(),
        "active_artifacts": query.filter(Artifact.is_deleted.is_(False)).count(),
        "deleted_artifacts": query.filter(Artifact.is_deleted.is_(True)).count(),
        "generated_artifacts": query.filter(Artifact.kind.in_(GENERATED_ARTIFACT_KINDS)).count(),
        "by_kind": _count_by(query, Artifact.kind),
        "latest_artifact_at": _latest_iso(latest_artifact),
    }


def get_run_metrics(db: Session, project_id: str | None = None) -> dict[str, Any]:
    """Analysis run totals by type and status."""
    query = _apply_project_filter(db.query(AnalysisRun), AnalysisRun, project_id)
    latest_run = query.order_by(AnalysisRun.created_at.desc()).first()
    return {
        "total_runs": query.count(),
        "completed_runs": query.filter(AnalysisRun.status == "completed").count(),
        "failed_runs": query.filter(AnalysisRun.status == "failed").count(),
        "by_type": _count_by(query, AnalysisRun.run_type),
        "by_status": _count_by(query, AnalysisRun.status),
        "latest_run_at": _latest_iso(latest_run),
    }


def get_quality_metrics(db: Session, project_id: str | None = None) -> dict[str, Any]:
    """Quality statistics derived from workflow stage history only."""
    history_query = _apply_project_filter(db.query(WorkflowStageHistory), WorkflowStageHistory, project_id)
    send_backs = history_query.filter(WorkflowStageHistory.action == "send_back").all()

    reason_counts: dict[str, int] = {}
    for send_back in send_backs:
        details = send_back.details_json if isinstance(send_back.details_json, dict) else {}
        reason = str(details.get("reason_code") or "UNKNOWN")
        reason_counts[reason] = reason_counts.get(reason, 0) + 1

    stage_submissions = (
        history_query.filter(WorkflowStageHistory.action == "submit")
        .with_entities(WorkflowStageHistory.from_stage, func.count(WorkflowStageHistory.id))
        .group_by(WorkflowStageHistory.from_stage)
        .all()
    )
    stage_send_backs = (
        history_query.filter(WorkflowStageHistory.action == "send_back")
        .with_entities(WorkflowStageHistory.from_stage, func.count(WorkflowStageHistory.id))
        .group_by(WorkflowStageHistory.from_stage)
        .all()
    )

    submissions_dict = {str(stage): int(count or 0) for stage, count in stage_submissions}
    send_backs_dict = {str(stage): int(count or 0) for stage, count in stage_send_backs}
    pass_rates: dict[str, float] = {}
    for stage in ("BA", "DEV", "REVIEWER"):
        total = submissions_dict.get(stage, 0) + send_backs_dict.get(stage, 0)
        passed = submissions_dict.get(stage, 0)
        pass_rates[stage] = round((passed / total) * 100, 1) if total > 0 else 100.0

    return {
        "send_back_reasons": reason_counts,
        "total_send_backs": len(send_backs),
        "pass_rate_by_stage": pass_rates,
    }


def get_activity_capture_metrics(db: Session, project_id: str | None = None) -> dict[str, Any]:
    """Coverage of workflow activity capture across stage history and action logs."""
    workflow_query = _apply_project_filter(db.query(Workflow), Workflow, project_id)
    history_query = _apply_project_filter(db.query(WorkflowStageHistory), WorkflowStageHistory, project_id)
    action_query = _apply_project_filter(db.query(WorkflowActionLog), WorkflowActionLog, project_id)

    total_workflows = workflow_query.count()
    workflows_with_stage_history = _distinct_workflow_count(history_query, WorkflowStageHistory)
    workflows_with_action_logs = _distinct_workflow_count(action_query, WorkflowActionLog)
    latest_stage_event = history_query.order_by(WorkflowStageHistory.created_at.desc()).first()
    latest_action_log = action_query.order_by(WorkflowActionLog.created_at.desc()).first()

    coverage_pct = round((workflows_with_action_logs / total_workflows) * 100, 1) if total_workflows > 0 else 0.0
    logged_download_actions = action_query.filter(WorkflowActionLog.action_type.like("%_download")).count()

    return {
        "stage_history_events": history_query.count(),
        "workflow_action_logs": action_query.count(),
        "workflows_with_stage_history": workflows_with_stage_history,
        "workflows_with_action_logs": workflows_with_action_logs,
        "workflows_without_action_logs": max(total_workflows - workflows_with_action_logs, 0),
        "action_logging_coverage_pct": coverage_pct,
        "logged_download_actions": logged_download_actions,
        "action_category_breakdown": _count_by(action_query, WorkflowActionLog.action_category),
        "action_status_breakdown": _count_by(action_query, WorkflowActionLog.status),
        "latest_stage_event_at": _latest_iso(latest_stage_event),
        "latest_action_log_at": _latest_iso(latest_action_log),
    }


def get_team_performance(db: Session, project_id: str | None = None) -> dict[str, Any]:
    """Observed actor activity without persona inference."""
    history_query = _apply_project_filter(db.query(WorkflowStageHistory), WorkflowStageHistory, project_id)
    action_query = _apply_project_filter(db.query(WorkflowActionLog), WorkflowActionLog, project_id)

    actors: dict[str, dict[str, Any]] = {}
    for event in history_query.all():
        actor = str(event.actor or "unknown")
        bucket = actors.setdefault(actor, {"actor": actor, "stage_events": 0, "action_logs": 0, "total_actions": 0, "latest_activity_at": None})
        bucket["stage_events"] += 1
        bucket["total_actions"] += 1
        if event.created_at and (bucket["latest_activity_at"] is None or event.created_at > bucket["latest_activity_at"]):
            bucket["latest_activity_at"] = event.created_at

    for event in action_query.all():
        actor = str(event.actor or "unknown")
        bucket = actors.setdefault(actor, {"actor": actor, "stage_events": 0, "action_logs": 0, "total_actions": 0, "latest_activity_at": None})
        bucket["action_logs"] += 1
        bucket["total_actions"] += 1
        if event.created_at and (bucket["latest_activity_at"] is None or event.created_at > bucket["latest_activity_at"]):
            bucket["latest_activity_at"] = event.created_at

    actor_list = sorted(actors.values(), key=lambda item: item["total_actions"], reverse=True)
    return {
        "actors": [
            {**item, "latest_activity_at": item["latest_activity_at"].isoformat() if item["latest_activity_at"] else None}
            for item in actor_list[:20]
        ],
        "total_active_actors": len(actor_list),
    }


def get_recent_activity(db: Session, project_id: str | None = None, limit: int = 12) -> list[dict[str, Any]]:
    """Recent workflow events from both stage history and workflow action logs."""
    history_query = _apply_project_filter(db.query(WorkflowStageHistory), WorkflowStageHistory, project_id)
    action_query = _apply_project_filter(db.query(WorkflowActionLog), WorkflowActionLog, project_id)

    history_rows = history_query.order_by(WorkflowStageHistory.created_at.desc()).limit(limit).all()
    action_rows = action_query.order_by(WorkflowActionLog.created_at.desc()).limit(limit).all()

    items: list[dict[str, Any]] = []
    for row in history_rows:
        items.append(
            {
                "id": f"stage-{row.id}",
                "source": "stage_history",
                "workflow_id": row.workflow_id,
                "action": row.action,
                "actor": row.actor,
                "stage": row.to_stage,
                "from_stage": row.from_stage,
                "to_stage": row.to_stage,
                "status": None,
                "description": row.comment,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
        )
    for row in action_rows:
        items.append(
            {
                "id": f"log-{row.id}",
                "source": "workflow_action_log",
                "workflow_id": row.workflow_id,
                "action": row.action_type,
                "actor": row.actor,
                "stage": row.stage,
                "from_stage": None,
                "to_stage": None,
                "status": row.status,
                "description": row.description,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
        )

    items.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    return items[:limit]
