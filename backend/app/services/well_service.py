import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.models.well import Well
from app.schemas.well import WellCreate, WellUpdate
from app.utils.exceptions import NotFoundException


async def get_wells(
    db: AsyncSession,
    team_id: uuid.UUID,
    project_id: uuid.UUID | None = None,
    status: str | None = None,
    basin: str | None = None,
    search: str | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Well], int]:
    query = select(Well).where(Well.team_id == team_id, Well.is_deleted == False)

    if project_id:
        query = query.where(Well.project_id == project_id)
    if status:
        query = query.where(Well.well_status == status)
    if basin:
        query = query.where(Well.basin == basin)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                Well.well_name.ilike(search_filter),
                Well.api_number.ilike(search_filter),
                Well.field_name.ilike(search_filter),
                Well.operator.ilike(search_filter),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Well.updated_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    wells = list(result.scalars().all())

    return wells, total


async def get_well(db: AsyncSession, well_id: uuid.UUID, team_id: uuid.UUID) -> Well:
    well = await db.execute(
        select(Well).where(Well.id == well_id, Well.team_id == team_id, Well.is_deleted == False)
    )
    well = well.scalar_one_or_none()
    if not well:
        raise NotFoundException(f"Well {well_id} not found")
    return well


async def create_well(
    db: AsyncSession, data: WellCreate, team_id: uuid.UUID, user_id: uuid.UUID
) -> Well:
    well = Well(
        team_id=team_id,
        created_by=user_id,
        **data.model_dump(exclude_none=True),
    )
    db.add(well)
    await db.flush()
    await db.refresh(well)
    return well


async def update_well(
    db: AsyncSession, well_id: uuid.UUID, team_id: uuid.UUID, data: WellUpdate
) -> Well:
    well = await get_well(db, well_id, team_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(well, field, value)
    await db.flush()
    await db.refresh(well)
    return well


async def delete_well(db: AsyncSession, well_id: uuid.UUID, team_id: uuid.UUID) -> None:
    well = await get_well(db, well_id, team_id)
    well.is_deleted = True
    await db.flush()
