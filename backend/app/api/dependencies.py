from functools import lru_cache
from datetime import date

from fastapi import Depends, HTTPException, Request, status

from app.core.config import get_settings
from app.core.security import ApiKeyAuthorizer, ApiPrincipal
from app.schemas.costs import CostFilters

VALID_GROUPS: set[str] = {"month", "cost_center", "project", "category"}
MAX_FILTER_IDS = 200


def validate_date_range(start_date: date, end_date: date) -> None:
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date")


def _normalize_id_list(values: list[int] | None) -> list[int]:
    if not values:
        return []
    unique_values = sorted(set(values))
    if len(unique_values) > MAX_FILTER_IDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Maximum number of ids per filter is {MAX_FILTER_IDS}",
        )
    return unique_values


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
        cost_center_ids=_normalize_id_list(cost_center_ids),
        project_ids=_normalize_id_list(project_ids),
        category_ids=_normalize_id_list(category_ids),
    )


def validate_group_by(group_by: list[str]) -> list[str]:
    if not group_by:
        raise HTTPException(status_code=400, detail="group_by must include at least one dimension")
    if len(group_by) > len(VALID_GROUPS):
        raise HTTPException(status_code=400, detail="group_by contains too many dimensions")
    invalid_groups = [item for item in group_by if item not in VALID_GROUPS]
    if invalid_groups:
        raise HTTPException(status_code=400, detail=f"Invalid group_by values: {invalid_groups}")
    return list(dict.fromkeys(group_by))


@lru_cache
def get_api_authorizer() -> ApiKeyAuthorizer:
    return ApiKeyAuthorizer(get_settings())


def require_api_key(
    request: Request,
    authorizer: ApiKeyAuthorizer = Depends(get_api_authorizer),
) -> ApiPrincipal:
    return authorizer.authenticate(request)


def require_scope(scope: str):
    def dependency(
        request: Request,
        authorizer: ApiKeyAuthorizer = Depends(get_api_authorizer),
    ) -> ApiPrincipal:
        return authorizer.require_scope(request, scope)

    return dependency
