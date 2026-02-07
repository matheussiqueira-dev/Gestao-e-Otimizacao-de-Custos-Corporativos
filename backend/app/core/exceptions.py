from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class AppError(Exception):
    message: str
    status_code: int = 400
    code: str = "app_error"
    details: dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        return self.message


class DomainValidationError(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message=message,
            status_code=422,
            code="domain_validation_error",
            details=details or {},
        )


class AuthorizationError(AppError):
    def __init__(self, message: str = "Not authorized", details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message=message,
            status_code=403,
            code="authorization_error",
            details=details or {},
        )
