from __future__ import annotations

import json
import secrets
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import Settings

ScopeSet = set[str]


@dataclass(frozen=True)
class ApiPrincipal:
    key_id: str
    scopes: ScopeSet

    def has_scope(self, required_scope: str) -> bool:
        return "*" in self.scopes or required_scope in self.scopes


def _normalize_scopes(raw_scopes: Any) -> ScopeSet:
    if isinstance(raw_scopes, list):
        return {str(item).strip() for item in raw_scopes if str(item).strip()}
    if isinstance(raw_scopes, str):
        return {scope.strip() for scope in raw_scopes.split(",") if scope.strip()}
    return set()


def _parse_api_keys_json(raw: str) -> dict[str, ScopeSet]:
    parsed = json.loads(raw)
    key_map: dict[str, ScopeSet] = {}

    if isinstance(parsed, dict):
        for key, scopes in parsed.items():
            clean_key = str(key).strip()
            if not clean_key:
                continue
            normalized_scopes = _normalize_scopes(scopes) or {"*"}
            key_map[clean_key] = normalized_scopes
        return key_map

    if isinstance(parsed, list):
        for item in parsed:
            if not isinstance(item, dict):
                continue
            clean_key = str(item.get("key", "")).strip()
            if not clean_key:
                continue
            normalized_scopes = _normalize_scopes(item.get("scopes", [])) or {"*"}
            key_map[clean_key] = normalized_scopes
        return key_map

    raise ValueError("api_keys_json must be a JSON object or list")


class ApiKeyAuthorizer:
    def __init__(self, settings: Settings) -> None:
        self._enabled = settings.auth_enabled
        self.header_name = settings.api_key_header_name
        self._keys = self._load_keys(settings)

    @staticmethod
    def _load_keys(settings: Settings) -> dict[str, ScopeSet]:
        if settings.api_keys_json:
            return _parse_api_keys_json(settings.api_keys_json)
        if settings.api_key_value:
            return {settings.api_key_value: {"*"}}
        return {}

    @property
    def enabled(self) -> bool:
        return self._enabled

    def authenticate(self, request: Request) -> ApiPrincipal:
        if not self._enabled:
            return ApiPrincipal(key_id="auth-disabled", scopes={"*"})

        provided_key = request.headers.get(self.header_name, "")
        if not provided_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")

        for key_value, scopes in self._keys.items():
            if secrets.compare_digest(provided_key, key_value):
                key_id = key_value[:4] + "..." if len(key_value) >= 4 else "***"
                return ApiPrincipal(key_id=key_id, scopes=scopes)

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    def require_scope(self, request: Request, required_scope: str) -> ApiPrincipal:
        principal = self.authenticate(request)
        if not principal.has_scope(required_scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient scope. Required scope: {required_scope}",
            )
        return principal


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,  # type: ignore[no-untyped-def]
        max_requests: int,
        window_seconds: int,
        enabled: bool = True,
    ) -> None:
        super().__init__(app)
        self._enabled = enabled
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._events: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    @staticmethod
    def _get_client_key(request: Request) -> str:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        if request.client and request.client.host:
            return request.client.host
        return "unknown"

    def _consume(self, key: str, now: float) -> tuple[bool, int, int]:
        window_start = now - self._window_seconds
        with self._lock:
            timestamps = self._events[key]
            while timestamps and timestamps[0] <= window_start:
                timestamps.popleft()

            remaining = self._max_requests - len(timestamps)
            if remaining <= 0:
                reset_after = max(1, int(timestamps[0] + self._window_seconds - now))
                return False, 0, reset_after

            timestamps.append(now)
            remaining_after_request = self._max_requests - len(timestamps)
            return True, remaining_after_request, self._window_seconds

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        if not self._enabled or request.url.path == "/health":
            return await call_next(request)

        now = time.monotonic()
        client_key = self._get_client_key(request)
        allowed, remaining, reset_after = self._consume(client_key, now)

        if not allowed:
            response = JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
            response.headers["Retry-After"] = str(reset_after)
            response.headers["X-RateLimit-Limit"] = str(self._max_requests)
            response.headers["X-RateLimit-Remaining"] = "0"
            response.headers["X-RateLimit-Reset"] = str(reset_after)
            return response

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self._max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_after)
        return response
