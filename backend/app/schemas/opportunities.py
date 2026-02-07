from datetime import date

from pydantic import BaseModel


class QuickWinOpportunity(BaseModel):
    cost_center: str
    category: str
    period_total: float
    monthly_average: float
    trend_percent: float
    volatility: float
    opportunity_score: float
    estimated_savings: float


class QuickWinsResponse(BaseModel):
    period_start: date
    period_end: date
    target_reduction_percent: float
    minimum_total: float
    items: list[QuickWinOpportunity]
