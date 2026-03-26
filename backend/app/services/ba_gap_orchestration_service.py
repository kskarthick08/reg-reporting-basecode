import json
import logging
import time
from typing import Any
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.constants import AGENT_DEFAULT_PROMPTS
from app.deps import active_instruction
from app.mapping_rules import apply_mapping_rules, load_mapping_rules
from app.models import AnalysisRun, Artifact
from app.services.ba_gap_common import (
    apply_structured_model_hints,
    build_model_ref_hints,
    build_remediation_targets,
    degraded_markers,
    extract_model_catalog,
    extract_model_fields,
    get_active_project_artifact,
    model_dump,
    refresh_gap_row_narratives,
    resolve_effective_dataset_family,
    save_workflow_gap_run,
)
from app.services.context_service import extract_requirement_lines
from app.services.gap_service import (
    compute_gap_diagnostics,
    enforce_gap_quality,
    enforce_matching_column_dot_format,
    enforce_required_coverage,
    extract_required_fields,
    heuristic_gap,
    normalize_gap_rows,
    unwrap_gap_rows,
    validate_gap_rows,
)
from app.services.llm_service import ask_llm_json
from app.services.vector_service import (
    build_candidate_map,
    enrich_rows_with_candidates,
    sync_model_field_vectors,
    sync_required_field_vectors,
)
from app.services.workflow_access_service import assert_workflow_stage_access

logger = logging.getLogger("app.ba.gap")


async def execute_gap_analysis_core(req: Any, db: Session) -> dict[str, Any]:
    """Core gap analysis logic - called by both sync routes and async jobs."""
    assert_workflow_stage_access(
        db,
        project_id=req.project_id,
        workflow_id=req.workflow_id,
        required_stage="BA",
    )
    run_trace_id = f"gap-{uuid4()}"
    started_at = time.perf_counter()
    logger.info(
        "BA_GAP_START trace_id=%s project_id=%s fca_artifact_id=%s data_model_artifact_id=%s dataset_family_req=%s allow_fallback=%s workflow_id=%s model=%s candidate_top_k=%s min_mapped_coverage_pct=%s",
        run_trace_id,
        req.project_id,
        req.fca_artifact_id,
        req.data_model_artifact_id,
        req.dataset_family,
        req.allow_fallback,
        req.workflow_id,
        req.model,
        req.candidate_top_k,
        req.min_mapped_coverage_pct,
    )
    fca = get_active_project_artifact(db, req.project_id, req.fca_artifact_id)
    dm = get_active_project_artifact(db, req.project_id, req.data_model_artifact_id)
    if not fca or not dm:
        logger.warning(
            "BA_GAP_INPUT_NOT_FOUND trace_id=%s fca_found=%s dm_found=%s",
            run_trace_id,
            bool(fca),
            bool(dm),
        )
        raise HTTPException(status_code=404, detail="input_artifact_not_found")

    fca_text = fca.extracted_text or ""
    model_catalog = extract_model_catalog(dm)
    model_fields = extract_model_fields(dm)
    if not model_fields:
        logger.warning("BA_GAP_MODEL_FIELDS_EMPTY trace_id=%s", run_trace_id)
        raise HTTPException(status_code=422, detail="no_model_fields_found")

    effective_dataset_family = resolve_effective_dataset_family(
        db,
        workflow_id=req.workflow_id,
        project_id=req.project_id,
        requested_dataset_family=req.dataset_family,
        fca_text=fca_text,
        fca_filename=fca.filename,
    )
    rules = load_mapping_rules(effective_dataset_family)
    logger.info(
        "BA_GAP_INPUT_READY trace_id=%s effective_dataset_family=%s fca_text_chars=%s model_fields=%s rules_loaded=%s",
        run_trace_id,
        effective_dataset_family,
        len(fca_text or ""),
        len(model_fields or []),
        bool(rules),
    )

    system_prompt = active_instruction(db, "ba_gap", AGENT_DEFAULT_PROMPTS["ba_gap"])
    required_fields = extract_required_fields(fca_text, limit=1500)
    if not required_fields:
        requirement_lines = extract_requirement_lines(fca_text, limit=800)
        required_fields = [{"ref": f"REQ-{i:03d}", "field": line} for i, line in enumerate(requirement_lines[:800], start=1)]
    logger.info(
        "BA_GAP_REQUIRED_FIELDS trace_id=%s required_fields_count=%s sample_refs=%s",
        run_trace_id,
        len(required_fields or []),
        [r.get("ref") for r in required_fields[:8]],
    )
    if settings.ba_log_payload:
        req_preview = json.dumps(required_fields[:10], ensure_ascii=False)
        logger.info(
            "BA_GAP_REQUIRED_FIELDS_PREVIEW trace_id=%s payload_preview=%s",
            run_trace_id,
            req_preview[: settings.ba_log_max_chars],
        )
    if isinstance(fca.extracted_json, dict):
        fca_meta = dict(fca.extracted_json)
    else:
        fca_meta = {}
    fca_meta["required_fields_v1"] = required_fields
    fca_meta["required_fields_count"] = len(required_fields)
    fca.extracted_json = fca_meta

    inserted_model_vectors = sync_model_field_vectors(db, req.project_id, dm.id, model_fields)
    inserted_required_vectors = sync_required_field_vectors(db, req.project_id, fca.id, required_fields)
    candidate_map = build_candidate_map(
        db=db,
        project_id=req.project_id,
        fca_artifact_id=fca.id,
        dm_artifact_id=dm.id,
        required_fields=required_fields,
        model_fields=model_fields,
        top_k=req.candidate_top_k,
    )
    logger.info(
        "BA_GAP_VECTOR_READY trace_id=%s inserted_model_vectors=%s inserted_required_vectors=%s candidate_map_refs=%s",
        run_trace_id,
        inserted_model_vectors,
        inserted_required_vectors,
        len(candidate_map or {}),
    )
    if settings.ba_log_payload:
        cand_preview = {k: v[:3] for k, v in list(candidate_map.items())[:10]}
        logger.info(
            "BA_GAP_CANDIDATE_PREVIEW trace_id=%s payload_preview=%s",
            run_trace_id,
            json.dumps(cand_preview, ensure_ascii=False)[: settings.ba_log_max_chars],
        )

    llm_rows: list[dict[str, Any]] = []
    fallback_batches = 0
    llm_error_batches = 0
    empty_batch_rows = 0
    batch_size = 40
    for idx in range(0, len(required_fields), batch_size):
        batch_started = time.perf_counter()
        batch = required_fields[idx : idx + batch_size]
        batch_no = (idx // batch_size) + 1
        batch_candidates = {str(b.get("ref") or ""): candidate_map.get(str(b.get("ref") or ""), []) for b in batch}
        batch_ref_hints = build_model_ref_hints(batch, model_catalog)
        user_prompt = (
            f"FCA required fields (verbatim JSON):\n{json.dumps(batch, ensure_ascii=False)}\n\n"
            f"Candidate model fields by ref (top-k shortlist):\n{json.dumps(batch_candidates, ensure_ascii=False)}\n\n"
            f"Structured data model hints by regulatory ref:\n{json.dumps(batch_ref_hints, ensure_ascii=False)}\n\n"
            f"Data model fields fallback:\n{json.dumps(model_fields[:300], ensure_ascii=False)}\n\n"
            "Return ONLY JSON array rows with keys: ref, field, matching_column, status, confidence, description, evidence. "
            "Return exactly one row for each provided required field in this batch. "
            "The output field label must match input verbatim. Prefer shortlist candidates when selecting matching_column."
        )
        if req.user_context and req.user_context.strip():
            user_prompt += f"\nOperator guidance:\n{req.user_context[:4000]}"
        if rules:
            user_prompt += f"\nDataset family rules:\n{json.dumps(rules)[:4000]}"

        llm_req_id = f"{run_trace_id}-b{batch_no:03d}"
        batch_rows = None
        fallback_reason = ""
        used_fallback = False
        try:
            llm_payload = await ask_llm_json(
                system_prompt,
                user_prompt,
                request_id=llm_req_id,
                model=req.model,
            )
            batch_rows = unwrap_gap_rows(llm_payload)
            if not isinstance(batch_rows, list):
                fallback_reason = "invalid_json"
        except Exception as exc:
            fallback_reason = f"llm_error:{type(exc).__name__}"
            logger.error(
                "BA_GAP_BATCH_LLM_ERROR trace_id=%s batch_no=%s llm_request_id=%s error=%s",
                run_trace_id,
                batch_no,
                llm_req_id,
                str(exc),
            )
            if req.allow_fallback:
                llm_error_batches += 1
            else:
                raise HTTPException(
                    status_code=502,
                    detail={
                        "message": "llm_transport_failed",
                        "trace_id": run_trace_id,
                        "batch_no": batch_no,
                        "llm_request_id": llm_req_id,
                    },
                ) from exc

        if not isinstance(batch_rows, list):
            if req.allow_fallback:
                used_fallback = True
                fallback_batches += 1
                fallback_text = "\n".join(f"{r.get('ref', '')} {r.get('field', '')}" for r in batch)
                batch_rows = heuristic_gap(fallback_text, model_fields)
                for i, row in enumerate(batch_rows):
                    if i < len(batch):
                        row["ref"] = batch[i].get("ref", row.get("ref", ""))
                        row["field"] = batch[i].get("field", row.get("field", ""))
            else:
                logger.error(
                    "BA_GAP_BATCH_INVALID_JSON trace_id=%s batch_no=%s llm_request_id=%s",
                    run_trace_id,
                    batch_no,
                    llm_req_id,
                )
                raise HTTPException(status_code=502, detail="llm_output_missing_rows")
        if not batch_rows:
            empty_batch_rows += 1
        llm_rows.extend(batch_rows)
        logger.info(
            "BA_GAP_BATCH_DONE trace_id=%s batch_no=%s batch_size=%s llm_rows=%s fallback_used=%s fallback_reason=%s elapsed_ms=%s",
            run_trace_id,
            batch_no,
            len(batch),
            len(batch_rows),
            used_fallback,
            fallback_reason,
            round((time.perf_counter() - batch_started) * 1000, 2),
        )

    pre_quality_rows = len(llm_rows)
    llm_rows = validate_gap_rows(normalize_gap_rows(llm_rows, model_fields))
    llm_rows = validate_gap_rows(apply_structured_model_hints(llm_rows, model_catalog))
    post_normalize_rows = len(llm_rows)
    llm_rows = apply_mapping_rules(llm_rows, model_fields, rules)
    post_rules_rows = len(llm_rows)
    llm_rows = enforce_gap_quality(llm_rows, fca_text, model_fields)
    post_quality_rows = len(llm_rows)
    llm_rows = validate_gap_rows(enforce_required_coverage(llm_rows, required_fields))
    post_coverage_rows = len(llm_rows)
    llm_rows = validate_gap_rows(refresh_gap_row_narratives(llm_rows, model_catalog))
    llm_rows = validate_gap_rows(enrich_rows_with_candidates(llm_rows, candidate_map))
    llm_rows = validate_gap_rows(enforce_matching_column_dot_format(llm_rows, model_fields))
    diagnostics = compute_gap_diagnostics(llm_rows, required_fields)
    diagnostics["inserted_model_vectors"] = inserted_model_vectors
    diagnostics["inserted_required_vectors"] = inserted_required_vectors
    diagnostics["candidate_top_k"] = int(req.candidate_top_k)
    diagnostics["llm_error_batches"] = llm_error_batches
    diagnostics.update(degraded_markers(fallback_batches=fallback_batches, llm_error_batches=llm_error_batches))
    threshold = req.min_mapped_coverage_pct
    logger.info(
        "BA_GAP_TRANSFORMS trace_id=%s pre_quality_rows=%s post_normalize_rows=%s post_rules_rows=%s post_quality_rows=%s post_coverage_rows=%s fallback_batches=%s empty_batch_rows=%s diagnostics=%s",
        run_trace_id,
        pre_quality_rows,
        post_normalize_rows,
        post_rules_rows,
        post_quality_rows,
        post_coverage_rows,
        fallback_batches,
        empty_batch_rows,
        diagnostics,
    )
    if threshold is not None and diagnostics["mapped_coverage_pct"] < float(threshold):
        logger.warning(
            "BA_GAP_THRESHOLD_FAIL trace_id=%s mapped_coverage_pct=%s threshold=%s",
            run_trace_id,
            diagnostics["mapped_coverage_pct"],
            float(threshold),
        )
        raise HTTPException(
            status_code=422,
            detail={
                "message": "mapped_coverage_below_threshold",
                "minimum_mapped_coverage_pct": float(threshold),
                "diagnostics": diagnostics,
            },
        )

    run = AnalysisRun(project_id=req.project_id, run_type="gap_analysis", status="completed", input_json={**model_dump(req), "effective_dataset_family": effective_dataset_family}, output_json={"rows": llm_rows, "diagnostics": diagnostics, "required_fields_count": len(required_fields), "degraded_quality": bool(diagnostics.get("degraded_quality"))})
    db.add(run)
    db.add(fca)
    db.commit()
    db.refresh(run)

    save_workflow_gap_run(
        db,
        project_id=req.project_id,
        workflow_id=req.workflow_id,
        run_id=run.id,
        action="gap_run_saved",
        comment=f"Gap run saved: {run.id}",
    )

    logger.info(
        "BA_GAP_COMPLETE trace_id=%s run_id=%s rows=%s elapsed_ms=%s",
        run_trace_id,
        run.id,
        len(llm_rows),
        round((time.perf_counter() - started_at) * 1000, 2),
    )
    return {
        "ok": True,
        "run_id": run.id,
        "dataset_family": effective_dataset_family,
        "rows": llm_rows,
        "diagnostics": diagnostics,
        "degraded_quality": bool(diagnostics.get("degraded_quality")),
    }


async def execute_gap_remediation_core(req: Any, db: Session) -> dict[str, Any]:
    """Core gap remediation logic - called by both sync routes and async jobs."""
    assert_workflow_stage_access(
        db,
        project_id=req.project_id,
        workflow_id=req.workflow_id,
        required_stage="BA",
    )
    run_trace_id = f"gap-remediate-{uuid4()}"
    started_at = time.perf_counter()
    base_run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.id == req.base_gap_run_id, AnalysisRun.project_id == req.project_id, AnalysisRun.run_type == "gap_analysis")
        .first()
    )
    if not base_run:
        raise HTTPException(status_code=404, detail="base_gap_run_not_found")

    base_input = base_run.input_json or {}
    fca_artifact_id = int(base_input.get("fca_artifact_id") or 0)
    data_model_artifact_id = int(base_input.get("data_model_artifact_id") or 0)
    if not fca_artifact_id or not data_model_artifact_id:
        raise HTTPException(status_code=422, detail="base_run_missing_artifact_links")

    fca = get_active_project_artifact(db, req.project_id, fca_artifact_id)
    dm = get_active_project_artifact(db, req.project_id, data_model_artifact_id)
    if not fca or not dm:
        raise HTTPException(status_code=404, detail="input_artifact_not_found")

    model_catalog = extract_model_catalog(dm)
    model_fields = extract_model_fields(dm)
    if not model_fields:
        raise HTTPException(status_code=422, detail="no_model_fields_found")

    base_rows = ((base_run.output_json or {}).get("rows") if isinstance(base_run.output_json, dict) else []) or []
    remediation_targets = build_remediation_targets(base_rows, req.include_statuses, req.max_rows)
    if not remediation_targets:
        raise HTTPException(status_code=422, detail="no_rows_selected_for_remediation")

    supplemental_context_chunks: list[str] = []
    supplemental_ids = [int(x) for x in (req.supplemental_artifact_ids or []) if int(x) > 0]
    if supplemental_ids:
        supplemental = (
            db.query(Artifact)
            .filter(Artifact.project_id == req.project_id, Artifact.id.in_(supplemental_ids), Artifact.is_deleted.is_(False))
            .all()
        )
        for art in supplemental[:8]:
            text_preview = str(art.extracted_text or "")[:1800]
            meta_preview = json.dumps(art.extracted_json or {}, ensure_ascii=False)[:1800] if art.extracted_json else ""
            supplemental_context_chunks.append(
                f"Artifact[{art.id}] kind={art.kind} filename={art.filename}\n{text_preview}\n{meta_preview}"
            )

    fca_text = fca.extracted_text or ""
    effective_dataset_family = resolve_effective_dataset_family(
        db,
        workflow_id=req.workflow_id,
        project_id=req.project_id,
        requested_dataset_family=str(base_input.get("effective_dataset_family") or ""),
        fca_text=fca_text,
        fca_filename=fca.filename,
    )
    rules = load_mapping_rules(effective_dataset_family)
    system_prompt = active_instruction(db, "ba_gap", AGENT_DEFAULT_PROMPTS["ba_gap"])

    inserted_model_vectors = sync_model_field_vectors(db, req.project_id, dm.id, model_fields)
    inserted_required_vectors = sync_required_field_vectors(db, req.project_id, fca.id, remediation_targets)
    candidate_map = build_candidate_map(
        db=db,
        project_id=req.project_id,
        fca_artifact_id=fca.id,
        dm_artifact_id=dm.id,
        required_fields=remediation_targets,
        model_fields=model_fields,
        top_k=req.candidate_top_k,
    )

    llm_rows: list[dict[str, Any]] = []
    fallback_batches = 0
    llm_error_batches = 0
    batch_size = 25
    for idx in range(0, len(remediation_targets), batch_size):
        batch = remediation_targets[idx : idx + batch_size]
        batch_no = (idx // batch_size) + 1
        batch_candidates = {str(b.get("ref") or ""): candidate_map.get(str(b.get("ref") or ""), []) for b in batch}
        batch_ref_hints = build_model_ref_hints(batch, model_catalog)
        user_prompt = (
            f"REMEDIATION MODE.\n"
            f"Only remap these unresolved FCA required fields:\n{json.dumps(batch, ensure_ascii=False)}\n\n"
            f"Candidate model fields by ref:\n{json.dumps(batch_candidates, ensure_ascii=False)}\n\n"
            f"Structured data model hints by regulatory ref:\n{json.dumps(batch_ref_hints, ensure_ascii=False)}\n\n"
            f"Data model fields fallback:\n{json.dumps(model_fields[:300], ensure_ascii=False)}\n\n"
            "Return ONLY JSON array rows with keys: ref, field, matching_column, status, confidence, description, evidence. "
            "Return exactly one row per provided field."
        )
        if supplemental_context_chunks:
            user_prompt += f"\nSupplemental artifacts context:\n{json.dumps(supplemental_context_chunks, ensure_ascii=False)[:12000]}"
        if req.user_context and req.user_context.strip():
            user_prompt += f"\nOperator remediation guidance:\n{req.user_context[:4000]}"
        if rules:
            user_prompt += f"\nDataset family rules:\n{json.dumps(rules)[:4000]}"

        llm_req_id = f"{run_trace_id}-b{batch_no:03d}"
        batch_rows = None
        try:
            llm_payload = await ask_llm_json(
                system_prompt,
                user_prompt,
                request_id=llm_req_id,
                model=req.model,
            )
            batch_rows = unwrap_gap_rows(llm_payload)
        except Exception as exc:
            logger.error(
                "BA_GAP_REMEDIATION_BATCH_LLM_ERROR trace_id=%s batch_no=%s llm_request_id=%s error=%s",
                run_trace_id,
                batch_no,
                llm_req_id,
                str(exc),
            )
            if req.allow_fallback:
                llm_error_batches += 1
            else:
                raise HTTPException(status_code=502, detail="llm_transport_failed") from exc

        if not isinstance(batch_rows, list):
            if req.allow_fallback:
                fallback_batches += 1
                fallback_text = "\n".join(f"{r.get('ref', '')} {r.get('field', '')}" for r in batch)
                batch_rows = heuristic_gap(fallback_text, model_fields)
                for i, row in enumerate(batch_rows):
                    if i < len(batch):
                        row["ref"] = batch[i].get("ref", row.get("ref", ""))
                        row["field"] = batch[i].get("field", row.get("field", ""))
            else:
                raise HTTPException(status_code=502, detail="llm_output_missing_rows")
        llm_rows.extend(batch_rows)

    llm_rows = validate_gap_rows(normalize_gap_rows(llm_rows, model_fields))
    llm_rows = validate_gap_rows(apply_structured_model_hints(llm_rows, model_catalog))
    llm_rows = apply_mapping_rules(llm_rows, model_fields, rules)
    llm_rows = enforce_gap_quality(llm_rows, fca_text, model_fields)
    llm_rows = validate_gap_rows(enforce_required_coverage(llm_rows, remediation_targets))
    llm_rows = validate_gap_rows(refresh_gap_row_narratives(llm_rows, model_catalog))
    llm_rows = validate_gap_rows(enrich_rows_with_candidates(llm_rows, candidate_map))
    llm_rows = validate_gap_rows(enforce_matching_column_dot_format(llm_rows, model_fields))
    remediation_diagnostics = compute_gap_diagnostics(llm_rows, remediation_targets)
    remediation_diagnostics["inserted_model_vectors"] = inserted_model_vectors
    remediation_diagnostics["inserted_required_vectors"] = inserted_required_vectors
    remediation_diagnostics["candidate_top_k"] = int(req.candidate_top_k)
    remediation_diagnostics["llm_error_batches"] = llm_error_batches
    remediation_diagnostics.update(degraded_markers(fallback_batches=fallback_batches, llm_error_batches=llm_error_batches))

    rem_by_ref = {str(r.get("ref") or "").strip().upper(): r for r in llm_rows if isinstance(r, dict)}
    merged_rows: list[dict[str, Any]] = []
    for row in base_rows:
        if not isinstance(row, dict):
            continue
        ref = str(row.get("ref") or "").strip().upper()
        merged_rows.append(dict(rem_by_ref.get(ref) or row))
    merged_rows = validate_gap_rows(enforce_matching_column_dot_format(merged_rows, model_fields))
    required_for_overall = extract_required_fields(fca_text, limit=1500) or [{"ref": str(r.get("ref") or ""), "field": str(r.get("field") or "")} for r in merged_rows if isinstance(r, dict)]
    overall_diagnostics = compute_gap_diagnostics(merged_rows, required_for_overall)
    overall_diagnostics["remediation_rows_attempted"] = len(remediation_targets)
    overall_diagnostics["remediation_rows_updated"] = len(rem_by_ref)
    overall_diagnostics["base_gap_run_id"] = base_run.id
    overall_diagnostics["degraded_quality"] = bool(remediation_diagnostics.get("degraded_quality"))
    overall_diagnostics["degraded_reasons"] = remediation_diagnostics.get("degraded_reasons", [])

    run = AnalysisRun(
        project_id=req.project_id,
        run_type="gap_analysis",
        status="completed",
        input_json={
            "project_id": req.project_id,
            "workflow_id": req.workflow_id,
            "fca_artifact_id": fca_artifact_id,
            "data_model_artifact_id": data_model_artifact_id,
            "model": req.model,
            "allow_fallback": req.allow_fallback,
            "effective_dataset_family": effective_dataset_family,
            "base_gap_run_id": base_run.id,
            "is_remediation_run": True,
            "include_statuses": req.include_statuses,
            "supplemental_artifact_ids": supplemental_ids,
        },
        output_json={
            "rows": merged_rows,
            "diagnostics": overall_diagnostics,
            "remediation_diagnostics": remediation_diagnostics,
            "required_fields_count": len(merged_rows),
            "degraded_quality": bool(remediation_diagnostics.get("degraded_quality")),
            "base_gap_run_id": base_run.id,
            "is_remediation_run": True,
        },
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    save_workflow_gap_run(
        db,
        project_id=req.project_id,
        workflow_id=req.workflow_id,
        run_id=run.id,
        action="gap_remediation_saved",
        comment=f"Gap remediation run saved: {run.id} (base {base_run.id})",
    )

    logger.info(
        "BA_GAP_REMEDIATION_COMPLETE trace_id=%s base_run_id=%s run_id=%s rows=%s elapsed_ms=%s degraded=%s",
        run_trace_id,
        base_run.id,
        run.id,
        len(merged_rows),
        round((time.perf_counter() - started_at) * 1000, 2),
        bool(remediation_diagnostics.get("degraded_quality")),
    )
    return {
        "ok": True,
        "run_id": run.id,
        "base_gap_run_id": base_run.id,
        "dataset_family": effective_dataset_family,
        "rows": merged_rows,
        "diagnostics": overall_diagnostics,
        "remediation_diagnostics": remediation_diagnostics,
        "degraded_quality": bool(remediation_diagnostics.get("degraded_quality")),
    }
