import csv
import io
import json
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.constants import AGENT_DEFAULT_PROMPTS
from app.api.deps import active_instruction, get_db
from app.llm_client import call_axet_chat
from app.models import AnalysisRun, Artifact
from app.schemas import GapRowUpdateRequest
from app.services.ba_gap_orchestration_service import execute_gap_analysis_core, execute_gap_remediation_core
from app.services.context_service import artifact_context_text, extract_requirement_lines
from app.services.llm_service import llm_content
from app.services.logging_service import log_system_audit, log_workflow_action
from app.schemas import GapAnalysisRequest, GapRemediationRequest

router = APIRouter()


class PsdCompareRequest(BaseModel):
    project_id: str
    baseline_artifact_id: int
    changed_artifact_id: int
    user_context: str | None = None


class ContextChatRequest(BaseModel):
    project_id: str
    message: str
    include_all_artifacts: bool = True
    artifact_ids: list[int] | None = None
    user_context: str | None = None
    model: str | None = None


@router.post("/v1/psd/compare")
async def compare_psd_versions(req: PsdCompareRequest, db: Session = Depends(get_db)):
    """Compare the PSD versions for the API response."""
    base_art = (
        db.query(Artifact)
        .filter(
            Artifact.id == req.baseline_artifact_id,
            Artifact.project_id == req.project_id,
            Artifact.is_deleted.is_(False),
        )
        .first()
    )
    changed_art = (
        db.query(Artifact)
        .filter(
            Artifact.id == req.changed_artifact_id,
            Artifact.project_id == req.project_id,
            Artifact.is_deleted.is_(False),
        )
        .first()
    )
    if not base_art or not changed_art:
        raise HTTPException(status_code=404, detail="input_artifact_not_found")

    base_lines = extract_requirement_lines(base_art.extracted_text or "")
    changed_lines = extract_requirement_lines(changed_art.extracted_text or "")
    base_set = set(base_lines)
    changed_set = set(changed_lines)
    added = sorted(changed_set - base_set)[:250]
    removed = sorted(base_set - changed_set)[:250]
    unchanged_count = len(base_set & changed_set)

    summary_payload = {
        "baseline_artifact_id": base_art.id,
        "changed_artifact_id": changed_art.id,
        "baseline_lines": len(base_lines),
        "changed_lines": len(changed_lines),
        "added_count": len(added),
        "removed_count": len(removed),
        "unchanged_count": unchanged_count,
        "added_samples": added[:15],
        "removed_samples": removed[:15],
    }

    llm_summary = ""
    try:
        system_prompt = active_instruction(db, "ba_compare", AGENT_DEFAULT_PROMPTS["ba_compare"])
        user_prompt = (
            f"Comparison payload:\n{json.dumps(summary_payload)}\n\n"
            f"Added requirement lines:\n{json.dumps(added[:80])}\n\n"
            f"Removed requirement lines:\n{json.dumps(removed[:80])}"
        )
        if req.user_context and req.user_context.strip():
            user_prompt += f"\n\nOperator guidance:\n{req.user_context[:3000]}"
        llm_resp = await call_axet_chat(
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            request_id=f"psd-compare-{uuid4()}",
        )
        llm_summary = llm_content(llm_resp).strip()
    except Exception:
        llm_summary = ""

    return {
        "ok": True,
        "comparison": summary_payload,
        "added_lines": added,
        "removed_lines": removed,
        "llm_summary": llm_summary,
    }


@router.post("/v1/chat/context")
async def chat_with_artifact_context(req: ContextChatRequest, db: Session = Depends(get_db)):
    """Run the with artifact context for the API response."""
    if not (req.message or "").strip():
        raise HTTPException(status_code=422, detail="message_required")
    context_text = artifact_context_text(
        db,
        req.project_id,
        include_all_artifacts=req.include_all_artifacts,
        artifact_ids=req.artifact_ids,
        max_chars=20000,
    )
    system_prompt = active_instruction(db, "copilot_chat", AGENT_DEFAULT_PROMPTS["copilot_chat"])
    user_prompt = ""
    if req.user_context and req.user_context.strip():
        user_prompt += f"Operator guidance:\n{req.user_context[:3000]}\n\n"
    user_prompt += f"Artifact context:\n{context_text[:16000]}\n\nUser question:\n{req.message[:4000]}"
    try:
        resp = await call_axet_chat(
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            request_id=f"context-chat-{uuid4()}",
            model=req.model,
        )
        answer = llm_content(resp)
        return {"ok": True, "answer": answer, "context_chars": len(context_text)}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"context_chat_failed: {exc}") from exc


@router.post("/v1/gap-analysis/run")
async def run_gap_analysis(req: GapAnalysisRequest, db: Session = Depends(get_db)):
    """Synchronous gap analysis endpoint (for backward compatibility)."""
    result = await execute_gap_analysis_core(req, db)
    
    # Log the action
    if req.workflow_id and result.get("ok"):
        diagnostics = result.get("diagnostics", {})
        log_workflow_action(
            db,
            workflow_id=req.workflow_id,
            project_id=req.project_id,
            action_type="gap_analysis",
            action_category="BA_ACTION",
            actor="BA",
            description=f"Gap analysis completed: {diagnostics.get('mapped_count', 0)}/{diagnostics.get('total_required', 0)} fields mapped",
            status="success",
            stage="BA",
            details={
                "run_id": result.get("run_id"),
                "mapped_count": diagnostics.get("mapped_count"),
                "total_required": diagnostics.get("total_required"),
                "coverage_pct": diagnostics.get("coverage_pct"),
            },
        )
        db.commit()
    
    return result


@router.post("/v1/gap-analysis/run-async")
@router.post("/ba/gap-analysis/async")
async def run_gap_analysis_async(
    req: GapAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Asynchronous gap analysis - returns immediately with job_id."""
    from app.api.routes.job_routes import start_background_job
    
    job_id = start_background_job(
        background_tasks=background_tasks,
        db=db,
        job_type="gap_analysis",
        project_id=req.project_id,
        request_data=req.dict(),
        workflow_id=req.workflow_id,
        actor="BA",
    )
    
    return {
        "ok": True,
        "job_id": job_id,
        "message": "Gap analysis started in background",
    }


@router.post("/v1/gap-analysis/remediate")
async def run_gap_remediation(req: GapRemediationRequest, db: Session = Depends(get_db)):
    """Synchronous gap remediation endpoint (for backward compatibility)."""
    result = await execute_gap_remediation_core(req, db)
    
    # Log the action
    if req.workflow_id and result.get("ok"):
        diagnostics = result.get("diagnostics", {})
        log_workflow_action(
            db,
            workflow_id=req.workflow_id,
            project_id=req.project_id,
            action_type="gap_remediation",
            action_category="BA_ACTION",
            actor="BA",
            description=f"Gap remediation completed: {diagnostics.get('remediated_count', 0)} rows processed",
            status="success",
            stage="BA",
            details={
                "run_id": result.get("run_id"),
                "remediated_count": diagnostics.get("remediated_count"),
                "base_run_id": req.base_gap_run_id,
            },
        )
        db.commit()
    
    return result


@router.post("/v1/gap-analysis/remediate-async")
@router.post("/ba/gap-analysis/remediate/async")
async def run_gap_remediation_async(
    req: GapRemediationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Asynchronous gap remediation - returns immediately with job_id."""
    from app.api.routes.job_routes import start_background_job
    
    job_id = start_background_job(
        background_tasks=background_tasks,
        db=db,
        job_type="gap_remediation",
        project_id=req.project_id,
        request_data=req.dict(),
        workflow_id=req.workflow_id,
        actor="BA",
    )
    
    return {
        "ok": True,
        "job_id": job_id,
        "message": "Gap remediation started in background",
    }


@router.get("/v1/gap-analysis/{run_id}")
def get_gap_analysis(
    run_id: int,
    workflow_id: int | None = Query(None),
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Return the gap analysis for the API response."""
    run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id, AnalysisRun.run_type == "gap_analysis").first()
    if not run:
        raise HTTPException(status_code=404, detail="run_not_found")
    input_json = run.input_json or {}
    run_workflow_id = int(input_json.get("workflow_id") or 0)
    if workflow_id is not None and run_workflow_id != workflow_id:
        raise HTTPException(status_code=404, detail="workflow_run_mismatch")
    if project_id is not None and run.project_id != project_id:
        raise HTTPException(status_code=404, detail="run_not_found")
    payload = dict(run.output_json or {})
    payload["run_id"] = run.id
    payload["input_json"] = input_json
    payload["created_at"] = run.created_at.isoformat() if run.created_at else None
    return payload


@router.patch("/v1/gap-analysis/{run_id}/update-row")
def update_gap_row(run_id: int, update: GapRowUpdateRequest, db: Session = Depends(get_db)):
    """Update a single gap analysis row by ref. Creates a new analysis run with the updated data."""
    run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id, AnalysisRun.run_type == "gap_analysis").first()
    if not run:
        raise HTTPException(status_code=404, detail="run_not_found")
    base_input_json = run.input_json or {}
    base_workflow_id = int(base_input_json.get("workflow_id") or 0)
    if base_workflow_id != update.workflow_id:
        raise HTTPException(status_code=404, detail="workflow_run_mismatch")
    
    output_json = run.output_json or {}
    rows = output_json.get("rows", [])
    if not isinstance(rows, list):
        raise HTTPException(status_code=422, detail="invalid_run_output_format")
    
    row_found = False
    updated_rows = []
    for row in rows:
        if isinstance(row, dict) and row.get("ref") == update.ref:
            row_found = True
            updated_row = dict(row)
            updated_row["status"] = update.status
            updated_row["matching_column"] = update.matching_column
            
            if update.confidence is not None:
                updated_row["confidence"] = max(0.0, min(1.0, update.confidence))
            
            if update.description is not None:
                updated_row["description"] = update.description
            else:
                desc = updated_row.get("description", "")
                if "BA edited" not in desc:
                    updated_row["description"] = f"{desc} [BA edited: status changed to {update.status}]"
            
            if update.evidence is not None:
                updated_row["evidence"] = update.evidence
            else:
                ev = updated_row.get("evidence", "")
                if "BA manual update" not in ev:
                    updated_row["evidence"] = f"{ev} [BA manual update applied]"
            
            updated_rows.append(updated_row)
        else:
            updated_rows.append(row)
    
    if not row_found:
        raise HTTPException(status_code=404, detail="row_not_found")
    
    from app.services.gap_service import compute_gap_diagnostics, validate_gap_rows
    
    try:
        validated_rows = validate_gap_rows(updated_rows)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"validation_failed: {exc}") from exc
    
    required_fields_count = output_json.get("required_fields_count", len(validated_rows))
    required_fields = [{"ref": r.get("ref", ""), "field": r.get("field", "")} for r in validated_rows]
    new_diagnostics = compute_gap_diagnostics(validated_rows, required_fields)
    new_diagnostics.update(
        {
            k: v
            for k, v in (output_json.get("diagnostics", {}) or {}).items()
            if k
            in [
                "inserted_model_vectors",
                "inserted_required_vectors",
                "candidate_top_k",
                "llm_error_batches",
            ]
        }
    )
    
    new_run = AnalysisRun(
        project_id=run.project_id,
        run_type="gap_analysis",
        status="completed",
        input_json={
            **base_input_json,
            "base_run_id": run.id,
            "is_manual_edit": True,
            "edited_ref": update.ref,
        },
        output_json={
            "rows": validated_rows,
            "diagnostics": new_diagnostics,
            "required_fields_count": required_fields_count,
            "degraded_quality": output_json.get("degraded_quality", False),
            "base_run_id": run.id,
            "is_manual_edit": True,
        },
    )
    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    
    workflow_id = base_workflow_id
    if workflow_id:
        from app.models import Workflow
        
        workflow = (
            db.query(Workflow)
            .filter(
                Workflow.id == workflow_id,
                Workflow.project_id == run.project_id,
                Workflow.is_active.is_(True),
            )
            .first()
        )
        if workflow:
            workflow.latest_gap_run_id = new_run.id
            db.commit()
            
            # Log the manual edit
            log_workflow_action(
                db,
                workflow_id=workflow_id,
                project_id=run.project_id,
                action_type="gap_manual_edit",
                action_category="BA_ACTION",
                actor="BA",
                description=f"Manual gap edit: {update.ref} status changed to {update.status}",
                status="success",
                stage="BA",
                details={
                    "ref": update.ref,
                    "old_status": next((r.get("status") for r in rows if r.get("ref") == update.ref), None),
                    "new_status": update.status,
                    "new_run_id": new_run.id,
                    "base_run_id": run.id,
                },
            )
            db.commit()
    
    return {
        "ok": True,
        "run_id": new_run.id,
        "base_run_id": run.id,
        "updated_ref": update.ref,
        "rows": validated_rows,
        "diagnostics": new_diagnostics,
    }


@router.get("/v1/gap-analysis/{run_id}/export")
def export_gap_analysis(run_id: int, format: str = Query("csv"), db: Session = Depends(get_db)):
    """Handle the export gap analysis API request."""
    run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id, AnalysisRun.run_type == "gap_analysis").first()
    if not run:
        raise HTTPException(status_code=404, detail="run_not_found")
    
    # Log data export
    workflow_id = (run.input_json or {}).get("workflow_id")
    if workflow_id:
        log_workflow_action(
            db,
            workflow_id=workflow_id,
            project_id=run.project_id,
            action_type="gap_export",
            action_category="BA_ACTION",
            actor="BA",
            description=f"Exported gap analysis to {format.upper()}",
            status="success",
            stage="BA",
            details={"run_id": run_id, "format": format},
        )
        db.commit()
    
    rows = (run.output_json or {}).get("rows") or []
    if format.lower() == "json":
        return JSONResponse(content={"rows": rows})
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["ref", "field", "matching_column", "status", "confidence", "description", "evidence"],
    )
    writer.writeheader()
    for row in rows:
        writer.writerow(
            {
                "ref": row.get("ref", ""),
                "field": row.get("field", ""),
                "matching_column": row.get("matching_column", ""),
                "status": row.get("status", ""),
                "confidence": row.get("confidence", ""),
                "description": row.get("description", ""),
                "evidence": row.get("evidence", ""),
            }
        )
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=gap_analysis_{run_id}.csv"},
    )
