from datetime import date
from typing import cast

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import build_cost_filters, require_scope, validate_group_by
from app.core.cache import cache
from app.db.session import get_db
from app.repositories import AggregationDimension, CostRepository
from app.schemas.costs import CostAggregateResponse, CostOverviewResponse, DimensionItem
from app.schemas.common import ErrorResponse
from app.services import CostService

ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Missing/invalid API key"},
    403: {"model": ErrorResponse, "description": "Insufficient scope"},
    422: {"model": ErrorResponse, "description": "Validation error"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}

router = APIRouter(tags=["costs"])


@router.get("/costs/aggregate", response_model=CostAggregateResponse, responses=ERROR_RESPONSES)
def get_aggregated_costs(
    start_date: date = Query(...),
    end_date: date = Query(...),
    group_by: list[str] = Query(default=["month"]),
    cost_center_ids: list[int] | None = Query(default=None),
    project_ids: list[int] | None = Query(default=None),
    category_ids: list[int] | None = Query(default=None),
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("costs:read")),
) -> CostAggregateResponse | dict:
    validate_group_by(group_by)

    filters = build_cost_filters(start_date, end_date, cost_center_ids, project_ids, category_ids)
    key = cache.build_key(
        "costs:aggregate",
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        group_by=group_by,
        cost_center_ids=filters.cost_center_ids,
        project_ids=filters.project_ids,
        category_ids=filters.category_ids,
    )
    def loader() -> dict:
        valid_group_by = cast(list[AggregationDimension], group_by)
        service = CostService(CostRepository(db))
        response = service.aggregate_costs(filters, group_by=valid_group_by)
        return response.model_dump(mode="json")

    return cache.get_or_set_json(key, loader)


@router.get("/costs/overview", response_model=CostOverviewResponse, responses=ERROR_RESPONSES)
def get_cost_overview(
    start_date: date = Query(...),
    end_date: date = Query(...),
    cost_center_ids: list[int] | None = Query(default=None),
    project_ids: list[int] | None = Query(default=None),
    category_ids: list[int] | None = Query(default=None),
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("costs:read")),
) -> CostOverviewResponse | dict:
    filters = build_cost_filters(start_date, end_date, cost_center_ids, project_ids, category_ids)
    key = cache.build_key(
        "costs:overview",
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        cost_center_ids=filters.cost_center_ids,
        project_ids=filters.project_ids,
        category_ids=filters.category_ids,
    )
    def loader() -> dict:
        service = CostService(CostRepository(db))
        response = service.cost_overview(filters)
        return response.model_dump(mode="json")

    return cache.get_or_set_json(key, loader)


@router.get("/dimensions/cost-centers", response_model=list[DimensionItem], responses=ERROR_RESPONSES)
def list_cost_centers(
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("costs:read")),
) -> list[dict]:
    key = cache.build_key("dimensions:cost_centers")
    return cache.get_or_set_json(key, lambda: CostRepository(db).list_cost_centers())


@router.get("/dimensions/projects", response_model=list[DimensionItem], responses=ERROR_RESPONSES)
def list_projects(
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("costs:read")),
) -> list[dict]:
    key = cache.build_key("dimensions:projects")
    return cache.get_or_set_json(key, lambda: CostRepository(db).list_projects())


@router.get("/dimensions/categories", response_model=list[DimensionItem], responses=ERROR_RESPONSES)
def list_categories(
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("costs:read")),
) -> list[dict]:
    key = cache.build_key("dimensions:categories")
    return cache.get_or_set_json(key, lambda: CostRepository(db).list_categories())
