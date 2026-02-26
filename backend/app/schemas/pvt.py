from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class PVTCalculateRequest(BaseModel):
    """Stateless PVT calculation request."""
    api_gravity: float = Field(..., ge=10, le=70, description="API gravity")
    gas_gravity: float = Field(..., ge=0.5, le=1.8, description="Gas specific gravity")
    temperature: float = Field(..., ge=60, le=500, description="Temperature (deg F)")
    separator_pressure: float = Field(default=100.0, ge=0, le=3000, description="Separator pressure (psig)")
    separator_temperature: float = Field(default=60.0, ge=40, le=200, description="Separator temperature (deg F)")
    rs_at_pb: float | None = Field(default=None, ge=0, le=5000, description="Known Rs at bubble point (scf/stb)")
    max_pressure: float = Field(default=6000.0, ge=100, le=20000, description="Max pressure for table (psia)")
    num_points: int = Field(default=50, ge=10, le=200, description="Number of pressure points")

    # Correlation selections (optional)
    correlation_bubble_point: str = Field(default="standing")
    correlation_rs: str = Field(default="standing")
    correlation_bo: str = Field(default="standing")
    correlation_dead_oil_viscosity: str = Field(default="beggs_robinson")


class PVTPoint(BaseModel):
    """Single PVT data point."""
    pressure: float
    rs: float
    bo: float
    bg: float
    mu_o: float
    mu_g: float
    z_factor: float
    co: float
    oil_density: float


class PVTCalculateResponse(BaseModel):
    """PVT calculation result."""
    bubble_point: float
    rs_at_pb: float
    bo_at_pb: float
    mu_o_at_pb: float
    inputs: dict
    correlations_used: dict
    table: list[PVTPoint]


class PVTStudyCreate(BaseModel):
    """Save a PVT study to a well."""
    name: str = Field(..., min_length=1, max_length=255)
    inputs: dict
    correlation_set: dict = Field(default_factory=dict)
    results: dict


class PVTStudyResponse(BaseModel):
    """Saved PVT study response."""
    id: UUID
    well_id: UUID
    team_id: UUID
    name: str
    inputs: dict
    correlation_set: dict
    results: dict
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
