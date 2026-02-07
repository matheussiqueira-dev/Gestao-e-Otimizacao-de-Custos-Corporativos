from datetime import date

from pydantic import BaseModel, Field, model_validator


class CostAggregateItem(BaseModel):
    month: date | None = None
    cost_center: str | None = None
    project: str | None = None
    category: str | None = None
    total_amount: float


class CostAggregateResponse(BaseModel):
    group_by: list[str]
    total_amount: float
    items: list[CostAggregateItem]


class CostOverviewResponse(BaseModel):
    total_cost: float
    monthly_average: float
    period_start: date
    period_end: date
    trend: list[CostAggregateItem]
    by_cost_center: list[CostAggregateItem]
    by_category: list[CostAggregateItem]


class DimensionItem(BaseModel):
    id: int
    code: str
    name: str


class CostFilters(BaseModel):
    start_date: date
    end_date: date
    cost_center_ids: list[int] = Field(default_factory=list)
    project_ids: list[int] = Field(default_factory=list)
    category_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_date_range(self) -> "CostFilters":
        if self.start_date > self.end_date:
            raise ValueError("start_date must be <= end_date")
        return self
