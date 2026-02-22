import uuid
from dataclasses import dataclass
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, TeamMembership
from app.utils.exceptions import UnauthorizedException
from app.middleware.auth import verify_token


@dataclass
class CurrentUser:
    id: uuid.UUID
    email: str
    name: str
    team_id: uuid.UUID
    role: str


async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException("Invalid authorization header")

    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")

    user = await db.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or inactive")

    membership = await db.execute(
        select(TeamMembership).where(TeamMembership.user_id == user.id).limit(1)
    )
    membership = membership.scalar_one_or_none()
    if not membership:
        raise UnauthorizedException("User has no team membership")

    return CurrentUser(
        id=user.id,
        email=user.email,
        name=user.name,
        team_id=membership.team_id,
        role=membership.role,
    )
