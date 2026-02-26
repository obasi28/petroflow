import uuid
from sqlalchemy import String, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class PVTStudy(Base, TimestampMixin):
    __tablename__ = "pvt_studies"
    __table_args__ = (
        Index("idx_pvt_well", "well_id"),
        Index("idx_pvt_team", "team_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    well_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("wells.id", ondelete="CASCADE"))
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Fluid inputs stored as JSONB
    # { api_gravity, gas_gravity, temperature, separator_pressure, separator_temperature, rs_at_pb }
    inputs: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Correlation choices stored as JSONB
    # { bubble_point, rs, bo, dead_oil_viscosity, ... }
    correlation_set: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Computed results stored as JSONB
    # { bubble_point, rs_at_pb, bo_at_pb, mu_o_at_pb, table: [...] }
    results: Mapped[dict] = mapped_column(JSONB, default=dict)

    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
