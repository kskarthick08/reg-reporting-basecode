from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.orm import Session

from app.models import AnalysisRun, Artifact, Workflow
from app.models import GateConfiguration
from app.services.workflow_provenance_service import functional_spec_gap_run_id, validation_matches_current_xml

HARD_GATE_CODES_BY_STAGE = {
    "BA": {"ba_functional_spec_missing", "ba_gap_run_missing"},
    "DEV": {"dev_sql_run_missing"},
    "REVIEWER": {"review_validation_missing"},
}


@dataclass
class GateResult:
    passed: bool
    code: str
    message: str
    metrics: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        """Handle as dict within the service layer."""
        return {
            "passed": self.passed,
            "code": self.code,
            "message": self.message,
            "metrics": self.metrics,
        }


def _missing_like(status: str) -> bool:
    """Return whether a gap status should be treated as unresolved/missing."""
    return "missing" in str(status or "").strip().lower()


def _norm_set(values: Any) -> set[str]:
    """Normalize a JSON list into a lowercase lookup set."""
    if not isinstance(values, list):
        return set()
    return {str(v).strip().lower() for v in values if str(v).strip()}


def _get_gate_config(db: Session, project_id: str, stage: str) -> GateConfiguration | None:
    """Fetch gate configuration for a project and stage."""
    return (
        db.query(GateConfiguration)
        .filter(
            GateConfiguration.project_id == project_id,
            GateConfiguration.stage == stage.upper(),
        )
        .first()
    )


def evaluate_ba_exit(
    workflow: Workflow,
    gap_run: AnalysisRun | None,
    functional_spec_artifact: Artifact | None = None,
    gate_config: GateConfiguration | None = None,
) -> GateResult:
    """Evaluate whether BA can hand off using the current gap run and functional spec."""
    if not workflow.functional_spec_artifact_id:
        return GateResult(
            passed=False,
            code="ba_functional_spec_missing",
            message="Functional specification must be saved before submission.",
        )
    if not workflow.latest_gap_run_id or not gap_run:
        return GateResult(
            passed=False,
            code="ba_gap_run_missing",
            message="A completed BA gap analysis run is required before submission.",
        )
    spec_gap_run_id = functional_spec_gap_run_id(functional_spec_artifact)
    if workflow.latest_gap_run_id and spec_gap_run_id and spec_gap_run_id != workflow.latest_gap_run_id:
        return GateResult(
            passed=False,
            code="ba_functional_spec_stale",
            message="Functional specification must be resaved from the latest BA gap run before submission.",
            metrics={
                "functional_spec_artifact_id": getattr(functional_spec_artifact, "id", None),
                "functional_spec_gap_run_id": spec_gap_run_id,
                "latest_gap_run_id": workflow.latest_gap_run_id,
            },
        )

    rows = (gap_run.output_json or {}).get("rows") or []
    if not isinstance(rows, list):
        rows = []

    waivers = workflow.ba_gap_waivers_json if isinstance(workflow.ba_gap_waivers_json, dict) else {}
    waived_refs = _norm_set(waivers.get("refs"))
    waived_fields = _norm_set(waivers.get("fields"))

    missing_rows = [r for r in rows if isinstance(r, dict) and _missing_like(str(r.get("status") or ""))]
    unresolved = []
    for row in missing_rows:
        ref = str(row.get("ref") or "").strip().lower()
        field = str(row.get("field") or "").strip().lower()
        if ref in waived_refs or field in waived_fields:
            continue
        unresolved.append(row)

    metrics = {
        "total_rows": len(rows),
        "missing_rows": len(missing_rows),
        "waived_missing_rows": max(len(missing_rows) - len(unresolved), 0),
        "unresolved_missing_rows": len(unresolved),
    }
    diagnostics = (gap_run.output_json or {}).get("diagnostics") if isinstance(gap_run.output_json, dict) else {}
    degraded_quality = bool((diagnostics or {}).get("degraded_quality") or (gap_run.output_json or {}).get("degraded_quality"))
    degraded_reasons = (diagnostics or {}).get("degraded_reasons") or []
    llm_error_batches = int((diagnostics or {}).get("llm_error_batches") or 0)
    fallback_batches = int((diagnostics or {}).get("fallback_batches") or 0)
    allow_degraded = bool(waivers.get("allow_degraded_quality"))
    
    # Apply gate configuration overrides
    if gate_config:
        if gate_config.allow_degraded_quality is not None:
            allow_degraded = gate_config.allow_degraded_quality
        allow_unresolved = gate_config.allow_unresolved_missing or False
    else:
        allow_unresolved = False
    
    metrics.update(
        {
            "degraded_quality": degraded_quality,
            "degraded_reasons": degraded_reasons,
            "llm_error_batches": llm_error_batches,
            "fallback_batches": fallback_batches,
            "allow_degraded_quality": allow_degraded,
            "allow_unresolved_missing": allow_unresolved,
        }
    )

    if degraded_quality and not allow_degraded:
        return GateResult(
            passed=False,
            code="ba_gap_run_degraded_quality",
            message="Gap analysis quality is degraded due to fallback/transport errors. Re-run BA mapping or add waiver allow_degraded_quality.",
            metrics=metrics,
        )

    if unresolved and not allow_unresolved:
        return GateResult(
            passed=False,
            code="ba_unresolved_missing_fields",
            message=f"{len(unresolved)} unresolved required fields remain in mapping.",
            metrics=metrics,
        )
    return GateResult(
        passed=True,
        code="ok",
        message="BA exit criteria satisfied.",
        metrics=metrics,
    )


def evaluate_dev_exit(
    workflow: Workflow, sql_run: AnalysisRun | None, gate_config: GateConfiguration | None = None
) -> GateResult:
    """Evaluate whether DEV output is present, validated, and fresh enough to submit."""
    if not workflow.latest_sql_run_id or not sql_run:
        return GateResult(
            passed=False,
            code="dev_sql_run_missing",
            message="A completed SQL generation run is required before submission.",
        )
    sql_input = getattr(sql_run, "input_json", None)
    sql_gap_run_id = (sql_input or {}).get("gap_run_id") if isinstance(sql_input, dict) else None
    try:
        sql_gap_run_id = int(sql_gap_run_id) if sql_gap_run_id is not None else None
    except (TypeError, ValueError):
        sql_gap_run_id = None
    if workflow.latest_gap_run_id and sql_gap_run_id and sql_gap_run_id != workflow.latest_gap_run_id:
        return GateResult(
            passed=False,
            code="dev_sql_stale_for_gap_run",
            message="SQL was generated from an older BA gap run. Regenerate SQL from the latest BA output.",
            metrics={
                "latest_gap_run_id": workflow.latest_gap_run_id,
                "sql_gap_run_id": sql_gap_run_id,
            },
        )
    
    # Apply gate configuration: check if XML artifact is required
    require_xml = True
    if gate_config and gate_config.require_xml_artifact is not None:
        require_xml = gate_config.require_xml_artifact
    
    if require_xml and not workflow.latest_report_xml_artifact_id:
        return GateResult(
            passed=False,
            code="dev_report_xml_missing",
            message="Submission XML instance must be linked before submission.",
        )

    # Apply gate configuration: check if SQL validation is required
    require_sql_validation = True
    if gate_config and gate_config.require_sql_validation is not None:
        require_sql_validation = gate_config.require_sql_validation
    
    sql_validation = (sql_run.output_json or {}).get("schema_validation") or {}
    validation_status = str(sql_validation.get("status") or "").strip().lower()
    
    if require_sql_validation and validation_status != "passed":
        return GateResult(
            passed=False,
            code="dev_sql_validation_failed",
            message="SQL validation did not pass. Regenerate and validate SQL before submission.",
            metrics={
                "schema_validation_status": validation_status or "missing",
                "require_sql_validation": require_sql_validation,
                "require_xml_artifact": require_xml,
            },
        )

    return GateResult(
        passed=True,
        code="ok",
        message="DEV exit criteria satisfied.",
        metrics={
            "schema_validation_status": validation_status,
            "require_sql_validation": require_sql_validation,
            "require_xml_artifact": require_xml,
        },
    )


def evaluate_reviewer_exit(
    workflow: Workflow,
    xml_validation_run: AnalysisRun | None,
    min_review_coverage_score: float,
    gate_config: GateConfiguration | None = None,
) -> GateResult:
    """Evaluate whether reviewer validation covers the current XML and passes all gates."""
    if not workflow.latest_xml_run_id or not xml_validation_run:
        return GateResult(
            passed=False,
            code="review_validation_missing",
            message="XML validation must be executed before submission.",
        )
    validation_output = getattr(xml_validation_run, "output_json", None)
    has_validation_artifact_id = isinstance(validation_output, dict) and validation_output.get("report_xml_artifact_id") is not None
    if workflow.latest_report_xml_artifact_id and has_validation_artifact_id and not validation_matches_current_xml(workflow, xml_validation_run):
        return GateResult(
            passed=False,
            code="review_validation_stale_for_xml",
            message="The latest validation run does not cover the currently linked submission XML. Re-run reviewer validation.",
            metrics={
                "latest_report_xml_artifact_id": workflow.latest_report_xml_artifact_id,
                "latest_xml_run_id": workflow.latest_xml_run_id,
            },
        )

    payload = xml_validation_run.output_json or {}
    xsd_pass = bool((payload.get("xsd_validation") or {}).get("pass"))
    rule_pass = bool((payload.get("rule_checks") or {}).get("passed"))

    ai_review = payload.get("ai_review") or {}
    raw_score = ai_review.get("coverage_score")
    try:
        coverage_score = float(raw_score)
    except Exception:
        derived_score = (payload.get("rule_checks") or {}).get("required_field_coverage_pct")
        try:
            coverage_score = float(derived_score)
        except Exception:
            coverage_score = None

    # Apply gate configuration
    require_xsd_validation = True
    require_rule_checks = True
    if gate_config:
        if gate_config.require_xsd_validation is not None:
            require_xsd_validation = gate_config.require_xsd_validation
        if gate_config.require_rule_checks is not None:
            require_rule_checks = gate_config.require_rule_checks

    metrics = {
        "xsd_pass": xsd_pass,
        "rule_pass": rule_pass,
        "coverage_score": coverage_score,
        "minimum_coverage_score": float(min_review_coverage_score),
        "require_xsd_validation": require_xsd_validation,
        "require_rule_checks": require_rule_checks,
    }

    if require_xsd_validation and not xsd_pass:
        return GateResult(
            passed=False,
            code="review_xsd_failed",
            message="XSD validation must pass before submission.",
            metrics=metrics,
        )
    if require_rule_checks and not rule_pass:
        return GateResult(
            passed=False,
            code="review_rule_checks_failed",
            message="Rule checks must pass before submission.",
            metrics=metrics,
        )
    if coverage_score is None:
        return GateResult(
            passed=False,
            code="review_coverage_missing",
            message="AI review coverage score is missing.",
            metrics=metrics,
        )
    if coverage_score < float(min_review_coverage_score):
        return GateResult(
            passed=False,
            code="review_coverage_below_threshold",
            message=f"AI review coverage score {coverage_score:.2f} is below threshold.",
            metrics=metrics,
        )

    return GateResult(
        passed=True,
        code="ok",
        message="REVIEWER exit criteria satisfied.",
        metrics=metrics,
    )


def evaluate_stage_exit_gate(
    db: Session,
    workflow: Workflow,
    min_review_coverage_score: float,
) -> GateResult:
    """Evaluate the active stage gate using the workflow's latest persisted outputs."""
    stage = str(workflow.current_stage or "").upper()
    gate_config = _get_gate_config(db, workflow.project_id, stage)

    if stage == "BA":
        gap_run = None
        functional_spec_artifact = None
        if workflow.latest_gap_run_id:
            gap_run = (
                db.query(AnalysisRun)
                .filter(
                    AnalysisRun.id == workflow.latest_gap_run_id,
                    AnalysisRun.project_id == workflow.project_id,
                    AnalysisRun.run_type == "gap_analysis",
                )
                .first()
            )
        if workflow.functional_spec_artifact_id:
            functional_spec_artifact = (
                db.query(Artifact)
                .filter(
                    Artifact.id == workflow.functional_spec_artifact_id,
                    Artifact.project_id == workflow.project_id,
                    Artifact.is_deleted.is_(False),
                )
                .first()
            )
        result = evaluate_ba_exit(workflow, gap_run, functional_spec_artifact, gate_config)
        if gate_config and not gate_config.gate_enabled and result.code not in HARD_GATE_CODES_BY_STAGE["BA"]:
            return GateResult(
                passed=True,
                code="gate_disabled",
                message="BA quality gate is disabled by admin configuration. Submission prerequisites still apply.",
                metrics={**(result.metrics or {}), "gate_config_applied": True, "gate_enabled": False},
            )
        return result
    if stage == "DEV":
        sql_run = None
        if workflow.latest_sql_run_id:
            sql_run = (
                db.query(AnalysisRun)
                .filter(
                    AnalysisRun.id == workflow.latest_sql_run_id,
                    AnalysisRun.project_id == workflow.project_id,
                    AnalysisRun.run_type == "sql_generation",
                )
                .first()
            )
        result = evaluate_dev_exit(workflow, sql_run, gate_config)
        if gate_config and not gate_config.gate_enabled and result.code not in HARD_GATE_CODES_BY_STAGE["DEV"]:
            return GateResult(
                passed=True,
                code="gate_disabled",
                message="DEV quality gate is disabled by admin configuration. Submission prerequisites still apply.",
                metrics={**(result.metrics or {}), "gate_config_applied": True, "gate_enabled": False},
            )
        return result
    if stage == "REVIEWER":
        xml_validation_run = None
        if workflow.latest_xml_run_id:
            xml_validation_run = (
                db.query(AnalysisRun)
                .filter(
                    AnalysisRun.id == workflow.latest_xml_run_id,
                    AnalysisRun.project_id == workflow.project_id,
                    AnalysisRun.run_type == "xml_validation",
                )
                .first()
            )
        # Use gate config for min coverage score if available
        min_score = gate_config.min_coverage_score if gate_config and gate_config.min_coverage_score is not None else min_review_coverage_score
        result = evaluate_reviewer_exit(workflow, xml_validation_run, min_score, gate_config)
        if gate_config and not gate_config.gate_enabled and result.code not in HARD_GATE_CODES_BY_STAGE["REVIEWER"]:
            return GateResult(
                passed=True,
                code="gate_disabled",
                message="Reviewer quality gate is disabled by admin configuration. Submission prerequisites still apply.",
                metrics={**(result.metrics or {}), "gate_config_applied": True, "gate_enabled": False},
            )
        return result
    return GateResult(
        passed=False,
        code="invalid_current_stage",
        message=f"Unsupported stage: {stage or 'unknown'}",
    )
