from __future__ import annotations

from datetime import date

from app.repositories.cost_repository import AggregationDimension, CostRepository
from app.schemas.costs import CostAggregateResponse, CostFilters, CostOverviewResponse


def _months_between(start_date: date, end_date: date) -> int:
    return max(1, (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1)


class CostService:
    def __init__(self, repository: CostRepository) -> None:
        self.repository = repository

    def aggregate_costs(self, filters: CostFilters, group_by: list[AggregationDimension]) -> CostAggregateResponse:
        items = self.repository.get_aggregated_costs(filters, group_by)
        total_amount = self.repository.get_total_cost(filters)
        return CostAggregateResponse(group_by=group_by, total_amount=round(total_amount, 2), items=items)

    def cost_overview(self, filters: CostFilters) -> CostOverviewResponse:
        trend = self.repository.get_aggregated_costs(filters, ["month"])
        by_center = self.repository.get_aggregated_costs(filters, ["cost_center"])
        by_category = self.repository.get_aggregated_costs(filters, ["category"])
        total_cost = self.repository.get_total_cost(filters)
        months = _months_between(filters.start_date, filters.end_date)
        monthly_average = total_cost / months
        return CostOverviewResponse(
            total_cost=round(total_cost, 2),
            monthly_average=round(monthly_average, 2),
            period_start=filters.start_date,
            period_end=filters.end_date,
            trend=trend,
            by_cost_center=by_center,
            by_category=by_category,
        )
