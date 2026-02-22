from pydantic import BaseModel, Field
from datetime import date, datetime
from uuid import UUID


class WellCreate(BaseModel):
    well_name: str = Field(..., min_length=1, max_length=255)
    api_number: str | None = None
    uwi: str | None = None
    project_id: UUID | None = None

    # Location
    latitude: float | None = None
    longitude: float | None = None
    county: str | None = None
    state_province: str | None = None
    country: str = "US"
    basin: str | None = None
    field_name: str | None = None

    # Characteristics
    well_type: str = "oil"
    well_status: str = "active"
    orientation: str = "vertical"
    formation: str | None = None
    operator: str | None = None

    # Dates
    spud_date: date | None = None
    completion_date: date | None = None
    first_prod_date: date | None = None

    # Parameters
    total_depth: float | None = None
    lateral_length: float | None = None
    perf_top: float | None = None
    perf_bottom: float | None = None
    num_stages: int | None = None

    # Reservoir
    initial_pressure: float | None = None
    reservoir_temp: float | None = None
    porosity: float | None = None
    water_saturation: float | None = None
    net_pay: float | None = None
    permeability: float | None = None

    notes: str | None = None
    tags: list[str] | None = None


class WellUpdate(BaseModel):
    well_name: str | None = None
    api_number: str | None = None
    uwi: str | None = None
    project_id: UUID | None = None
    latitude: float | None = None
    longitude: float | None = None
    county: str | None = None
    state_province: str | None = None
    country: str | None = None
    basin: str | None = None
    field_name: str | None = None
    well_type: str | None = None
    well_status: str | None = None
    orientation: str | None = None
    formation: str | None = None
    operator: str | None = None
    spud_date: date | None = None
    completion_date: date | None = None
    first_prod_date: date | None = None
    total_depth: float | None = None
    lateral_length: float | None = None
    perf_top: float | None = None
    perf_bottom: float | None = None
    num_stages: int | None = None
    initial_pressure: float | None = None
    reservoir_temp: float | None = None
    porosity: float | None = None
    water_saturation: float | None = None
    net_pay: float | None = None
    permeability: float | None = None
    notes: str | None = None
    tags: list[str] | None = None


class WellResponse(BaseModel):
    id: UUID
    team_id: UUID
    project_id: UUID | None
    well_name: str
    api_number: str | None
    uwi: str | None
    latitude: float | None
    longitude: float | None
    county: str | None
    state_province: str | None
    country: str
    basin: str | None
    field_name: str | None
    well_type: str
    well_status: str
    orientation: str
    formation: str | None
    operator: str | None
    spud_date: date | None
    completion_date: date | None
    first_prod_date: date | None
    total_depth: float | None
    lateral_length: float | None
    perf_top: float | None
    perf_bottom: float | None
    num_stages: int | None
    initial_pressure: float | None
    reservoir_temp: float | None
    porosity: float | None
    water_saturation: float | None
    net_pay: float | None
    permeability: float | None
    notes: str | None
    tags: list[str] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
