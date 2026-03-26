import json
import re
import xml.etree.ElementTree as ET
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from app.paths import DATA_ROOT
from app.models import Artifact


XSI_NS = "http://www.w3.org/2001/XMLSchema-instance"


def detect_contract_report_code(expected_root: str | None, xsd_text: str, fca_text: str) -> str | None:
    """Detect contract report code within the service layer."""
    root = str(expected_root or "").strip()
    haystack = f"{xsd_text[:12000]}\n{fca_text[:4000]}".upper()
    if root == "PSD008-CreditAgreementSales" or "PSD008" in haystack:
        return "PSD008"
    return None


def _artifact_report_code(payload: dict[str, Any] | None) -> str:
    """Handle artifact report code within the service layer."""
    if not isinstance(payload, dict):
        return ""
    return str(payload.get("report_code") or payload.get("reportCode") or "").strip().upper()


def load_shared_mapping_contract(report_code: str, *, artifacts: list[Any] | None = None) -> dict[str, Any] | None:
    """Load shared mapping contract within the service layer."""
    code = str(report_code or "").strip().upper()
    if code != "PSD008":
        return None
    for artifact in artifacts or []:
        payload = getattr(artifact, "extracted_json", None)
        if _artifact_report_code(payload) == code:
            return payload
    repo_root = Path(__file__).resolve().parents[3]
    candidate_paths = [
        repo_root / "prototype-assets" / "PSD008 Prototype Pack" / "PSD008-Prototype-Mapping-Config.json",
        DATA_ROOT / "prototype-assets" / "PSD008 Prototype Pack" / "PSD008-Prototype-Mapping-Config.json",
    ]
    for path in candidate_paths:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    return None


def load_admin_mapping_contracts(db: Any, project_id: str, report_code: str) -> list[Artifact]:
    """Load admin mapping contracts within the service layer."""
    code = str(report_code or "").strip().upper()
    if not code:
        return []
    artifacts = (
        db.query(Artifact)
        .filter(
            Artifact.project_id == project_id,
            Artifact.kind == "mapping_contract",
            Artifact.is_deleted.is_(False),
        )
        .order_by(Artifact.created_at.desc(), Artifact.id.desc())
        .all()
    )
    return [artifact for artifact in artifacts if _artifact_report_code(getattr(artifact, "extracted_json", None)) == code]


def functional_spec_rows(spec_artifact: Any) -> list[dict[str, Any]]:
    """Handle functional spec rows within the service layer."""
    if not spec_artifact:
        return []
    spec_json = getattr(spec_artifact, "extracted_json", None) or {}
    rows = spec_json.get("rows") if isinstance(spec_json, dict) else []
    return [row for row in rows if isinstance(row, dict)]


def render_contract_xml(
    *,
    report_code: str,
    mapping_contract: dict[str, Any],
    source_rows: list[dict[str, Any]],
    functional_spec: list[dict[str, Any]],
) -> tuple[str, dict[str, Any]]:
    """Render contract XML within the service layer."""
    code = str(report_code or "").strip().upper()
    if code != "PSD008":
        raise ValueError(f"unsupported_contract_report_code:{code}")

    ns = str(mapping_contract.get("namespace") or "").strip()
    root_name = str(mapping_contract.get("root_element") or "").strip()
    record_name = str(mapping_contract.get("record_element") or "").strip()
    if not ns or not root_name or not record_name:
        raise ValueError("invalid_mapping_contract")

    ET.register_namespace("", ns)
    ET.register_namespace("xsi", XSI_NS)
    schema_location = f"{ns} http://www.fsa.gov.uk/MER/DRG/PSD008/v1/PSD008-Schema.xsd"
    root = ET.Element(f"{{{ns}}}{root_name}", {f"{{{XSI_NS}}}schemaLocation": schema_location})

    issues: list[str] = []
    warnings: list[str] = []
    header_mappings = mapping_contract.get("header_mappings") or []
    record_mappings = mapping_contract.get("record_mappings") or []
    spec_by_target = {
        _normalize_key(str(row.get("xml_path") or "")): row
        for row in functional_spec
        if str(row.get("xml_path") or "").strip()
    }

    first_row = source_rows[0] if source_rows else {}
    for mapping in header_mappings:
        _apply_scalar_mapping(
            parent=root,
            ns=ns,
            mapping=mapping,
            row=first_row,
            issues=issues,
            warnings=warnings,
            spec_row=spec_by_target.get(_normalize_key(str(mapping.get("target_xpath") or ""))),
            path_is_absolute=True,
        )

    for row_index, row in enumerate(source_rows, start=1):
        if not isinstance(row, dict):
            warnings.append(f"source_row_{row_index}_ignored_non_object")
            continue
        record = ET.SubElement(root, f"{{{ns}}}{record_name}")
        for mapping in record_mappings:
            target = str(mapping.get("target_xpath") or "").strip()
            spec_row = spec_by_target.get(_normalize_key(f"/{root_name}/{record_name}/{target}"))
            if str(mapping.get("type") or "") == "array":
                _apply_array_mapping(record, ns, mapping, row, issues, warnings, spec_row, row_index)
            else:
                _apply_scalar_mapping(
                    parent=record,
                    ns=ns,
                    mapping=mapping,
                    row=row,
                    issues=issues,
                    warnings=warnings,
                    spec_row=spec_row,
                    path_is_absolute=False,
                    row_index=row_index,
                )

    if issues:
        raise ValueError("contract_render_failed:" + "; ".join(issues[:12]))

    xml_text = ET.tostring(root, encoding="unicode")
    xml_text = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml_text
    metadata = {
        "report_code": code,
        "contract_mode": True,
        "contract_root": root_name,
        "contract_record_element": record_name,
        "source_row_count": len(source_rows),
        "functional_spec_rows": len(functional_spec),
        "warnings": warnings[:50],
        "warning_count": len(warnings),
    }
    return xml_text, metadata


def _apply_scalar_mapping(
    *,
    parent: ET.Element,
    ns: str,
    mapping: dict[str, Any],
    row: dict[str, Any],
    issues: list[str],
    warnings: list[str],
    spec_row: dict[str, Any] | None,
    path_is_absolute: bool,
    row_index: int | None = None,
) -> None:
    """Handle apply scalar mapping within the service layer."""
    if not _condition_passes(mapping.get("condition"), row):
        return
    source_column = str(mapping.get("source_column") or "").strip()
    target_xpath = str(mapping.get("target_xpath") or "").strip()
    required = bool(mapping.get("required"))
    raw_value = row.get(source_column)
    normalized = _normalize_value(raw_value, mapping)
    if normalized is None or normalized == "":
        if required:
            issues.append(_issue_text(row_index, target_xpath, f"missing_or_invalid_value_from_{source_column}"))
        return
    if spec_row and str(spec_row.get("source_column") or "").strip() and str(spec_row.get("source_column")).strip() != source_column:
        warnings.append(_issue_text(row_index, target_xpath, f"spec_source_mismatch:{spec_row.get('source_column')}!={source_column}"))
    segments = _xpath_segments(target_xpath, path_is_absolute=path_is_absolute)
    if not segments:
        if required:
            issues.append(_issue_text(row_index, target_xpath, "invalid_target_xpath"))
        return
    elem = _ensure_path(parent, ns, segments)
    elem.text = normalized


def _apply_array_mapping(
    parent: ET.Element,
    ns: str,
    mapping: dict[str, Any],
    row: dict[str, Any],
    issues: list[str],
    warnings: list[str],
    spec_row: dict[str, Any] | None,
    row_index: int,
) -> None:
    """Handle apply array mapping within the service layer."""
    source_column = str(mapping.get("source_column") or "").strip()
    target_xpath = str(mapping.get("target_xpath") or "").strip()
    required = bool(mapping.get("required"))
    values = _parse_json_array(row.get(source_column))
    if not values:
        if required:
            issues.append(_issue_text(row_index, target_xpath, f"missing_array_from_{source_column}"))
        return
    segments = [segment for segment in _xpath_segments(target_xpath, path_is_absolute=False) if segment]
    if not segments:
        issues.append(_issue_text(row_index, target_xpath, "invalid_array_target_xpath"))
        return
    array_parent_segments = segments[:-1]
    item_name = segments[-1].replace("[*]", "")
    array_parent = _ensure_path(parent, ns, array_parent_segments) if array_parent_segments else parent
    child_mappings = mapping.get("children") or []
    try:
        max_items = int(mapping.get("max_items") or 10)
    except (TypeError, ValueError):
        max_items = 10
    for item in values[:max_items]:
        if not isinstance(item, dict):
            warnings.append(_issue_text(row_index, target_xpath, "array_item_not_object"))
            continue
        item_elem = ET.SubElement(array_parent, f"{{{ns}}}{item_name}")
        for child in child_mappings:
            child_key = str(child.get("source_key") or "").strip()
            child_target = str(child.get("target_xpath") or "").strip()
            child_mapping = {
                "source_column": child_key,
                "target_xpath": child_target,
                "type": child.get("type"),
                "required": child.get("required", False),
            }
            _apply_scalar_mapping(
                parent=item_elem,
                ns=ns,
                mapping=child_mapping,
                row=item,
                issues=issues,
                warnings=warnings,
                spec_row=spec_row,
                path_is_absolute=False,
                row_index=row_index,
            )


def _normalize_value(raw_value: Any, mapping: dict[str, Any]) -> str | None:
    """Normalize value within the service layer."""
    if raw_value is None:
        return None
    value = str(raw_value).strip()
    if not value:
        return None
    mapping_type = str(mapping.get("type") or "string").strip().lower()
    if mapping_type == "boolean":
        lowered = value.lower()
        if lowered in {"true", "1", "y", "yes"}:
            return "true"
        if lowered in {"false", "0", "n", "no"}:
            return "false"
        return None
    if mapping_type == "yes_no":
        lowered = value.lower()
        if lowered in {"y", "yes", "true", "1"}:
            return "Y"
        if lowered in {"n", "no", "false", "0"}:
            return "N"
        return None
    if mapping_type == "date":
        return _normalize_date(value)
    if mapping_type == "decimal_2":
        return _normalize_decimal(value, scale=2)
    if mapping_type == "integer":
        return _normalize_integer(value)
    if mapping_type == "frn":
        digits = re.sub(r"\D+", "", value)
        return digits if re.fullmatch(r"\d{6,7}", digits) else None
    if mapping_type == "string25":
        return value[:25]
    if mapping_type == "string100" or mapping_type == "string":
        return value[:100] if mapping_type == "string100" else value
    if mapping_type == "enum":
        allowed_values = [str(item).strip() for item in mapping.get("allowed_values") or []]
        return value if not allowed_values or value in allowed_values else None
    return value


def _normalize_date(value: str) -> str | None:
    """Normalize date within the service layer."""
    match = re.match(r"^(\d{4}-\d{2}-\d{2})", value)
    return match.group(1) if match else None


def _normalize_decimal(value: str, scale: int) -> str | None:
    """Normalize decimal within the service layer."""
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None
    quant = Decimal("1").scaleb(-scale)
    return f"{decimal_value.quantize(quant):.{scale}f}"


def _normalize_integer(value: str) -> str | None:
    """Normalize integer within the service layer."""
    if not re.fullmatch(r"\d+", value):
        return None
    return str(int(value))


def _condition_passes(condition: Any, row: dict[str, Any]) -> bool:
    """Handle condition passes within the service layer."""
    text = str(condition or "").strip()
    if not text:
        return True
    match = re.fullmatch(r"([A-Za-z0-9_]+)\s*==\s*'([^']*)'", text)
    if not match:
        return True
    key, expected = match.groups()
    return str(row.get(key) or "").strip() == expected


def _xpath_segments(target_xpath: str, *, path_is_absolute: bool) -> list[str]:
    """Handle xpath segments within the service layer."""
    text = str(target_xpath or "").strip()
    if not text:
        return []
    segments = [segment for segment in text.split("/") if segment]
    if path_is_absolute and segments:
        return segments[1:]
    return segments


def _ensure_path(parent: ET.Element, ns: str, segments: list[str]) -> ET.Element:
    """Ensure path within the service layer."""
    current = parent
    for segment in segments:
        local_name = segment.replace("[*]", "")
        existing = None
        for child in list(current):
            if child.tag == f"{{{ns}}}{local_name}":
                existing = child
                break
        current = existing or ET.SubElement(current, f"{{{ns}}}{local_name}")
    return current


def _parse_json_array(raw_value: Any) -> list[dict[str, Any]]:
    """Parse json array within the service layer."""
    if isinstance(raw_value, list):
        return [item for item in raw_value if isinstance(item, dict)]
    text = str(raw_value or "").strip()
    if not text:
        return []
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return []
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    return []


def _normalize_key(value: str) -> str:
    """Normalize a key so related fields can be compared reliably."""
    return re.sub(r"\s+", "", str(value or "").strip()).lower()


def _issue_text(row_index: int | None, target_xpath: str, detail: str) -> str:
    """Handle issue text within the service layer."""
    prefix = f"row_{row_index}" if row_index else "header"
    return f"{prefix}:{target_xpath}:{detail}"
