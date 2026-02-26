import io
import csv
import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.schemas.production import ProductionBatchCreate, ProductionRecordResponse, ProductionStatistics
from app.schemas.common import success_response
from app.services import production_service

router = APIRouter(prefix="/wells/{well_id}/production", tags=["production"])


@router.get("")
async def get_production(
    well_id: uuid.UUID,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    records = await production_service.get_production(
        db, well_id, current_user.team_id, start_date, end_date
    )
    return success_response(
        [ProductionRecordResponse.model_validate(r).model_dump() for r in records]
    )


@router.post("")
async def upsert_production(
    well_id: uuid.UUID,
    data: ProductionBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    count = await production_service.upsert_production(
        db, well_id, current_user.team_id, data.records
    )
    return success_response({"records_upserted": count})


@router.get("/statistics")
async def get_statistics(
    well_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    stats = await production_service.get_statistics(db, well_id, current_user.team_id)
    return success_response(stats.model_dump())


@router.get("/export")
async def export_production_csv(
    well_id: uuid.UUID,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    records = await production_service.get_production(
        db, well_id, current_user.team_id, start_date, end_date
    )

    columns = [
        "production_date", "days_on",
        "oil_rate", "gas_rate", "water_rate", "boe",
        "cum_oil", "cum_gas", "cum_water",
        "gor", "water_cut",
        "tubing_pressure", "casing_pressure", "flowing_bhp",
        "choke_size", "hours_on",
    ]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    for rec in records:
        writer.writerow([getattr(rec, col, None) for col in columns])

    output.seek(0)
    filename = f"production_{well_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("")
async def delete_production(
    well_id: uuid.UUID,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    count = await production_service.delete_production(
        db, well_id, current_user.team_id, start_date, end_date
    )
    return success_response({"records_deleted": count})
