from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://petroflow:petroflow@localhost:5432/petroflow"
    database_url_sync: str = "postgresql://petroflow:petroflow@localhost:5432/petroflow"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Backend
    backend_secret_key: str = "change-this-to-a-random-secret-key"
    backend_cors_origins: str = "http://localhost:3000"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # Auth
    nextauth_secret: str = "change-this-to-a-random-secret"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    model_config = {"env_file": ("../.env", ".env"), "extra": "ignore"}

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
