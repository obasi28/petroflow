import uuid
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import numpy as np

from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.models.dca import DCAAnalysis, DCAForecastPoint
from app.models.production import ProductionRecord
from app.schemas.dca import (
    DCACreate, DCAResponse,
    DCAMonteCarloRequest, DCAAutoFitRequest, DCAAutoFitResponse, DCAForecastPointResponse,
)
from app.schemas.common import success_response
from app.utils.exceptions import NotFoundException, EngineException, ValidationException
from app.engine.dca.fitting import DCAFitter
from app.engine.dca.forecasting import generate_forecast
from app.engine.dca.monte_carlo import MonteCarloEUR

router = APIRouter(tags=["dca"])


async def _get_production_arrays(
    db: AsyncSession, well_id: uuid.UUID, team_id: uuid.UUID,
    fluid_type: str, start_date: date, end_date: date | None,
) -> tuple[np.ndarray, np.ndarray, float]:
    """Fetch production data and return time/rate arrays for DCA fitting."""
    query = select(ProductionRecord).where(
        ProductionRecord.well_id == well_id,
        ProductionRecord.team_id == team_id,
        ProductionRecord.production_date >= start_date,
    )
    if end_date:
        query = query.where(ProductionRecord.production_date <= end_date)
    query = query.order_by(ProductionRecord.production_date.asc())

    result = await db.execute(query)
    records = list(result.scalars().all())

    if len(records) < 3:
        raise EngineException("Need at least 3 production data points for DCA fitting")

    rate_field = {
        "oil": "oil_rate", "gas": "gas_rate", "water": "water_rate", "boe": "boe"
    }.get(fluid_type, "oil_rate")
    cum_field = {
        "oil": "cum_oil", "gas": "cum_gas", "water": "cum_water"
    }.get(fluid_type, "cum_oil")

    base_date = records[0].production_date
    t_list, q_list = [], []
    for rec in records:
        rate = getattr(rec, rate_field)
        if rate is not None and rate > 0:
            months = (rec.production_date - base_date).days / 30.4375
            t_list.append(months)
            q_list.append(rate)

    if len(t_list) < 3:
        raise EngineException("Insufficient non-zero production data points")

    # Get cumulative at start for EUR calculation
    last_cum = None
    for rec in reversed(records):
        val = getattr(rec, cum_field, None) if cum_field else None
        if val is not None:
            last_cum = val
            break

    return np.array(t_list), np.array(q_list), last_cum or 0.0


def _normalize_param_distributions(param_distributions: dict) -> dict:
    """
    Accept both `type` and legacy `distribution` keys from clients.
    """
    normalized = {}
    for param, config in param_distributions.items():
        if not isinstance(config, dict):
            raise ValidationException(f"Invalid distribution config for '{param}'")

        dist_type = config.get("type") or config.get("distribution")
        if not dist_type:
            raise ValidationException(
                f"Distribution type missing for '{param}'",
                field=f"param_distributions.{param}.type",
            )

        normalized[param] = {**config, "type": dist_type}
        normalized[param].pop("distribution", None)

    return normalized


def _build_histogram(values: np.ndarray, bins: int = 30) -> tuple[list[float], list[int]]:
    if values.size == 0:
        return [], []
    counts, edges = np.histogram(values, bins=bins)
    return [float(v) for v in edges.tolist()], [int(v) for v in counts.tolist()]


@router.get("/wells/{well_id}/dca")
async def list_analyses(
    well_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(DCAAnalysis)
        .options(selectinload(DCAAnalysis.forecast_points))
        .where(DCAAnalysis.well_id == well_id, DCAAnalysis.team_id == current_user.team_id)
        .order_by(DCAAnalysis.updated_at.desc())
    )
    analyses = list(result.scalars().all())

    return success_response(
        [DCAResponse.model_validate(a).model_dump() for a in analyses]
    )


@router.post("/wells/{well_id}/dca")
async def create_analysis(
    well_id: uuid.UUID,
    data: DCACreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    t, q, cum_to_date = await _get_production_arrays(
        db, well_id, current_user.team_id, data.fluid_type, data.start_date, data.end_date
    )

    fitter = DCAFitter()
    fit_result = fitter.fit(t, q, data.model_type, data.initial_params)

    if not fit_result.success:
        raise EngineException(f"Curve fitting failed: {fit_result.message}")

    # Generate forecast
    forecast = generate_forecast(
        model_type=data.model_type,
        parameters=fit_result.parameters,
        forecast_months=data.forecast_months,
        economic_limit=data.economic_limit,
    )

    eur = forecast["cumulative"][-1] + cum_to_date if len(forecast["cumulative"]) > 0 else cum_to_date

    analysis = DCAAnalysis(
        well_id=well_id,
        team_id=current_user.team_id,
        name=data.name,
        model_type=data.model_type,
        fluid_type=data.fluid_type,
        start_date=data.start_date,
        end_date=data.end_date,
        parameters=fit_result.parameters,
        r_squared=fit_result.r_squared,
        rmse=fit_result.rmse,
        aic=fit_result.aic,
        bic=fit_result.bic,
        economic_limit=data.economic_limit,
        forecast_months=data.forecast_months,
        eur=eur,
        remaining_reserves=eur - cum_to_date,
        cum_at_forecast_start=cum_to_date,
        status="completed",
        created_by=current_user.id,
    )
    db.add(analysis)
    await db.flush()

    # Store forecast points
    base_date = data.start_date
    for i in range(len(forecast["time"])):
        point = DCAForecastPoint(
            analysis_id=analysis.id,
            forecast_date=base_date + timedelta(days=int(forecast["time"][i] * 30.4375)),
            time_months=float(forecast["time"][i]),
            rate=float(forecast["rate"][i]),
            cumulative=float(forecast["cumulative"][i]),
        )
        db.add(point)

    await db.flush()
    analysis_result = await db.execute(
        select(DCAAnalysis)
        .options(selectinload(DCAAnalysis.forecast_points))
        .where(DCAAnalysis.id == analysis.id)
    )
    analysis_with_points = analysis_result.scalar_one()

    return success_response(DCAResponse.model_validate(analysis_with_points).model_dump())


@router.get("/wells/{well_id}/dca/{analysis_id}")
async def get_analysis(
    well_id: uuid.UUID,
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(DCAAnalysis)
        .options(selectinload(DCAAnalysis.forecast_points))
        .where(
            DCAAnalysis.id == analysis_id,
            DCAAnalysis.well_id == well_id,
            DCAAnalysis.team_id == current_user.team_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise NotFoundException("DCA analysis not found")

    return success_response(DCAResponse.model_validate(analysis).model_dump())


@router.delete("/wells/{well_id}/dca/{analysis_id}")
async def delete_analysis(
    well_id: uuid.UUID,
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(DCAAnalysis).where(
            DCAAnalysis.id == analysis_id,
            DCAAnalysis.well_id == well_id,
            DCAAnalysis.team_id == current_user.team_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise NotFoundException("DCA analysis not found")

    await db.delete(analysis)
    await db.flush()
    return success_response({"deleted": True})


@router.post("/wells/{well_id}/dca/{analysis_id}/monte-carlo")
async def start_monte_carlo(
    well_id: uuid.UUID,
    analysis_id: uuid.UUID,
    data: DCAMonteCarloRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(DCAAnalysis).where(
            DCAAnalysis.id == analysis_id,
            DCAAnalysis.well_id == well_id,
            DCAAnalysis.team_id == current_user.team_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise NotFoundException("DCA analysis not found")

    try:
        normalized_distributions = _normalize_param_distributions(data.param_distributions)
        mc = MonteCarloEUR()
        result = mc.run(
            model_type=analysis.model_type,
            base_parameters=analysis.parameters,
            param_distributions=normalized_distributions,
            economic_limit=data.economic_limit,
            cum_to_date=analysis.cum_at_forecast_start or 0.0,
            iterations=data.iterations,
        )
    except ValidationException:
        raise
    except Exception as exc:
        raise EngineException(f"Monte Carlo simulation failed: {str(exc)}")

    histogram_bins, histogram_counts = _build_histogram(result.eur_distribution, bins=30)
    sample_size = min(500, len(result.eur_distribution))
    sample = result.eur_distribution[:sample_size]

    analysis.monte_carlo_results = {
        "p10": result.eur_p10,
        "p50": result.eur_p50,
        "p90": result.eur_p90,
        "mean": result.eur_mean,
        "std": result.eur_std,
        "iterations": result.iterations,
        "histogram_bins": histogram_bins,
        "histogram_counts": histogram_counts,
        "eur_distribution_sample": [float(v) for v in sample.tolist()],
    }
    analysis.status = "completed"
    await db.flush()
    await db.refresh(analysis)

    return success_response({
        "status": "completed",
        "monte_carlo_results": analysis.monte_carlo_results,
    })


@router.post("/dca/auto-fit")
async def auto_fit(
    data: DCAAutoFitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    t, q, cum_to_date = await _get_production_arrays(
        db, data.well_id, current_user.team_id, data.fluid_type, data.start_date, data.end_date
    )

    fitter = DCAFitter()
    results = fitter.auto_fit(t, q)

    response = []
    for r in results:
        forecast = generate_forecast(
            model_type=r.model_type,
            parameters=r.parameters,
            forecast_months=360,
            economic_limit=5.0,
        )
        eur = forecast["cumulative"][-1] + cum_to_date if len(forecast["cumulative"]) > 0 else None
        forecast_points = [
            DCAForecastPointResponse(
                forecast_date=data.start_date + timedelta(days=int(forecast["time"][i] * 30.4375)),
                time_months=float(forecast["time"][i]),
                rate=float(forecast["rate"][i]),
                cumulative=float(forecast["cumulative"][i]),
            )
            for i in range(len(forecast["time"]))
        ]

        response.append(DCAAutoFitResponse(
            model_type=r.model_type,
            parameters=r.parameters,
            r_squared=r.r_squared,
            rmse=r.rmse,
            aic=r.aic,
            bic=r.bic,
            eur=eur,
            forecast_points=forecast_points,
        ).model_dump())

    return success_response(response)
