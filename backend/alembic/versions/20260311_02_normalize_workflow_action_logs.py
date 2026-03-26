"""normalize workflow action logs

Revision ID: 20260311_02
Revises: 20260311_01
Create Date: 2026-03-11
"""

from alembic import op


revision = "20260311_02"
down_revision = "20260311_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE workflow_action_logs
        SET action_type = lower(replace(replace(trim(action_type), ' ', '_'), '-', '_'))
        WHERE action_type IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE workflow_action_logs
        SET action_category = CASE
            WHEN upper(trim(coalesce(action_category, ''))) IN ('BA', 'BA_ACTION', 'BUSINESS_ANALYST') THEN 'BA'
            WHEN upper(trim(coalesce(action_category, ''))) IN ('DEV', 'DEV_ACTION', 'DEVELOPER') THEN 'DEV'
            WHEN upper(trim(coalesce(action_category, ''))) IN ('REVIEWER', 'REVIEWER_ACTION', 'QA') THEN 'REVIEWER'
            ELSE 'SYSTEM'
        END
        """
    )
    op.execute(
        """
        UPDATE workflow_action_logs
        SET actor = CASE
            WHEN upper(trim(coalesce(actor, ''))) IN ('BA', 'BUSINESS_ANALYST') THEN 'ba.user'
            WHEN upper(trim(coalesce(actor, ''))) IN ('DEV', 'DEVELOPER') THEN 'dev.user'
            WHEN upper(trim(coalesce(actor, ''))) IN ('REVIEWER', 'QA') THEN 'reviewer.user'
            WHEN lower(trim(coalesce(actor, ''))) = 'system' THEN 'system'
            WHEN trim(coalesce(actor, '')) = '' THEN
                CASE
                    WHEN action_category = 'BA' THEN 'ba.user'
                    WHEN action_category = 'DEV' THEN 'dev.user'
                    WHEN action_category = 'REVIEWER' THEN 'reviewer.user'
                    ELSE 'system'
                END
            ELSE actor
        END
        """
    )
    op.execute(
        """
        UPDATE workflow_action_logs
        SET status = CASE
            WHEN lower(trim(coalesce(status, ''))) IN ('ok', 'success') THEN 'success'
            WHEN lower(trim(coalesce(status, ''))) IN ('warning', 'warn', 'partial') THEN 'partial'
            WHEN lower(trim(coalesce(status, ''))) IN ('failure', 'failed', 'error') THEN 'failure'
            ELSE 'success'
        END
        """
    )
    op.execute(
        """
        UPDATE workflow_action_logs
        SET stage = CASE
            WHEN upper(trim(coalesce(stage, ''))) IN ('BA', 'DEV', 'REVIEWER', 'COMPLETED') THEN upper(trim(stage))
            WHEN action_category IN ('BA', 'DEV', 'REVIEWER') THEN action_category
            ELSE NULL
        END
        """
    )


def downgrade() -> None:
    # This migration standardizes log values in place and is intentionally irreversible.
    pass
