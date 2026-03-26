"""add logging tables

Revision ID: 20260305_02
Revises: 20260305_01
Create Date: 2026-03-05 16:49:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260305_02'
down_revision: Union[str, None] = '20260305_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create workflow_action_logs table
    op.create_table(
        'workflow_action_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.String(length=100), nullable=False),
        sa.Column('action_type', sa.String(length=80), nullable=False),
        sa.Column('action_category', sa.String(length=40), nullable=False),
        sa.Column('actor', sa.String(length=120), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=40), nullable=False),
        sa.Column('stage', sa.String(length=40), nullable=True),
        sa.Column('details_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_workflow_action_logs_id', 'workflow_action_logs', ['id'])
    op.create_index('ix_workflow_action_logs_workflow_id', 'workflow_action_logs', ['workflow_id'])
    op.create_index('ix_workflow_action_logs_project_id', 'workflow_action_logs', ['project_id'])
    op.create_index('ix_workflow_action_logs_action_type', 'workflow_action_logs', ['action_type'])
    op.create_index('ix_workflow_action_logs_action_category', 'workflow_action_logs', ['action_category'])
    op.create_index('ix_workflow_action_logs_actor', 'workflow_action_logs', ['actor'])
    op.create_index('ix_workflow_action_logs_status', 'workflow_action_logs', ['status'])
    op.create_index('ix_workflow_action_logs_stage', 'workflow_action_logs', ['stage'])
    op.create_index('ix_workflow_action_logs_created_at', 'workflow_action_logs', ['created_at'])

    # Create system_audit_logs table
    op.create_table(
        'system_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=80), nullable=False),
        sa.Column('event_category', sa.String(length=40), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('actor', sa.String(length=120), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('target_type', sa.String(length=80), nullable=True),
        sa.Column('target_id', sa.String(length=120), nullable=True),
        sa.Column('project_id', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('details_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=40), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_system_audit_logs_id', 'system_audit_logs', ['id'])
    op.create_index('ix_system_audit_logs_event_type', 'system_audit_logs', ['event_type'])
    op.create_index('ix_system_audit_logs_event_category', 'system_audit_logs', ['event_category'])
    op.create_index('ix_system_audit_logs_severity', 'system_audit_logs', ['severity'])
    op.create_index('ix_system_audit_logs_actor', 'system_audit_logs', ['actor'])
    op.create_index('ix_system_audit_logs_target_type', 'system_audit_logs', ['target_type'])
    op.create_index('ix_system_audit_logs_project_id', 'system_audit_logs', ['project_id'])
    op.create_index('ix_system_audit_logs_status', 'system_audit_logs', ['status'])
    op.create_index('ix_system_audit_logs_created_at', 'system_audit_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_system_audit_logs_created_at', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_status', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_project_id', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_target_type', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_actor', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_severity', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_event_category', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_event_type', table_name='system_audit_logs')
    op.drop_index('ix_system_audit_logs_id', table_name='system_audit_logs')
    op.drop_table('system_audit_logs')

    op.drop_index('ix_workflow_action_logs_created_at', table_name='workflow_action_logs')
    op.drop_index('ix_workflow_action_logs_stage', table_name='workflow_action_logs')
    op.drop_index('ix_workflow_action_logs_status', table_name='workflow_action_logs')
    op.drop_index('ix_workflow_action_logs_actor', table_name='workflow_action_logs')
    op.drop_index('ix_workflow_action_logs_action_category', table_name='workflow_action_logs')
    op.drop_index('ix_workflow_action_logs_action_type', table_name='workflow_action_logs')
    op.drop_index('ix_workflow_action_logs_project_id', table_name='workflow_action_logs')
    op.drop_index('ix_workflow_action_logs_workflow_id', table_name='workflow_action_logs')
    op.drop_index('ix_workflow_action_logs_id', table_name='workflow_action_logs')
    op.drop_table('workflow_action_logs')
