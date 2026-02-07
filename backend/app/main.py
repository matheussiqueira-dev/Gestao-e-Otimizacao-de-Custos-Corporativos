import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.observability import RequestContextMiddleware, configure_logging, request_id_ctx
from app.core.security import RateLimitMiddleware
from app.schemas.common import ErrorResponse

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Plataforma de inteligência de custos com simulações, anomalias e ranking de desperdício.",
)

origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    RateLimitMiddleware,
    enabled=settings.rate_limit_enabled,
    max_requests=settings.rate_limit_requests,
    window_seconds=settings.rate_limit_window_seconds,
)
app.add_middleware(GZipMiddleware, minimum_size=512)
app.add_middleware(RequestContextMiddleware)

allowed_hosts = [host.strip() for host in settings.allowed_hosts.split(",") if host.strip()]
if allowed_hosts and "*" not in allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger = logging.getLogger("app.validation")
    logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
    request_id = getattr(request.state, "request_id", request_id_ctx.get("-"))
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(detail=exc.errors(), request_id=request_id, code="validation_error").model_dump(mode="json"),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", request_id_ctx.get("-"))
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(detail=detail, request_id=request_id, code="http_error").model_dump(mode="json"),
        headers=exc.headers,
    )


@app.exception_handler(AppError)
async def app_exception_handler(request: Request, exc: AppError) -> JSONResponse:
    logger = logging.getLogger("app.domain")
    logger.warning("Application error on %s: %s", request.url.path, exc.message)
    request_id = getattr(request.state, "request_id", request_id_ctx.get("-"))
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            detail=exc.message,
            request_id=request_id,
            code=exc.code,
            details=exc.details or None,
        ).model_dump(mode="json"),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger = logging.getLogger("app.error")
    logger.exception("Unhandled application error: %s", exc)
    request_id = getattr(request.state, "request_id", request_id_ctx.get("-"))
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(detail="Internal server error", request_id=request_id, code="internal_error").model_dump(mode="json"),
    )


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "version": settings.app_version, "environment": settings.environment}
