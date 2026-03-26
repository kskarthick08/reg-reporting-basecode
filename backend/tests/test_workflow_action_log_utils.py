from app.services.workflow_action_log_utils import (
    normalize_action_category,
    normalize_action_type,
    normalize_actor,
    normalize_stage,
    normalize_status,
    workflow_stage_from_artifact_kind,
)


def test_normalize_action_category_maps_legacy_role_labels():
    assert normalize_action_category("BA_ACTION") == "BA"
    assert normalize_action_category("DEV_ACTION") == "DEV"
    assert normalize_action_category("REVIEWER_ACTION") == "REVIEWER"


def test_normalize_actor_maps_bare_role_aliases_to_canonical_ids():
    assert normalize_actor("BA", action_category="BA") == "ba.user"
    assert normalize_actor("DEV", action_category="DEV") == "dev.user"
    assert normalize_actor("REVIEWER", action_category="REVIEWER") == "reviewer.user"


def test_normalize_status_maps_warning_to_partial():
    assert normalize_status("warning") == "partial"
    assert normalize_status("FAILED") == "failure"
    assert normalize_status("success") == "success"


def test_normalize_stage_uses_category_fallback():
    assert normalize_stage(None, action_category="DEV") == "DEV"
    assert normalize_stage("reviewer", action_category=None) == "REVIEWER"


def test_download_taxonomy_helpers_are_stable():
    assert normalize_action_type("XML Validation Report Download") == "xml_validation_report_download"
    assert workflow_stage_from_artifact_kind("generated_sql") == "DEV"
