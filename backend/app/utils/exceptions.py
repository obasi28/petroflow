from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class PetroFlowException(Exception):
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code


class NotFoundException(PetroFlowException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message=message, code="NOT_FOUND", status_code=404)


class ValidationException(PetroFlowException):
    def __init__(self, message: str, field: str | None = None):
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=422)
        self.field = field


class UnauthorizedException(PetroFlowException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message=message, code="UNAUTHORIZED", status_code=401)


class ForbiddenException(PetroFlowException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message=message, code="FORBIDDEN", status_code=403)


class EngineException(PetroFlowException):
    """Raised when a scientific computation fails."""

    def __init__(self, message: str):
        super().__init__(message=message, code="ENGINE_ERROR", status_code=422)


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(PetroFlowException)
    async def petroflow_exception_handler(request: Request, exc: PetroFlowException):
        error = {"code": exc.code, "message": exc.message}
        if isinstance(exc, ValidationException) and exc.field:
            error["field"] = exc.field
        return JSONResponse(
            status_code=exc.status_code,
            content={"status": "error", "data": None, "meta": None, "errors": [error]},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "data": None,
                "meta": None,
                "errors": [{"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}],
            },
        )
