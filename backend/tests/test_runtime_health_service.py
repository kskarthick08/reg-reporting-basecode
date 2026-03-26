from app.services import runtime_health_service


def test_mask_connection_url_hides_password():
    masked = runtime_health_service.mask_connection_url("postgresql+psycopg://user:secret@db.example.com:5431/app")
    assert "secret" not in masked
    assert "***" in masked


def test_summarize_runtime_status_marks_llm_outage_as_degraded(monkeypatch):
    monkeypatch.setattr(runtime_health_service.settings, "require_redis", False)
    status, ready = runtime_health_service.summarize_runtime_status(
        {"ok": True, "schema": {"complete": True}, "vector_installed": True},
        {"ok": None},
        {"ok": False},
    )
    assert status == "degraded"
    assert ready is True


def test_summarize_runtime_status_requires_redis_only_when_enabled(monkeypatch):
    monkeypatch.setattr(runtime_health_service.settings, "require_redis", True)
    status, ready = runtime_health_service.summarize_runtime_status(
        {"ok": True, "schema": {"complete": True}, "vector_installed": True},
        {"ok": False},
        {"ok": True},
    )
    assert status == "down"
    assert ready is False


def test_build_troubleshooting_steps_for_database_mentions_database_url():
    steps = runtime_health_service.build_troubleshooting_steps("database")
    assert any("DATABASE_URL" in step for step in steps)
