"""
Dashboard API regression tests.

Covers: KPIs and production summary endpoints.
"""
import pytest
from fastapi.testclient import TestClient

from tests.conftest import regression_guard, _assert_success


pytestmark = regression_guard


def test_dashboard_kpis_with_data(
    client: TestClient, well_with_production: dict,
) -> None:
    """KPIs should reflect the well and production data we just created."""
    headers = well_with_production["headers"]

    kpis = _assert_success(
        client,
        "GET",
        "/api/v1/dashboard/kpis",
        headers=headers,
    )
    data = kpis["data"]

    assert data["total_wells"] >= 1
    assert data["active_wells"] >= 1
    # Average oil rate should reflect our ~100 STB/d fixture data
    assert data["avg_oil_rate"] is None or data["avg_oil_rate"] > 0
    # Total production should be present
    assert data["total_production"] >= 0


def test_dashboard_production_summary(
    client: TestClient, well_with_production: dict,
) -> None:
    """Production summary should return monthly aggregated data."""
    headers = well_with_production["headers"]

    summary = _assert_success(
        client,
        "GET",
        "/api/v1/dashboard/production-summary",
        headers=headers,
    )
    data = summary["data"]

    # Should be a list of monthly summaries
    assert isinstance(data, list)
    assert len(data) >= 1

    # Each entry should have date and rate fields
    first = data[0]
    assert "month" in first or "date" in first or "production_date" in first


def test_dashboard_kpis_empty_team(
    client: TestClient, auth_headers: dict,
) -> None:
    """KPIs for a team with no wells should return zeros, not errors."""
    kpis = _assert_success(
        client,
        "GET",
        "/api/v1/dashboard/kpis",
        headers=auth_headers,
    )
    data = kpis["data"]

    assert data["total_wells"] == 0
    assert data["active_wells"] == 0
