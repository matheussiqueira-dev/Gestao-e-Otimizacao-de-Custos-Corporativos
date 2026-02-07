from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class BudgetVarianceItem(BaseModel):
    cost_center_id: int
    cost_center: str
    planned_amount: float
    actual_amount: float
    variance_amount: float
    variance_percent: float
    status: Literal["over_budget", "on_track", "under_budget"]


class BudgetVarianceResponse(BaseModel):
    period_start: date
    period_end: date
    tolerance_percent: float = Field(ge=0, le=100)
    total_planned: float
    total_actual: float
    total_variance: float
    items: list[BudgetVarianceItem]
