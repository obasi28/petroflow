import uuid
import logging
from datetime import date, datetime, timedelta

import numpy as np
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.models.project import Project
from app.models.well import Well
from app.models.dca import DCAAnalysis, DCAForecastPoint
from app.models.production import ProductionRecord
from app.models.material_balance import MaterialBalanceAnalysis
from app.models.well_test import WellTestAnalysisModel
from app.schemas.common import success_response, paginated_response
from app.utils.exceptions import NotFoundException, EngineException

logger = logging.getLogger(__name__)

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


class ProjectMBResponse(BaseModel):
    id: uuid.UUID
    well_id: uuid.UUID
    well_name: str
    name: str
    method: str
    ooip: float | None
    gas_cap_ratio: float | None
    drive_mechanism: str | None
    updated_at: datetime


class ProjectWTResponse(BaseModel):
    id: uuid.UUID
    well_id: uuid.UUID
    well_name: str
    name: str
    test_type: str
    permeability: float | None
    skin_factor: float | None
    storage_coefficient: float | None
    updated_at: datetime


class ProjectSummaryResponse(BaseModel):
    project_id: uuid.UUID
    well_count: int
    dca_count: int
    mb_count: int
    wt_count: int
    total_eur: float
    total_remaining_reserves: float
    total_cum_oil: float
    total_cum_gas: float
    total_cum_water: float
    last_production_date: date | None


class BatchDCARequest(BaseModel):
    model_type: str = Field(default="exponential", description="DCA model type")
    fluid_type: str = Field(default="oil", description="Fluid type to fit")
    forecast_months: int = Field(default=240, ge=12, le=600)
    economic_limit: float = Field(default=10.0, ge=0)


class BatchDCAResult(BaseModel):
    total_wells: int
    succeeded: int
    failed: int
    analyses: list[ProjectDCAResponse]
    errors: list[dict]


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


class ProjectListSummary(BaseModel):
    project_id: uuid.UUID
    well_count: int
    dca_count: int


@router.get("/summaries")
async def list_project_summaries(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return lightweight well/DCA counts for every project (single query)."""
    query = (
        select(
            Project.id.label("project_id"),
            func.count(func.distinct(Well.id)).label("well_count"),
            func.count(func.distinct(DCAAnalysis.id)).label("dca_count"),
        )
        .outerjoin(
            Well,
            (Well.project_id == Project.id) & (Well.is_deleted == False),
        )
        .outerjoin(
            DCAAnalysis,
            (DCAAnalysis.well_id == Well.id)
            & (DCAAnalysis.team_id == current_user.team_id),
        )
        .where(Project.team_id == current_user.team_id)
        .group_by(Project.id)
    )
    result = await db.execute(query)
    rows = result.all()
    summaries = [
        ProjectListSummary(
            project_id=row.project_id,
            well_count=row.well_count,
            dca_count=row.dca_count,
        ).model_dump()
        for row in rows
    ]
    return success_response(summaries)


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

    # MB count
    mb_count_result = await db.execute(
        select(func.count(MaterialBalanceAnalysis.id))
        .join(Well, Well.id == MaterialBalanceAnalysis.well_id)
        .where(
            Well.project_id == project_id,
            Well.team_id == current_user.team_id,
            Well.is_deleted == False,
            MaterialBalanceAnalysis.team_id == current_user.team_id,
        )
    )
    mb_count = int(mb_count_result.scalar() or 0)

    # WT count
    wt_count_result = await db.execute(
        select(func.count(WellTestAnalysisModel.id))
        .join(Well, Well.id == WellTestAnalysisModel.well_id)
        .where(
            Well.project_id == project_id,
            Well.team_id == current_user.team_id,
            Well.is_deleted == False,
            WellTestAnalysisModel.team_id == current_user.team_id,
        )
    )
    wt_count = int(wt_count_result.scalar() or 0)

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
        mb_count=mb_count,
        wt_count=wt_count,
        total_eur=float(total_eur or 0.0),
        total_remaining_reserves=float(total_remaining or 0.0),
        total_cum_oil=float(total_cum_oil or 0.0),
        total_cum_gas=float(total_cum_gas or 0.0),
        total_cum_water=float(total_cum_water or 0.0),
        last_production_date=last_production_date,
    )
    return success_response(summary.model_dump())


@router.get("/{project_id}/material-balance")
async def list_project_mb(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all Material Balance analyses across wells in this project."""
    await _get_project_or_404(db, project_id, current_user.team_id)

    result = await db.execute(
        select(MaterialBalanceAnalysis, Well.well_name)
        .join(Well, Well.id == MaterialBalanceAnalysis.well_id)
        .where(
            Well.project_id == project_id,
            Well.team_id == current_user.team_id,
            Well.is_deleted == False,
            MaterialBalanceAnalysis.team_id == current_user.team_id,
        )
        .order_by(MaterialBalanceAnalysis.updated_at.desc())
    )

    data = [
        ProjectMBResponse(
            id=mb.id,
            well_id=mb.well_id,
            well_name=well_name,
            name=mb.name,
            method=mb.method,
            ooip=mb.ooip,
            gas_cap_ratio=mb.gas_cap_ratio,
            drive_mechanism=mb.drive_mechanism,
            updated_at=mb.updated_at,
        ).model_dump()
        for mb, well_name in result.all()
    ]

    return success_response(data)


@router.get("/{project_id}/well-test")
async def list_project_wt(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all Well Test analyses across wells in this project."""
    await _get_project_or_404(db, project_id, current_user.team_id)

    result = await db.execute(
        select(WellTestAnalysisModel, Well.well_name)
        .join(Well, Well.id == WellTestAnalysisModel.well_id)
        .where(
            Well.project_id == project_id,
            Well.team_id == current_user.team_id,
            Well.is_deleted == False,
            WellTestAnalysisModel.team_id == current_user.team_id,
        )
        .order_by(WellTestAnalysisModel.updated_at.desc())
    )

    data = [
        ProjectWTResponse(
            id=wt.id,
            well_id=wt.well_id,
            well_name=well_name,
            name=wt.name,
            test_type=wt.test_type,
            permeability=wt.permeability,
            skin_factor=wt.skin_factor,
            storage_coefficient=wt.storage_coefficient,
            updated_at=wt.updated_at,
        ).model_dump()
        for wt, well_name in result.all()
    ]

    return success_response(data)


@router.post("/{project_id}/batch-dca")
async def batch_dca_analysis(
    project_id: uuid.UUID,
    data: BatchDCARequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Run DCA analysis on all wells in a project that have production data.

    Processes each well sequentially within a single request.
    For very large projects (100+ wells), consider using the Celery task queue.
    """
    from app.engine.dca.fitting import DCAFitter
    from app.engine.dca.forecasting import generate_forecast

    await _get_project_or_404(db, project_id, current_user.team_id)

    # Get all active wells in the project
    wells_result = await db.execute(
        select(Well).where(
            Well.project_id == project_id,
            Well.team_id == current_user.team_id,
            Well.is_deleted == False,
        ).order_by(Well.well_name.asc())
    )
    wells = list(wells_result.scalars().all())

    if not wells:
        raise NotFoundException("No wells found in this project")

    rate_field = {
        "oil": "oil_rate", "gas": "gas_rate", "water": "water_rate",
    }.get(data.fluid_type, "oil_rate")
    cum_field = {
        "oil": "cum_oil", "gas": "cum_gas", "water": "cum_water",
    }.get(data.fluid_type, "cum_oil")

    fitter = DCAFitter()
    succeeded_analyses = []
    errors = []

    for well in wells:
        try:
            # Fetch production data for this well
            prod_result = await db.execute(
                select(ProductionRecord)
                .where(
                    ProductionRecord.well_id == well.id,
                    ProductionRecord.team_id == current_user.team_id,
                )
                .order_by(ProductionRecord.production_date.asc())
            )
            records = list(prod_result.scalars().all())

            if len(records) < 3:
                errors.append({
                    "well_id": str(well.id),
                    "well_name": well.well_name,
                    "error": f"Insufficient data ({len(records)} records, need >= 3)",
                })
                continue

            # Build time/rate arrays
            base_date = records[0].production_date
            t_list, q_list = [], []
            estimated_cum = 0.0
            for rec in records:
                rate = getattr(rec, rate_field)
                if rate is not None and rate > 0:
                    months = (rec.production_date - base_date).days / 30.4375
                    t_list.append(months)
                    q_list.append(rate)
                    days_on = rec.days_on if rec.days_on and rec.days_on > 0 else 30.4375
                    estimated_cum += float(rate) * float(days_on)

            if len(t_list) < 3:
                errors.append({
                    "well_id": str(well.id),
                    "well_name": well.well_name,
                    "error": "Insufficient non-zero production data",
                })
                continue

            # Get cumulative to date
            last_cum = None
            for rec in reversed(records):
                val = getattr(rec, cum_field, None) if cum_field else None
                if val is not None:
                    last_cum = val
                    break
            cum_to_date = last_cum if last_cum is not None else estimated_cum

            t = np.array(t_list)
            q = np.array(q_list)

            # Fit DCA model
            fit_result = fitter.fit(t, q, data.model_type)
            if not fit_result.success:
                errors.append({
                    "well_id": str(well.id),
                    "well_name": well.well_name,
                    "error": f"Curve fitting failed: {fit_result.message}",
                })
                continue

            # Generate forecast
            forecast = generate_forecast(
                model_type=data.model_type,
                parameters=fit_result.parameters,
                forecast_months=data.forecast_months,
                economic_limit=data.economic_limit,
            )

            eur = (forecast["cumulative"][-1] + cum_to_date) if len(forecast["cumulative"]) > 0 else cum_to_date

            # Create DCA analysis record
            analysis = DCAAnalysis(
                well_id=well.id,
                team_id=current_user.team_id,
                name=f"Batch DCA - {data.model_type}",
                model_type=data.model_type,
                fluid_type=data.fluid_type,
                start_date=records[0].production_date,
                end_date=records[-1].production_date,
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
            start_date = records[0].production_date
            for i in range(len(forecast["time"])):
                point = DCAForecastPoint(
                    analysis_id=analysis.id,
                    forecast_date=start_date + timedelta(days=int(forecast["time"][i] * 30.4375)),
                    time_months=float(forecast["time"][i]),
                    rate=float(forecast["rate"][i]),
                    cumulative=float(forecast["cumulative"][i]),
                )
                db.add(point)

            await db.flush()

            succeeded_analyses.append(
                ProjectDCAResponse(
                    id=analysis.id,
                    well_id=well.id,
                    well_name=well.well_name,
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
            )

            logger.info("Batch DCA: %s (%s) => EUR=%.0f R²=%.4f",
                        well.well_name, well.id, eur, fit_result.r_squared)

        except Exception as exc:
            errors.append({
                "well_id": str(well.id),
                "well_name": well.well_name,
                "error": str(exc),
            })
            logger.warning("Batch DCA failed for %s: %s", well.well_name, exc)

    result = BatchDCAResult(
        total_wells=len(wells),
        succeeded=len(succeeded_analyses),
        failed=len(errors),
        analyses=succeeded_analyses,
        errors=errors,
    )
    return success_response(result.model_dump())


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
