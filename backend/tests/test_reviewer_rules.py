from app.routes.reviewer_routes import _build_rule_checks, _required_fields_from_psd_text


def test_required_fields_extraction_is_stable():
    text = """
    Field A: mandatory
    Field B: optional
    Reporting Date
    """
    fields = _required_fields_from_psd_text(text)
    assert "Field A" in fields
    assert "Field B" in fields


def test_rule_checks_pass_with_high_coverage():
    xml_tags = ["FieldA", "FieldB", "ReportingDate", "Root"]
    psd_required = ["Field A", "Field B", "Reporting Date"]
    model_fields = ["field_a", "field_b", "reporting_date", "other"]
    checks = _build_rule_checks(xml_tags, psd_required, model_fields)
    assert checks["required_field_coverage_pct"] >= 95.0
    assert checks["passed"] is True


def test_rule_checks_fail_when_required_fields_missing():
    xml_tags = ["FieldA", "Root"]
    psd_required = ["Field A", "Field B", "Reporting Date"]
    model_fields = ["field_a", "field_b", "reporting_date"]
    checks = _build_rule_checks(xml_tags, psd_required, model_fields)
    assert checks["required_field_coverage_pct"] < 95.0
    assert checks["passed"] is False
