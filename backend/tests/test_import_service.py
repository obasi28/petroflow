from app.services.import_service import (
    auto_detect_columns,
    parse_csv,
    transform_production_data,
)
from app.api.v1.endpoints.imports import _normalize_column_mapping


CSV_SAMPLE = b"""Prod Date,Oil Rate,Gas Rate,Water Rate
2024-01-01,100,500,20
2024-02-01,95,470,22
"""


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
