from types import SimpleNamespace

from fastapi import HTTPException

from app.services import workflow_service


class DummyDb:
    def __init__(self):
        self.items = []
        self.committed = 0
        self.refreshed = 0

    def add(self, item):
        self.items.append(item)

    def commit(self):
        self.committed += 1

    def refresh(self, _item):
        self.refreshed += 1


def _wf(**kwargs):
    base = {
        "id": 101,
        "project_id": "demo",
        "name": "WF",
        "psd_version": "v1",
        "current_stage": "DEV",
        "status": "in_progress",
        "assigned_ba": "ba.user",
        "assigned_dev": "dev.user",
        "assigned_reviewer": "reviewer.user",
        "current_assignee": "dev.user",
        "started_by": "ba.user",
        "parent_workflow_id": None,
        "latest_gap_run_id": 11,
        "latest_sql_run_id": 12,
        "latest_xml_run_id": None,
        "latest_report_xml_artifact_id": None,
        "functional_spec_artifact_id": 9,
        "ba_gap_waivers_json": None,
        "created_at": None,
        "updated_at": None,
        "is_active": True,
    }
    base.update(kwargs)
    return SimpleNamespace(**base)


def test_submit_workflow_stage_moves_to_next_stage(monkeypatch):
    db = DummyDb()
    wf = _wf(current_stage="DEV", current_assignee="dev.user")

    monkeypatch.setattr(
        workflow_service,
        "evaluate_stage_exit_gate",
        lambda _db, _wf, _min_score: SimpleNamespace(passed=True, as_dict=lambda: {"passed": True}),
    )

    updated = workflow_service.submit_workflow_stage(
        db,
        wf,
        actor="dev.user",
        comment="ready",
        min_review_coverage_score=80,
    )
    assert updated.current_stage == "REVIEWER"
    assert updated.current_assignee == "reviewer.user"
    assert db.committed == 1
    assert db.refreshed == 1


def test_send_back_requires_reason_detail_length():
    db = DummyDb()
    wf = _wf(current_stage="REVIEWER", current_assignee="reviewer.user")
    try:
        workflow_service.send_back_workflow_stage(
            db,
            wf,
            actor="reviewer.user",
            target_stage="DEV",
            reason_code="SQL_LOGIC_ISSUE",
            reason_detail="short",
            comment="not enough detail",
        )
        assert False, "Expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 422
        assert exc.detail == "send_back_reason_detail_too_short"


def test_send_back_persists_structured_details():
    db = DummyDb()
    wf = _wf(current_stage="REVIEWER", current_assignee="reviewer.user")

    updated = workflow_service.send_back_workflow_stage(
        db,
        wf,
        actor="reviewer.user",
        target_stage="DEV",
        reason_code="SQL_LOGIC_ISSUE",
        reason_detail="Joins produce duplicate report rows.",
        comment="Please fix join conditions.",
    )
    assert updated.current_stage == "DEV"
    assert updated.current_assignee == "dev.user"
    assert db.committed == 1
    assert db.refreshed == 1
    history = db.items[-1]
    assert history.details_json["reason_code"] == "SQL_LOGIC_ISSUE"
