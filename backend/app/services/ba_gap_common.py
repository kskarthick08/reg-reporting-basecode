import re
from typing import Any

from sqlalchemy.orm import Session

from app.models import Artifact, Workflow, WorkflowStageHistory


def model_dump(req: Any) -> dict[str, Any]:
    """Return a plain dict from either a Pydantic model or a simple request object."""
    if hasattr(req, "model_dump"):
        return dict(req.model_dump())
    if hasattr(req, "dict"):
        return dict(req.dict())
    return {}


def _norm_text(value: str) -> str:
    """Collapse repeated whitespace while preserving readable text."""
    return re.sub(r"\s+", " ", str(value or "").strip())


def _norm_key(value: str) -> str:
    """Normalize text into a lowercase comparison key made of simple tokens."""
    return re.sub(r"[^a-z0-9]+", " ", _norm_text(value).lower()).strip()


_MODEL_NOISE_LABELS = {
    "table",
    "number of attributes",
    "notes",
    "column name",
    "data type",
    "pk/fk",
    "nullable (y/n)",
    "nullable",
    "psd008 field ref",
    "psd field ref",
    "description",
    "source system",
    "(general)",
}


def _token_overlap(*values: str) -> float:
    """Calculate lightweight token overlap between one anchor value and peers."""
    token_sets = [{tok for tok in re.findall(r"[a-z0-9]+", _norm_key(v)) if len(tok) > 2} for v in values]
    token_sets = [s for s in token_sets if s]
    if len(token_sets) < 2:
        return 0.0
    base = token_sets[0]
    comp = set().union(*token_sets[1:])
    return len(base & comp) / max(len(base), 1)


def _looks_like_model_field(value: str) -> bool:
    """Return whether a spreadsheet cell looks like a real model field instead of table noise."""
    txt = _norm_text(value)
    if not txt:
        return False
    lower = txt.lower()
    if lower in _MODEL_NOISE_LABELS:
        return False
    if lower.startswith("example added field:"):
        return False
    if re.fullmatch(r"\d+", txt):
        return False
    if ":" in txt:
        left, right = [part.strip() for part in txt.split(":", 1)]
        if not left or not right:
            return False
        if right.lower() in _MODEL_NOISE_LABELS:
            return False
        if re.fullmatch(r"\d+", right):
            return False
        return True
    if re.fullmatch(r"(bridge|dim|fact|stg|tbl|map)_[a-z0-9_]+", lower):
        return False
    return bool(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]{1,160}", txt))


def _narrative_for_match(row: dict[str, Any], catalog_entry: dict[str, str] | None) -> tuple[str, str]:
    """Build consistent BA-facing description and evidence text for a resolved match."""
    field = _norm_text(row.get("field") or "") or "This requirement"
    target = _norm_text(row.get("matching_column") or "")
    status = _norm_text(row.get("status") or "")
    description = _norm_text((catalog_entry or {}).get("description") or "")
    source_name = _norm_text((catalog_entry or {}).get("source_name") or "")
    notes: list[str] = []
    if description:
        notes.append(f"Model description: {description}.")
    if source_name:
        notes.append(f"Source name: {source_name}.")

    if status == "full match":
        desc = f"{field} maps directly to {target}. BA should confirm business semantics and any reporting filters."
    elif target.lower().endswith("_id"):
        desc = f"{field} points to {target}, which looks like a key-based join candidate rather than the final reported value. BA should confirm the join and derived output."
    else:
        desc = f"{field} is best aligned to {target}, but BA should confirm the required transformation or derivation before treating it as final."
    evidence = f"Final mapping uses {target}."
    if notes:
        evidence = f"{evidence} {' '.join(notes)}"
    return desc[:1200], evidence[:1200]


def refresh_gap_row_narratives(rows: list[dict[str, Any]], model_catalog: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Rewrite matched-row narratives after structured hints and quality guards settle the final mapping."""
    catalog_by_match = {
        _norm_text(entry.get("qualified_name") or "").lower(): entry
        for entry in model_catalog or []
        if _norm_text(entry.get("qualified_name") or "")
    }
    out: list[dict[str, Any]] = []
    for row in rows or []:
        rr = dict(row or {})
        status = _norm_text(rr.get("status") or "")
        match = _norm_text(rr.get("matching_column") or "")
        if not match or status == "missing":
            out.append(rr)
            continue
        desc, evidence = _narrative_for_match(rr, catalog_by_match.get(match.lower()))
        rr["description"] = desc
        rr["evidence"] = evidence
        out.append(rr)
    return out


def resolve_effective_dataset_family(
    db: Session,
    *,
    workflow_id: int | None,
    project_id: str,
    requested_dataset_family: str | None,
    fca_text: str,
    fca_filename: str | None = None,
) -> str:
    """Resolve dataset family from request input, workflow PSD version, or FCA text hints."""
    requested = _norm_text(requested_dataset_family or "").lower()
    if requested:
        return requested
    if workflow_id:
        wf = (
            db.query(Workflow)
            .filter(Workflow.id == workflow_id, Workflow.project_id == project_id, Workflow.is_active.is_(True))
            .first()
        )
        if wf and _norm_text(wf.psd_version or ""):
            return _norm_text(wf.psd_version or "").lower()
    text = f"{fca_filename or ''}\n{fca_text}"
    matches = re.findall(r"\b(psd\d{3})\b", text, flags=re.IGNORECASE)
    if matches:
        counts: dict[str, int] = {}
        for match in matches:
            counts[match.lower()] = counts.get(match.lower(), 0) + 1
        return max(counts.items(), key=lambda item: item[1])[0]
    return "default"


def extract_model_catalog(dm: Artifact) -> list[dict[str, str]]:
    """Build a normalized model catalog from uploaded artifact metadata and parsed tables."""
    dm_json = dm.extracted_json or {}
    catalog: list[dict[str, str]] = []
    seen: set[str] = set()

    def _push(
        *,
        qualified_name: str,
        table_name: str = "",
        column_name: str = "",
        source_name: str = "",
        description: str = "",
        psd_ref: str = "",
        source_system: str = "",
    ) -> None:
        """Handle push within the service layer."""
        qualified = _norm_text(qualified_name)
        if not qualified:
            return
        key = qualified.lower()
        if key in seen:
            return
        seen.add(key)
        catalog.append(
            {
                "qualified_name": qualified,
                "table_name": _norm_text(table_name),
                "column_name": _norm_text(column_name) or qualified.split(":")[-1],
                "source_name": _norm_text(source_name),
                "description": _norm_text(description),
                "psd_ref": _norm_text(psd_ref).upper(),
                "source_system": _norm_text(source_system),
            }
        )

    if isinstance(dm_json, dict):
        tables = dm_json.get("tables")
        if isinstance(tables, list):
            for table in tables:
                if not isinstance(table, dict):
                    continue
                table_name = _norm_text(table.get("table_name") or table.get("sheet_name") or "")
                for column in table.get("columns") or []:
                    if not isinstance(column, dict):
                        continue
                    column_name = _norm_text(column.get("name") or column.get("source_name") or "")
                    if not column_name:
                        continue
                    qualified_name = f"{table_name}:{column_name}" if table_name else column_name
                    _push(
                        qualified_name=qualified_name,
                        table_name=table_name,
                        column_name=column_name,
                        source_name=str(column.get("source_name") or ""),
                        description=str(column.get("description") or ""),
                        psd_ref=str(column.get("psd_ref") or ""),
                        source_system=str(column.get("source_system") or ""),
                    )
        elif "targets" in dm_json and isinstance(dm_json["targets"], list):
            for value in dm_json["targets"]:
                if _looks_like_model_field(str(value)):
                    _push(qualified_name=str(value))
        elif "fields" in dm_json and isinstance(dm_json["fields"], list):
            for value in dm_json["fields"]:
                if _looks_like_model_field(str(value)):
                    _push(qualified_name=str(value))
    return catalog


def extract_model_fields(dm: Artifact) -> list[str]:
    """Return the qualified model field names used during BA matching and shortlist building."""
    return [entry["qualified_name"] for entry in extract_model_catalog(dm)]


def build_model_ref_hints(
    required_fields: list[dict[str, str]],
    model_catalog: list[dict[str, str]],
    *,
    max_per_ref: int = 4,
) -> dict[str, list[dict[str, str]]]:
    """Build shortlist hints keyed by PSD reference using structured data-model metadata."""
    by_ref: dict[str, list[dict[str, str]]] = {}
    for entry in model_catalog or []:
        ref = _norm_text(entry.get("psd_ref") or "").upper()
        if not ref:
            continue
        by_ref.setdefault(ref, []).append(entry)

    hints: dict[str, list[dict[str, str]]] = {}
    for req in required_fields or []:
        ref = _norm_text(req.get("ref") or "").upper()
        if not ref or ref not in by_ref:
            continue
        shortlist = by_ref[ref][: max(1, int(max_per_ref))]
        hints[ref] = [
            {
                "matching_column": item.get("qualified_name", ""),
                "description": item.get("description", ""),
                "source_name": item.get("source_name", ""),
                "source_system": item.get("source_system", ""),
            }
            for item in shortlist
        ]
    return hints


def apply_structured_model_hints(rows: list[dict[str, Any]], model_catalog: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Promote better matches when the model catalog provides a more explicit PSD-ref mapping."""
    by_ref: dict[str, list[dict[str, str]]] = {}
    by_alias: dict[str, list[dict[str, str]]] = {}

    for entry in model_catalog or []:
        ref = _norm_text(entry.get("psd_ref") or "").upper()
        if ref:
            by_ref.setdefault(ref, []).append(entry)
        for alias in (
            entry.get("column_name"),
            entry.get("qualified_name"),
            entry.get("source_name"),
            entry.get("description"),
        ):
            key = _norm_key(str(alias or ""))
            if key:
                by_alias.setdefault(key, []).append(entry)

    out: list[dict[str, Any]] = []
    for row in rows or []:
        rr = dict(row or {})
        ref = _norm_text(rr.get("ref") or "").upper()
        field = _norm_text(rr.get("field") or "")
        current_status = _norm_text(rr.get("status") or "")
        current_match = _norm_text(rr.get("matching_column") or "")

        candidates = list(by_ref.get(ref) or [])
        if not candidates and field:
            candidates = list(by_alias.get(_norm_key(field)) or [])
        if not candidates:
            out.append(rr)
            continue

        best = max(
            candidates,
            key=lambda entry: max(
                _token_overlap(field, entry.get("description", "")),
                _token_overlap(field, entry.get("column_name", "")),
                _token_overlap(field, entry.get("source_name", "")),
                _token_overlap(field, entry.get("qualified_name", "")),
            ),
        )
        overlap = max(
            _token_overlap(field, best.get("description", "")),
            _token_overlap(field, best.get("column_name", "")),
            _token_overlap(field, best.get("source_name", "")),
            _token_overlap(field, best.get("qualified_name", "")),
        )
        target = _norm_text(best.get("qualified_name") or "")
        should_apply = not current_match or "missing" in current_status.lower()
        should_apply = should_apply or ("partial" in current_status.lower() and bool(ref))
        if not should_apply or not target:
            out.append(rr)
            continue

        rr["matching_column"] = target
        if ref and _norm_text(best.get("psd_ref") or "").upper() == ref and overlap >= 0.18:
            rr["status"] = "Full Match" if overlap >= 0.3 else "Partial Match"
            rr["confidence"] = max(float(rr.get("confidence") or 0.0), 0.94 if rr["status"] == "Full Match" else 0.78)
        elif overlap >= 0.35:
            rr["status"] = "Partial Match"
            rr["confidence"] = max(float(rr.get("confidence") or 0.0), 0.68)
        else:
            out.append(rr)
            continue

        rr["description"], rr["evidence"] = _narrative_for_match(rr, best)
        out.append(rr)
    return out


def get_active_project_artifact(db: Session, project_id: str, artifact_id: int) -> Artifact | None:
    """Return active project artifact for downstream service use."""
    return (
        db.query(Artifact)
        .filter(
            Artifact.id == artifact_id,
            Artifact.project_id == project_id,
            Artifact.is_deleted.is_(False),
        )
        .first()
    )


def save_workflow_gap_run(
    db: Session,
    *,
    project_id: str,
    workflow_id: int | None,
    run_id: int,
    action: str,
    comment: str,
) -> None:
    """Save workflow gap run within the service layer."""
    if not workflow_id:
        return
    wf = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.project_id == project_id,
            Workflow.is_active.is_(True),
        )
        .first()
    )
    if not wf:
        return
    wf.latest_gap_run_id = run_id
    db.add(
        WorkflowStageHistory(
            workflow_id=wf.id,
            project_id=wf.project_id,
            from_stage=wf.current_stage,
            to_stage=wf.current_stage,
            action=action,
            actor="system",
            comment=comment,
        )
    )
    db.commit()


def degraded_markers(*, fallback_batches: int, llm_error_batches: int) -> dict[str, Any]:
    """Handle degraded markers within the service layer."""
    degraded_reasons: list[str] = []
    if int(llm_error_batches) > 0:
        degraded_reasons.append("llm_transport_errors")
    if int(fallback_batches) > 0:
        degraded_reasons.append("heuristic_fallback_used")
    return {
        "fallback_batches": int(fallback_batches),
        "degraded_quality": bool(degraded_reasons),
        "degraded_reasons": degraded_reasons,
    }


def status_norm(value: str) -> str:
    """Handle status norm within the service layer."""
    txt = str(value or "").strip().lower()
    if "full" in txt:
        return "full"
    if "partial" in txt:
        return "partial"
    return "missing"


def build_remediation_targets(
    base_rows: list[dict[str, Any]],
    include_statuses: list[str],
    max_rows: int,
) -> list[dict[str, str]]:
    """Build remediation targets within the service layer."""
    wanted = {status_norm(s) for s in include_statuses or []}
    if not wanted:
        wanted = {"missing", "partial"}
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for row in base_rows or []:
        if not isinstance(row, dict):
            continue
        if status_norm(str(row.get("status") or "")) not in wanted:
            continue
        ref = str(row.get("ref") or "").strip()
        field = str(row.get("field") or "").strip()
        if not ref or not field:
            continue
        key = f"{ref}|{field.lower()}"
        if key in seen:
            continue
        seen.add(key)
        out.append({"ref": ref, "field": field})
        if len(out) >= max(1, int(max_rows or 1)):
            break
    return out
