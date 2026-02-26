"""create well_test_analyses table

Revision ID: 20260226_0005
Revises: 20260226_0004
Create Date: 2026-02-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "20260226_0005"
down_revision = "20260226_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "well_test_analyses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("well_id", UUID(as_uuid=True), sa.ForeignKey("wells.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("test_type", sa.String(50), nullable=False),
        sa.Column("test_data", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("results", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("permeability", sa.Float, nullable=True),
        sa.Column("skin_factor", sa.Float, nullable=True),
        sa.Column("storage_coefficient", sa.Float, nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_wt_well", "well_test_analyses", ["well_id"])
    op.create_index("idx_wt_team", "well_test_analyses", ["team_id"])


def downgrade() -> None:
    op.drop_index("idx_wt_team", table_name="well_test_analyses")
    op.drop_index("idx_wt_well", table_name="well_test_analyses")
    op.drop_table("well_test_analyses")
