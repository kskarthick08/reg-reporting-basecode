import re
from dataclasses import dataclass


def _norm(v: str) -> str:
    """Normalize text for tolerant comparisons."""
    txt = re.sub(r"[^a-z0-9]+", " ", str(v or "").lower()).strip()
    return re.sub(r"\s+", " ", txt)


@dataclass
class ParserProfile:
    id: str
    header_hints: set[str]
    min_fields: int = 1
    require_targets: bool = False


PROFILES = [
    ParserProfile(
        id="psd_logical_model",
        header_hints={
            "field ref",
            "column name",
            "data type",
            "nullable y n",
            "source system",
            "table",
        },
        min_fields=10,
        require_targets=True,
    ),
    ParserProfile(
        id="generic_excel_model",
        header_hints={"table", "table name", "column name", "field name", "attribute name"},
        min_fields=1,
        require_targets=False,
    ),
]


def detect_profile(headers: list[str], fields_count: int, targets_count: int) -> dict:
    """Detect profile."""
    normalized_headers = {_norm(h) for h in headers if str(h).strip()}

    best = None
    best_hits = -1
    for p in PROFILES:
        hits = sum(1 for h in normalized_headers if h in p.header_hints)
        if hits > best_hits:
            best_hits = hits
            best = p

    if not best:
        return {
            "profile_id": "unknown",
            "supported": False,
            "reason": "no_matching_profile",
            "missing_headers": [],
        }

    missing_headers = []
    if best_hits <= 0:
        missing_headers = sorted(best.header_hints)[:10]
    supported = best_hits > 0 and fields_count >= best.min_fields
    if best.require_targets and targets_count <= 0:
        supported = False

    reason = ""
    if not supported:
        if best_hits <= 0:
            reason = "missing_required_headers"
        elif fields_count < best.min_fields:
            reason = "insufficient_model_fields"
        elif best.require_targets and targets_count <= 0:
            reason = "missing_table_column_targets"
        else:
            reason = "unsupported_structure"

    return {
        "profile_id": best.id,
        "supported": supported,
        "reason": reason,
        "missing_headers": missing_headers,
    }
