from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
try:
    # SQLAlchemy 2.x
    from sqlalchemy.ext.asyncio import async_sessionmaker
except ImportError:  # pragma: no cover - compatibility shim for SQLAlchemy 1.4
    from sqlalchemy.orm import sessionmaker as _sessionmaker

    def async_sessionmaker(*args, **kwargs):
        return _sessionmaker(*args, **kwargs)
try:
    # SQLAlchemy 2.x
    from sqlalchemy.orm import DeclarativeBase
except ImportError:  # pragma: no cover - compatibility shim for SQLAlchemy 1.4
    DeclarativeBase = None
    from sqlalchemy.orm import declarative_base
from app.config import get_settings

settings = get_settings()

try:
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_size=20,
        max_overflow=10,
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
except ModuleNotFoundError:  # pragma: no cover - allows Alembic metadata import in minimal envs
    engine = None
    async_session = None

if DeclarativeBase is not None:
    class Base(DeclarativeBase):
        pass
else:
    Base = declarative_base()


async def get_db() -> AsyncSession:
    if async_session is None:
        raise RuntimeError("Database async session is unavailable; install async driver dependencies")
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
