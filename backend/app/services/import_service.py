import io
import pandas as pd
from datetime import date


def parse_csv(file_content: bytes) -> tuple[list[str], list[list]]:
    """Parse CSV file and return column names and preview rows."""
    df = pd.read_csv(io.BytesIO(file_content), nrows=100)
    columns = list(df.columns)
    preview = df.head(10).values.tolist()
    return columns, preview


def parse_excel(file_content: bytes) -> tuple[list[str], list[list]]:
    """Parse Excel file and return column names and preview rows."""
    df = pd.read_excel(io.BytesIO(file_content), nrows=100)
    columns = list(df.columns)
    preview = df.head(10).values.tolist()
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
    if file_type == "csv":
        df = pd.read_csv(io.BytesIO(file_content))
    else:
        df = pd.read_excel(io.BytesIO(file_content))

    records = []
    date_col = column_mapping.get("date_column")
    oil_col = column_mapping.get("oil_column")
    gas_col = column_mapping.get("gas_column")
    water_col = column_mapping.get("water_column")

    if not date_col:
        raise ValueError("Date column mapping is required")

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
