import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.models.project import Project
from app.models.well import Well
from app.models.dca import DCAAnalysis
from app.models.production import ProductionRecord
from app.schemas.common import success_response, paginated_response
from app.utils.exceptions import NotFoundException
from pydantic import BaseModel, Field
from datetime import date, datetime

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectDCAResponse(BaseModel):
    id: uuid.UUID
    well_id: uuid.UUID
    well_name: str
    name: str
    model_type: str
    fluid_type: str
    r_squared: float | None
    aic: float | None
    eur: float | None
    remaining_reserves: float | None
    status: str
    updated_at: datetime


class ProjectSummaryResponse(BaseModel):
    project_id: uuid.UUID
    well_count: int
    dca_count: int
    total_eur: float
    total_remaining_reserves: float
    total_cum_oil: float
    total_cum_gas: float
    total_cum_water: float
    last_production_date: date | None


async def _get_project_or_404(
    db: AsyncSession, project_id: uuid.UUID, team_id: uuid.UUID
) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.team_id == team_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundException("Project not found")
    return project


@router.get("")
async def list_projects(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    offset = (page - 1) * per_page
    query = select(Project).where(Project.team_id == current_user.team_id)

    total = (await db.execute(
        select(func.count()).select_from(query.subquery())
    )).scalar() or 0

    result = await db.execute(
        query.order_by(Project.updated_at.desc()).offset(offset).limit(per_page)
    )
    projects = list(result.scalars().all())

    return paginated_response(
        [ProjectResponse.model_validate(p).model_dump() for p in projects],
        page=page, per_page=per_page, total=total,
    )


@router.post("")
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    project = Project(
        team_id=current_user.team_id,
        name=data.name,
        description=data.description,
        created_by=current_user.id,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return success_response(ProjectResponse.model_validate(project).model_dump())


@router.get("/{project_id}")
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    project = await _get_project_or_404(db, project_id, current_user.team_id)
    return success_response(ProjectResponse.model_validate(project).model_dump())


@router.get("/{project_id}/dca")
async def list_project_dca(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    await _get_project_or_404(db, project_id, current_user.team_id)

    result = await db.execute(
        select(DCAAnalysis, Well.well_name)
        .join(Well, Well.id == DCAAnalysis.well_id)
        .where(
            Well.project_id == project_id,
            Well.team_id == current_user.team_id,
            Well.is_deleted == False,
            DCAAnalysis.team_id == current_user.team_id,
        )
        .order_by(DCAAnalysis.updated_at.desc())
    )

    data = [
        ProjectDCAResponse(
            id=analysis.id,
            well_id=analysis.well_id,
            well_name=well_name,
            name=analysis.name,
            model_type=analysis.model_type,
            fluid_type=analysis.fluid_type,
            r_squared=analysis.r_squared,
            aic=analysis.aic,
            eur=analysis.eur,
            remaining_reserves=analysis.remaining_reserves,
            status=analysis.status,
            updated_at=analysis.updated_at,
        ).model_dump()
        for analysis, well_name in result.all()
    ]

    return success_response(data)


@router.get("/{project_id}/summary")
async def get_project_summary(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    await _get_project_or_404(db, project_id, current_user.team_id)

    well_count_result = await db.execute(
        select(func.count(Well.id)).where(
            Well.project_id == project_id,
            Well.team_id == current_user.team_id,
            Well.is_deleted == False,
        )
    )
    well_count = int(well_count_result.scalar() or 0)

    dca_result = await db.execute(
        select(
            func.count(DCAAnalysis.id),
            func.coalesce(func.sum(DCAAnalysis.eur), 0.0),
            func.coalesce(func.sum(DCAAnalysis.remaining_reserves), 0.0),
        )
        .join(Well, Well.id == DCAAnalysis.well_id)
        .where(
            Well.project_id == project_id,
            Well.team_id == current_user.team_id,
            Well.is_deleted == False,
            DCAAnalysis.team_id == current_user.team_id,
        )
    )
    dca_count, total_eur, total_remaining = dca_result.one()

    latest_per_well = (
        select(
            ProductionRecord.well_id.label("well_id"),
            func.max(ProductionRecord.production_date).label("latest_date"),
        )
        .join(Well, Well.id == ProductionRecord.well_id)
        .where(
            Well.project_id == project_id,
            Well.team_id == current_user.team_id,
            Well.is_deleted == False,
            ProductionRecord.team_id == current_user.team_id,
        )
        .group_by(ProductionRecord.well_id)
        .subquery()
    )

    production_result = await db.execute(
        select(
            func.coalesce(func.sum(ProductionRecord.cum_oil), 0.0),
            func.coalesce(func.sum(ProductionRecord.cum_gas), 0.0),
            func.coalesce(func.sum(ProductionRecord.cum_water), 0.0),
            func.max(ProductionRecord.production_date),
        )
        .join(
            latest_per_well,
            (ProductionRecord.well_id == latest_per_well.c.well_id)
            & (ProductionRecord.production_date == latest_per_well.c.latest_date),
        )
    )
    total_cum_oil, total_cum_gas, total_cum_water, last_production_date = production_result.one()

    summary = ProjectSummaryResponse(
        project_id=project_id,
        well_count=well_count,
        dca_count=int(dca_count or 0),
        total_eur=float(total_eur or 0.0),
        total_remaining_reserves=float(total_remaining or 0.0),
        total_cum_oil=float(total_cum_oil or 0.0),
        total_cum_gas=float(total_cum_gas or 0.0),
        total_cum_water=float(total_cum_water or 0.0),
        last_production_date=last_production_date,
    )
    return success_response(summary.model_dump())


@router.put("/{project_id}")
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    project = await _get_project_or_404(db, project_id, current_user.team_id)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    await db.flush()
    await db.refresh(project)
    return success_response(ProjectResponse.model_validate(project).model_dump())


@router.delete("/{project_id}")
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    project = await _get_project_or_404(db, project_id, current_user.team_id)
    await db.delete(project)
    await db.flush()
    return success_response({"deleted": True})
