from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user, CurrentUser
from app.schemas.common import success_response
from app.services.import_service import parse_csv, parse_excel, auto_detect_columns

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    content = await file.read()
    filename = file.filename or "unknown"

    if filename.endswith(".csv"):
        file_type = "csv"
        columns, preview = parse_csv(content)
    elif filename.endswith((".xlsx", ".xls")):
        file_type = "xlsx"
        columns, preview = parse_excel(content)
    else:
        return {"status": "error", "errors": [{"code": "INVALID_FILE", "message": "Unsupported file type. Use CSV or Excel."}]}

    mapping = auto_detect_columns(columns)

    return success_response({
        "file_name": filename,
        "file_type": file_type,
        "file_size": len(content),
        "columns": columns,
        "preview": preview,
        "suggested_mapping": mapping,
    })
