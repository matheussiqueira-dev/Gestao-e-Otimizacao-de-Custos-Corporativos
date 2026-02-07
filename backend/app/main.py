import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api import api_router
from app.core.config import get_settings
from app.core.observability import RequestContextMiddleware, configure_logging, request_id_ctx

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
        content={"detail": exc.errors(), "request_id": request_id},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger = logging.getLogger("app.error")
    logger.exception("Unhandled application error: %s", exc)
    request_id = getattr(request.state, "request_id", request_id_ctx.get("-"))
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "request_id": request_id,
        },
    )


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
