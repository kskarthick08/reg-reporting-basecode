import json
from pathlib import Path


RULES_DIR = Path(__file__).resolve().parent / "mapping_rules"


def _column_only(name: str) -> str:
    """Return the column portion of a qualified model field reference."""
    txt = (name or "").strip()
    if ":" not in txt:
        return txt
    return txt.split(":")[-1].strip()


def load_mapping_rules(dataset_family: str | None) -> dict:
    """Load default rules and optionally overlay dataset-specific mapping policies."""
    base = {}
    default_file = RULES_DIR / "default.json"
    if default_file.exists():
        try:
            base = json.loads(default_file.read_text(encoding="utf-8"))
        except Exception:
            base = {}

    if not dataset_family:
        return base

    rule_file = RULES_DIR / f"{dataset_family.strip().lower()}.json"
    if not rule_file.exists():
        return base
    try:
        family = json.loads(rule_file.read_text(encoding="utf-8"))
    except Exception:
        return base

    merged = dict(base)
    merged.update(family)
    merged["field_aliases"] = {**(base.get("field_aliases") or {}), **(family.get("field_aliases") or {})}
    merged["status_thresholds"] = {**(base.get("status_thresholds") or {}), **(family.get("status_thresholds") or {})}
    merged["forbidden_full_match_columns"] = list(
        {
            *[str(x) for x in (base.get("forbidden_full_match_columns") or [])],
            *[str(x) for x in (family.get("forbidden_full_match_columns") or [])],
        }
    )
    return merged


def apply_mapping_rules(rows: list[dict], model_fields: list[str], rules: dict) -> list[dict]:
    """Apply dataset-specific mapping overrides and confidence/status thresholds."""
    if not rules:
        return rows

    out = []
    field_aliases = {str(k).lower(): v for k, v in (rules.get("field_aliases") or {}).items()}
    thresholds = rules.get("status_thresholds") or {}
    full_min = float(thresholds.get("full_match_min", 0.0))
    partial_min = float(thresholds.get("partial_match_min", 0.0))
    forbidden_full = {str(v).lower() for v in (rules.get("forbidden_full_match_columns") or [])}

    by_column = {_column_only(m).lower(): m for m in model_fields if _column_only(m)}
    by_exact = {m.lower(): m for m in model_fields}

    for r in rows:
        rr = dict(r)
        field_key = str(rr.get("field", "")).strip().lower()
        status = str(rr.get("status", "")).strip()
        conf = float(rr.get("confidence", 0.0) or 0.0)
        mc = str(rr.get("matching_column", "")).strip()

        aliases = field_aliases.get(field_key) or []
        if aliases:
            for a in aliases:
                txt = str(a).strip()
                resolved = by_exact.get(txt.lower()) or by_column.get(_column_only(txt).lower())
                if resolved:
                    rr["matching_column"] = resolved
                    if status == "Missing":
                        rr["status"] = "Partial Match"
                        rr["confidence"] = max(conf, partial_min or 0.6)
                    break

        mc_lower = str(rr.get("matching_column", "")).lower()
        if status == "Full Match" and mc_lower in forbidden_full:
            rr["status"] = "Partial Match"
            rr["confidence"] = max(partial_min or 0.6, min(float(rr.get("confidence", 0.0) or 0.0), 0.79))
            desc = str(rr.get("description", "") or "").strip()
            rr["description"] = f"{desc} Rule adjustment: full match downgraded by dataset policy.".strip()

        if rr.get("status") == "Full Match" and float(rr.get("confidence", 0.0) or 0.0) < full_min:
            rr["status"] = "Partial Match"
        if rr.get("status") == "Partial Match" and float(rr.get("confidence", 0.0) or 0.0) < partial_min:
            rr["status"] = "Missing"

        out.append(rr)

    return out
