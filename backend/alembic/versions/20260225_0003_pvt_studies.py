"""create pvt_studies table

Revision ID: 20260225_0003
Revises: 20260225_0002
Create Date: 2026-02-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "20260225_0003"
down_revision = "20260225_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pvt_studies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("well_id", UUID(as_uuid=True), sa.ForeignKey("wells.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("inputs", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("correlation_set", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("results", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_pvt_well", "pvt_studies", ["well_id"])
    op.create_index("idx_pvt_team", "pvt_studies", ["team_id"])


def downgrade() -> None:
    op.drop_index("idx_pvt_team", table_name="pvt_studies")
    op.drop_index("idx_pvt_well", table_name="pvt_studies")
    op.drop_table("pvt_studies")
