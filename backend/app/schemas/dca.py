from pydantic import BaseModel, Field
from datetime import date, datetime
from uuid import UUID


class DCACreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    model_type: str = Field(
        ...,
        pattern="^(exponential|hyperbolic|harmonic|modified_hyperbolic|sedm|duong)$",
    )
    fluid_type: str = Field(default="oil", pattern="^(oil|gas|water|boe)$")
    start_date: date
    end_date: date | None = None
    initial_params: dict | None = None  # Null = auto-fit
    economic_limit: float = 5.0
    forecast_months: int = Field(default=360, ge=1, le=600)


class DCAUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    parameters: dict | None = None
    economic_limit: float | None = None
    forecast_months: int | None = None


class DCAForecastRequest(BaseModel):
    parameters: dict
    forecast_months: int = 360
    economic_limit: float = 5.0


class DCAMonteCarloRequest(BaseModel):
    iterations: int = Field(default=10000, ge=100, le=100000)
    param_distributions: dict
    economic_limit: float = 5.0


class DCAAutoFitRequest(BaseModel):
    well_id: UUID
    fluid_type: str = "oil"
    start_date: date
    end_date: date | None = None
    forecast_months: int = Field(default=360, ge=1, le=600)
    economic_limit: float = Field(default=5.0, ge=0)


class DCAForecastPointResponse(BaseModel):
    forecast_date: date
    time_months: float
    rate: float
    cumulative: float

    model_config = {"from_attributes": True}


class DCAResponse(BaseModel):
    id: UUID
    well_id: UUID
    name: str
    description: str | None
    model_type: str
    fluid_type: str
    start_date: date
    end_date: date | None
    parameters: dict
    r_squared: float | None
    rmse: float | None
    aic: float | None
    bic: float | None
    forecast_months: int
    economic_limit: float | None
    eur: float | None
    remaining_reserves: float | None
    cum_at_forecast_start: float | None
    monte_carlo_results: dict | None
    status: str
    is_primary: bool
    created_at: datetime
    updated_at: datetime
    forecast_points: list[DCAForecastPointResponse] = []

    model_config = {"from_attributes": True}


class DCAAutoFitResponse(BaseModel):
    model_type: str
    parameters: dict
    r_squared: float
    rmse: float
    aic: float
    bic: float
    eur: float | None
    forecast_points: list[DCAForecastPointResponse] = []
