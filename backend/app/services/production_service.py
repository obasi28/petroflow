import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.models.production import ProductionRecord
from app.models.dca import DCAAnalysis
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
    production_changed = False
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
            # Any production history update makes prior DCA fits stale.
            production_changed = True
        else:
            record = ProductionRecord(
                well_id=well_id,
                team_id=team_id,
                data_source="manual",
                **data,
            )
            db.add(record)
            production_changed = True
        count += 1

    if production_changed:
        await db.execute(
            delete(DCAAnalysis).where(
                DCAAnalysis.well_id == well_id,
                DCAAnalysis.team_id == team_id,
            )
        )

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


async def compute_analytics(
    db: AsyncSession, well_id: uuid.UUID, team_id: uuid.UUID
) -> dict:
    """Compute production analytics: WOR, GOR, decline rates, cumulatives.

    Returns a dict with time-series arrays ready for frontend charting.
    """
    records = await get_production(db, well_id, team_id)
    if not records:
        return {
            "dates": [], "oil_rate": [], "gas_rate": [], "water_rate": [],
            "cum_oil": [], "cum_gas": [], "cum_water": [],
            "gor": [], "wor": [], "water_cut": [], "decline_rate": [],
            "summary": {},
        }

    dates: list[str] = []
    oil_rates: list[float] = []
    gas_rates: list[float] = []
    water_rates: list[float] = []
    cum_oil_arr: list[float] = []
    cum_gas_arr: list[float] = []
    cum_water_arr: list[float] = []
    gor_vals: list[float | None] = []
    wor_vals: list[float | None] = []
    wc_vals: list[float | None] = []
    decline_rates: list[float | None] = []

    for i, rec in enumerate(records):
        dates.append(str(rec.production_date))
        qo = rec.oil_rate or 0.0
        qg = rec.gas_rate or 0.0
        qw = rec.water_rate or 0.0

        oil_rates.append(qo)
        gas_rates.append(qg)
        water_rates.append(qw)
        cum_oil_arr.append(rec.cum_oil or 0.0)
        cum_gas_arr.append(rec.cum_gas or 0.0)
        cum_water_arr.append(rec.cum_water or 0.0)

        # GOR
        gor_vals.append(rec.gor if rec.gor is not None else (qg / qo if qo > 0 else None))
        # WOR
        wor_vals.append(qw / qo if qo > 0 else None)
        # Water cut
        total_liquid = qo + qw
        wc_vals.append(qw / total_liquid if total_liquid > 0 else None)
        # Instantaneous decline rate
        if i > 0 and oil_rates[i - 1] > 0:
            d = -(qo - oil_rates[i - 1]) / oil_rates[i - 1]
            decline_rates.append(round(d, 6))
        else:
            decline_rates.append(None)

    # Summary metrics
    valid_declines = [d for d in decline_rates if d is not None]
    avg_decline = sum(valid_declines) / len(valid_declines) if valid_declines else 0.0

    return {
        "dates": dates,
        "oil_rate": oil_rates,
        "gas_rate": gas_rates,
        "water_rate": water_rates,
        "cum_oil": cum_oil_arr,
        "cum_gas": cum_gas_arr,
        "cum_water": cum_water_arr,
        "gor": gor_vals,
        "wor": wor_vals,
        "water_cut": wc_vals,
        "decline_rate": decline_rates,
        "summary": {
            "peak_oil_rate": max(oil_rates) if oil_rates else 0.0,
            "current_oil_rate": oil_rates[-1] if oil_rates else 0.0,
            "total_cum_oil": cum_oil_arr[-1] if cum_oil_arr else 0.0,
            "total_cum_gas": cum_gas_arr[-1] if cum_gas_arr else 0.0,
            "total_cum_water": cum_water_arr[-1] if cum_water_arr else 0.0,
            "avg_decline_rate": round(avg_decline, 6),
            "num_records": len(records),
        },
    }


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
