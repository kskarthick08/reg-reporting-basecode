from types import SimpleNamespace

from app.services.workflow_gates import evaluate_ba_exit, evaluate_dev_exit, evaluate_reviewer_exit


def _wf(**kwargs):
    base = {
        "functional_spec_artifact_id": 1,
        "latest_gap_run_id": 1,
        "latest_sql_run_id": 1,
        "latest_report_xml_artifact_id": 1,
        "latest_xml_run_id": 1,
        "ba_gap_waivers_json": None,
    }
    base.update(kwargs)
    return SimpleNamespace(**base)


def _run(output_json):
    return SimpleNamespace(output_json=output_json)


def test_ba_gate_fails_with_unresolved_missing_rows():
    wf = _wf()
    run = _run(
        {
            "rows": [
                {"ref": "REQ-001", "field": "Field A", "status": "Full Match"},
                {"ref": "REQ-002", "field": "Field B", "status": "Missing"},
            ]
        }
    )
    result = evaluate_ba_exit(wf, run)
    assert result.passed is False
    assert result.code == "ba_unresolved_missing_fields"


def test_ba_gate_passes_when_missing_rows_are_waived():
    wf = _wf(ba_gap_waivers_json={"refs": ["REQ-002"]})
    run = _run({"rows": [{"ref": "REQ-002", "field": "Field B", "status": "Missing"}]})
    result = evaluate_ba_exit(wf, run)
    assert result.passed is True
    assert result.code == "ok"


def test_dev_gate_requires_sql_schema_validation():
    wf = _wf()
    result = evaluate_dev_exit(wf, _run({"schema_validation": {"status": "failed"}}))
    assert result.passed is False
    assert result.code == "dev_sql_validation_failed"


def test_reviewer_gate_requires_coverage_threshold():
    wf = _wf()
    run = _run(
        {
            "xsd_validation": {"pass": True},
            "rule_checks": {"passed": True},
            "ai_review": {"coverage_score": 75},
        }
    )
    result = evaluate_reviewer_exit(wf, run, min_review_coverage_score=80)
    assert result.passed is False
    assert result.code == "review_coverage_below_threshold"
