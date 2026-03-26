"""Compatibility bridge for databases stamped with removed revision 20260316_01.

Revision ID: 20260316_01
Revises: 20260311_02
Create Date: 2026-03-17 13:06:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260316_01"
down_revision: Union[str, Sequence[str], None] = "20260311_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Intentionally empty: this revision only restores a missing migration id.
    pass


def downgrade() -> None:
    pass
