from fastapi import Query


def pagination_params(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page"),
):
    return {"page": page, "per_page": per_page, "offset": (page - 1) * per_page}
