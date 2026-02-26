import uuid
from sqlalchemy import String, Float, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class MaterialBalanceAnalysis(Base, TimestampMixin):
    __tablename__ = "material_balance_analyses"
    __table_args__ = (
        Index("idx_mb_well", "well_id"),
        Index("idx_mb_team", "team_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    well_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("wells.id", ondelete="CASCADE"))
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str] = mapped_column(String(50), nullable=False, default="both")

    # Flexible JSONB for inputs and results
    inputs: Mapped[dict] = mapped_column(JSONB, default=dict)
    results: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Key scalar results for quick querying / dashboard display
    ooip: Mapped[float | None] = mapped_column(Float, nullable=True)
    gas_cap_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    drive_mechanism: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
