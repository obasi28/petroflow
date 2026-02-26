import uuid
from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, literal_column, text
from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.models.well import Well
from app.models.production import ProductionRecord
from app.models.dca import DCAAnalysis
from app.schemas.common import success_response

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis")
async def get_dashboard_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    team_id = current_user.team_id

    # Total and active wells
    well_counts = await db.execute(
        select(
            func.count().label("total"),
            func.count().filter(Well.well_status == "active").label("active"),
        ).where(
            Well.team_id == team_id,
            Well.is_deleted == False,
        )
    )
    row = well_counts.one()
    total_wells = row.total
    active_wells = row.active

    # Average oil rate from the latest production record per active well
    # PostgreSQL DISTINCT ON gets the most recent record per well_id
    latest_prod_subq = (
        select(
            ProductionRecord.well_id,
            ProductionRecord.oil_rate,
            ProductionRecord.production_date,
        )
        .where(
            ProductionRecord.team_id == team_id,
            ProductionRecord.oil_rate.isnot(None),
        )
        .distinct(ProductionRecord.well_id)
        .order_by(
            ProductionRecord.well_id,
            ProductionRecord.production_date.desc(),
        )
        .subquery()
    )

    avg_rate_result = await db.execute(
        select(func.avg(latest_prod_subq.c.oil_rate))
    )
    avg_oil_rate = avg_rate_result.scalar()

    # Total EUR from DCA analyses (latest per well or is_primary)
    # Use DISTINCT ON to pick the best DCA per well: prefer is_primary, else latest
    best_dca_subq = (
        select(
            DCAAnalysis.well_id,
            DCAAnalysis.eur,
        )
        .where(
            DCAAnalysis.team_id == team_id,
            DCAAnalysis.eur.isnot(None),
        )
        .distinct(DCAAnalysis.well_id)
        .order_by(
            DCAAnalysis.well_id,
            DCAAnalysis.is_primary.desc(),
            DCAAnalysis.created_at.desc(),
        )
        .subquery()
    )

    total_eur_result = await db.execute(
        select(func.sum(best_dca_subq.c.eur))
    )
    total_eur = total_eur_result.scalar()

    # Month-over-month trend for oil rate
    # Compare current month avg vs previous month avg across all wells
    today = date.today()
    current_month_start = today.replace(day=1)
    prev_month_end = current_month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    trend_result = await db.execute(
        select(
            func.avg(ProductionRecord.oil_rate).filter(
                ProductionRecord.production_date >= current_month_start,
            ).label("current_avg"),
            func.avg(ProductionRecord.oil_rate).filter(
                ProductionRecord.production_date >= prev_month_start,
                ProductionRecord.production_date < current_month_start,
            ).label("prev_avg"),
        ).where(
            ProductionRecord.team_id == team_id,
            ProductionRecord.oil_rate.isnot(None),
        )
    )
    trend_row = trend_result.one()

    oil_trend = None
    if trend_row.prev_avg and trend_row.prev_avg > 0 and trend_row.current_avg:
        oil_trend = ((trend_row.current_avg - trend_row.prev_avg) / trend_row.prev_avg) * 100

    return success_response({
        "total_wells": total_wells,
        "active_wells": active_wells,
        "avg_oil_rate": round(float(avg_oil_rate), 1) if avg_oil_rate else None,
        "total_eur": round(float(total_eur), 0) if total_eur else None,
        "oil_trend": round(float(oil_trend), 1) if oil_trend is not None else None,
    })


@router.get("/production-summary")
async def get_production_summary(
    months: int = Query(24, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    team_id = current_user.team_id

    # Aggregate monthly production across all wells for the team
    cutoff = date.today() - timedelta(days=months * 31)

    result = await db.execute(
        select(
            func.date_trunc("month", ProductionRecord.production_date).label("month"),
            func.avg(ProductionRecord.oil_rate).label("oil"),
            func.avg(ProductionRecord.gas_rate).label("gas"),
            func.avg(ProductionRecord.water_rate).label("water"),
        )
        .where(
            ProductionRecord.team_id == team_id,
            ProductionRecord.production_date >= cutoff,
        )
        .group_by(text("1"))
        .order_by(text("1"))
    )

    rows = result.all()
    data = []
    for row in rows:
        data.append({
            "date": row.month.strftime("%Y-%m") if row.month else None,
            "oil": round(float(row.oil), 1) if row.oil else 0,
            "gas": round(float(row.gas), 1) if row.gas else 0,
            "water": round(float(row.water), 1) if row.water else 0,
        })

    return success_response(data)
