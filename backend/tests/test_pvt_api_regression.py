"""
PVT API regression tests.

Covers: stateless calculate, save, list, get, delete.
"""
import pytest
from fastapi.testclient import TestClient

from tests.conftest import regression_guard, _assert_success


pytestmark = regression_guard


def test_pvt_calculate_save_list_get_delete(
    client: TestClient, auth_headers: dict, well_with_production: dict,
) -> None:
    headers = well_with_production["headers"]
    well_id = well_with_production["well_id"]

    # 1. Stateless calculate
    calc = _assert_success(
        client,
        "POST",
        "/api/v1/pvt/calculate",
        headers=headers,
        json={
            "api_gravity": 35.0,
            "gas_gravity": 0.75,
            "temperature": 200.0,
            "separator_pressure": 100.0,
            "separator_temperature": 75.0,
            "max_pressure": 5000.0,
            "num_points": 20,
        },
    )
    data = calc["data"]
    assert data["bubble_point"] > 0
    assert data["rs_at_pb"] > 0
    assert len(data["table"]) == 20

    # Sanity: Bo should be > 1.0 at bubble point
    assert data["bo_at_pb"] > 1.0

    # 2. Save study
    saved = _assert_success(
        client,
        "POST",
        f"/api/v1/wells/{well_id}/pvt",
        headers=headers,
        json={
            "name": "Test PVT Study",
            "inputs": {
                "api_gravity": 35.0,
                "gas_gravity": 0.75,
                "temperature": 200.0,
            },
            "results": data,
        },
    )
    study_id = saved["data"]["id"]
    assert saved["data"]["name"] == "Test PVT Study"

    # 3. List studies
    listed = _assert_success(
        client,
        "GET",
        f"/api/v1/wells/{well_id}/pvt",
        headers=headers,
    )
    ids = [s["id"] for s in listed["data"]]
    assert study_id in ids

    # 4. Get single study
    detail = _assert_success(
        client,
        "GET",
        f"/api/v1/wells/{well_id}/pvt/{study_id}",
        headers=headers,
    )
    assert detail["data"]["id"] == study_id
    assert detail["data"]["name"] == "Test PVT Study"

    # 5. Delete
    _assert_success(
        client,
        "DELETE",
        f"/api/v1/wells/{well_id}/pvt/{study_id}",
        headers=headers,
    )

    # Verify gone
    listed_after = _assert_success(
        client,
        "GET",
        f"/api/v1/wells/{well_id}/pvt",
        headers=headers,
    )
    ids_after = [s["id"] for s in listed_after["data"]]
    assert study_id not in ids_after


def test_pvt_calculate_with_custom_correlations(
    client: TestClient, auth_headers: dict,
) -> None:
    """Verify that specifying correlations actually produces results."""
    calc = _assert_success(
        client,
        "POST",
        "/api/v1/pvt/calculate",
        headers=auth_headers,
        json={
            "api_gravity": 28.0,
            "gas_gravity": 0.85,
            "temperature": 250.0,
            "separator_pressure": 150.0,
            "separator_temperature": 80.0,
            "max_pressure": 6000.0,
            "num_points": 10,
            "correlation_bubble_point": "vasquez_beggs",
            "correlation_rs": "vasquez_beggs",
            "correlation_bo": "vasquez_beggs",
        },
    )
    data = calc["data"]
    assert data["bubble_point"] > 0
    assert len(data["table"]) == 10
    assert "vasquez_beggs" in data["correlations_used"].values()
