from app.services.gap_service import compute_gap_diagnostics, enforce_required_coverage, extract_required_fields


def test_extract_required_fields_from_table_and_inline_rows():
    text = """
    Contents
    1A | Transaction reference (regulated mortgage contracts and relevant regulated credit agreements only) | text
    2A Origination agreement type
    Overview
    """
    rows = extract_required_fields(text)
    assert rows == [
        {
            "ref": "1A",
            "field": "Transaction reference (regulated mortgage contracts and relevant regulated credit agreements only)",
        },
        {"ref": "2A", "field": "Origination agreement type"},
    ]


def test_enforce_required_coverage_injects_missing_rows():
    required = [{"ref": "1A", "field": "Transaction reference"}, {"ref": "2A", "field": "Origination agreement type"}]
    rows = [
        {
            "ref": "1A",
            "field": "Transaction reference",
            "matching_column": "fact_credit_agreement_sale:transaction_reference",
            "status": "Full Match",
            "confidence": 0.95,
            "description": "ok",
            "evidence": "found",
        }
    ]
    out = enforce_required_coverage(rows, required)
    assert len(out) == 2
    assert out[0]["ref"] == "1A"
    assert out[1]["ref"] == "2A"
    assert out[1]["status"] == "Missing"
    assert out[1]["matching_column"] == ""


def test_compute_gap_diagnostics_counts_coverage_and_injected():
    required = [{"ref": "1A", "field": "Transaction reference"}, {"ref": "2A", "field": "Origination agreement type"}]
    rows = [
        {
            "ref": "1A",
            "field": "Transaction reference",
            "matching_column": "fact_credit_agreement_sale:transaction_reference",
            "status": "Full Match",
            "confidence": 0.95,
            "description": "ok",
            "evidence": "found",
        },
        {
            "ref": "2A",
            "field": "Origination agreement type",
            "matching_column": "",
            "status": "Missing",
            "confidence": 0.0,
            "description": "missing",
            "evidence": "Coverage guard inserted this row because no LLM output matched the required ref/field.",
        },
    ]
    d = compute_gap_diagnostics(rows, required)
    assert d["expected_required_count"] == 2
    assert d["returned_count"] == 2
    assert d["missing_count"] == 1
    assert d["mapped_count"] == 1
    assert d["coverage_pct"] == 100.0
    assert d["mapped_coverage_pct"] == 50.0
    assert d["injected_missing_count"] == 1
