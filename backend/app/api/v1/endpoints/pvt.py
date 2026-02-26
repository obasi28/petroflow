import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.models.pvt import PVTStudy
from app.schemas.pvt import (
    PVTCalculateRequest, PVTCalculateResponse, PVTPoint,
    PVTStudyCreate, PVTStudyResponse,
)
from app.schemas.common import success_response
from app.utils.exceptions import NotFoundException, EngineException
from app.engine.pvt.fluid_model import FluidModel, FluidInputs

router = APIRouter(tags=["pvt"])


@router.post("/pvt/calculate")
async def calculate_pvt(
    data: PVTCalculateRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Stateless PVT calculation — no database storage."""
    try:
        inputs = FluidInputs(
            api_gravity=data.api_gravity,
            gas_gravity=data.gas_gravity,
            temperature=data.temperature,
            separator_pressure=data.separator_pressure,
            separator_temperature=data.separator_temperature,
            rs_at_pb=data.rs_at_pb,
        )
        correlation_set = {
            "bubble_point": data.correlation_bubble_point,
            "rs": data.correlation_rs,
            "bo": data.correlation_bo,
            "dead_oil_viscosity": data.correlation_dead_oil_viscosity,
        }
        model = FluidModel(inputs, correlation_set)
        result = model.generate_pvt_table(
            max_pressure=data.max_pressure,
            num_points=data.num_points,
        )
    except (ValueError, ZeroDivisionError) as exc:
        raise EngineException(f"PVT calculation failed: {str(exc)}")

    response = PVTCalculateResponse(
        bubble_point=result.bubble_point,
        rs_at_pb=result.rs_at_pb,
        bo_at_pb=result.bo_at_pb,
        mu_o_at_pb=result.mu_o_at_pb,
        inputs=result.inputs,
        correlations_used=result.correlations_used,
        table=[
            PVTPoint(
                pressure=pt.pressure,
                rs=pt.rs,
                bo=pt.bo,
                bg=pt.bg,
                mu_o=pt.mu_o,
                mu_g=pt.mu_g,
                z_factor=pt.z_factor,
                co=pt.co,
                oil_density=pt.oil_density,
            )
            for pt in result.points
        ],
    )

    return success_response(response.model_dump())


@router.post("/wells/{well_id}/pvt")
async def save_pvt_study(
    well_id: uuid.UUID,
    data: PVTStudyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Save a PVT study linked to a well."""
    study = PVTStudy(
        well_id=well_id,
        team_id=current_user.team_id,
        name=data.name,
        inputs=data.inputs,
        correlation_set=data.correlation_set,
        results=data.results,
        created_by=current_user.id,
    )
    db.add(study)
    await db.flush()
    await db.refresh(study)

    return success_response(PVTStudyResponse.model_validate(study).model_dump())


@router.get("/wells/{well_id}/pvt")
async def list_pvt_studies(
    well_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List saved PVT studies for a well."""
    result = await db.execute(
        select(PVTStudy)
        .where(PVTStudy.well_id == well_id, PVTStudy.team_id == current_user.team_id)
        .order_by(PVTStudy.updated_at.desc())
    )
    studies = list(result.scalars().all())

    return success_response(
        [PVTStudyResponse.model_validate(s).model_dump() for s in studies]
    )


@router.get("/wells/{well_id}/pvt/{study_id}")
async def get_pvt_study(
    well_id: uuid.UUID,
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single PVT study."""
    result = await db.execute(
        select(PVTStudy).where(
            PVTStudy.id == study_id,
            PVTStudy.well_id == well_id,
            PVTStudy.team_id == current_user.team_id,
        )
    )
    study = result.scalar_one_or_none()
    if not study:
        raise NotFoundException("PVT study not found")

    return success_response(PVTStudyResponse.model_validate(study).model_dump())


@router.delete("/wells/{well_id}/pvt/{study_id}")
async def delete_pvt_study(
    well_id: uuid.UUID,
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a PVT study."""
    result = await db.execute(
        select(PVTStudy).where(
            PVTStudy.id == study_id,
            PVTStudy.well_id == well_id,
            PVTStudy.team_id == current_user.team_id,
        )
    )
    study = result.scalar_one_or_none()
    if not study:
        raise NotFoundException("PVT study not found")

    await db.delete(study)
    await db.flush()
    return success_response({"deleted": True})
