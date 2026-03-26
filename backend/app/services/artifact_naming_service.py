import re
from datetime import datetime, timezone
from uuid import uuid4


KIND_LABELS = {
    "fca": "PSD Document",
    "data_model": "Data Model",
    "data": "Source Data",
    "xsd": "XSD Schema",
    "report_xml": "Submission XML",
    "generated_xml": "Submission XML",
    "generated_sql": "SQL Extraction Script",
    "functional_spec": "Mapping Specification",
    "mapping_contract": "Mapping Contract",
}


def _clean_part(value: str | None) -> str:
    """Handle clean part within the service layer."""
    text = str(value or "").strip()
    return re.sub(r"\s+", " ", text)


def _slugify(value: str | None, fallback: str) -> str:
    """Handle slugify within the service layer."""
    text = _clean_part(value).lower()
    text = re.sub(r"[^a-z0-9]+", "_", text).strip("_")
    return text or fallback


def _display_base(kind: str, filename: str | None = None) -> str:
    """Handle display base within the service layer."""
    label = KIND_LABELS.get(str(kind or "").strip().lower(), "Artifact")
    if filename:
        return f"{label} | {filename}"
    return label


def build_uploaded_artifact_display_name(kind: str, filename: str | None) -> str:
    """Build uploaded artifact display name within the service layer."""
    return _display_base(kind, _clean_part(filename))


def build_generated_artifact_display_name(
    kind: str,
    *,
    workflow_name: str | None = None,
    workflow_id: int | None = None,
    project_id: str | None = None,
    gap_run_id: int | None = None,
) -> str:
    """Build generated artifact display name within the service layer."""
    parts = [_display_base(kind)]
    name = _clean_part(workflow_name) or _clean_part(project_id)
    if name:
        parts.append(name)
    if workflow_id:
        parts.append(f"WF {workflow_id}")
    if gap_run_id:
        parts.append(f"Gap Run {gap_run_id}")
    return " | ".join(parts)


def build_generated_artifact_filename(
    kind: str,
    *,
    extension: str,
    workflow_name: str | None = None,
    workflow_id: int | None = None,
    gap_run_id: int | None = None,
) -> str:
    """Build generated artifact filename within the service layer."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    token = uuid4().hex[:8]
    workflow_slug = _slugify(workflow_name, "workflow")
    prefix = {
        "functional_spec": "mapping_spec",
        "generated_sql": "sql_extraction",
        "generated_xml": "submission_xml",
    }.get(str(kind or "").strip().lower(), "artifact")
    parts = [prefix, workflow_slug]
    if workflow_id:
        parts.append(f"wf_{workflow_id}")
    if gap_run_id:
        parts.append(f"gap_{gap_run_id}")
    parts.append(timestamp)
    parts.append(token)
    ext = extension.lstrip(".")
    return f"{'_'.join(parts)}.{ext}"
