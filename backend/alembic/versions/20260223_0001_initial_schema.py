"""initial schema

Revision ID: 20260223_0001
Revises:
Create Date: 2026-02-23 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260223_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.String(length=512), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("email_verified", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "settings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )

    op.create_table(
        "team_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column(
            "invited_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "team_id"),
    )

    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("provider_account_id", sa.String(length=255), nullable=False),
        sa.Column("refresh_token", sa.String(length=2000), nullable=True),
        sa.Column("access_token", sa.String(length=2000), nullable=True),
        sa.Column("expires_at", sa.Integer(), nullable=True),
        sa.Column("token_type", sa.String(length=50), nullable=True),
        sa.Column("scope", sa.String(length=500), nullable=True),
        sa.Column("id_token", sa.String(length=4000), nullable=True),
        sa.Column("session_state", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_account_id"),
    )

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_projects_team", "projects", ["team_id"], unique=False)

    op.create_table(
        "wells",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("well_name", sa.String(length=255), nullable=False),
        sa.Column("api_number", sa.String(length=14), nullable=True),
        sa.Column("uwi", sa.String(length=20), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("county", sa.String(length=100), nullable=True),
        sa.Column("state_province", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("basin", sa.String(length=100), nullable=True),
        sa.Column("field_name", sa.String(length=255), nullable=True),
        sa.Column("well_type", sa.String(length=20), nullable=False),
        sa.Column("well_status", sa.String(length=20), nullable=False),
        sa.Column("orientation", sa.String(length=20), nullable=False),
        sa.Column("formation", sa.String(length=255), nullable=True),
        sa.Column("operator", sa.String(length=255), nullable=True),
        sa.Column("spud_date", sa.Date(), nullable=True),
        sa.Column("completion_date", sa.Date(), nullable=True),
        sa.Column("first_prod_date", sa.Date(), nullable=True),
        sa.Column("total_depth", sa.Float(), nullable=True),
        sa.Column("lateral_length", sa.Float(), nullable=True),
        sa.Column("perf_top", sa.Float(), nullable=True),
        sa.Column("perf_bottom", sa.Float(), nullable=True),
        sa.Column("num_stages", sa.Integer(), nullable=True),
        sa.Column("initial_pressure", sa.Float(), nullable=True),
        sa.Column("reservoir_temp", sa.Float(), nullable=True),
        sa.Column("porosity", sa.Float(), nullable=True),
        sa.Column("water_saturation", sa.Float(), nullable=True),
        sa.Column("net_pay", sa.Float(), nullable=True),
        sa.Column("permeability", sa.Float(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column(
            "custom_fields",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_wells_api", "wells", ["api_number"], unique=False)
    op.create_index("idx_wells_basin", "wells", ["basin"], unique=False)
    op.create_index("idx_wells_project", "wells", ["project_id"], unique=False)
    op.create_index("idx_wells_status", "wells", ["well_status"], unique=False)
    op.create_index("idx_wells_team", "wells", ["team_id"], unique=False)

    op.create_table(
        "production_records",
        sa.Column("well_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("production_date", sa.Date(), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("days_on", sa.Integer(), nullable=False),
        sa.Column("oil_rate", sa.Float(), nullable=True),
        sa.Column("gas_rate", sa.Float(), nullable=True),
        sa.Column("water_rate", sa.Float(), nullable=True),
        sa.Column("cum_oil", sa.Float(), nullable=True),
        sa.Column("cum_gas", sa.Float(), nullable=True),
        sa.Column("cum_water", sa.Float(), nullable=True),
        sa.Column("gor", sa.Float(), nullable=True),
        sa.Column("water_cut", sa.Float(), nullable=True),
        sa.Column("boe", sa.Float(), nullable=True),
        sa.Column("tubing_pressure", sa.Float(), nullable=True),
        sa.Column("casing_pressure", sa.Float(), nullable=True),
        sa.Column("flowing_bhp", sa.Float(), nullable=True),
        sa.Column("choke_size", sa.Float(), nullable=True),
        sa.Column("hours_on", sa.Float(), nullable=True),
        sa.Column("data_source", sa.String(length=50), nullable=False),
        sa.Column("is_validated", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["well_id"], ["wells.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("well_id", "production_date"),
    )
    op.create_index(
        "idx_prod_well_date",
        "production_records",
        ["well_id", "production_date"],
        unique=False,
    )
    op.create_index("idx_prod_team", "production_records", ["team_id"], unique=False)

    op.create_table(
        "dca_analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("well_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("fluid_type", sa.String(length=10), nullable=False),
        sa.Column("model_type", sa.String(length=30), nullable=False),
        sa.Column(
            "parameters",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("r_squared", sa.Float(), nullable=True),
        sa.Column("rmse", sa.Float(), nullable=True),
        sa.Column("aic", sa.Float(), nullable=True),
        sa.Column("bic", sa.Float(), nullable=True),
        sa.Column("forecast_end_date", sa.Date(), nullable=True),
        sa.Column("economic_limit", sa.Float(), nullable=True),
        sa.Column("forecast_months", sa.Integer(), nullable=False),
        sa.Column("eur", sa.Float(), nullable=True),
        sa.Column("remaining_reserves", sa.Float(), nullable=True),
        sa.Column("cum_at_forecast_start", sa.Float(), nullable=True),
        sa.Column(
            "monte_carlo_results",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["well_id"], ["wells.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_dca_team", "dca_analyses", ["team_id"], unique=False)
    op.create_index("idx_dca_well", "dca_analyses", ["well_id"], unique=False)

    op.create_table(
        "dca_forecast_points",
        sa.Column("analysis_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("forecast_date", sa.Date(), nullable=False),
        sa.Column("time_months", sa.Float(), nullable=False),
        sa.Column("rate", sa.Float(), nullable=False),
        sa.Column("cumulative", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["analysis_id"], ["dca_analyses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("analysis_id", "forecast_date"),
    )


def downgrade() -> None:
    op.drop_table("dca_forecast_points")
    op.drop_index("idx_dca_well", table_name="dca_analyses")
    op.drop_index("idx_dca_team", table_name="dca_analyses")
    op.drop_table("dca_analyses")
    op.drop_index("idx_prod_team", table_name="production_records")
    op.drop_index("idx_prod_well_date", table_name="production_records")
    op.drop_table("production_records")
    op.drop_index("idx_wells_team", table_name="wells")
    op.drop_index("idx_wells_status", table_name="wells")
    op.drop_index("idx_wells_project", table_name="wells")
    op.drop_index("idx_wells_basin", table_name="wells")
    op.drop_index("idx_wells_api", table_name="wells")
    op.drop_table("wells")
    op.drop_index("idx_projects_team", table_name="projects")
    op.drop_table("projects")
    op.drop_table("accounts")
    op.drop_table("team_memberships")
    op.drop_table("teams")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
