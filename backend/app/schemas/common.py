from pydantic import BaseModel
from typing import Any, Generic, TypeVar

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: str | None = None


class ApiResponse(BaseModel, Generic[T]):
    status: str = "success"
    data: T | None = None
    meta: PaginationMeta | None = None
    errors: list[ErrorDetail] | None = None


def success_response(data: Any, meta: PaginationMeta | None = None) -> dict:
    return {"status": "success", "data": data, "meta": meta, "errors": None}


def paginated_response(data: Any, page: int, per_page: int, total: int) -> dict:
    total_pages = (total + per_page - 1) // per_page
    return {
        "status": "success",
        "data": data,
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
        "errors": None,
    }
