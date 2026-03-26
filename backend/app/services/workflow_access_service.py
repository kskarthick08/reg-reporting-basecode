from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Workflow


def assert_workflow_stage_access(
    db: Session,
    *,
    project_id: str,
    workflow_id: int | None,
    required_stage: str,
) -> Workflow | None:
    """Load an active workflow and reject edits when it is not in the required stage."""
    if not workflow_id:
        return None

    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.project_id == project_id,
            Workflow.is_active.is_(True),
        )
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="workflow_not_found")
    if workflow.status != "in_progress":
        raise HTTPException(status_code=422, detail="workflow_not_in_progress")
    if workflow.current_stage != required_stage:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "workflow_locked_for_stage",
                "message": f"Workflow is no longer editable in {required_stage}",
                "current_stage": workflow.current_stage,
                "required_stage": required_stage,
            },
        )
    return workflow
