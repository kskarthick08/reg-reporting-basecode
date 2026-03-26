"""add workflow and artifact incremental columns

Revision ID: 20260304_01
Revises:
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa


revision = "20260304_01"
down_revision = "20260101_00_initial_schema"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in {c["name"] for c in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not _has_column("artifacts", "is_deleted"):
        op.add_column("artifacts", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    if not _has_column("artifacts", "deleted_at"):
        op.add_column("artifacts", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    if not _has_column("artifacts", "deleted_by"):
        op.add_column("artifacts", sa.Column("deleted_by", sa.String(length=120), nullable=True))
    if not _has_column("workflows", "latest_report_xml_artifact_id"):
        op.add_column("workflows", sa.Column("latest_report_xml_artifact_id", sa.Integer(), nullable=True))
    if not _has_column("workflows", "ba_gap_waivers_json"):
        op.add_column("workflows", sa.Column("ba_gap_waivers_json", sa.JSON(), nullable=True))
    if not _has_column("workflow_stage_history", "details_json"):
        op.add_column("workflow_stage_history", sa.Column("details_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    if _has_column("workflow_stage_history", "details_json"):
        op.drop_column("workflow_stage_history", "details_json")
    if _has_column("workflows", "ba_gap_waivers_json"):
        op.drop_column("workflows", "ba_gap_waivers_json")
    if _has_column("workflows", "latest_report_xml_artifact_id"):
        op.drop_column("workflows", "latest_report_xml_artifact_id")
    if _has_column("artifacts", "deleted_by"):
        op.drop_column("artifacts", "deleted_by")
    if _has_column("artifacts", "deleted_at"):
        op.drop_column("artifacts", "deleted_at")
    if _has_column("artifacts", "is_deleted"):
        op.drop_column("artifacts", "is_deleted")
