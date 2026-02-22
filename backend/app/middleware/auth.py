from jose import jwt, JWTError
from app.config import get_settings
from app.utils.exceptions import UnauthorizedException

settings = get_settings()

ALGORITHM = "HS256"


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.nextauth_secret, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise UnauthorizedException("Invalid or expired token")


def create_access_token(data: dict) -> str:
    from datetime import datetime, timedelta, timezone

    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.nextauth_secret, algorithm=ALGORITHM)
