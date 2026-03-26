"""
Gate Configuration Service
Business logic for managing gate configurations.
"""
from typing import Any

from sqlalchemy.orm import Session

from app.models_gate_config import GateConfiguration


DEFAULT_GATE_CONFIGS = {
    "BA": {
        "gate_enabled": True,
        "allow_unresolved_missing": False,
        "allow_degraded_quality": False,
    },
    "DEV": {
        "gate_enabled": True,
        "require_sql_validation": True,
        "require_xml_artifact": True,
    },
    "REVIEWER": {
        "gate_enabled": True,
        "min_coverage_score": 0.85,
        "require_xsd_validation": True,
        "require_rule_checks": True,
    },
}


def get_gate_config(db: Session, project_id: str, stage: str) -> dict[str, Any]:
    """
    Retrieve gate configuration for a specific project and stage.
    Returns defaults if no custom configuration exists.
    """
    config = (
        db.query(GateConfiguration)
        .filter(
            GateConfiguration.project_id == project_id,
            GateConfiguration.stage == stage.upper(),
        )
        .first()
    )
    
    if config:
        return {
            "id": config.id,
            "project_id": config.project_id,
            "stage": config.stage,
            "gate_enabled": config.gate_enabled,
            "allow_unresolved_missing": config.allow_unresolved_missing,
            "allow_degraded_quality": config.allow_degraded_quality,
            "require_sql_validation": config.require_sql_validation,
            "require_xml_artifact": config.require_xml_artifact,
            "min_coverage_score": config.min_coverage_score,
            "require_xsd_validation": config.require_xsd_validation,
            "require_rule_checks": config.require_rule_checks,
            "updated_by": config.updated_by,
            "custom_config_json": config.custom_config_json or {},
            "created_at": config.created_at.isoformat() if config.created_at else None,
            "updated_at": config.updated_at.isoformat() if config.updated_at else None,
        }
    
    # Return defaults
    defaults = DEFAULT_GATE_CONFIGS.get(stage.upper(), {})
    return {
        "id": None,
        "project_id": project_id,
        "stage": stage.upper(),
        "gate_enabled": defaults.get("gate_enabled", True),
        "allow_unresolved_missing": defaults.get("allow_unresolved_missing", False),
        "allow_degraded_quality": defaults.get("allow_degraded_quality", False),
        "require_sql_validation": defaults.get("require_sql_validation", True),
        "require_xml_artifact": defaults.get("require_xml_artifact", True),
        "min_coverage_score": defaults.get("min_coverage_score", 0.85),
        "require_xsd_validation": defaults.get("require_xsd_validation", True),
        "require_rule_checks": defaults.get("require_rule_checks", True),
        "updated_by": None,
        "custom_config_json": {},
        "created_at": None,
        "updated_at": None,
    }


def get_all_gate_configs(db: Session, project_id: str) -> list[dict[str, Any]]:
    """
    Retrieve all gate configurations for a project (all stages).
    """
    stages = ["BA", "DEV", "REVIEWER"]
    return [get_gate_config(db, project_id, stage) for stage in stages]


def upsert_gate_config(
    db: Session,
    project_id: str,
    stage: str,
    gate_enabled: bool | None = None,
    allow_unresolved_missing: bool | None = None,
    allow_degraded_quality: bool | None = None,
    require_sql_validation: bool | None = None,
    require_xml_artifact: bool | None = None,
    min_coverage_score: float | None = None,
    require_xsd_validation: bool | None = None,
    require_rule_checks: bool | None = None,
    updated_by: str | None = None,
    custom_config_json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Create or update gate configuration for a project and stage.
    """
    config = (
        db.query(GateConfiguration)
        .filter(
            GateConfiguration.project_id == project_id,
            GateConfiguration.stage == stage.upper(),
        )
        .first()
    )
    
    if not config:
        config = GateConfiguration(
            project_id=project_id,
            stage=stage.upper(),
        )
        db.add(config)
    
    # Update fields if provided
    if gate_enabled is not None:
        config.gate_enabled = gate_enabled
    if allow_unresolved_missing is not None:
        config.allow_unresolved_missing = allow_unresolved_missing
    if allow_degraded_quality is not None:
        config.allow_degraded_quality = allow_degraded_quality
    if require_sql_validation is not None:
        config.require_sql_validation = require_sql_validation
    if require_xml_artifact is not None:
        config.require_xml_artifact = require_xml_artifact
    if min_coverage_score is not None:
        config.min_coverage_score = float(min_coverage_score)
    if require_xsd_validation is not None:
        config.require_xsd_validation = require_xsd_validation
    if require_rule_checks is not None:
        config.require_rule_checks = require_rule_checks
    if updated_by is not None:
        config.updated_by = updated_by
    if custom_config_json is not None:
        config.custom_config_json = custom_config_json
    
    db.commit()
    db.refresh(config)
    
    return get_gate_config(db, project_id, stage.upper())


def reset_gate_config(db: Session, project_id: str, stage: str) -> bool:
    """
    Delete custom gate configuration, reverting to defaults.
    """
    result = (
        db.query(GateConfiguration)
        .filter(
            GateConfiguration.project_id == project_id,
            GateConfiguration.stage == stage.upper(),
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return result > 0
