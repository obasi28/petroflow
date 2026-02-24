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
    auto_detect_well_columns,
    transform_production_data,
    transform_well_data,
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


def _normalize_well_column_mapping(mapping: dict) -> dict:
    """
    Normalize well import mapping keys to backend well fields.
    """
    canonical_map = {
        "well_name": ["well_name", "well", "name"],
        "api_number": ["api_number", "api", "api_num"],
        "uwi": ["uwi"],
        "project_id": ["project_id", "project"],
        "operator": ["operator"],
        "well_type": ["well_type", "type"],
        "well_status": ["well_status", "status"],
        "orientation": ["orientation"],
        "country": ["country"],
        "state_province": ["state_province", "state", "province"],
        "county": ["county"],
        "basin": ["basin"],
        "field_name": ["field_name", "field"],
        "formation": ["formation"],
        "latitude": ["latitude", "lat"],
        "longitude": ["longitude", "lon", "lng"],
        "spud_date": ["spud_date"],
        "completion_date": ["completion_date"],
        "first_prod_date": ["first_prod_date", "first_production_date"],
        "total_depth": ["total_depth", "td"],
        "lateral_length": ["lateral_length"],
        "num_stages": ["num_stages", "stages"],
        "initial_pressure": ["initial_pressure"],
        "reservoir_temp": ["reservoir_temp", "temperature"],
        "porosity": ["porosity"],
        "water_saturation": ["water_saturation", "sw"],
        "net_pay": ["net_pay"],
        "permeability": ["permeability", "perm"],
        "notes": ["notes", "comment"],
    }

    normalized: dict[str, str] = {}
    for target_key, aliases in canonical_map.items():
        if isinstance(mapping.get(target_key), str) and mapping[target_key].strip():
            normalized[target_key] = mapping[target_key]
            continue
        for alias in aliases:
            val = mapping.get(alias)
            if isinstance(val, str) and val.strip():
                normalized[target_key] = val
                break

    return normalized


def _is_non_empty_value(value: object) -> bool:
    if value is None:
        return False
    if isinstance(value, str) and value.strip() == "":
        return False
    return True


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    well_id: str | None = Form(None),
    replace_existing: bool = Form(False),
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

    deleted_count = 0
    if replace_existing:
        deleted_count = await production_service.delete_production(
            db, well_uuid, current_user.team_id
        )
    imported_count = await production_service.upsert_production(
        db, well_uuid, current_user.team_id, records
    )

    return success_response({
        "file_name": filename,
        "file_type": file_type,
        "records_detected": len(records),
        "records_imported": imported_count,
        "replace_existing": replace_existing,
        "records_deleted": deleted_count,
    })


@router.post("/wells/upload")
async def upload_wells_file(
    file: UploadFile = File(...),
    execute: bool = Form(False),
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

    suggested_mapping = auto_detect_well_columns(columns)

    if not execute:
        return success_response({
            "file_name": filename,
            "file_type": file_type,
            "file_size": len(content),
            "columns": columns,
            "preview": preview,
            "suggested_mapping": suggested_mapping,
        })

    if column_mapping:
        try:
            raw_mapping = json.loads(column_mapping)
            if not isinstance(raw_mapping, dict):
                raise ValueError("column_mapping must be a JSON object")
        except (json.JSONDecodeError, ValueError):
            raise ValidationException("Invalid column_mapping JSON", field="column_mapping")
        mapping = _normalize_well_column_mapping(raw_mapping)
    else:
        mapping = suggested_mapping

    if not mapping:
        raise ValidationException("No valid well column mapping found", field="column_mapping")

    try:
        transformed = transform_well_data(content, file_type, mapping)
    except ValueError as exc:
        raise ValidationException(str(exc), field="column_mapping")

    if not transformed:
        raise ValidationException(
            "No valid well rows found. Ensure at least one row has well_name/API/UWI mapped.",
            field="column_mapping",
        )

    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors: list[dict] = []

    for row_idx, row_data in enumerate(transformed, start=1):
        try:
            payload = {
                key: value for key, value in row_data.items() if _is_non_empty_value(value)
            }
            if not payload.get("well_name"):
                skipped_count += 1
                continue

            if payload.get("project_id"):
                payload["project_id"] = uuid.UUID(payload["project_id"])

            existing_well = None
            if payload.get("api_number"):
                existing_result = await db.execute(
                    select(Well).where(
                        Well.team_id == current_user.team_id,
                        Well.is_deleted == False,
                        Well.api_number == payload["api_number"],
                    )
                )
                existing_well = existing_result.scalar_one_or_none()

            if existing_well is None and payload.get("uwi"):
                existing_result = await db.execute(
                    select(Well).where(
                        Well.team_id == current_user.team_id,
                        Well.is_deleted == False,
                        Well.uwi == payload["uwi"],
                    )
                )
                existing_well = existing_result.scalar_one_or_none()

            if existing_well:
                for field, value in payload.items():
                    if _is_non_empty_value(value):
                        setattr(existing_well, field, value)
                updated_count += 1
            else:
                db.add(
                    Well(
                        team_id=current_user.team_id,
                        created_by=current_user.id,
                        **payload,
                    )
                )
                created_count += 1
        except Exception as exc:
            skipped_count += 1
            errors.append({
                "row": row_idx,
                "message": str(exc),
            })

    return success_response({
        "file_name": filename,
        "file_type": file_type,
        "rows_detected": len(transformed),
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "errors": errors[:20],
    })
