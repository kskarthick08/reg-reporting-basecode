"""Initial schema — create all base tables

Revision ID: 20260101_00_initial_schema
Revises:
Create Date: 2026-01-01

This is the root migration.  It creates the seven base tables that the
application needs before any of the incremental add-column / add-table
migrations run.  A fresh database only needs to run `alembic upgrade head`
once — this file makes the chain fully self-contained.

All CREATE TABLE / CREATE INDEX calls are guarded with existence checks so
the migration is safe to run against a database that was bootstrapped by
auto_create_schema (Base.metadata.create_all) before Alembic was introduced.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

try:
    from pgvector.sqlalchemy import Vector as _Vector
    VECTOR_TYPE = _Vector(768)
except ImportError:  # pragma: no cover
    VECTOR_TYPE = sa.Text()

revision = "20260101_00_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def _table_exists(name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(name)


def _index_exists(index_name: str, table_name: str) -> bool:
    bind = op.get_bind()
    indexes = sa.inspect(bind).get_indexes(table_name)
    return any(ix["name"] == index_name for ix in indexes)


def _create_index_if_missing(index_name: str, table_name: str, columns: list[str]) -> None:
    if not _index_exists(index_name, table_name):
        op.create_index(index_name, table_name, columns)


def upgrade() -> None:
    # ------------------------------------------------------------------
    # pgvector extension — required by rag_chunks.embedding
    # ------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ------------------------------------------------------------------
    # rag_chunks
    # ------------------------------------------------------------------
    if not _table_exists("rag_chunks"):
        op.create_table(
            "rag_chunks",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("project_id", sa.String(100), nullable=False),
            sa.Column("source_ref", sa.String(255), nullable=False),
            sa.Column("chunk_text", sa.Text(), nullable=False),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("embedding", VECTOR_TYPE, nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    _create_index_if_missing("ix_rag_chunks_id", "rag_chunks", ["id"])
    _create_index_if_missing("ix_rag_chunks_project_id", "rag_chunks", ["project_id"])

    # ------------------------------------------------------------------
    # artifacts  (base columns only — incremental columns added later)
    #   20260304_01 adds:   is_deleted, deleted_at, deleted_by
    #   20260311_01 adds:   display_name
    # ------------------------------------------------------------------
    if not _table_exists("artifacts"):
        op.create_table(
            "artifacts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("project_id", sa.String(100), nullable=False),
            sa.Column("kind", sa.String(50), nullable=False),
            sa.Column("filename", sa.String(255), nullable=False),
            sa.Column("content_type", sa.String(100), nullable=True),
            sa.Column("file_path", sa.Text(), nullable=False),
            sa.Column("extracted_text", sa.Text(), nullable=True),
            sa.Column("extracted_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    _create_index_if_missing("ix_artifacts_id", "artifacts", ["id"])
    _create_index_if_missing("ix_artifacts_project_id", "artifacts", ["project_id"])
    _create_index_if_missing("ix_artifacts_kind", "artifacts", ["kind"])

    # ------------------------------------------------------------------
    # analysis_runs
    # ------------------------------------------------------------------
    if not _table_exists("analysis_runs"):
        op.create_table(
            "analysis_runs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("project_id", sa.String(100), nullable=False),
            sa.Column("run_type", sa.String(50), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default=sa.text("'completed'")),
            sa.Column("input_json", sa.JSON(), nullable=True),
            sa.Column("output_json", sa.JSON(), nullable=True),
            sa.Column("output_artifact_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    _create_index_if_missing("ix_analysis_runs_id", "analysis_runs", ["id"])
    _create_index_if_missing("ix_analysis_runs_project_id", "analysis_runs", ["project_id"])
    _create_index_if_missing("ix_analysis_runs_run_type", "analysis_runs", ["run_type"])
    _create_index_if_missing("ix_analysis_runs_status", "analysis_runs", ["status"])

    # ------------------------------------------------------------------
    # agent_instructions
    # ------------------------------------------------------------------
    if not _table_exists("agent_instructions"):
        op.create_table(
            "agent_instructions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("agent_key", sa.String(80), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("instruction", sa.Text(), nullable=False),
            sa.Column("updated_by", sa.String(120), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    _create_index_if_missing("ix_agent_instructions_id", "agent_instructions", ["id"])
    _create_index_if_missing("ix_agent_instructions_agent_key", "agent_instructions", ["agent_key"])

    # ------------------------------------------------------------------
    # admin_audit_logs
    # ------------------------------------------------------------------
    if not _table_exists("admin_audit_logs"):
        op.create_table(
            "admin_audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("action", sa.String(80), nullable=False),
            sa.Column("target_type", sa.String(80), nullable=False),
            sa.Column("target_id", sa.String(120), nullable=True),
            sa.Column("project_id", sa.String(100), nullable=True),
            sa.Column("actor", sa.String(120), nullable=True),
            sa.Column("details_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    _create_index_if_missing("ix_admin_audit_logs_id", "admin_audit_logs", ["id"])
    _create_index_if_missing("ix_admin_audit_logs_action", "admin_audit_logs", ["action"])
    _create_index_if_missing("ix_admin_audit_logs_target_type", "admin_audit_logs", ["target_type"])
    _create_index_if_missing("ix_admin_audit_logs_project_id", "admin_audit_logs", ["project_id"])

    # ------------------------------------------------------------------
    # workflows  (base columns only — incremental columns added later)
    #   20260304_01 adds:   latest_report_xml_artifact_id, ba_gap_waivers_json
    # ------------------------------------------------------------------
    if not _table_exists("workflows"):
        op.create_table(
            "workflows",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("project_id", sa.String(100), nullable=False),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("psd_version", sa.String(80), nullable=True),
            sa.Column("current_stage", sa.String(40), nullable=False, server_default=sa.text("'BA'")),
            sa.Column("status", sa.String(40), nullable=False, server_default=sa.text("'in_progress'")),
            sa.Column("assigned_ba", sa.String(120), nullable=True),
            sa.Column("assigned_dev", sa.String(120), nullable=True),
            sa.Column("assigned_reviewer", sa.String(120), nullable=True),
            sa.Column("current_assignee", sa.String(120), nullable=True),
            sa.Column("started_by", sa.String(120), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("parent_workflow_id", sa.Integer(), nullable=True),
            sa.Column("latest_gap_run_id", sa.Integer(), nullable=True),
            sa.Column("latest_sql_run_id", sa.Integer(), nullable=True),
            sa.Column("latest_xml_run_id", sa.Integer(), nullable=True),
            sa.Column("functional_spec_artifact_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    _create_index_if_missing("ix_workflows_id", "workflows", ["id"])
    _create_index_if_missing("ix_workflows_project_id", "workflows", ["project_id"])
    _create_index_if_missing("ix_workflows_current_stage", "workflows", ["current_stage"])
    _create_index_if_missing("ix_workflows_status", "workflows", ["status"])

    # ------------------------------------------------------------------
    # workflow_stage_history  (base columns only — incremental added later)
    #   20260304_01 adds:   details_json
    # ------------------------------------------------------------------
    if not _table_exists("workflow_stage_history"):
        op.create_table(
            "workflow_stage_history",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("workflow_id", sa.Integer(), nullable=False),
            sa.Column("project_id", sa.String(100), nullable=False),
            sa.Column("from_stage", sa.String(40), nullable=True),
            sa.Column("to_stage", sa.String(40), nullable=False),
            sa.Column("action", sa.String(40), nullable=False),
            sa.Column("actor", sa.String(120), nullable=True),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    _create_index_if_missing("ix_workflow_stage_history_id", "workflow_stage_history", ["id"])
    _create_index_if_missing("ix_workflow_stage_history_workflow_id", "workflow_stage_history", ["workflow_id"])
    _create_index_if_missing("ix_workflow_stage_history_project_id", "workflow_stage_history", ["project_id"])
    _create_index_if_missing("ix_workflow_stage_history_action", "workflow_stage_history", ["action"])


def downgrade() -> None:
    op.drop_table("workflow_stage_history")
    op.drop_table("workflows")
    op.drop_table("admin_audit_logs")
    op.drop_table("agent_instructions")
    op.drop_table("analysis_runs")
    op.drop_table("artifacts")
    op.drop_table("rag_chunks")
