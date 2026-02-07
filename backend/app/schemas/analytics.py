from datetime import date

from pydantic import BaseModel


class WasteRankingItem(BaseModel):
    cost_center: str
    category: str
    previous_period_total: float
    current_period_total: float
    estimated_waste: float
    variation_percent: float


class WasteRankingResponse(BaseModel):
    period_start: date
    period_end: date
    items: list[WasteRankingItem]


class AnomalyItem(BaseModel):
    month: date
    cost_center: str
    category: str
    amount: float
    baseline_mean: float
    baseline_std: float
    z_score: float


class AnomalyDetectionResponse(BaseModel):
    period_start: date
    period_end: date
    threshold_z: float
    items: list[AnomalyItem]

