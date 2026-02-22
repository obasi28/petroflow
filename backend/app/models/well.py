import uuid
from datetime import date
from sqlalchemy import String, Float, Integer, Date, ForeignKey, Index, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Well(Base, TimestampMixin):
    __tablename__ = "wells"
    __table_args__ = (
        Index("idx_wells_team", "team_id"),
        Index("idx_wells_project", "project_id"),
        Index("idx_wells_api", "api_number"),
        Index("idx_wells_basin", "basin"),
        Index("idx_wells_status", "well_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"))

    # Identification
    well_name: Mapped[str] = mapped_column(String(255), nullable=False)
    api_number: Mapped[str | None] = mapped_column(String(14))
    uwi: Mapped[str | None] = mapped_column(String(20))

    # Location
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    county: Mapped[str | None] = mapped_column(String(100))
    state_province: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100), default="US")
    basin: Mapped[str | None] = mapped_column(String(100))
    field_name: Mapped[str | None] = mapped_column(String(255))

    # Well Characteristics
    well_type: Mapped[str] = mapped_column(String(20), default="oil")
    well_status: Mapped[str] = mapped_column(String(20), default="active")
    orientation: Mapped[str] = mapped_column(String(20), default="vertical")
    formation: Mapped[str | None] = mapped_column(String(255))
    operator: Mapped[str | None] = mapped_column(String(255))

    # Key Dates
    spud_date: Mapped[date | None] = mapped_column(Date)
    completion_date: Mapped[date | None] = mapped_column(Date)
    first_prod_date: Mapped[date | None] = mapped_column(Date)

    # Well Parameters
    total_depth: Mapped[float | None] = mapped_column(Float)
    lateral_length: Mapped[float | None] = mapped_column(Float)
    perf_top: Mapped[float | None] = mapped_column(Float)
    perf_bottom: Mapped[float | None] = mapped_column(Float)
    num_stages: Mapped[int | None] = mapped_column(Integer)

    # Reservoir Parameters
    initial_pressure: Mapped[float | None] = mapped_column(Float)
    reservoir_temp: Mapped[float | None] = mapped_column(Float)
    porosity: Mapped[float | None] = mapped_column(Float)
    water_saturation: Mapped[float | None] = mapped_column(Float)
    net_pay: Mapped[float | None] = mapped_column(Float)
    permeability: Mapped[float | None] = mapped_column(Float)

    # Metadata
    notes: Mapped[str | None] = mapped_column(String)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    custom_fields: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_deleted: Mapped[bool] = mapped_column(default=False)

    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Relationships
    production_records: Mapped[list["ProductionRecord"]] = relationship(back_populates="well")
    dca_analyses: Mapped[list["DCAAnalysis"]] = relationship(back_populates="well")
