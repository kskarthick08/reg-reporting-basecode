from app.routes.reviewer_routes import _parse_xsd_error, _structure_xsd_errors


def test_parse_xsd_error_extracts_path_and_enum_expectation():
    raw = (
        "failed validating 'no' with XsdEnumerationFacets(['Y', 'N']):\n\n"
        "Reason: value must be one of ['Y', 'N']\n\n"
        "Path: /Root/Node"
    )
    parsed = _parse_xsd_error(raw)
    assert parsed["path"] == "/Root/Node"
    assert parsed["rule"] == "enumeration"
    assert "Y" in parsed["expected"]
    assert parsed["actual"] == "no"


def test_structure_xsd_errors_deduplicates():
    raw = (
        "failed validating 'no' with XsdEnumerationFacets(['Y', 'N']):\n\n"
        "Reason: value must be one of ['Y', 'N']\n\n"
        "Path: /Root/Node"
    )
    details = _structure_xsd_errors([raw, raw])
    assert len(details) == 1

