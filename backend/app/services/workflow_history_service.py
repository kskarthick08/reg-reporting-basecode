from app.models import WorkflowStageHistory


def add_workflow_history(
    *,
    workflow_id: int,
    project_id: str,
    from_stage: str | None,
    to_stage: str,
    action: str,
    actor: str | None,
    comment: str | None = None,
    details_json: dict | None = None,
) -> WorkflowStageHistory:
    """Add workflow history within the service layer."""
    return WorkflowStageHistory(
        workflow_id=workflow_id,
        project_id=project_id,
        from_stage=from_stage,
        to_stage=to_stage,
        action=action,
        actor=actor,
        comment=comment,
        details_json=details_json,
    )
