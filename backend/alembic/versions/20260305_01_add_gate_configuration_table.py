"""add gate configuration table

Revision ID: 20260305_01
Revises: 20260304_01
Create Date: 2026-03-05 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = '20260305_01'
down_revision = '20260304_01'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'gate_configuration',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.String(length=255), nullable=False),
        sa.Column('stage', sa.String(length=50), nullable=False),
        sa.Column('gate_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('allow_unresolved_missing', sa.Boolean(), nullable=True),
        sa.Column('allow_degraded_quality', sa.Boolean(), nullable=True),
        sa.Column('require_sql_validation', sa.Boolean(), nullable=True),
        sa.Column('require_xml_artifact', sa.Boolean(), nullable=True),
        sa.Column('min_coverage_score', sa.Float(), nullable=True),
        sa.Column('require_xsd_validation', sa.Boolean(), nullable=True),
        sa.Column('require_rule_checks', sa.Boolean(), nullable=True),
        sa.Column('updated_by', sa.String(length=255), nullable=True),
        sa.Column('custom_config_json', JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        'ix_gate_configuration_project_stage',
        'gate_configuration',
        ['project_id', 'stage'],
        unique=True
    )


def downgrade():
    op.drop_index('ix_gate_configuration_project_stage', table_name='gate_configuration')
    op.drop_table('gate_configuration')
