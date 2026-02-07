from datetime import date
from typing import Any

from pydantic import BaseModel, Field


class DateWindow(BaseModel):
    start_date: date
    end_date: date


class ErrorResponse(BaseModel):
    detail: str | list[Any]
    request_id: str
    code: str | None = None
    details: dict[str, Any] | None = None


class PaginatedMeta(BaseModel):
    total_items: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)
