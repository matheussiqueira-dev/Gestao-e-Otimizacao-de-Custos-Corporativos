from datetime import date

from fastapi import Depends, HTTPException, Request

from app.core.config import Settings, get_settings
from app.schemas.costs import CostFilters

VALID_GROUPS: set[str] = {"month", "cost_center", "project", "category"}


def validate_date_range(start_date: date, end_date: date) -> None:
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date")


def build_cost_filters(
    start_date: date,
    end_date: date,
    cost_center_ids: list[int] | None,
    project_ids: list[int] | None,
    category_ids: list[int] | None,
) -> CostFilters:
    validate_date_range(start_date, end_date)
    return CostFilters(
        start_date=start_date,
        end_date=end_date,
        cost_center_ids=cost_center_ids or [],
        project_ids=project_ids or [],
        category_ids=category_ids or [],
    )


def validate_group_by(group_by: list[str]) -> list[str]:
    invalid_groups = [item for item in group_by if item not in VALID_GROUPS]
    if invalid_groups:
        raise HTTPException(status_code=400, detail=f"Invalid group_by values: {invalid_groups}")
    return group_by


def require_api_key(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> None:
    if not settings.auth_enabled:
        return
    provided_key = request.headers.get(settings.api_key_header_name)
    if not provided_key or provided_key != settings.api_key_value:
        raise HTTPException(status_code=401, detail="Invalid API key")
