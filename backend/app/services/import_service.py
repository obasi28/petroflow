import io
import uuid
import math
import pandas as pd
from datetime import date, datetime


WELL_COLUMN_ALIASES: dict[str, list[str]] = {
    "well_name": ["well_name", "well name", "name", "well"],
    "api_number": ["api", "api_number", "api number", "api #", "api_num"],
    "uwi": ["uwi", "uwi_number", "uwi number"],
    "project_id": ["project_id", "project id"],
    "operator": ["operator", "company"],
    "well_type": ["well_type", "well type", "type"],
    "well_status": ["well_status", "well status", "status"],
    "orientation": ["orientation", "trajectory"],
    "country": ["country"],
    "state_province": ["state", "state_province", "state province", "province"],
    "county": ["county"],
    "basin": ["basin", "play"],
    "field_name": ["field", "field_name", "field name"],
    "formation": ["formation", "zone"],
    "latitude": ["latitude", "lat"],
    "longitude": ["longitude", "lon", "lng"],
    "spud_date": ["spud_date", "spud date"],
    "completion_date": ["completion_date", "completion date"],
    "first_prod_date": ["first_prod_date", "first production date", "first_prod", "first production"],
    "total_depth": ["total_depth", "total depth", "td"],
    "lateral_length": ["lateral_length", "lateral length"],
    "num_stages": ["num_stages", "stages", "frac_stages", "frac stages"],
    "initial_pressure": ["initial_pressure", "initial pressure"],
    "reservoir_temp": ["reservoir_temp", "reservoir temp", "temperature"],
    "porosity": ["porosity"],
    "water_saturation": ["water_saturation", "water saturation", "sw"],
    "net_pay": ["net_pay", "net pay"],
    "permeability": ["permeability", "perm"],
    "notes": ["notes", "comment", "comments"],
}

WELL_NUMERIC_FIELDS: set[str] = {
    "latitude",
    "longitude",
    "total_depth",
    "lateral_length",
    "num_stages",
    "initial_pressure",
    "reservoir_temp",
    "porosity",
    "water_saturation",
    "net_pay",
    "permeability",
}

WELL_DATE_FIELDS: set[str] = {"spud_date", "completion_date", "first_prod_date"}


def _read_table(file_content: bytes, file_type: str):
    if file_type == "csv":
        return pd.read_csv(io.BytesIO(file_content))
    return pd.read_excel(io.BytesIO(file_content))


def _to_json_safe_preview_value(value):
    """Convert pandas/numpy values into JSON-safe preview cells."""
    if value is None:
        return None

    if isinstance(value, (datetime, date, pd.Timestamp)):
        return value.isoformat()

    try:
        if pd.isna(value):
            return None
    except TypeError:
        # Some objects don't support pd.isna checks.
        pass

    # Convert numpy scalar objects to Python native scalars.
    if hasattr(value, "item"):
        try:
            value = value.item()
        except Exception:
            pass

    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None

    if isinstance(value, (str, int, float, bool)):
        return value

    return str(value)


def _build_preview_rows(df: pd.DataFrame) -> list[list]:
    return [
        [_to_json_safe_preview_value(value) for value in row]
        for row in df.head(10).to_numpy().tolist()
    ]


def parse_csv(file_content: bytes) -> tuple[list[str], list[list]]:
    """Parse CSV file and return column names and preview rows."""
    df = pd.read_csv(io.BytesIO(file_content), nrows=100)
    columns = list(df.columns)
    preview = _build_preview_rows(df)
    return columns, preview


def parse_excel(file_content: bytes) -> tuple[list[str], list[list]]:
    """Parse Excel file and return column names and preview rows."""
    df = pd.read_excel(io.BytesIO(file_content), nrows=100)
    columns = list(df.columns)
    preview = _build_preview_rows(df)
    return columns, preview


def auto_detect_columns(columns: list[str]) -> dict:
    """Heuristic column mapping based on common naming patterns."""
    mapping = {}
    date_patterns = ["date", "month", "period", "time", "prod_date", "production_date"]
    oil_patterns = ["oil", "oil_rate", "oil rate", "oil_prod", "oil production", "bopd"]
    gas_patterns = ["gas", "gas_rate", "gas rate", "gas_prod", "gas production", "mcfd"]
    water_patterns = ["water", "water_rate", "water rate", "water_prod", "bwpd"]

    for col in columns:
        col_lower = col.lower().strip()
        if any(p in col_lower for p in date_patterns) and "date_column" not in mapping:
            mapping["date_column"] = col
        elif any(p in col_lower for p in oil_patterns) and "oil_column" not in mapping:
            mapping["oil_column"] = col
        elif any(p in col_lower for p in gas_patterns) and "gas_column" not in mapping:
            mapping["gas_column"] = col
        elif any(p in col_lower for p in water_patterns) and "water_column" not in mapping:
            mapping["water_column"] = col

    return mapping


def transform_production_data(
    file_content: bytes,
    file_type: str,
    column_mapping: dict,
) -> list[dict]:
    """Transform file data into production records using the column mapping."""
    df = _read_table(file_content, file_type)

    records = []
    date_col = column_mapping.get("date_column")
    oil_col = column_mapping.get("oil_column")
    gas_col = column_mapping.get("gas_column")
    water_col = column_mapping.get("water_column")

    if not date_col:
        raise ValueError("Date column mapping is required")

    available_columns = set(df.columns.tolist())
    for mapped_col in (date_col, oil_col, gas_col, water_col):
        if mapped_col and mapped_col not in available_columns:
            raise ValueError(
                f"Mapped column '{mapped_col}' was not found in file. "
                "Please review the mapping and try again."
            )

    for _, row in df.iterrows():
        try:
            prod_date = pd.to_datetime(row[date_col]).date()
        except (ValueError, TypeError):
            continue

        record = {"production_date": prod_date.isoformat()}

        if oil_col and pd.notna(row.get(oil_col)):
            record["oil_rate"] = float(row[oil_col])
        if gas_col and pd.notna(row.get(gas_col)):
            record["gas_rate"] = float(row[gas_col])
        if water_col and pd.notna(row.get(water_col)):
            record["water_rate"] = float(row[water_col])

        records.append(record)

    return records


def auto_detect_well_columns(columns: list[str]) -> dict:
    """Heuristic mapping of well CSV/Excel columns to Well model fields."""
    mapping = {}
    for column in columns:
        normalized = column.lower().strip()
        for target_field, aliases in WELL_COLUMN_ALIASES.items():
            if target_field in mapping:
                continue
            if any(alias in normalized for alias in aliases):
                mapping[target_field] = column
                break
    return mapping


def transform_well_data(file_content: bytes, file_type: str, column_mapping: dict) -> list[dict]:
    """Transform uploaded file into well create/update payloads."""
    df = _read_table(file_content, file_type)

    available_columns = set(df.columns.tolist())
    for target_field, mapped_col in column_mapping.items():
        if mapped_col and mapped_col not in available_columns:
            raise ValueError(
                f"Mapped column '{mapped_col}' for '{target_field}' was not found in file."
            )

    records: list[dict] = []
    for _, row in df.iterrows():
        record: dict = {}
        for target_field, mapped_col in column_mapping.items():
            if not mapped_col or pd.isna(row.get(mapped_col)):
                continue

            value = row[mapped_col]
            if target_field in WELL_DATE_FIELDS:
                try:
                    parsed_date = pd.to_datetime(value).date()
                except (ValueError, TypeError):
                    continue
                record[target_field] = parsed_date
                continue

            if target_field in WELL_NUMERIC_FIELDS:
                try:
                    numeric = float(value)
                except (TypeError, ValueError):
                    continue
                if target_field == "num_stages":
                    record[target_field] = int(numeric)
                else:
                    record[target_field] = numeric
                continue

            text = str(value).strip()
            if not text:
                continue

            if target_field == "project_id":
                try:
                    record[target_field] = str(uuid.UUID(text))
                except (ValueError, TypeError):
                    continue
            else:
                record[target_field] = text

        if "well_name" not in record:
            fallback_name = record.get("api_number") or record.get("uwi")
            if fallback_name:
                record["well_name"] = fallback_name

        if not record.get("well_name"):
            continue

        if "country" not in record or not record["country"]:
            record["country"] = "US"

        records.append(record)

    return records


# ---------------------------------------------------------------------------
# Bulk production helpers
# ---------------------------------------------------------------------------

WELL_IDENTIFIER_PATTERNS = [
    "well_name", "well name", "well", "wellname",
    "api", "api_number", "api number", "api_num", "api#",
    "uwi", "uwi_number", "uwi number",
]


def auto_detect_bulk_production_columns(columns: list[str]) -> dict:
    """Extend standard production detection with a well identifier column."""
    mapping = auto_detect_columns(columns)

    for col in columns:
        col_lower = col.lower().strip()
        if any(p == col_lower or p in col_lower for p in WELL_IDENTIFIER_PATTERNS):
            if "well_identifier_column" not in mapping:
                mapping["well_identifier_column"] = col
                break

    return mapping


def transform_bulk_production_data(
    file_content: bytes,
    file_type: str,
    column_mapping: dict,
) -> dict[str, list[dict]]:
    """Transform file into production records grouped by well identifier.

    Returns: { "well_identifier_value": [{"production_date": ..., "oil_rate": ...}, ...] }
    """
    df = _read_table(file_content, file_type)

    well_id_col = column_mapping.get("well_identifier_column")
    date_col = column_mapping.get("date_column")
    oil_col = column_mapping.get("oil_column")
    gas_col = column_mapping.get("gas_column")
    water_col = column_mapping.get("water_column")

    if not well_id_col:
        raise ValueError("Well identifier column mapping is required")
    if not date_col:
        raise ValueError("Date column mapping is required")

    available_columns = set(df.columns.tolist())
    for mapped_col in (well_id_col, date_col, oil_col, gas_col, water_col):
        if mapped_col and mapped_col not in available_columns:
            raise ValueError(
                f"Mapped column '{mapped_col}' was not found in file. "
                "Please review the mapping and try again."
            )

    grouped: dict[str, list[dict]] = {}

    for _, row in df.iterrows():
        identifier = row.get(well_id_col)
        if pd.isna(identifier) or not str(identifier).strip():
            continue
        identifier = str(identifier).strip()

        try:
            prod_date = pd.to_datetime(row[date_col]).date()
        except (ValueError, TypeError):
            continue

        record: dict = {"production_date": prod_date.isoformat()}

        if oil_col and pd.notna(row.get(oil_col)):
            try:
                record["oil_rate"] = float(row[oil_col])
            except (TypeError, ValueError):
                pass
        if gas_col and pd.notna(row.get(gas_col)):
            try:
                record["gas_rate"] = float(row[gas_col])
            except (TypeError, ValueError):
                pass
        if water_col and pd.notna(row.get(water_col)):
            try:
                record["water_rate"] = float(row[water_col])
            except (TypeError, ValueError):
                pass

        grouped.setdefault(identifier, []).append(record)

    return grouped
