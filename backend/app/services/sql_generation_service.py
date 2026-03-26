import json
import logging
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.constants import AGENT_DEFAULT_PROMPTS
from app.deps import active_instruction
from app.models import AnalysisRun, Artifact, Workflow, WorkflowStageHistory
from app.paths import ARTIFACT_ROOT
from app.services.artifact_naming_service import (
    build_generated_artifact_display_name,
    build_generated_artifact_filename,
)
from app.services.llm_service import ask_llm_json, ask_llm_text
from app.services.logging_service import log_workflow_action
from app.services.output_validation_service import log_validation_result, validate_dev_output
from app.services.sql_quality_service import analyze_sql_quality
from app.services.sql_service import (
    compact_schema_for_sql,
    extract_schema_from_artifact,
    format_table_list_for_llm,
    repair_hardcoded_common_errors,
    repair_table_names_with_fuzzy_matching,
    validate_readonly_sql,
    validate_sql_against_schema,
)
from app.services.workflow_access_service import assert_workflow_stage_access
from app.services.workflow_provenance_service import ensure_gap_run_is_current_for_workflow
from app.workflow_job_schemas import SqlGenerateRequest


async def generate_sql_core(req: SqlGenerateRequest, db: Session) -> dict:
    """Generate a validated SQL artifact from the workflow's current BA gap run."""
    workflow = assert_workflow_stage_access(
        db,
        project_id=req.project_id,
        workflow_id=req.workflow_id,
        required_stage="DEV",
    )
    gap_run = db.query(AnalysisRun).filter(AnalysisRun.id == req.gap_run_id, AnalysisRun.project_id == req.project_id).first()
    dm = db.query(Artifact).filter(Artifact.id == req.data_model_artifact_id, Artifact.project_id == req.project_id, Artifact.is_deleted.is_(False)).first()
    if not gap_run or not dm:
        raise HTTPException(status_code=404, detail="input_not_found")
    ensure_gap_run_is_current_for_workflow(workflow, gap_run)

    extra_text = ""
    if req.extra_requirements_artifact_id:
        extra = db.query(Artifact).filter(Artifact.id == req.extra_requirements_artifact_id, Artifact.project_id == req.project_id, Artifact.is_deleted.is_(False)).first()
        extra_text = (extra.extracted_text or "") if extra else ""

    rows = (gap_run.output_json or {}).get("rows") or []
    dm_json = dm.extracted_json or {}

    logger = logging.getLogger(__name__)
    logger.info("Data model artifact %s - kind: %s", dm.id, dm.kind)
    logger.info("Extracted JSON keys: %s", list(dm_json.keys()) if isinstance(dm_json, dict) else type(dm_json))
    if isinstance(dm_json, dict) and "tables" in dm_json:
        logger.info("Found 'tables' key with %s tables", len(dm_json.get("tables", [])))

    uploaded_schema = extract_schema_from_artifact(dm_json, dm.file_path)
    if not uploaded_schema:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_data_model_schema",
                "message": "Could not extract table schema from uploaded data model artifact",
                "artifact_id": dm.id,
                "artifact_filename": dm.filename,
                "artifact_has_tables_key": bool(isinstance(dm_json, dict) and "tables" in dm_json),
                "suggestion": "Upload a data model with table/column structure (JSON, SQL, or Excel)",
            },
        )

    logger.info("Using uploaded schema with %s tables: %s", len(uploaded_schema), list(uploaded_schema.keys())[:10])

    compact_schema = compact_schema_for_sql(rows, uploaded_schema)
    schema_json = json.dumps(compact_schema, ensure_ascii=True)
    valid_tables = list(uploaded_schema.keys())
    table_list = format_table_list_for_llm(valid_tables)

    base_system_prompt = active_instruction(db, "dev_sql", AGENT_DEFAULT_PROMPTS["dev_sql"])
    system_prompt = f"""{base_system_prompt}

RUN-SPECIFIC OVERRIDES (HIGHEST PRIORITY):
- Treat the uploaded data model as the only schema source of truth.
- Ignore any hardcoded or example table names from base instructions.
- Do not validate against application metadata tables.

AUTHORITATIVE DATA MODEL TABLES (use ONLY these exact names):
{table_list}

CRITICAL NOTES:
- Table names are case-sensitive and must match exactly
- Use only tables present in the list above
- Return a single read-only SQL statement
"""

    user_prompt = (
        f"Gap rows:\n{json.dumps(rows[:250])}\n\n"
        f"Data model info:\n{json.dumps(dm_json)[:18000]}\n\n"
        f"Additional requirements:\n{extra_text[:6000]}\n\n"
        f"Schema columns (refer to table list in system prompt for valid names):\n{schema_json[:10000]}"
    )
    if req.user_context and req.user_context.strip():
        user_prompt += f"\n\nOperator guidance:\n{req.user_context[:4000]}"

    request_id = f"sql-{uuid4()}"
    out = await ask_llm_json(system_prompt, user_prompt, request_id=request_id, model=req.model)

    if isinstance(out, dict) and out.get("sql_script"):
        validation_result = validate_dev_output(out)
        log_validation_result("DEV", request_id, validation_result)
        if not validation_result.is_valid:
            out["validation_errors"] = validation_result.errors
            out["validation_warnings"] = validation_result.warnings

    if not isinstance(out, dict) or not out.get("sql_script"):
        sql_only = await ask_llm_text(
            system_prompt=(
                "You are Developer agent. Return ONLY one PostgreSQL read-only SQL statement. "
                "No markdown, no explanation, no JSON. Use only provided schema identifiers."
            ),
            user_prompt=(
                f"Gap rows (condensed):\n{json.dumps(rows[:120])}\n\n"
                f"Schema:\n{schema_json[:9000]}\n\n"
                f"Operator guidance:\n{(req.user_context or '')[:2000]}"
            ),
            request_id=f"sql-retry-{uuid4()}",
            model=req.model,
        )
        out = {
            "summary": "Recovered using SQL-only retry path.",
            "key_steps": ["Generated read-only SQL from condensed schema context"],
            "output_specification": "Single read-only SQL statement",
            "validation_plan": ["Run read-only SQL checks", "Confirm tables against uploaded schema"],
            "deployment_notes": ["Use SQL as baseline and iterate with domain checks"],
            "sql_script": sql_only or "",
        }

    sql_text = str(out.get("sql_script") or "").strip()
    readonly_ok, readonly_msg = validate_readonly_sql(sql_text)
    repaired_sql_text = sql_text
    repair_fixes: list[str] = []

    if readonly_ok:
        repaired_sql_text, hardcoded_fixes = repair_hardcoded_common_errors(repaired_sql_text)
        repaired_sql_text, fuzzy_fixes = repair_table_names_with_fuzzy_matching(repaired_sql_text, valid_tables)
        repair_fixes = hardcoded_fixes + fuzzy_fixes

        readonly_ok, readonly_msg = validate_readonly_sql(repaired_sql_text)
        if readonly_ok:
            sql_text = repaired_sql_text
            out["sql_script"] = sql_text
            if repair_fixes:
                out["auto_repair_applied"] = True
                out["repair_details"] = ", ".join(repair_fixes)

    schema_ok, schema_msg, schema_suggestions = validate_sql_against_schema(sql_text, uploaded_schema)
    validation_error = readonly_msg if not readonly_ok else schema_msg

    if not readonly_ok or not schema_ok:
        logger.info("SQL validation failed: readonly_ok=%s, schema_ok=%s, message=%s", readonly_ok, schema_ok, validation_error)
        logger.info("Original SQL (first 500 chars): %s", sql_text[:500])

        repaired = await ask_llm_text(
            system_prompt=(
                "Return ONLY a corrected read-only PostgreSQL SQL statement. "
                "No markdown, no prose, no explanations. "
                "Use only tables from the VALID TABLES list."
            ),
            user_prompt=(
                f"VALIDATION ERROR:\n{validation_error}\n\n"
                f"SCHEMA SUGGESTIONS:\n{json.dumps(schema_suggestions[:25], ensure_ascii=True)}\n\n"
                f"VALID TABLES:\n{table_list}\n\n"
                f"Invalid SQL to fix:\n{sql_text}\n\n"
                f"Schema columns:\n{schema_json[:8000]}\n\n"
                "Generate corrected SQL using only valid table names and read-only SQL."
            ),
            request_id=f"sql-repair-{uuid4()}",
            model=req.model,
        )

        sql_retry = repaired.strip()
        logger.info("LLM repaired SQL (first 500 chars): %s", sql_retry[:500])

        retry_readonly_ok, retry_readonly_msg = validate_readonly_sql(sql_retry)
        retry_sql = sql_retry
        retry_fixes: list[str] = []
        if retry_readonly_ok:
            retry_sql, hardcoded_retry_fixes = repair_hardcoded_common_errors(retry_sql)
            retry_sql, fuzzy_retry_fixes = repair_table_names_with_fuzzy_matching(retry_sql, valid_tables)
            retry_fixes = hardcoded_retry_fixes + fuzzy_retry_fixes
            retry_readonly_ok, retry_readonly_msg = validate_readonly_sql(retry_sql)

        retry_schema_ok, retry_schema_msg, retry_suggestions = validate_sql_against_schema(retry_sql, uploaded_schema)
        logger.info(
            "Retry validation result: readonly_ok=%s, schema_ok=%s, readonly_msg=%s, schema_msg=%s",
            retry_readonly_ok,
            retry_schema_ok,
            retry_readonly_msg,
            retry_schema_msg,
        )

        if not retry_readonly_ok or not retry_schema_ok:
            logger.error("SQL repair failed. Original: %s, Repaired: %s", sql_text[:200], sql_retry[:200])
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "invalid_generated_sql_after_repair",
                    "original_sql_preview": sql_text[:200],
                    "repaired_sql_preview": sql_retry[:200],
                    "original_error": validation_error,
                    "repair_error": retry_readonly_msg if not retry_readonly_ok else retry_schema_msg,
                    "repair_suggestions": retry_suggestions[:25],
                    "suggestion": "Check table names against the selected uploaded data model",
                },
            )

        sql_text = retry_sql
        out["sql_script"] = sql_text
        out["llm_repair_applied"] = True
        if retry_fixes:
            out["repair_details"] = ", ".join(retry_fixes)
        logger.info("SQL repair successful! Final SQL (first 500 chars): %s", sql_text[:500])

    out["schema_validation"] = {"status": "passed", "table_count": len(uploaded_schema), "mode": "logical"}
    out["sql_quality"] = analyze_sql_quality(rows, sql_text)
    path = ARTIFACT_ROOT / req.project_id
    path.mkdir(parents=True, exist_ok=True)
    sql_filename = build_generated_artifact_filename(
        "generated_sql",
        extension="sql",
        workflow_name=workflow.name if workflow else req.project_id,
        workflow_id=workflow.id if workflow else req.workflow_id,
        gap_run_id=req.gap_run_id,
    )
    sql_file = path / sql_filename
    sql_file.write_text(sql_text, encoding="utf-8")

    artifact = Artifact(
        project_id=req.project_id,
        kind="generated_sql",
        filename=sql_file.name,
        display_name=build_generated_artifact_display_name(
            "generated_sql",
            workflow_name=workflow.name if workflow else None,
            workflow_id=workflow.id if workflow else req.workflow_id,
            project_id=req.project_id,
            gap_run_id=req.gap_run_id,
        ),
        content_type="application/sql",
        file_path=str(sql_file),
        extracted_text=sql_text,
        extracted_json=out,
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)

    run = AnalysisRun(
        project_id=req.project_id,
        run_type="sql_generation",
        status="completed",
        input_json=req.model_dump(),
        output_json=out,
        output_artifact_id=artifact.id,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    if req.workflow_id:
        wf = workflow or db.query(Workflow).filter(Workflow.id == req.workflow_id, Workflow.project_id == req.project_id, Workflow.is_active.is_(True)).first()
        if wf:
            wf.latest_sql_run_id = run.id
            db.add(
                WorkflowStageHistory(
                    workflow_id=wf.id,
                    project_id=wf.project_id,
                    from_stage=wf.current_stage,
                    to_stage=wf.current_stage,
                    action="sql_run_saved",
                    actor="system",
                    comment=f"SQL run saved: {run.id}",
                )
            )
            db.commit()

            log_workflow_action(
                db,
                workflow_id=req.workflow_id,
                project_id=req.project_id,
                action_type="sql_generation",
                action_category="DEV_ACTION",
                actor="DEV",
                description=f"SQL generated successfully from gap analysis run {req.gap_run_id}",
                status="success",
                stage="DEV",
                details={
                    "run_id": run.id,
                    "artifact_id": artifact.id,
                    "gap_run_id": req.gap_run_id,
                    "schema_validation": out.get("schema_validation"),
                    "sql_quality": out.get("sql_quality"),
                },
            )
            db.commit()

    return {"ok": True, "run_id": run.id, "artifact_id": artifact.id, "sql_script": sql_text}
