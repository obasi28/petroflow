import json
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.models.well import Well
from app.schemas.common import success_response
from app.schemas.production import ProductionRecordCreate
from app.services import production_service
from app.services.import_service import (
    parse_csv,
    parse_excel,
    auto_detect_columns,
    transform_production_data,
)
from app.utils.exceptions import ValidationException

router = APIRouter(prefix="/imports", tags=["imports"])


def _normalize_column_mapping(mapping: dict) -> dict:
    """
    Accept both backend-style and frontend-style mapping keys.
    """
    normalized: dict[str, str] = {}

    # Backend-native keys
    if isinstance(mapping.get("date_column"), str) and mapping["date_column"].strip():
        normalized["date_column"] = mapping["date_column"]
    if isinstance(mapping.get("oil_column"), str) and mapping["oil_column"].strip():
        normalized["oil_column"] = mapping["oil_column"]
    if isinstance(mapping.get("gas_column"), str) and mapping["gas_column"].strip():
        normalized["gas_column"] = mapping["gas_column"]
    if isinstance(mapping.get("water_column"), str) and mapping["water_column"].strip():
        normalized["water_column"] = mapping["water_column"]

    # Frontend keys from EXPECTED_COLUMNS
    alias_map = {
        "date_column": ["production_date", "date", "prod_date"],
        "oil_column": ["oil_rate", "oil", "oil_prod"],
        "gas_column": ["gas_rate", "gas", "gas_prod"],
        "water_column": ["water_rate", "water", "water_prod"],
    }
    for target_key, aliases in alias_map.items():
        if target_key in normalized:
            continue
        for alias in aliases:
            val = mapping.get(alias)
            if isinstance(val, str) and val.strip():
                # Preserve exact header text to match file columns verbatim.
                normalized[target_key] = val
                break

    return normalized


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    well_id: str | None = Form(None),
    column_mapping: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    content = await file.read()
    filename = (file.filename or "unknown").lower()

    if filename.endswith(".csv"):
        file_type = "csv"
        columns, preview = parse_csv(content)
    elif filename.endswith((".xlsx", ".xls")):
        file_type = "xlsx"
        columns, preview = parse_excel(content)
    else:
        raise ValidationException("Unsupported file type. Use CSV or Excel.", field="file")

    suggested_mapping = auto_detect_columns(columns)

    # Preview mode (Step 1): just return metadata + sample rows.
    if not well_id and not column_mapping:
        return success_response({
            "file_name": filename,
            "file_type": file_type,
            "file_size": len(content),
            "columns": columns,
            "preview": preview,
            "suggested_mapping": suggested_mapping,
        })

    # Import mode (Step 2): frontend provides well_id + explicit mapping.
    if not well_id or not column_mapping:
        raise ValidationException(
            "Both well_id and column_mapping are required for import execution"
        )

    try:
        well_uuid = uuid.UUID(well_id)
    except ValueError:
        raise ValidationException("Invalid well_id format", field="well_id")

    try:
        mapping = json.loads(column_mapping)
        if not isinstance(mapping, dict):
            raise ValueError("column_mapping must be a JSON object")
    except (json.JSONDecodeError, ValueError):
        raise ValidationException("Invalid column_mapping JSON", field="column_mapping")

    normalized_mapping = _normalize_column_mapping(mapping)

    well_result = await db.execute(
        select(Well.id).where(
            Well.id == well_uuid,
            Well.team_id == current_user.team_id,
            Well.is_deleted == False,
        )
    )
    if well_result.scalar_one_or_none() is None:
        raise ValidationException("Well not found for your account", field="well_id")

    try:
        transformed = transform_production_data(content, file_type, normalized_mapping)
    except ValueError as exc:
        raise ValidationException(str(exc), field="column_mapping")

    records = [ProductionRecordCreate.model_validate(record) for record in transformed]

    if not records:
        raise ValidationException("No valid production rows found in uploaded file")

    imported_count = await production_service.upsert_production(
        db, well_uuid, current_user.team_id, records
    )

    return success_response({
        "file_name": filename,
        "file_type": file_type,
        "records_detected": len(records),
        "records_imported": imported_count,
    })
