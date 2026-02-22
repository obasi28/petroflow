from pydantic import BaseModel
from datetime import date
from uuid import UUID


class ProductionRecordCreate(BaseModel):
    production_date: date
    days_on: int = 30
    oil_rate: float | None = None
    gas_rate: float | None = None
    water_rate: float | None = None
    cum_oil: float | None = None
    cum_gas: float | None = None
    cum_water: float | None = None
    gor: float | None = None
    water_cut: float | None = None
    boe: float | None = None
    tubing_pressure: float | None = None
    casing_pressure: float | None = None
    flowing_bhp: float | None = None
    choke_size: float | None = None
    hours_on: float | None = None


class ProductionBatchCreate(BaseModel):
    records: list[ProductionRecordCreate]


class ProductionRecordResponse(BaseModel):
    well_id: UUID
    production_date: date
    days_on: int
    oil_rate: float | None
    gas_rate: float | None
    water_rate: float | None
    cum_oil: float | None
    cum_gas: float | None
    cum_water: float | None
    gor: float | None
    water_cut: float | None
    boe: float | None
    tubing_pressure: float | None
    casing_pressure: float | None
    flowing_bhp: float | None
    choke_size: float | None
    hours_on: float | None
    data_source: str
    is_validated: bool

    model_config = {"from_attributes": True}


class ProductionStatistics(BaseModel):
    total_records: int
    first_production_date: date | None
    last_production_date: date | None
    peak_oil_rate: float | None
    peak_gas_rate: float | None
    current_oil_rate: float | None
    current_gas_rate: float | None
    cum_oil: float | None
    cum_gas: float | None
    cum_water: float | None
    avg_oil_rate: float | None
    avg_gas_rate: float | None
    avg_water_cut: float | None
    avg_gor: float | None
