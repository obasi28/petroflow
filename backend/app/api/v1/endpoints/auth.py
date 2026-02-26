import uuid
from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
import re
from app.database import get_db
from app.models.user import User, Team, TeamMembership
from app.middleware.auth import create_access_token, verify_token
from app.schemas.common import success_response
from app.utils.exceptions import UnauthorizedException, ValidationException
from app.dependencies import get_current_user, CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class RegisterRequest:
    def __init__(self, email: str, password: str, name: str):
        self.email = email
        self.password = password
        self.name = name


def _slugify_workspace_name(email: str) -> str:
    local_part = email.split("@", 1)[0].lower()
    slug = re.sub(r"[^a-z0-9]+", "-", local_part).strip("-")
    return slug or "workspace"


async def _unique_team_slug(db: AsyncSession, base_slug: str) -> str:
    candidate = base_slug
    suffix = 2
    while True:
        existing = await db.execute(select(Team.id).where(Team.slug == candidate))
        if existing.scalar_one_or_none() is None:
            return candidate
        candidate = f"{base_slug}-{suffix}"
        suffix += 1


@router.post("/register")
async def register(
    email: str = Body(...),
    password: str = Body(..., min_length=8),
    name: str = Body(...),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise ValidationException("Email already registered", field="email")

    user = User(
        email=email,
        name=name,
        password_hash=pwd_context.hash(password),
    )
    db.add(user)
    await db.flush()

    # Auto-create personal team
    slug = await _unique_team_slug(db, _slugify_workspace_name(email))
    team = Team(name=f"{name}'s Workspace", slug=slug, owner_id=user.id)
    db.add(team)
    await db.flush()

    membership = TeamMembership(user_id=user.id, team_id=team.id, role="owner")
    db.add(membership)
    await db.flush()

    token = create_access_token({"sub": str(user.id), "email": user.email})

    return success_response({
        "token": token,
        "user": {"id": str(user.id), "email": user.email, "name": user.name},
    })


@router.post("/login")
async def login(
    email: str = Body(...),
    password: str = Body(...),
    db: AsyncSession = Depends(get_db),
):
    user = await db.execute(select(User).where(User.email == email))
    user = user.scalar_one_or_none()

    if not user or not user.password_hash or not pwd_context.verify(password, user.password_hash):
        raise UnauthorizedException("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedException("Account is deactivated")

    token = create_access_token({"sub": str(user.id), "email": user.email})

    return success_response({
        "token": token,
        "user": {"id": str(user.id), "email": user.email, "name": user.name},
    })


@router.get("/me")
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return success_response({
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "team_id": str(current_user.team_id),
        "role": current_user.role,
    })


class ProfileUpdate(BaseModel):
    name: str


@router.put("/profile")
async def update_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user = await db.get(User, current_user.id)
    if not user:
        raise UnauthorizedException("User not found")

    user.name = data.name
    await db.flush()

    return success_response({
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
    })


@router.get("/preferences")
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user = await db.get(User, current_user.id)
    if not user:
        raise UnauthorizedException("User not found")

    return success_response(user.preferences or {})


class PreferencesUpdate(BaseModel):
    unit_system: str | None = None
    default_dca_model: str | None = None
    default_economic_limit: float | None = None


@router.put("/preferences")
async def update_preferences(
    data: PreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user = await db.get(User, current_user.id)
    if not user:
        raise UnauthorizedException("User not found")

    prefs = dict(user.preferences or {})
    update = data.model_dump(exclude_none=True)
    prefs.update(update)
    user.preferences = prefs
    await db.flush()

    return success_response(prefs)
