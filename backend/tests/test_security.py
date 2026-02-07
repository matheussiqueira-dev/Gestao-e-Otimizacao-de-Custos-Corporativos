from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.core.security import ApiKeyAuthorizer


def _build_request(header_name: str, value: str | None):
    headers = {}
    if value is not None:
        headers[header_name] = value
    return SimpleNamespace(headers=headers)


def test_api_key_authorizer_validates_scoped_key() -> None:
    settings = Settings(
        auth_enabled=True,
        api_key_header_name="X-API-Key",
        api_keys_json='{"analytics-key": ["analytics:read"], "writer-key": ["simulations:write"]}',
    )
    authorizer = ApiKeyAuthorizer(settings)

    analytics_request = _build_request("X-API-Key", "analytics-key")
    principal = authorizer.require_scope(analytics_request, "analytics:read")  # type: ignore[arg-type]

    assert principal.has_scope("analytics:read")

    with pytest.raises(HTTPException):
        authorizer.require_scope(analytics_request, "simulations:write")  # type: ignore[arg-type]


def test_api_key_authorizer_rejects_missing_key() -> None:
    settings = Settings(auth_enabled=True, api_key_header_name="X-API-Key", api_key_value="secret")
    authorizer = ApiKeyAuthorizer(settings)

    with pytest.raises(HTTPException):
        authorizer.authenticate(_build_request("X-API-Key", None))  # type: ignore[arg-type]
