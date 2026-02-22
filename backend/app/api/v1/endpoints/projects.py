import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.models.project import Project
from app.schemas.common import success_response, paginated_response
from app.utils.exceptions import NotFoundException
from pydantic import BaseModel, Field
from datetime import datetime

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
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.team_id == current_user.team_id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundException("Project not found")
    return success_response(ProjectResponse.model_validate(project).model_dump())


@router.put("/{project_id}")
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.team_id == current_user.team_id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundException("Project not found")

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
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.team_id == current_user.team_id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundException("Project not found")
    await db.delete(project)
    await db.flush()
    return success_response({"deleted": True})
