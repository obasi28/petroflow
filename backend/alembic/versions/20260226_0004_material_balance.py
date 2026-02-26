"""create material_balance_analyses table

Revision ID: 20260226_0004
Revises: 20260225_0003
Create Date: 2026-02-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "20260226_0004"
down_revision = "20260225_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "material_balance_analyses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("well_id", UUID(as_uuid=True), sa.ForeignKey("wells.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("method", sa.String(50), nullable=False, server_default="both"),
        sa.Column("inputs", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("results", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("ooip", sa.Float, nullable=True),
        sa.Column("gas_cap_ratio", sa.Float, nullable=True),
        sa.Column("drive_mechanism", sa.String(100), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_mb_well", "material_balance_analyses", ["well_id"])
    op.create_index("idx_mb_team", "material_balance_analyses", ["team_id"])


def downgrade() -> None:
    op.drop_index("idx_mb_team", table_name="material_balance_analyses")
    op.drop_index("idx_mb_well", table_name="material_balance_analyses")
    op.drop_table("material_balance_analyses")
