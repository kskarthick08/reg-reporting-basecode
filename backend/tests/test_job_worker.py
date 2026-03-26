from types import SimpleNamespace

from app.services import job_worker


def test_process_pending_jobs_once_marks_unknown_job_failed(monkeypatch):
    calls = []

    class FakeSession:
        def close(self):
            return None

    monkeypatch.setattr(job_worker, "SessionLocal", lambda: FakeSession())
    monkeypatch.setattr(
        job_worker,
        "get_pending_jobs",
        lambda db, limit=10: [SimpleNamespace(id=7, job_type="unknown", input_json={})],
    )
    monkeypatch.setattr(
        job_worker.job_service,
        "fail_job",
        lambda db, job_id, error_message, error_details=None: calls.append((job_id, error_message)),
    )

    processed = __import__("asyncio").run(job_worker.process_pending_jobs_once())

    assert processed == 0
    assert calls == [(7, "unsupported_job_type:unknown")]


def test_process_pending_jobs_once_executes_known_job(monkeypatch):
    calls = []

    class FakeSession:
        def close(self):
            return None

    async def fake_handler(db, **kwargs):
        return {"ok": True}

    async def fake_execute_job_with_progress(job_id, job_func, job_args, progress_steps=None):
        calls.append((job_id, job_func, job_args, progress_steps))

    monkeypatch.setattr(job_worker, "SessionLocal", lambda: FakeSession())
    monkeypatch.setattr(
        job_worker,
        "get_pending_jobs",
        lambda db, limit=10: [
            SimpleNamespace(id=11, job_type="test_job", input_json={"request_data": {"project_id": "p1"}})
        ],
    )
    monkeypatch.setattr(job_worker, "execute_job_with_progress", fake_execute_job_with_progress)
    monkeypatch.setattr(job_worker, "JOB_TYPE_HANDLERS", {"test_job": fake_handler})
    monkeypatch.setattr(job_worker, "JOB_PROGRESS_STEPS", {"test_job": [(50, "Running")]})

    processed = __import__("asyncio").run(job_worker.process_pending_jobs_once())

    assert processed == 1
    assert calls == [
        (
            11,
            fake_handler,
            {"request_data": {"project_id": "p1"}},
            [(50, "Running")],
        )
    ]
