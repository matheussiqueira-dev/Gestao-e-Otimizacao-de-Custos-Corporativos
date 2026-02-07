from datetime import date

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import require_scope
from app.core.cache import cache
from app.db.session import get_db
from app.repositories import CostRepository
from app.schemas.common import ErrorResponse
from app.schemas.analytics import AnomalyDetectionResponse, WasteRankingResponse
from app.schemas.opportunities import QuickWinsResponse
from app.services import AnalyticsService

ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Missing/invalid API key"},
    403: {"model": ErrorResponse, "description": "Insufficient scope"},
    422: {"model": ErrorResponse, "description": "Validation error"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}

router = APIRouter(tags=["analytics"])


@router.get("/waste/ranking", response_model=WasteRankingResponse, responses=ERROR_RESPONSES)
def get_waste_ranking(
    end_date: date | None = Query(default=None),
    lookback_months: int = Query(default=3, ge=1, le=12),
    top_n: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("analytics:read")),
) -> WasteRankingResponse | dict:
    period_end = end_date or date.today()
    period_start = period_end - relativedelta(months=lookback_months) + relativedelta(days=1)

    key = cache.build_key(
        "analytics:waste",
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat(),
        top_n=top_n,
    )
    def loader() -> dict:
        service = AnalyticsService(CostRepository(db))
        response = service.waste_ranking(period_start=period_start, period_end=period_end, top_n=top_n)
        return response.model_dump(mode="json")

    return cache.get_or_set_json(key, loader)


@router.get("/anomalies/detect", response_model=AnomalyDetectionResponse, responses=ERROR_RESPONSES)
def detect_anomalies(
    end_date: date | None = Query(default=None),
    lookback_months: int = Query(default=12, ge=3, le=36),
    threshold_z: float = Query(default=2.0, ge=1.0, le=6.0),
    top_n: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("analytics:read")),
) -> AnomalyDetectionResponse | dict:
    period_end = end_date or date.today()
    period_start = period_end - relativedelta(months=lookback_months) + relativedelta(days=1)

    key = cache.build_key(
        "analytics:anomalies",
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat(),
        threshold_z=threshold_z,
        top_n=top_n,
    )
    def loader() -> dict:
        service = AnalyticsService(CostRepository(db))
        response = service.detect_anomalies(
            period_start=period_start,
            period_end=period_end,
            threshold_z=threshold_z,
            top_n=top_n,
        )
        return response.model_dump(mode="json")

    return cache.get_or_set_json(key, loader)


@router.get("/opportunities/quick-wins", response_model=QuickWinsResponse, responses=ERROR_RESPONSES)
def get_quick_wins(
    end_date: date | None = Query(default=None),
    lookback_months: int = Query(default=6, ge=2, le=24),
    target_reduction_percent: float = Query(default=8.0, ge=1.0, le=30.0),
    minimum_total: float = Query(default=10000.0, ge=1000.0),
    top_n: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("analytics:read")),
) -> QuickWinsResponse | dict:
    period_end = end_date or date.today()
    period_start = period_end - relativedelta(months=lookback_months) + relativedelta(days=1)

    key = cache.build_key(
        "analytics:quick_wins",
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat(),
        target_reduction_percent=target_reduction_percent,
        minimum_total=minimum_total,
        top_n=top_n,
    )
    def loader() -> dict:
        service = AnalyticsService(CostRepository(db))
        response = service.quick_wins(
            period_start=period_start,
            period_end=period_end,
            target_reduction_percent=target_reduction_percent,
            minimum_total=minimum_total,
            top_n=top_n,
        )
        return response.model_dump(mode="json")

    return cache.get_or_set_json(key, loader)
