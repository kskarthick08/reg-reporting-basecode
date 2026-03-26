"""add job queue table

Revision ID: 20260310_01_add_job_queue
Revises: 20260305_02_add_logging_tables
Create Date: 2026-03-10 12:41:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260310_01_add_job_queue'
down_revision = '20260305_02'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'job_queue',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='pending'),
        sa.Column('progress_pct', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('progress_message', sa.String(length=255), nullable=True),
        sa.Column('workflow_id', sa.Integer(), nullable=True),
        sa.Column('project_id', sa.String(length=100), nullable=False),
        sa.Column('actor', sa.String(length=120), nullable=True),
        sa.Column('input_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('result_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('result_artifact_id', sa.Integer(), nullable=True),
        sa.Column('result_run_id', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_details', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_job_queue_id'), 'job_queue', ['id'], unique=False)
    op.create_index(op.f('ix_job_queue_job_type'), 'job_queue', ['job_type'], unique=False)
    op.create_index(op.f('ix_job_queue_status'), 'job_queue', ['status'], unique=False)
    op.create_index(op.f('ix_job_queue_workflow_id'), 'job_queue', ['workflow_id'], unique=False)
    op.create_index(op.f('ix_job_queue_project_id'), 'job_queue', ['project_id'], unique=False)
    op.create_index(op.f('ix_job_queue_created_at'), 'job_queue', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_job_queue_created_at'), table_name='job_queue')
    op.drop_index(op.f('ix_job_queue_project_id'), table_name='job_queue')
    op.drop_index(op.f('ix_job_queue_workflow_id'), table_name='job_queue')
    op.drop_index(op.f('ix_job_queue_status'), table_name='job_queue')
    op.drop_index(op.f('ix_job_queue_job_type'), table_name='job_queue')
    op.drop_index(op.f('ix_job_queue_id'), table_name='job_queue')
    op.drop_table('job_queue')
