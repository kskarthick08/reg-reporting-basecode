"""add artifact display name

Revision ID: 20260311_01
Revises: 20260310_01_add_job_queue
Create Date: 2026-03-11
"""

from alembic import op
import sqlalchemy as sa


revision = "20260311_01"
down_revision = "20260310_01_add_job_queue"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("artifacts", sa.Column("display_name", sa.String(length=255), nullable=True))
    op.execute("UPDATE artifacts SET display_name = filename WHERE display_name IS NULL")


def downgrade() -> None:
    op.drop_column("artifacts", "display_name")
