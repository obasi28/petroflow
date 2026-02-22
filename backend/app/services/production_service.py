import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.models.production import ProductionRecord
from app.schemas.production import ProductionRecordCreate, ProductionStatistics


async def get_production(
    db: AsyncSession,
    well_id: uuid.UUID,
    team_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[ProductionRecord]:
    query = select(ProductionRecord).where(
        ProductionRecord.well_id == well_id,
        ProductionRecord.team_id == team_id,
    )
    if start_date:
        query = query.where(ProductionRecord.production_date >= start_date)
    if end_date:
        query = query.where(ProductionRecord.production_date <= end_date)

    query = query.order_by(ProductionRecord.production_date.asc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def upsert_production(
    db: AsyncSession,
    well_id: uuid.UUID,
    team_id: uuid.UUID,
    records: list[ProductionRecordCreate],
) -> int:
    count = 0
    for rec in records:
        existing = await db.execute(
            select(ProductionRecord).where(
                ProductionRecord.well_id == well_id,
                ProductionRecord.production_date == rec.production_date,
            )
        )
        existing = existing.scalar_one_or_none()

        data = rec.model_dump(exclude_none=True)

        # Auto-calculate ratios if not provided
        if data.get("oil_rate") and data.get("gas_rate") and not data.get("gor"):
            if data["oil_rate"] > 0:
                data["gor"] = data["gas_rate"] / data["oil_rate"]
        if data.get("water_rate") and data.get("oil_rate") and not data.get("water_cut"):
            total_liquid = data["oil_rate"] + data["water_rate"]
            if total_liquid > 0:
                data["water_cut"] = data["water_rate"] / total_liquid
        if data.get("oil_rate") and data.get("gas_rate") and not data.get("boe"):
            data["boe"] = data["oil_rate"] + data["gas_rate"] / 6.0

        if existing:
            for field, value in data.items():
                setattr(existing, field, value)
        else:
            record = ProductionRecord(
                well_id=well_id,
                team_id=team_id,
                data_source="manual",
                **data,
            )
            db.add(record)
        count += 1

    await db.flush()
    return count


async def get_statistics(
    db: AsyncSession, well_id: uuid.UUID, team_id: uuid.UUID
) -> ProductionStatistics:
    base = select(ProductionRecord).where(
        ProductionRecord.well_id == well_id,
        ProductionRecord.team_id == team_id,
    )

    # Total records
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0

    if total == 0:
        return ProductionStatistics(
            total_records=0,
            first_production_date=None, last_production_date=None,
            peak_oil_rate=None, peak_gas_rate=None,
            current_oil_rate=None, current_gas_rate=None,
            cum_oil=None, cum_gas=None, cum_water=None,
            avg_oil_rate=None, avg_gas_rate=None,
            avg_water_cut=None, avg_gor=None,
        )

    stats = await db.execute(
        select(
            func.min(ProductionRecord.production_date),
            func.max(ProductionRecord.production_date),
            func.max(ProductionRecord.oil_rate),
            func.max(ProductionRecord.gas_rate),
            func.max(ProductionRecord.cum_oil),
            func.max(ProductionRecord.cum_gas),
            func.max(ProductionRecord.cum_water),
            func.avg(ProductionRecord.oil_rate),
            func.avg(ProductionRecord.gas_rate),
            func.avg(ProductionRecord.water_cut),
            func.avg(ProductionRecord.gor),
        ).where(
            ProductionRecord.well_id == well_id,
            ProductionRecord.team_id == team_id,
        )
    )
    row = stats.one()

    # Get current (most recent) rates
    latest = await db.execute(
        select(ProductionRecord)
        .where(ProductionRecord.well_id == well_id, ProductionRecord.team_id == team_id)
        .order_by(ProductionRecord.production_date.desc())
        .limit(1)
    )
    latest_record = latest.scalar_one_or_none()

    return ProductionStatistics(
        total_records=total,
        first_production_date=row[0],
        last_production_date=row[1],
        peak_oil_rate=row[2],
        peak_gas_rate=row[3],
        current_oil_rate=latest_record.oil_rate if latest_record else None,
        current_gas_rate=latest_record.gas_rate if latest_record else None,
        cum_oil=row[4],
        cum_gas=row[5],
        cum_water=row[6],
        avg_oil_rate=float(row[7]) if row[7] else None,
        avg_gas_rate=float(row[8]) if row[8] else None,
        avg_water_cut=float(row[9]) if row[9] else None,
        avg_gor=float(row[10]) if row[10] else None,
    )


async def delete_production(
    db: AsyncSession,
    well_id: uuid.UUID,
    team_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> int:
    query = delete(ProductionRecord).where(
        ProductionRecord.well_id == well_id,
        ProductionRecord.team_id == team_id,
    )
    if start_date:
        query = query.where(ProductionRecord.production_date >= start_date)
    if end_date:
        query = query.where(ProductionRecord.production_date <= end_date)

    result = await db.execute(query)
    await db.flush()
    return result.rowcount
