import csv
import io
import json
from pathlib import Path

from app.models import Artifact
from app.services.artifact_naming_service import build_generated_artifact_display_name, build_generated_artifact_filename


def validate_store_format(store_format: str | None) -> str:
    """Validate store format within the service layer."""
    fmt = str(store_format or "json").strip().lower()
    if fmt not in {"json", "csv"}:
        raise ValueError("invalid_store_format")
    return fmt


def _rows_csv(rows: list[dict]) -> str:
    """Handle rows csv within the service layer."""
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["ref", "field", "matching_column", "status", "confidence", "description", "evidence"],
    )
    writer.writeheader()
    for row in rows:
        writer.writerow(
            {
                "ref": row.get("ref", ""),
                "field": row.get("field", ""),
                "matching_column": row.get("matching_column", ""),
                "status": row.get("status", ""),
                "confidence": row.get("confidence", ""),
                "description": row.get("description", ""),
                "evidence": row.get("evidence", ""),
            }
        )
    return output.getvalue()


def _rows_json(rows: list[dict]) -> str:
    """Handle rows json within the service layer."""
    return json.dumps({"rows": rows}, indent=2)


def write_functional_spec_file(
    artifact_root: Path,
    project_id: str,
    workflow_id: int,
    workflow_name: str,
    rows: list[dict],
    gap_run_id: int,
    fmt: str,
) -> tuple[str, Path, str]:
    """Write functional spec file within the service layer."""
    project_path = artifact_root / project_id
    project_path.mkdir(parents=True, exist_ok=True)
    filename = build_generated_artifact_filename(
        "functional_spec",
        extension=fmt,
        workflow_name=workflow_name,
        workflow_id=workflow_id,
        gap_run_id=gap_run_id,
    )
    full_path = project_path / filename

    if fmt == "json":
        content = _rows_json(rows)
        content_type = "application/json"
    else:
        content = _rows_csv(rows)
        content_type = "text/csv"
    full_path.write_text(content, encoding="utf-8")
    return filename, full_path, content_type


def build_functional_spec_artifact(
    *,
    project_id: str,
    filename: str,
    file_path: Path,
    content_type: str,
    rows: list[dict],
    gap_run_id: int,
    workflow_name: str,
    workflow_id: int,
) -> Artifact:
    """Build functional spec artifact within the service layer."""
    return Artifact(
        project_id=project_id,
        kind="functional_spec",
        filename=filename,
        display_name=build_generated_artifact_display_name(
            "functional_spec",
            workflow_name=workflow_name,
            workflow_id=workflow_id,
            project_id=project_id,
            gap_run_id=gap_run_id,
        ),
        content_type=content_type,
        file_path=str(file_path),
        extracted_json={"rows": rows, "gap_run_id": gap_run_id},
        extracted_text=file_path.read_text(encoding="utf-8")[:120000],
    )


def functional_spec_download_payload(rows: list[dict], fmt: str) -> tuple[str, str]:
    """Handle functional spec download payload within the service layer."""
    if fmt == "json":
        return _rows_json(rows), "application/json"
    return _rows_csv(rows), "text/csv"
