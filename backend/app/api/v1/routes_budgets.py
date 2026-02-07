from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import build_cost_filters, require_scope
from app.core.cache import cache
from app.db.session import get_db
from app.repositories import CostRepository
from app.schemas.budgets import BudgetVarianceResponse
from app.schemas.common import ErrorResponse
from app.services import BudgetService

ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Missing/invalid API key"},
    403: {"model": ErrorResponse, "description": "Insufficient scope"},
    422: {"model": ErrorResponse, "description": "Validation error"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}

router = APIRouter(tags=["budgets"])


@router.get("/budgets/variance", response_model=BudgetVarianceResponse, responses=ERROR_RESPONSES)
def get_budget_variance(
    start_date: date = Query(...),
    end_date: date = Query(...),
    cost_center_ids: list[int] | None = Query(default=None),
    tolerance_percent: float = Query(default=3.0, ge=0.0, le=30.0),
    include_on_track: bool = Query(default=True),
    top_n: int | None = Query(default=None, ge=1, le=100),
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("budgets:read")),
) -> BudgetVarianceResponse | dict:
    filters = build_cost_filters(
        start_date=start_date,
        end_date=end_date,
        cost_center_ids=cost_center_ids,
        project_ids=None,
        category_ids=None,
    )
    key = cache.build_key(
        "budgets:variance",
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        cost_center_ids=filters.cost_center_ids,
        tolerance_percent=tolerance_percent,
        include_on_track=include_on_track,
        top_n=top_n,
    )

    def loader() -> dict:
        service = BudgetService(CostRepository(db))
        response = service.variance_by_center(
            period_start=start_date,
            period_end=end_date,
            cost_center_ids=filters.cost_center_ids,
            tolerance_percent=tolerance_percent,
            include_on_track=include_on_track,
            top_n=top_n,
        )
        return response.model_dump(mode="json")

    return cache.get_or_set_json(key, loader)
