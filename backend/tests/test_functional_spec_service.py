from app.services.functional_spec_service import functional_spec_download_payload, validate_store_format


def test_validate_store_format_accepts_json_and_csv():
    assert validate_store_format("json") == "json"
    assert validate_store_format("csv") == "csv"


def test_validate_store_format_rejects_invalid():
    try:
        validate_store_format("xml")
        assert False, "Expected ValueError for invalid format"
    except ValueError:
        assert True


def test_functional_spec_download_payload_csv_contains_header():
    rows = [{"ref": "REQ-001", "field": "Field A", "matching_column": "table:col", "status": "Full Match", "confidence": 0.9, "description": "ok", "evidence": "src"}]
    payload, media_type = functional_spec_download_payload(rows, "csv")
    assert media_type == "text/csv"
    assert "ref,field,matching_column,status,confidence,description,evidence" in payload


def test_functional_spec_download_payload_json_contains_rows():
    rows = [{"ref": "REQ-001", "field": "Field A"}]
    payload, media_type = functional_spec_download_payload(rows, "json")
    assert media_type == "application/json"
    assert "\"rows\"" in payload
