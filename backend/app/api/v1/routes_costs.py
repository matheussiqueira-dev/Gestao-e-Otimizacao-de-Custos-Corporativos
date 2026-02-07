from datetime import date
from typing import cast

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import build_cost_filters, require_api_key, validate_group_by
from app.core.cache import cache
from app.db.session import get_db
from app.repositories import AggregationDimension, CostRepository
from app.schemas.costs import CostAggregateResponse, CostOverviewResponse, DimensionItem
from app.services import CostService

router = APIRouter(tags=["costs"], dependencies=[Depends(require_api_key)])


@router.get("/costs/aggregate", response_model=CostAggregateResponse)
def get_aggregated_costs(
    start_date: date = Query(...),
    end_date: date = Query(...),
    group_by: list[str] = Query(default=["month"]),
    cost_center_ids: list[int] | None = Query(default=None),
    project_ids: list[int] | None = Query(default=None),
    category_ids: list[int] | None = Query(default=None),
    db: Session = Depends(get_db),
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
    cached = cache.get_json(key)
    if cached:
        return cached

    valid_group_by = cast(list[AggregationDimension], group_by)
    service = CostService(CostRepository(db))
    response = service.aggregate_costs(filters, group_by=valid_group_by)
    cache.set_json(key, response.model_dump(mode="json"))
    return response


@router.get("/costs/overview", response_model=CostOverviewResponse)
def get_cost_overview(
    start_date: date = Query(...),
    end_date: date = Query(...),
    cost_center_ids: list[int] | None = Query(default=None),
    project_ids: list[int] | None = Query(default=None),
    category_ids: list[int] | None = Query(default=None),
    db: Session = Depends(get_db),
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
    cached = cache.get_json(key)
    if cached:
        return cached

    service = CostService(CostRepository(db))
    response = service.cost_overview(filters)
    cache.set_json(key, response.model_dump(mode="json"))
    return response


@router.get("/dimensions/cost-centers", response_model=list[DimensionItem])
def list_cost_centers(db: Session = Depends(get_db)) -> list[dict]:
    repository = CostRepository(db)
    return repository.list_cost_centers()


@router.get("/dimensions/projects", response_model=list[DimensionItem])
def list_projects(db: Session = Depends(get_db)) -> list[dict]:
    repository = CostRepository(db)
    return repository.list_projects()


@router.get("/dimensions/categories", response_model=list[DimensionItem])
def list_categories(db: Session = Depends(get_db)) -> list[dict]:
    repository = CostRepository(db)
    return repository.list_categories()
