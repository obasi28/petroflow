import uuid
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.config import get_settings
from app.main import app


def _db_available() -> bool:
    settings = get_settings()
    try:
        engine = create_engine(settings.database_url_sync, future=True)
        with engine.connect() as conn:
            conn.execute(text("select 1"))
        return True
    except Exception:
        return False


def test_register_allows_duplicate_local_part_across_domains() -> None:
    if os.getenv("PETROFLOW_RUN_API_REGRESSION") != "1":
        pytest.skip("Set PETROFLOW_RUN_API_REGRESSION=1 to run API regression tests")
    if not _db_available():
        pytest.skip("Postgres not available for auth registration test")

    client = TestClient(app)
    local = f"slugreg{uuid.uuid4().hex[:8]}"
    email_primary = f"{local}@example.com"
    email_secondary = f"{local}@another.com"
    password = "Password123!"

    first = client.post(
        "/api/v1/auth/register",
        json={"email": email_primary, "password": password, "name": "Primary User"},
    )
    assert first.status_code == 200, first.text

    second = client.post(
        "/api/v1/auth/register",
        json={"email": email_secondary, "password": password, "name": "Secondary User"},
    )
    assert second.status_code == 200, second.text

    login = client.post(
        "/api/v1/auth/login",
        json={"email": email_secondary, "password": password},
    )
    assert login.status_code == 200, login.text
