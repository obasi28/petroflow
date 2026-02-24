import os
import uuid

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


def _assert_success(client: TestClient, method: str, url: str, **kwargs) -> dict:
    resp = client.request(method, url, **kwargs)
    assert resp.status_code < 400, f"{method} {url} failed: {resp.status_code} {resp.text}"
    body = resp.json()
    assert body.get("status") == "success", body
    return body


def test_project_summary_and_dca_endpoints_regression() -> None:
    if os.getenv("PETROFLOW_RUN_API_REGRESSION") != "1":
        pytest.skip("Set PETROFLOW_RUN_API_REGRESSION=1 to run API regression tests")
    if not _db_available():
        pytest.skip("Postgres not available for project regression test")

    client = TestClient(app)
    tag = uuid.uuid4().hex[:8]
    email = f"project_reg_{tag}@example.com"
    password = "Project123!"

    register = _assert_success(
        client,
        "POST",
        "/api/v1/auth/register",
        json={"email": email, "password": password, "name": f"Project Regression {tag}"},
    )
    token = register["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    project = _assert_success(
        client,
        "POST",
        "/api/v1/projects",
        headers=headers,
        json={"name": f"Project-{tag}", "description": "Regression"},
    )["data"]
    project_id = project["id"]

    well = _assert_success(
        client,
        "POST",
        "/api/v1/wells",
        headers=headers,
        json={
            "well_name": f"PRJ-{tag}",
            "api_number": f"42-401-{tag[:5]}",
            "project_id": project_id,
            "well_type": "oil",
            "well_status": "active",
            "orientation": "horizontal",
            "first_prod_date": "2024-01-01",
        },
    )["data"]
    well_id = well["id"]

    _assert_success(
        client,
        "POST",
        f"/api/v1/wells/{well_id}/production",
        headers=headers,
        json={
            "records": [
                {
                    "production_date": "2024-01-01",
                    "days_on": 31,
                    "oil_rate": 100.0,
                    "gas_rate": 400.0,
                    "water_rate": 10.0,
                    "cum_oil": 3100.0,
                    "cum_gas": 12400.0,
                    "cum_water": 310.0,
                },
                {
                    "production_date": "2024-02-01",
                    "days_on": 29,
                    "oil_rate": 95.0,
                    "gas_rate": 390.0,
                    "water_rate": 11.0,
                    "cum_oil": 5855.0,
                    "cum_gas": 23710.0,
                    "cum_water": 629.0,
                },
                {
                    "production_date": "2024-03-01",
                    "days_on": 31,
                    "oil_rate": 90.0,
                    "gas_rate": 370.0,
                    "water_rate": 12.0,
                    "cum_oil": 8645.0,
                    "cum_gas": 35180.0,
                    "cum_water": 1001.0,
                },
            ]
        },
    )

    _assert_success(
        client,
        "POST",
        f"/api/v1/wells/{well_id}/dca",
        headers=headers,
        json={
            "name": f"Project DCA {tag}",
            "model_type": "exponential",
            "fluid_type": "oil",
            "start_date": "2024-01-01",
            "end_date": "2024-03-01",
            "economic_limit": 10.0,
            "forecast_months": 120,
        },
    )

    dca_response = _assert_success(
        client,
        "GET",
        f"/api/v1/projects/{project_id}/dca",
        headers=headers,
    )["data"]
    assert len(dca_response) == 1
    assert dca_response[0]["well_id"] == well_id

    summary_response = _assert_success(
        client,
        "GET",
        f"/api/v1/projects/{project_id}/summary",
        headers=headers,
    )["data"]
    assert summary_response["well_count"] == 1
    assert summary_response["dca_count"] == 1
    assert summary_response["total_cum_oil"] > 0
