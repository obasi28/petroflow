import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.models.well_test import WellTestAnalysisModel
from app.schemas.well_test import (
    WellTestAnalyzeRequest,
    WellTestAnalyzeResponse,
    WellTestCreate,
    WellTestResponse,
)
from app.schemas.common import success_response
from app.utils.exceptions import NotFoundException, EngineException
from app.engine.well_test import WellTestAnalyzer, WellTestData, WellParams

router = APIRouter(tags=["well-test"])


@router.post("/wells/{well_id}/well-test/analyze")
async def analyze_well_test(
    well_id: uuid.UUID,
    data: WellTestAnalyzeRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Stateless well test analysis — no database storage."""
    try:
        test_data = WellTestData(
            time=data.time,
            pressure=data.pressure,
            rate=data.rate,
            test_type=data.test_type,
            tp=data.tp,
            pwf_at_shutin=data.pwf_at_shutin,
        )
        well_params = WellParams(
            mu=data.well_params.mu,
            bo=data.well_params.bo,
            h=data.well_params.h,
            phi=data.well_params.phi,
            ct=data.well_params.ct,
            rw=data.well_params.rw,
            pi=data.well_params.pi,
        )

        analyzer = WellTestAnalyzer()
        result = analyzer.analyze(test_data, well_params)

    except (ValueError, ZeroDivisionError, TypeError) as exc:
        raise EngineException(f"Well test analysis failed: {str(exc)}")

    # Build plot data from the result
    plot_data = {}
    if result.drawdown is not None:
        plot_data["semi_log"] = result.drawdown.semi_log_plot
        plot_data["log_log"] = result.drawdown.log_log_plot
    if result.buildup is not None:
        plot_data["horner"] = result.buildup.horner_plot
        plot_data["mdh"] = result.buildup.mdh_plot
        plot_data["log_log"] = result.buildup.log_log_plot
    if result.derivative is not None:
        plot_data["derivative"] = {
            "time": result.derivative.time,
            "delta_p": result.derivative.delta_p,
            "derivative": result.derivative.derivative,
            "flow_regimes": result.derivative.flow_regimes,
        }

    response = WellTestAnalyzeResponse(
        test_type=result.test_type,
        permeability=result.permeability,
        skin_factor=result.skin_factor,
        flow_capacity=result.flow_capacity,
        p_star=result.p_star,
        flow_efficiency=result.flow_efficiency,
        dp_skin=result.dp_skin,
        radius_investigation=result.radius_investigation,
        summary=result.summary,
        plot_data=plot_data,
    )

    return success_response(response.model_dump())


@router.post("/wells/{well_id}/well-test")
async def save_well_test(
    well_id: uuid.UUID,
    data: WellTestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Save a well test analysis linked to a well."""
    analysis = WellTestAnalysisModel(
        well_id=well_id,
        team_id=current_user.team_id,
        name=data.name,
        test_type=data.test_type,
        test_data=data.test_data,
        results=data.results,
        permeability=data.permeability,
        skin_factor=data.skin_factor,
        storage_coefficient=data.storage_coefficient,
        created_by=current_user.id,
    )
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    return success_response(WellTestResponse.model_validate(analysis).model_dump())


@router.get("/wells/{well_id}/well-test")
async def list_well_tests(
    well_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List saved well test analyses for a well."""
    result = await db.execute(
        select(WellTestAnalysisModel)
        .where(
            WellTestAnalysisModel.well_id == well_id,
            WellTestAnalysisModel.team_id == current_user.team_id,
        )
        .order_by(WellTestAnalysisModel.updated_at.desc())
    )
    analyses = list(result.scalars().all())

    return success_response(
        [WellTestResponse.model_validate(a).model_dump() for a in analyses]
    )


@router.get("/wells/{well_id}/well-test/{analysis_id}")
async def get_well_test(
    well_id: uuid.UUID,
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single well test analysis."""
    result = await db.execute(
        select(WellTestAnalysisModel).where(
            WellTestAnalysisModel.id == analysis_id,
            WellTestAnalysisModel.well_id == well_id,
            WellTestAnalysisModel.team_id == current_user.team_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise NotFoundException("Well test analysis not found")

    return success_response(WellTestResponse.model_validate(analysis).model_dump())


@router.delete("/wells/{well_id}/well-test/{analysis_id}")
async def delete_well_test(
    well_id: uuid.UUID,
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a well test analysis."""
    result = await db.execute(
        select(WellTestAnalysisModel).where(
            WellTestAnalysisModel.id == analysis_id,
            WellTestAnalysisModel.well_id == well_id,
            WellTestAnalysisModel.team_id == current_user.team_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise NotFoundException("Well test analysis not found")

    await db.delete(analysis)
    await db.flush()
    return success_response({"deleted": True})
