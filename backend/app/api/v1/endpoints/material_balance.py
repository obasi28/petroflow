import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.models.material_balance import MaterialBalanceAnalysis
from app.schemas.material_balance import (
    MaterialBalanceCalculateRequest,
    MaterialBalanceCalculateResponse,
    MaterialBalanceCreate,
    MaterialBalanceResponse,
)
from app.schemas.common import success_response
from app.utils.exceptions import NotFoundException, EngineException
from app.engine.material_balance import (
    TankModel,
    MBEInputs,
    PressureStep,
    PVTAtPressure,
)

router = APIRouter(tags=["material-balance"])


@router.post("/wells/{well_id}/material-balance/calculate")
async def calculate_material_balance(
    well_id: uuid.UUID,
    data: MaterialBalanceCalculateRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Stateless material balance calculation — no database storage."""
    try:
        pressure_history = [
            PressureStep(
                pressure=s.pressure,
                np_cum=s.np_cum,
                gp_cum=s.gp_cum,
                wp_cum=s.wp_cum,
                wi_cum=s.wi_cum,
                gi_cum=s.gi_cum,
            )
            for s in data.pressure_history
        ]
        pvt_data = [
            PVTAtPressure(
                pressure=p.pressure,
                bo=p.bo,
                bg=p.bg,
                bw=p.bw,
                rs=p.rs,
            )
            for p in data.pvt_data
        ]
        inputs = MBEInputs(
            pressure_history=pressure_history,
            pvt_data=pvt_data,
            initial_pressure=data.initial_pressure,
            boi=data.boi,
            bgi=data.bgi,
            rsi=data.rsi,
            gas_cap_ratio=data.gas_cap_ratio,
            swi=data.swi,
            cf=data.cf,
            cw=data.cw,
        )

        model = TankModel()
        result = model.run(inputs, method=data.method)

    except (ValueError, ZeroDivisionError) as exc:
        raise EngineException(f"Material balance calculation failed: {str(exc)}")

    response = MaterialBalanceCalculateResponse(
        ooip=result.ooip,
        ogip=result.ogip,
        gas_cap_ratio=result.gas_cap_ratio,
        water_influx=result.water_influx,
        drive_mechanism=result.drive_mechanism,
        drive_indices=result.drive_indices,
        plot_data=result.plot_data,
        method=data.method,
    )

    return success_response(response.model_dump())


@router.post("/wells/{well_id}/material-balance")
async def save_material_balance(
    well_id: uuid.UUID,
    data: MaterialBalanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Save a material balance analysis linked to a well."""
    analysis = MaterialBalanceAnalysis(
        well_id=well_id,
        team_id=current_user.team_id,
        name=data.name,
        method=data.method,
        inputs=data.inputs,
        results=data.results,
        ooip=data.ooip,
        gas_cap_ratio=data.gas_cap_ratio,
        drive_mechanism=data.drive_mechanism,
        created_by=current_user.id,
    )
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    return success_response(MaterialBalanceResponse.model_validate(analysis).model_dump())


@router.get("/wells/{well_id}/material-balance")
async def list_material_balance(
    well_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List saved material balance analyses for a well."""
    result = await db.execute(
        select(MaterialBalanceAnalysis)
        .where(
            MaterialBalanceAnalysis.well_id == well_id,
            MaterialBalanceAnalysis.team_id == current_user.team_id,
        )
        .order_by(MaterialBalanceAnalysis.updated_at.desc())
    )
    analyses = list(result.scalars().all())

    return success_response(
        [MaterialBalanceResponse.model_validate(a).model_dump() for a in analyses]
    )


@router.get("/wells/{well_id}/material-balance/{analysis_id}")
async def get_material_balance(
    well_id: uuid.UUID,
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single material balance analysis."""
    result = await db.execute(
        select(MaterialBalanceAnalysis).where(
            MaterialBalanceAnalysis.id == analysis_id,
            MaterialBalanceAnalysis.well_id == well_id,
            MaterialBalanceAnalysis.team_id == current_user.team_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise NotFoundException("Material balance analysis not found")

    return success_response(MaterialBalanceResponse.model_validate(analysis).model_dump())


@router.delete("/wells/{well_id}/material-balance/{analysis_id}")
async def delete_material_balance(
    well_id: uuid.UUID,
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a material balance analysis."""
    result = await db.execute(
        select(MaterialBalanceAnalysis).where(
            MaterialBalanceAnalysis.id == analysis_id,
            MaterialBalanceAnalysis.well_id == well_id,
            MaterialBalanceAnalysis.team_id == current_user.team_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise NotFoundException("Material balance analysis not found")

    await db.delete(analysis)
    await db.flush()
    return success_response({"deleted": True})
