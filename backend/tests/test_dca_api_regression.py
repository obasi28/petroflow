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


def _assert_success(client: TestClient, method: str, url: str, **kwargs) -> dict:
    resp = client.request(method, url, **kwargs)
    assert resp.status_code < 400, f"{method} {url} failed: {resp.status_code} {resp.text}"
    body = resp.json()
    assert body.get("status") == "success", body
    return body


def test_dca_create_list_detail_serialization_regression() -> None:
    """
    Regression for async lazy-load serialization errors (MissingGreenlet)
    on DCA create/list/detail responses.
    """
    if os.getenv("PETROFLOW_RUN_API_REGRESSION") != "1":
        pytest.skip("Set PETROFLOW_RUN_API_REGRESSION=1 to run API regression tests")
    if not _db_available():
        pytest.skip("Postgres not available for DCA API regression test")

    client = TestClient(app)
    tag = uuid.uuid4().hex[:8]
    email = f"dca_reg_{tag}@example.com"
    password = "Regress123!"

    register = _assert_success(
        client,
        "POST",
        "/api/v1/auth/register",
        json={"email": email, "password": password, "name": f"Regression {tag}"},
    )
    token = register["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    created_well = _assert_success(
        client,
        "POST",
        "/api/v1/wells",
        headers=headers,
        json={
            "well_name": f"DCA-REG-{tag}",
            "api_number": f"42-301-{tag[:5]}",
            "basin": "Permian",
            "well_type": "oil",
            "well_status": "active",
            "orientation": "horizontal",
            "first_prod_date": "2024-01-01",
        },
    )
    well_id = created_well["data"]["id"]

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

    created_analysis = _assert_success(
        client,
        "POST",
        f"/api/v1/wells/{well_id}/dca",
        headers=headers,
        json={
            "name": f"DCA Regression {tag}",
            "model_type": "exponential",
            "fluid_type": "oil",
            "start_date": "2024-01-01",
            "end_date": "2024-03-01",
            "economic_limit": 10.0,
            "forecast_months": 120,
        },
    )
    analysis_id = created_analysis["data"]["id"]
    assert len(created_analysis["data"]["forecast_points"]) > 0

    listed = _assert_success(
        client,
        "GET",
        f"/api/v1/wells/{well_id}/dca",
        headers=headers,
    )
    matched = [a for a in listed["data"] if a["id"] == analysis_id]
    assert matched, "Expected created analysis in list response"
    assert len(matched[0]["forecast_points"]) > 0

    detail = _assert_success(
        client,
        "GET",
        f"/api/v1/wells/{well_id}/dca/{analysis_id}",
        headers=headers,
    )
    assert detail["data"]["id"] == analysis_id
    assert len(detail["data"]["forecast_points"]) > 0
