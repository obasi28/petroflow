"""
Shared test fixtures for PetroFlow API regression tests.

All regression tests require:
  PETROFLOW_RUN_API_REGRESSION=1
and a running PostgreSQL instance.
"""
import os
import uuid
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.config import get_settings
from app.main import app


def _db_available() -> bool:
    """Check if Postgres is reachable."""
    settings = get_settings()
    try:
        engine = create_engine(settings.database_url_sync, future=True)
        with engine.connect() as conn:
            conn.execute(text("select 1"))
        return True
    except Exception:
        return False


regression_guard = pytest.mark.skipif(
    os.getenv("PETROFLOW_RUN_API_REGRESSION") != "1" or not _db_available(),
    reason="Set PETROFLOW_RUN_API_REGRESSION=1 with Postgres running",
)


def _assert_success(client: TestClient, method: str, url: str, **kwargs) -> dict:
    """Send a request and assert HTTP success + JSON envelope status."""
    resp = client.request(method, url, **kwargs)
    assert resp.status_code < 400, f"{method} {url} failed: {resp.status_code} {resp.text}"
    body = resp.json()
    assert body.get("status") == "success", body
    return body


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    """Provide a FastAPI TestClient."""
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def auth_headers(client: TestClient) -> dict:
    """Register a fresh user and return auth headers."""
    tag = uuid.uuid4().hex[:8]
    reg = _assert_success(
        client,
        "POST",
        "/api/v1/auth/register",
        json={
            "email": f"test_{tag}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {tag}",
        },
    )
    return {"Authorization": f"Bearer {reg['data']['token']}"}


@pytest.fixture()
def well_with_production(client: TestClient, auth_headers: dict) -> dict:
    """Create a well with 3 months of production data. Returns { well_id, headers }."""
    tag = uuid.uuid4().hex[:8]
    well = _assert_success(
        client,
        "POST",
        "/api/v1/wells",
        headers=auth_headers,
        json={
            "well_name": f"Fixture-{tag}",
            "api_number": f"42-501-{tag[:5]}",
            "well_type": "oil",
            "well_status": "active",
            "orientation": "horizontal",
            "first_prod_date": "2024-01-01",
        },
    )
    well_id = well["data"]["id"]

    _assert_success(
        client,
        "POST",
        f"/api/v1/wells/{well_id}/production",
        headers=auth_headers,
        json={
            "records": [
                {
                    "production_date": "2024-01-01",
                    "days_on": 31,
                    "oil_rate": 100.0,
                    "gas_rate": 500.0,
                    "water_rate": 20.0,
                    "cum_oil": 3100.0,
                    "cum_gas": 15500.0,
                    "cum_water": 620.0,
                },
                {
                    "production_date": "2024-02-01",
                    "days_on": 29,
                    "oil_rate": 95.0,
                    "gas_rate": 470.0,
                    "water_rate": 22.0,
                    "cum_oil": 5855.0,
                    "cum_gas": 29130.0,
                    "cum_water": 1258.0,
                },
                {
                    "production_date": "2024-03-01",
                    "days_on": 31,
                    "oil_rate": 90.0,
                    "gas_rate": 450.0,
                    "water_rate": 24.0,
                    "cum_oil": 8645.0,
                    "cum_gas": 43080.0,
                    "cum_water": 2002.0,
                },
            ]
        },
    )

    return {"well_id": well_id, "headers": auth_headers}
