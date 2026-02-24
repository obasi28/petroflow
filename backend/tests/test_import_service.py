from app.services.import_service import (
    auto_detect_columns,
    auto_detect_well_columns,
    parse_csv,
    transform_production_data,
    transform_well_data,
)
from app.api.v1.endpoints.imports import _normalize_column_mapping, _normalize_well_column_mapping


CSV_SAMPLE = b"""Prod Date,Oil Rate,Gas Rate,Water Rate
2024-01-01,100,500,20
2024-02-01,95,470,22
"""

WELL_CSV_SAMPLE = b"""Well Name,API Number,UWI,Operator,Type,Status,State,County,Latitude,Longitude,First Production Date\nSmith 1H,42-123-10001,US-42-123-10001,Petro Ops,oil,active,Texas,Midland,31.9974,-102.0779,2023-04-01\nJones 2H,42-123-10002,US-42-123-10002,Petro Ops,gas,active,Texas,Martin,32.1234,-101.8877,2023-05-01\n"""


def test_parse_csv_returns_headers_and_preview():
    columns, preview = parse_csv(CSV_SAMPLE)

    assert columns == ["Prod Date", "Oil Rate", "Gas Rate", "Water Rate"]
    assert len(preview) == 2


def test_auto_detect_columns_maps_common_names():
    mapping = auto_detect_columns(["Prod Date", "Oil Rate", "Gas Rate", "Water Rate"])

    assert mapping["date_column"] == "Prod Date"
    assert mapping["oil_column"] == "Oil Rate"
    assert mapping["gas_column"] == "Gas Rate"
    assert mapping["water_column"] == "Water Rate"


def test_transform_production_data_builds_records():
    records = transform_production_data(
        file_content=CSV_SAMPLE,
        file_type="csv",
        column_mapping={
            "date_column": "Prod Date",
            "oil_column": "Oil Rate",
            "gas_column": "Gas Rate",
            "water_column": "Water Rate",
        },
    )

    assert len(records) == 2
    assert records[0]["production_date"] == "2024-01-01"
    assert records[0]["oil_rate"] == 100.0
    assert records[0]["gas_rate"] == 500.0
    assert records[0]["water_rate"] == 20.0


def test_normalize_column_mapping_accepts_frontend_keys():
    mapping = {
        "production_date": "Prod Date",
        "oil_rate": "Oil Rate",
        "gas_rate": "Gas Rate",
        "water_rate": "Water Rate",
    }

    normalized = _normalize_column_mapping(mapping)

    assert normalized["date_column"] == "Prod Date"
    assert normalized["oil_column"] == "Oil Rate"
    assert normalized["gas_column"] == "Gas Rate"
    assert normalized["water_column"] == "Water Rate"


def test_normalize_column_mapping_preserves_exact_header_whitespace():
    mapping = {
        "production_date": "Prod Date ",
        "oil_rate": " Oil Rate",
    }

    normalized = _normalize_column_mapping(mapping)

    assert normalized["date_column"] == "Prod Date "
    assert normalized["oil_column"] == " Oil Rate"


def test_transform_production_data_raises_value_error_for_missing_mapped_column():
    csv_sample = b"""Prod Date ,Oil Rate\n2024-01-01,100\n"""

    try:
        transform_production_data(
            file_content=csv_sample,
            file_type="csv",
            column_mapping={"date_column": "Prod Date", "oil_column": "Oil Rate"},
        )
        assert False, "Expected ValueError for missing mapped column"
    except ValueError as exc:
        assert "Prod Date" in str(exc)


def test_auto_detect_well_columns_maps_common_names():
    mapping = auto_detect_well_columns(
        ["Well Name", "API Number", "UWI", "Operator", "Type", "Status", "First Production Date"]
    )

    assert mapping["well_name"] == "Well Name"
    assert mapping["api_number"] == "API Number"
    assert mapping["uwi"] == "UWI"
    assert mapping["operator"] == "Operator"
    assert mapping["well_type"] == "Type"
    assert mapping["well_status"] == "Status"
    assert mapping["first_prod_date"] == "First Production Date"


def test_normalize_well_column_mapping_accepts_alias_keys():
    mapping = {
        "name": "Well Name",
        "api": "API Number",
        "status": "Status",
    }

    normalized = _normalize_well_column_mapping(mapping)

    assert normalized["well_name"] == "Well Name"
    assert normalized["api_number"] == "API Number"
    assert normalized["well_status"] == "Status"


def test_transform_well_data_builds_well_payloads():
    records = transform_well_data(
        file_content=WELL_CSV_SAMPLE,
        file_type="csv",
        column_mapping={
            "well_name": "Well Name",
            "api_number": "API Number",
            "uwi": "UWI",
            "operator": "Operator",
            "well_type": "Type",
            "well_status": "Status",
            "state_province": "State",
            "county": "County",
            "latitude": "Latitude",
            "longitude": "Longitude",
            "first_prod_date": "First Production Date",
        },
    )

    assert len(records) == 2
    assert records[0]["well_name"] == "Smith 1H"
    assert records[0]["api_number"] == "42-123-10001"
    assert records[0]["latitude"] == 31.9974
    assert records[0]["first_prod_date"] == "2023-04-01"
    assert records[0]["country"] == "US"
