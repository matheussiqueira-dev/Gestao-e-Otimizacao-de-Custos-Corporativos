from datetime import date

from app.services import BudgetService


class FakeBudgetRepository:
    def get_budget_vs_actual_by_center(self, start_date: date, end_date: date, cost_center_ids: list[int] | None = None):
        _ = (start_date, end_date, cost_center_ids)
        return [
            {"cost_center_id": 1, "cost_center": "Operacoes", "planned_amount": 100000.0, "actual_amount": 112500.0},
            {"cost_center_id": 2, "cost_center": "TI", "planned_amount": 80000.0, "actual_amount": 79200.0},
            {"cost_center_id": 3, "cost_center": "RH", "planned_amount": 45000.0, "actual_amount": 38000.0},
        ]


def test_budget_variance_ranks_by_absolute_variance() -> None:
    service = BudgetService(FakeBudgetRepository())  # type: ignore[arg-type]

    result = service.variance_by_center(
        period_start=date(2025, 1, 1),
        period_end=date(2025, 1, 31),
        tolerance_percent=2.0,
    )

    assert result.items[0].cost_center == "Operacoes"
    assert result.items[0].status == "over_budget"
    assert any(item.status == "under_budget" for item in result.items)
    assert result.total_variance > 0


def test_budget_variance_can_filter_on_track_rows() -> None:
    service = BudgetService(FakeBudgetRepository())  # type: ignore[arg-type]

    result = service.variance_by_center(
        period_start=date(2025, 1, 1),
        period_end=date(2025, 1, 31),
        tolerance_percent=2.0,
        include_on_track=False,
    )

    assert all(item.status != "on_track" for item in result.items)
