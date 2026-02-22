import uuid
from datetime import date, datetime
from sqlalchemy import String, Float, Integer, Date, Boolean, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ProductionRecord(Base):
    __tablename__ = "production_records"
    __table_args__ = (
        Index("idx_prod_well_date", "well_id", "production_date"),
        Index("idx_prod_team", "team_id"),
    )

    well_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wells.id", ondelete="CASCADE"), primary_key=True
    )
    production_date: Mapped[date] = mapped_column(Date, primary_key=True)
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )

    # Producing days
    days_on: Mapped[int] = mapped_column(Integer, default=30)

    # Rates (daily averages)
    oil_rate: Mapped[float | None] = mapped_column(Float)       # bbl/day
    gas_rate: Mapped[float | None] = mapped_column(Float)       # Mcf/day
    water_rate: Mapped[float | None] = mapped_column(Float)     # bbl/day

    # Cumulative
    cum_oil: Mapped[float | None] = mapped_column(Float)        # bbl
    cum_gas: Mapped[float | None] = mapped_column(Float)        # Mcf
    cum_water: Mapped[float | None] = mapped_column(Float)      # bbl

    # Ratios
    gor: Mapped[float | None] = mapped_column(Float)            # Mcf/bbl
    water_cut: Mapped[float | None] = mapped_column(Float)      # fraction
    boe: Mapped[float | None] = mapped_column(Float)            # bbl equivalent

    # Pressures
    tubing_pressure: Mapped[float | None] = mapped_column(Float)
    casing_pressure: Mapped[float | None] = mapped_column(Float)
    flowing_bhp: Mapped[float | None] = mapped_column(Float)

    # Operating
    choke_size: Mapped[float | None] = mapped_column(Float)
    hours_on: Mapped[float | None] = mapped_column(Float)

    # Quality
    data_source: Mapped[str] = mapped_column(String(50), default="manual")
    is_validated: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    well: Mapped["Well"] = relationship(back_populates="production_records")
