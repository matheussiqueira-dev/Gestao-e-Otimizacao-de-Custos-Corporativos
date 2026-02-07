from __future__ import annotations

from datetime import date

from app.repositories.cost_repository import CostRepository
from app.schemas.budgets import BudgetVarianceItem, BudgetVarianceResponse


class BudgetService:
    def __init__(self, repository: CostRepository) -> None:
        self.repository = repository

    def variance_by_center(
        self,
        period_start: date,
        period_end: date,
        cost_center_ids: list[int] | None = None,
        tolerance_percent: float = 3.0,
        include_on_track: bool = True,
        top_n: int | None = None,
    ) -> BudgetVarianceResponse:
        rows = self.repository.get_budget_vs_actual_by_center(
            start_date=period_start,
            end_date=period_end,
            cost_center_ids=cost_center_ids,
        )

        items: list[BudgetVarianceItem] = []
        for row in rows:
            planned = round(row["planned_amount"], 2)
            actual = round(row["actual_amount"], 2)
            variance = round(actual - planned, 2)

            if planned > 0:
                variance_percent = round((variance / planned) * 100, 2)
            elif actual > 0:
                variance_percent = 100.0
            else:
                variance_percent = 0.0

            if planned <= 0 and actual > 0:
                status = "over_budget"
            elif abs(variance_percent) <= tolerance_percent:
                status = "on_track"
            elif variance_percent > tolerance_percent:
                status = "over_budget"
            else:
                status = "under_budget"

            if not include_on_track and status == "on_track":
                continue

            items.append(
                BudgetVarianceItem(
                    cost_center_id=row["cost_center_id"],
                    cost_center=row["cost_center"],
                    planned_amount=planned,
                    actual_amount=actual,
                    variance_amount=variance,
                    variance_percent=variance_percent,
                    status=status,
                )
            )

        items.sort(key=lambda item: abs(item.variance_amount), reverse=True)
        if top_n is not None:
            items = items[:top_n]

        total_planned = round(sum(item.planned_amount for item in items), 2)
        total_actual = round(sum(item.actual_amount for item in items), 2)
        total_variance = round(total_actual - total_planned, 2)

        return BudgetVarianceResponse(
            period_start=period_start,
            period_end=period_end,
            tolerance_percent=tolerance_percent,
            total_planned=total_planned,
            total_actual=total_actual,
            total_variance=total_variance,
            items=items,
        )
