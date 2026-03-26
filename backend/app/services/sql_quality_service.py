"""Deterministic SQL quality checks for generated DEV extraction scripts."""

from __future__ import annotations

import re
from typing import Any


def extract_select_aliases(sql_text: str) -> list[str]:
    """Extract quoted output aliases from a generated SELECT statement."""
    return [match.strip() for match in re.findall(r'AS\s+"([^"]+)"', sql_text or "", flags=re.IGNORECASE)]


def analyze_sql_quality(gap_rows: list[dict[str, Any]], sql_text: str) -> dict[str, Any]:
    """
    Review generated SQL against the approved mapping rows.

    The goal is not to reject every imperfect draft, but to give DEV a stable,
    deterministic quality signal around coverage, proxy usage, and row-grain risk.
    """
    aliases = extract_select_aliases(sql_text)
    alias_norm = {_normalize(alias) for alias in aliases if alias}
    required_rows = [row for row in gap_rows if isinstance(row, dict)]

    mapped_rows = [row for row in required_rows if str(row.get("matching_column") or "").strip()]
    expected_fields = [str(row.get("field") or "").strip() for row in mapped_rows if str(row.get("field") or "").strip()]
    matched_fields = [field for field in expected_fields if _normalize(field) in alias_norm]
    missing_alias_fields = [field for field in expected_fields if _normalize(field) not in alias_norm]

    partial_rows = [
        str(row.get("field") or "").strip()
        for row in mapped_rows
        if "partial" in str(row.get("status") or "").lower()
    ]
    partial_alias_hits = [field for field in partial_rows if _normalize(field) in alias_norm]

    has_bridge_join = bool(re.search(r"\bjoin\s+bridge_", sql_text or "", flags=re.IGNORECASE))
    has_distinct = bool(re.search(r"\bselect\s+distinct\b", sql_text or "", flags=re.IGNORECASE))
    has_group_by = bool(re.search(r"\bgroup\s+by\b", sql_text or "", flags=re.IGNORECASE))
    row_grain_risk = has_bridge_join and not (has_distinct or has_group_by)

    comments = re.findall(r"--\s*(.+)", sql_text or "")
    proxy_comment_count = sum(1 for comment in comments if "partial" in comment.lower() or "proxy" in comment.lower())

    warnings: list[str] = []
    if missing_alias_fields:
        warnings.append(f"{len(missing_alias_fields)} mapped field aliases are not present in the SQL output.")
    if partial_alias_hits:
        warnings.append(f"{len(partial_alias_hits)} output fields are based on partial/proxy mappings and need DEV review.")
    if row_grain_risk:
        warnings.append("SQL joins a bridge table without DISTINCT or GROUP BY, so row multiplication risk should be reviewed.")
    if proxy_comment_count:
        warnings.append(f"{proxy_comment_count} inline SQL comments indicate proxy or partial mappings.")

    coverage_pct = round((len(matched_fields) / len(expected_fields)) * 100, 2) if expected_fields else 0.0
    quality_status = "review_required" if warnings else "good"

    return {
        "status": quality_status,
        "alias_count": len(aliases),
        "mapped_field_count": len(expected_fields),
        "matched_alias_count": len(matched_fields),
        "missing_alias_count": len(missing_alias_fields),
        "alias_coverage_pct": coverage_pct,
        "partial_proxy_field_count": len(partial_alias_hits),
        "proxy_comment_count": proxy_comment_count,
        "row_grain_risk": row_grain_risk,
        "warnings": warnings,
        "missing_alias_fields": missing_alias_fields[:25],
        "partial_proxy_fields": partial_alias_hits[:25],
    }


def _normalize(value: str) -> str:
    """Normalize text for tolerant comparisons."""
    return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())
