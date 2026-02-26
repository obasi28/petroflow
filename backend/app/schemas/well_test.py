from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


# ---------------------------------------------------------------------------
# Stateless analysis request / response
# ---------------------------------------------------------------------------

class WellParamsInput(BaseModel):
    """Reservoir and fluid properties for well test analysis."""
    mu: float = Field(..., gt=0, description="Oil viscosity (cp)")
    bo: float = Field(..., gt=0, description="Oil FVF (rb/stb)")
    h: float = Field(..., gt=0, description="Net pay thickness (ft)")
    phi: float = Field(..., gt=0, le=1, description="Porosity (fraction)")
    ct: float = Field(..., gt=0, description="Total compressibility (1/psi)")
    rw: float = Field(..., gt=0, description="Wellbore radius (ft)")
    pi: float | None = Field(default=None, ge=0, description="Initial reservoir pressure (psi)")


class WellTestAnalyzeRequest(BaseModel):
    """Stateless well test analysis request."""
    time: list[float] = Field(..., min_length=10, description="Time array (hours)")
    pressure: list[float] = Field(..., min_length=10, description="Pressure array (psi)")
    rate: float = Field(..., gt=0, description="Flow rate (STB/d)")
    test_type: str = Field(..., description="Test type: drawdown or buildup")
    tp: float | None = Field(default=None, ge=0, description="Producing time before shut-in (hours)")
    pwf_at_shutin: float | None = Field(default=None, ge=0, description="Pwf at shut-in (psi)")
    well_params: WellParamsInput


class WellTestAnalyzeResponse(BaseModel):
    """Stateless analysis result."""
    test_type: str
    permeability: float
    skin_factor: float
    flow_capacity: float
    p_star: float | None
    flow_efficiency: float | None
    dp_skin: float | None
    radius_investigation: float | None
    summary: dict
    plot_data: dict


# ---------------------------------------------------------------------------
# CRUD schemas
# ---------------------------------------------------------------------------

class WellTestCreate(BaseModel):
    """Save a well test analysis."""
    name: str = Field(..., min_length=1, max_length=255)
    test_type: str = Field(...)
    test_data: dict
    results: dict
    permeability: float | None = None
    skin_factor: float | None = None
    storage_coefficient: float | None = None


class WellTestResponse(BaseModel):
    """Saved well test analysis response."""
    id: UUID
    well_id: UUID
    team_id: UUID
    name: str
    test_type: str
    test_data: dict
    results: dict
    permeability: float | None
    skin_factor: float | None
    storage_coefficient: float | None
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
