from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


# ---------------------------------------------------------------------------
# Stateless calculation request / response
# ---------------------------------------------------------------------------

class PressureStepInput(BaseModel):
    """Single pressure/production data point for MBE."""
    pressure: float = Field(..., ge=0, description="Reservoir pressure (psia)")
    np_cum: float = Field(..., ge=0, description="Cumulative oil produced (STB)")
    gp_cum: float = Field(..., ge=0, description="Cumulative gas produced (Mscf)")
    wp_cum: float = Field(default=0.0, ge=0, description="Cumulative water produced (STB)")
    wi_cum: float = Field(default=0.0, ge=0, description="Cumulative water injected (STB)")
    gi_cum: float = Field(default=0.0, ge=0, description="Cumulative gas injected (Mscf)")


class PVTDataInput(BaseModel):
    """PVT properties at a specific pressure."""
    pressure: float = Field(..., ge=0, description="Pressure (psia)")
    bo: float = Field(..., gt=0, description="Oil FVF (rb/stb)")
    bg: float = Field(..., gt=0, description="Gas FVF (rb/scf)")
    bw: float = Field(default=1.0, gt=0, description="Water FVF (rb/stb)")
    rs: float = Field(..., ge=0, description="Solution GOR (scf/stb)")


class MaterialBalanceCalculateRequest(BaseModel):
    """Stateless material balance calculation request."""
    pressure_history: list[PressureStepInput] = Field(..., min_length=3)
    pvt_data: list[PVTDataInput] = Field(..., min_length=2)
    initial_pressure: float = Field(..., ge=0, description="Initial reservoir pressure (psia)")
    boi: float = Field(..., gt=0, description="Initial oil FVF (rb/stb)")
    bgi: float = Field(..., gt=0, description="Initial gas FVF (rb/scf)")
    rsi: float = Field(..., ge=0, description="Initial solution GOR (scf/stb)")
    method: str = Field(default="both", description="Method: schilthuis, havlena_odeh, or both")
    gas_cap_ratio: float | None = Field(default=None, ge=0, description="Gas-cap to oil-zone ratio (m)")
    swi: float = Field(default=0.2, ge=0, le=1, description="Initial water saturation")
    cf: float = Field(default=3.0e-6, ge=0, description="Formation compressibility (1/psi)")
    cw: float = Field(default=3.0e-6, ge=0, description="Water compressibility (1/psi)")


class MaterialBalanceCalculateResponse(BaseModel):
    """Stateless calculation result."""
    ooip: float | None
    ogip: float | None
    gas_cap_ratio: float | None
    water_influx: list[float]
    drive_mechanism: str
    drive_indices: dict
    plot_data: dict
    method: str


# ---------------------------------------------------------------------------
# CRUD schemas
# ---------------------------------------------------------------------------

class MaterialBalanceCreate(BaseModel):
    """Save a material balance analysis."""
    name: str = Field(..., min_length=1, max_length=255)
    method: str = Field(default="both")
    inputs: dict
    results: dict
    ooip: float | None = None
    gas_cap_ratio: float | None = None
    drive_mechanism: str | None = None


class MaterialBalanceResponse(BaseModel):
    """Saved material balance analysis response."""
    id: UUID
    well_id: UUID
    team_id: UUID
    name: str
    method: str
    inputs: dict
    results: dict
    ooip: float | None
    gas_cap_ratio: float | None
    drive_mechanism: str | None
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
