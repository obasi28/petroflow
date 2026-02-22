import uuid
from datetime import date
from sqlalchemy import String, Float, Integer, Date, Boolean, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class DCAAnalysis(Base, TimestampMixin):
    __tablename__ = "dca_analyses"
    __table_args__ = (
        Index("idx_dca_well", "well_id"),
        Index("idx_dca_team", "team_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    well_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("wells.id", ondelete="CASCADE"))
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))

    # Configuration
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String)

    # Data selection
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)
    fluid_type: Mapped[str] = mapped_column(String(10), default="oil")  # oil, gas, water, boe

    # Model
    model_type: Mapped[str] = mapped_column(String(30), nullable=False)
    parameters: Mapped[dict] = mapped_column(JSONB, nullable=False)

    # Fit quality
    r_squared: Mapped[float | None] = mapped_column(Float)
    rmse: Mapped[float | None] = mapped_column(Float)
    aic: Mapped[float | None] = mapped_column(Float)
    bic: Mapped[float | None] = mapped_column(Float)

    # Forecast config
    forecast_end_date: Mapped[date | None] = mapped_column(Date)
    economic_limit: Mapped[float | None] = mapped_column(Float)
    forecast_months: Mapped[int] = mapped_column(Integer, default=360)

    # Results
    eur: Mapped[float | None] = mapped_column(Float)
    remaining_reserves: Mapped[float | None] = mapped_column(Float)
    cum_at_forecast_start: Mapped[float | None] = mapped_column(Float)

    # Monte Carlo
    monte_carlo_results: Mapped[dict | None] = mapped_column(JSONB)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="completed")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Relationships
    well: Mapped["Well"] = relationship(back_populates="dca_analyses")
    forecast_points: Mapped[list["DCAForecastPoint"]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan"
    )


class DCAForecastPoint(Base):
    __tablename__ = "dca_forecast_points"

    analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("dca_analyses.id", ondelete="CASCADE"), primary_key=True
    )
    forecast_date: Mapped[date] = mapped_column(Date, primary_key=True)
    time_months: Mapped[float] = mapped_column(Float, nullable=False)
    rate: Mapped[float] = mapped_column(Float, nullable=False)
    cumulative: Mapped[float] = mapped_column(Float, nullable=False)

    analysis: Mapped["DCAAnalysis"] = relationship(back_populates="forecast_points")
