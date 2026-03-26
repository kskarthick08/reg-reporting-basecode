import re
from collections import Counter
from typing import Any

from pydantic import TypeAdapter

from app.schemas import GapRow

_REF_RE = re.compile(r"^\s*(\d{1,3}[A-Z])\b")
_HEADER_HINTS = (
    "contents",
    "overview",
    "document history",
    "list of abbreviations",
    "user stories",
    "appendix",
)


def _norm(value: str) -> str:
    """Normalize text for tolerant comparisons."""
    return re.sub(r"\s+", " ", str(value or "").strip())


def _is_header_like(text: str) -> bool:
    """Handle is header like within the service layer."""
    t = _norm(text).lower()
    if not t:
        return True
    if any(h in t for h in _HEADER_HINTS):
        return True
    if re.fullmatch(r"\d+(\.\d+)*\s+.*\d+", t):
        return True
    return False


def extract_required_fields(requirements_text: str, limit: int = 1500) -> list[dict[str, str]]:
    """Extract canonical FCA required fields (ref + label) from mixed DOCX text/table lines."""
    rows: list[dict[str, str]] = []
    seen_ref: set[str] = set()
    seen_field: set[str] = set()
    lines = [ln for ln in re.split(r"[\r\n]+", requirements_text or "") if _norm(ln)]

    def _push(ref: str, field: str):
        """Handle push within the service layer."""
        rr = _norm(ref).upper()
        ff = _norm(field)
        if not rr or not ff:
            return
        if _is_header_like(ff):
            return
        key = f"{rr}|{ff.lower()}"
        if rr in seen_ref or key in seen_field:
            return
        seen_ref.add(rr)
        seen_field.add(key)
        rows.append({"ref": rr, "field": ff})

    for ln in lines:
        text = _norm(ln)
        # Table-style row: "1A | Transaction reference | ..."
        if "|" in text:
            cells = [_norm(c) for c in text.split("|") if _norm(c)]
            if len(cells) >= 2 and _REF_RE.match(cells[0]):
                _push(cells[0], cells[1])
                if len(rows) >= limit:
                    break
                continue

        # Inline style: "1A Transaction reference ..."
        m = _REF_RE.match(text)
        if m:
            ref = m.group(1)
            tail = _norm(text[m.end() :]).lstrip(":-. ")
            if tail:
                _push(ref, tail)
                if len(rows) >= limit:
                    break

    return rows


def heuristic_gap(requirements_text: str, model_fields: list[str]) -> list[dict[str, Any]]:
    """Handle heuristic gap within the service layer."""
    lines = [ln.strip() for ln in re.split(r"[\r\n]+", requirements_text or "") if ln.strip()]
    if not lines:
        lines = ["Customer ID", "Account Number", "Agreement Date", "Amount", "Status"]

    mf_l = [(f, f.lower()) for f in model_fields]
    out = []
    for i, ln in enumerate(lines[:120], start=1):
        match = best_field_match(ln, model_fields)
        if match and len(match) > 0:
            status = "Full Match"
            conf = 0.86
        else:
            guess = next((f for f, fl in mf_l if any(tok in fl for tok in re.findall(r"[a-z0-9]+", ln.lower()))), "")
            if guess:
                match = guess
                status = "Partial Match"
                conf = 0.63
            else:
                match = ""
                status = "Missing"
                conf = 0.32
        out.append(
            {
                "ref": f"REQ-{i:03d}",
                "field": ln[:180],
                "matching_column": match,
                "status": status,
                "confidence": conf,
                "description": "Heuristic fallback result. Replace via BA review.",
                "evidence": "Heuristic token overlap against provided model field list.",
            }
        )
    return out


def best_field_match(text: str, model_fields: list[str]) -> str:
    """Handle best field match within the service layer."""
    q = re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()
    if not q:
        return ""
    tokens = [t for t in q.split() if len(t) > 2]
    if not tokens:
        return ""
    best = ("", -1)
    for f in model_fields:
        fl = re.sub(r"[^a-z0-9]+", " ", f.lower())
        s = sum(1 for t in tokens if t in fl)
        if s > best[1]:
            best = (f, s)
    return best[0] if best[1] > 0 else ""


def column_only(name: str) -> str:
    """Return the column portion of a dotted field reference."""
    txt = str(name or "").strip()
    if ":" in txt:
        return txt.split(":", 1)[1].strip()
    return txt


def normalize_gap_rows(rows: list[dict], model_fields: list[str]) -> list[dict]:
    """Normalize gap rows within the service layer."""
    out = []
    model_lut = {m.lower(): m for m in model_fields}
    col_lut = {column_only(m).lower(): m for m in model_fields}
    for r in rows:
        rr = dict(r or {})
        rr["ref"] = str(rr.get("ref") or "").strip() or f"REQ-{len(out)+1:03d}"
        rr["field"] = str(rr.get("field") or "").strip()[:250]
        mc = str(rr.get("matching_column") or "").strip()
        norm = model_lut.get(mc.lower()) or col_lut.get(mc.lower()) or mc
        rr["matching_column"] = norm
        st = str(rr.get("status") or "").strip().lower()
        if "full" in st:
            rr["status"] = "Full Match"
        elif "partial" in st:
            rr["status"] = "Partial Match"
        else:
            rr["status"] = "Missing"
        try:
            cf = float(rr.get("confidence", 0.0))
        except Exception:
            cf = 0.0
        rr["confidence"] = max(0.0, min(1.0, cf))
        desc = str(rr.get("description") or "").strip()[:1200]
        if desc and "BA review note:" not in desc.lower():
            rr["description"] = f"{desc} BA review note: verify the field label is verbatim from FCA source and confirm transformation assumptions."
        else:
            rr["description"] = desc or "Mapping assessment generated from FCA field text and model field candidates. BA review required."
        rr["evidence"] = str(rr.get("evidence") or "").strip()[:1200] or "No explicit evidence returned by LLM; fallback normalization applied."
        out.append(rr)
    return out


def unwrap_gap_rows(payload: dict | list | None) -> list[dict] | None:
    """Unwrap gap rows within the service layer."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        rows = payload.get("rows")
        if isinstance(rows, list):
            return rows
    return None


def validate_gap_rows(rows: list[dict]) -> list[dict]:
    """Validate gap rows within the service layer."""
    adapter = TypeAdapter(list[GapRow])
    validated = adapter.validate_python(rows)
    return [item.model_dump() for item in validated]


def detect_dataset_family(fca_text: str) -> str | None:
    """Detect dataset family within the service layer."""
    txt = str(fca_text or "")
    matches = re.findall(r"\b(psd\d{3})\b", txt, flags=re.IGNORECASE)
    if matches:
        counts = Counter(m.lower() for m in matches)
        return counts.most_common(1)[0][0]
    return None


def _norm_text(value: str) -> str:
    """Normalize text for tolerant comparisons."""
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _tokens(value: str) -> list[str]:
    """Split text into comparison tokens."""
    return [t for t in re.findall(r"[a-z0-9]+", _norm_text(value)) if len(t) > 2]


def _token_overlap(a: str, b: str) -> float:
    """Measure token overlap between normalized text values."""
    aa = set(_tokens(a))
    bb = set(_tokens(b))
    if not aa or not bb:
        return 0.0
    return len(aa & bb) / max(len(aa), 1)


def enforce_gap_quality(rows: list[dict], requirements_text: str, model_fields: list[str]) -> list[dict]:
    """Enforce gap quality within the service layer."""
    source_norm = _norm_text(requirements_text)
    model_lookup = {str(m).strip().lower(): str(m).strip() for m in model_fields}
    out: list[dict] = []
    seen_fields: set[str] = set()

    for row in rows:
        rr = dict(row or {})
        field = str(rr.get("field") or "").strip()
        field_key = field.lower()
        if not field or field_key in seen_fields:
            continue
        seen_fields.add(field_key)

        mapped = str(rr.get("matching_column") or "").strip()
        mapped_l = mapped.lower()
        mapped_exact = model_lookup.get(mapped_l)
        downgrade_reason = ""
        if not mapped_exact:
            # If model field is unknown, it cannot be a full/partial grounded match.
            rr["matching_column"] = ""
            rr["status"] = "Missing"
            rr["confidence"] = min(float(rr.get("confidence") or 0.0), 0.2)
            downgrade_reason = "matching_column not found in provided data model field list"
        else:
            rr["matching_column"] = mapped_exact
            overlap = _token_overlap(field, mapped_exact)
            status = str(rr.get("status") or "")
            conf = float(rr.get("confidence") or 0.0)
            if "full" in status.lower() and overlap < 0.2:
                rr["status"] = "Partial Match"
                rr["confidence"] = min(conf, 0.72)
            elif "partial" in status.lower() and overlap < 0.1:
                rr["status"] = "Missing"
                rr["matching_column"] = ""
                rr["confidence"] = min(conf, 0.35)
                downgrade_reason = "low semantic overlap between FCA field and matched data model field"

        # Field labels not present in source text are likely hallucinated.
        if _norm_text(field) and _norm_text(field) not in source_norm:
            rr["status"] = "Missing"
            rr["matching_column"] = ""
            rr["confidence"] = min(float(rr.get("confidence") or 0.0), 0.25)
            downgrade_reason = "field label not found verbatim in FCA source"

        # Keep explanation consistent with enforced status.
        if str(rr.get("status") or "").strip() == "Missing":
            desc = str(rr.get("description") or "").strip()
            ev = str(rr.get("evidence") or "").strip()
            reason = downgrade_reason or "quality guard downgraded row to Missing"
            if desc:
                rr["description"] = (
                    f"{desc} Final status set to Missing because {reason}. "
                    "BA should verify source extraction and canonical field naming."
                )[:1200]
            else:
                rr["description"] = (
                    f"Row marked Missing because {reason}. "
                    "BA should verify source extraction and canonical field naming."
                )
            rr["evidence"] = (ev or f"Quality guard reason: {reason}.")[:1200]

        out.append(rr)

    return out


def enforce_required_coverage(rows: list[dict], required_fields: list[dict[str, str]]) -> list[dict]:
    """
    Ensure one output row exists for each required FCA field.
    Missing mappings are explicitly added as Missing rows.
    """
    if not required_fields:
        return rows

    by_ref: dict[str, dict] = {}
    by_field: dict[str, dict] = {}
    for r in rows:
        ref = _norm(str(r.get("ref") or "")).upper()
        field = _norm(str(r.get("field") or "")).lower()
        if ref and ref not in by_ref:
            by_ref[ref] = r
        if field and field not in by_field:
            by_field[field] = r

    out: list[dict] = []
    for req in required_fields:
        ref = _norm(req.get("ref") or "").upper()
        field = _norm(req.get("field") or "")
        row = by_ref.get(ref) or by_field.get(field.lower())
        if row:
            rr = dict(row)
            rr["ref"] = ref or str(rr.get("ref") or "")
            rr["field"] = field or str(rr.get("field") or "")
            rr["description"] = str(rr.get("description") or "Mapped row. BA review required for rule checks.")
            rr["evidence"] = str(rr.get("evidence") or "Matched against provided data model field list.")
            out.append(rr)
            continue
        out.append(
            {
                "ref": ref or "n/a",
                "field": field or "Unknown FCA field",
                "matching_column": "",
                "status": "Missing",
                "confidence": 0.0,
                "description": "No mapping row returned for this required FCA field. BA should verify source extraction and mapping logic.",
                "evidence": "Coverage guard inserted this row because no LLM output matched the required ref/field.",
            }
        )

    return out


def compute_gap_diagnostics(rows: list[dict], required_fields: list[dict[str, str]]) -> dict[str, float | int]:
    """Compute gap diagnostics within the service layer."""
    expected = len(required_fields or [])
    returned = len(rows or [])
    missing = 0
    mapped = 0
    injected = 0
    for r in rows or []:
        status = str(r.get("status") or "").strip().lower()
        if "missing" in status:
            missing += 1
        else:
            mapped += 1
        evidence = str(r.get("evidence") or "")
        if evidence.startswith("Coverage guard inserted this row"):
            injected += 1
    coverage_pct = round((returned / expected) * 100.0, 2) if expected else 0.0
    mapped_coverage_pct = round((mapped / expected) * 100.0, 2) if expected else 0.0
    return {
        "expected_required_count": expected,
        "returned_count": returned,
        "missing_count": missing,
        "mapped_count": mapped,
        "coverage_pct": coverage_pct,
        "mapped_coverage_pct": mapped_coverage_pct,
        "injected_missing_count": injected,
    }


def enforce_matching_column_dot_format(rows: list[dict], model_fields: list[str]) -> list[dict]:
    """
    Ensure matching_column is emitted as table.column where possible.
    - Converts table:column -> table.column
    - Resolves plain column -> table.column when unique in model_fields
    """
    col_to_table: dict[str, str] = {}
    collisions: set[str] = set()
    for mf in model_fields or []:
        txt = str(mf or "").strip()
        if ":" not in txt:
            continue
        table, col = txt.split(":", 1)
        t = table.strip()
        c = col.strip()
        if not t or not c:
            continue
        key = c.lower()
        if key in col_to_table and col_to_table[key] != t:
            collisions.add(key)
        else:
            col_to_table[key] = t

    out: list[dict] = []
    model_set = {str(m or "").strip().lower() for m in model_fields or []}
    for row in rows or []:
        rr = dict(row)
        mc = str(rr.get("matching_column") or "").strip()
        if not mc:
            out.append(rr)
            continue

        if ":" in mc:
            table, col = mc.split(":", 1)
            rr["matching_column"] = f"{table.strip()}.{col.strip()}"
            out.append(rr)
            continue

        if "." in mc:
            out.append(rr)
            continue

        # If evidence/description already contains table:column hint, prefer that mapping.
        hint_text = f"{rr.get('evidence', '')} {rr.get('description', '')}"
        hint = re.search(
            r"\b([A-Za-z_][A-Za-z0-9_]*)[:.](" + re.escape(mc) + r")\b",
            str(hint_text),
            flags=re.IGNORECASE,
        )
        if hint:
            hinted_table = hint.group(1)
            candidate_key = f"{hinted_table}:{mc}".lower()
            if candidate_key in model_set:
                rr["matching_column"] = f"{hinted_table}.{mc}"
                out.append(rr)
                continue

        key = mc.lower()
        table = col_to_table.get(key)
        if table and key not in collisions:
            rr["matching_column"] = f"{table}.{mc}"
        out.append(rr)
    return out
