from datetime import date
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.cache import cache
from app.db.session import get_db
from app.repositories import AggregationDimension, CostRepository
from app.schemas.costs import CostAggregateResponse, CostFilters, CostOverviewResponse, DimensionItem
from app.services import CostService

router = APIRouter(tags=["costs"])

VALID_GROUPS: set[str] = {"month", "cost_center", "project", "category"}


def _build_filters(
    start_date: date,
    end_date: date,
    cost_center_ids: list[int] | None,
    project_ids: list[int] | None,
    category_ids: list[int] | None,
) -> CostFilters:
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date")
    return CostFilters(
        start_date=start_date,
        end_date=end_date,
        cost_center_ids=cost_center_ids or [],
        project_ids=project_ids or [],
        category_ids=category_ids or [],
    )


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
    invalid_groups = [item for item in group_by if item not in VALID_GROUPS]
    if invalid_groups:
        raise HTTPException(status_code=400, detail=f"Invalid group_by values: {invalid_groups}")

    filters = _build_filters(start_date, end_date, cost_center_ids, project_ids, category_ids)
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

    valid_group_by = cast(list[AggregationDimension], [item for item in group_by if item in VALID_GROUPS])
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
    filters = _build_filters(start_date, end_date, cost_center_ids, project_ids, category_ids)
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
