"""Compatibility wrapper for runtime health helpers."""

from app.config import settings
from app.services.runtime import collect_runtime_health, get_startup_state, run_startup_sequence
from app.services.runtime.probes import mask_connection_url, summarize_runtime_status as _summarize_runtime_status
from app.services.runtime.state import build_troubleshooting_steps


def summarize_runtime_status(db_status: dict, redis_status: dict | None, llm_status: dict | None = None) -> tuple[str, bool]:
    """Compatibility wrapper for runtime status checks with optional Redis status."""
    if llm_status is None:
        llm_status = redis_status or {}
        redis_status = None
    if settings.require_redis and redis_status and redis_status.get("ok") is False:
        return "down", False
    return _summarize_runtime_status(db_status, llm_status or {})

__all__ = [
    "build_troubleshooting_steps",
    "collect_runtime_health",
    "get_startup_state",
    "mask_connection_url",
    "run_startup_sequence",
    "settings",
    "summarize_runtime_status",
]
