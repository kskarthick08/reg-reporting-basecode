from app.services.artifact_naming_service import (
    build_generated_artifact_display_name,
    build_generated_artifact_filename,
    build_uploaded_artifact_display_name,
)


def test_uploaded_artifact_display_name_uses_business_label():
    assert build_uploaded_artifact_display_name("fca", "PSD008.pdf") == "PSD Document | PSD008.pdf"


def test_generated_artifact_display_name_includes_workflow_context():
    label = build_generated_artifact_display_name(
        "functional_spec",
        workflow_name="PSD 008 Sprint 1",
        workflow_id=14,
        project_id="demo-local",
        gap_run_id=21,
    )

    assert label == "Mapping Specification | PSD 008 Sprint 1 | WF 14 | Gap Run 21"


def test_generated_artifact_filename_is_meaningful_and_stable_shape():
    filename = build_generated_artifact_filename(
        "generated_sql",
        extension="sql",
        workflow_name="PSD 008 Sprint 1",
        workflow_id=14,
        gap_run_id=21,
    )

    assert filename.startswith("sql_extraction_psd_008_sprint_1_wf_14_gap_21_")
    assert filename.endswith(".sql")
