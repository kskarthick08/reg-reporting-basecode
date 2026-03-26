from app.services.vector_service import (
    enrich_rows_with_candidates,
    hashed_embedding,
)


def test_hashed_embedding_is_deterministic_and_normalized():
    v1 = hashed_embedding("Origination agreement type")
    v2 = hashed_embedding("Origination agreement type")
    assert len(v1) == len(v2)
    assert v1 == v2
    norm = sum(x * x for x in v1) ** 0.5
    assert 0.99 <= norm <= 1.01


def test_enrich_rows_with_candidates_appends_shortlist():
    rows = [
        {
            "ref": "2A",
            "field": "Origination agreement type",
            "matching_column": "origination_agreement_type",
            "status": "Full Match",
            "confidence": 0.95,
            "description": "ok",
            "evidence": "Found in model.",
        }
    ]
    out = enrich_rows_with_candidates(rows, {"2A": ["origination_agreement_type", "agreement_type_code"]})
    assert len(out) == 1
    assert "Candidate shortlist:" in out[0]["evidence"]
    assert "origination_agreement_type" in out[0]["evidence"]

