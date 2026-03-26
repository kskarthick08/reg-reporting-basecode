import logging
from typing import Any

import httpx

from app.config import settings


logger = logging.getLogger("app.llm_client")

MODEL_ALIASES: dict[str, str] = {
    "gpt-5.1-mini": "gpt-5.1-codex-mini",
}

def resolve_gateway_model(model: str | None) -> str:
    """Normalize local model labels into the canonical ids expected by the gateway."""
    raw = str(model or "").strip()
    if not raw:
        return str(settings.axet_llm_model or "gpt-5-mini").strip()
    # Gateway expects canonical model ids without provider suffixes.
    # Examples:
    # - gpt-4.1-mini:ntt -> gpt-4.1-mini
    # - eu.anthropic...:aws-anthropic -> eu.anthropic...
    if raw.endswith(":ntt"):
        return raw[: -len(":ntt")]
    if raw.endswith(":aws-anthropic"):
        return raw[: -len(":aws-anthropic")]
    if raw.endswith(":0:aws-anthropic"):
        return raw[: -len(":0:aws-anthropic")]
    return MODEL_ALIASES.get(raw, raw)


async def call_axet_chat(messages: list[dict[str, str]], request_id: str, model: str | None = None) -> dict[str, Any]:
    """Send a chat-completions request to the configured gateway and return raw JSON."""
    chosen_model = resolve_gateway_model(model or settings.axet_llm_model)
    payload = {
        "requestId": request_id,
        "model": chosen_model,
        "messages": messages,
    }
    timeout = httpx.Timeout(timeout=240.0, connect=20.0, read=240.0, write=60.0)
    if settings.llm_log_payload:
        preview = str(payload)
        logger.info(
            "LLM request start request_id=%s model=%s url=%s payload_preview=%s",
            request_id,
            chosen_model,
            settings.axet_llm_url,
            preview[: settings.llm_log_max_chars],
        )
    else:
        logger.info(
            "LLM request start request_id=%s model=%s url=%s messages=%d",
            request_id,
            chosen_model,
            settings.axet_llm_url,
            len(messages or []),
        )

    async with httpx.AsyncClient(timeout=timeout, verify=settings.axet_llm_verify_ssl) as client:
        try:
            response = await client.post(settings.axet_llm_url, json=payload)
            logger.info(
                "LLM response received request_id=%s status=%s",
                request_id,
                response.status_code,
            )
            if response.status_code >= 400:
                body_preview = (response.text or "")[: settings.llm_log_max_chars]
                logger.error(
                    "LLM request failed request_id=%s status=%s body_preview=%s",
                    request_id,
                    response.status_code,
                    body_preview,
                )
            response.raise_for_status()
            data = response.json()
            if settings.llm_log_payload:
                out_preview = str(data)
                logger.info(
                    "LLM response parsed request_id=%s response_preview=%s",
                    request_id,
                    out_preview[: settings.llm_log_max_chars],
                )
            return data
        except httpx.HTTPError as exc:
            logger.exception("LLM transport error request_id=%s error=%s", request_id, str(exc))
            raise
