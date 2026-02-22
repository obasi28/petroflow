import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.schemas.well import WellCreate, WellUpdate, WellResponse
from app.schemas.common import success_response, paginated_response
from app.services import well_service

router = APIRouter(prefix="/wells", tags=["wells"])


@router.get("")
async def list_wells(
    project_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    basin: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    offset = (page - 1) * per_page
    wells, total = await well_service.get_wells(
        db, current_user.team_id,
        project_id=project_id, status=status, basin=basin,
        search=search, offset=offset, limit=per_page,
    )
    return paginated_response(
        [WellResponse.model_validate(w).model_dump() for w in wells],
        page=page, per_page=per_page, total=total,
    )


@router.post("")
async def create_well(
    data: WellCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    well = await well_service.create_well(db, data, current_user.team_id, current_user.id)
    return success_response(WellResponse.model_validate(well).model_dump())


@router.get("/{well_id}")
async def get_well(
    well_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    well = await well_service.get_well(db, well_id, current_user.team_id)
    return success_response(WellResponse.model_validate(well).model_dump())


@router.put("/{well_id}")
async def update_well(
    well_id: uuid.UUID,
    data: WellUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    well = await well_service.update_well(db, well_id, current_user.team_id, data)
    return success_response(WellResponse.model_validate(well).model_dump())


@router.delete("/{well_id}")
async def delete_well(
    well_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    await well_service.delete_well(db, well_id, current_user.team_id)
    return success_response({"deleted": True})
