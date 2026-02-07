from datetime import date

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.cache import cache
from app.db.session import get_db
from app.repositories import CostRepository
from app.schemas.analytics import AnomalyDetectionResponse, WasteRankingResponse
from app.services import AnalyticsService

router = APIRouter(tags=["analytics"])


@router.get("/waste/ranking", response_model=WasteRankingResponse)
def get_waste_ranking(
    end_date: date | None = Query(default=None),
    lookback_months: int = Query(default=3, ge=1, le=12),
    top_n: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> WasteRankingResponse | dict:
    period_end = end_date or date.today()
    period_start = period_end - relativedelta(months=lookback_months) + relativedelta(days=1)

    key = cache.build_key(
        "analytics:waste",
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat(),
        top_n=top_n,
    )
    cached = cache.get_json(key)
    if cached:
        return cached

    service = AnalyticsService(CostRepository(db))
    response = service.waste_ranking(period_start=period_start, period_end=period_end, top_n=top_n)
    cache.set_json(key, response.model_dump(mode="json"))
    return response


@router.get("/anomalies/detect", response_model=AnomalyDetectionResponse)
def detect_anomalies(
    end_date: date | None = Query(default=None),
    lookback_months: int = Query(default=12, ge=3, le=36),
    threshold_z: float = Query(default=2.0, ge=1.0, le=6.0),
    top_n: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
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
    cached = cache.get_json(key)
    if cached:
        return cached

    service = AnalyticsService(CostRepository(db))
    response = service.detect_anomalies(
        period_start=period_start,
        period_end=period_end,
        threshold_z=threshold_z,
        top_n=top_n,
    )
    cache.set_json(key, response.model_dump(mode="json"))
    return response

