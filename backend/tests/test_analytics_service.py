from datetime import date

from app.services import AnalyticsService


class FakeAnalyticsRepository:
    def get_bucket_totals(self, start_date: date, end_date: date):
        if start_date.year == 2024:
            return [
                {"cost_center": "Operacoes", "category": "Logistica", "total_amount": 8000.0},
                {"cost_center": "Marketing", "category": "Midia", "total_amount": 5000.0},
            ]
        return [
            {"cost_center": "Operacoes", "category": "Logistica", "total_amount": 12000.0},
            {"cost_center": "Marketing", "category": "Midia", "total_amount": 4500.0},
        ]

    def get_monthly_bucket_totals(self, _start_date: date, _end_date: date):
        return [
            {"month": date(2025, 1, 1), "cost_center": "Operacoes", "category": "Logistica", "total_amount": 7000.0},
            {"month": date(2025, 2, 1), "cost_center": "Operacoes", "category": "Logistica", "total_amount": 7600.0},
            {"month": date(2025, 3, 1), "cost_center": "Operacoes", "category": "Logistica", "total_amount": 9400.0},
            {"month": date(2025, 4, 1), "cost_center": "Operacoes", "category": "Logistica", "total_amount": 11800.0},
            {"month": date(2025, 5, 1), "cost_center": "Operacoes", "category": "Logistica", "total_amount": 14900.0},
            {"month": date(2025, 1, 1), "cost_center": "TI", "category": "Cloud", "total_amount": 4200.0},
            {"month": date(2025, 2, 1), "cost_center": "TI", "category": "Cloud", "total_amount": 4100.0},
            {"month": date(2025, 3, 1), "cost_center": "TI", "category": "Cloud", "total_amount": 4300.0},
            {"month": date(2025, 4, 1), "cost_center": "TI", "category": "Cloud", "total_amount": 4150.0},
            {"month": date(2025, 5, 1), "cost_center": "TI", "category": "Cloud", "total_amount": 4250.0},
        ]


def test_waste_ranking_detects_highest_waste_first() -> None:
    service = AnalyticsService(FakeAnalyticsRepository())  # type: ignore[arg-type]

    result = service.waste_ranking(
        period_start=date(2025, 1, 1),
        period_end=date(2025, 3, 31),
        comparison_period_days=90,
        top_n=5,
    )

    assert result.items[0].cost_center == "Operacoes"
    assert result.items[0].estimated_waste == 4000.0


def test_detect_anomalies_returns_spike() -> None:
    service = AnalyticsService(FakeAnalyticsRepository())  # type: ignore[arg-type]

    result = service.detect_anomalies(
        period_start=date(2025, 1, 1),
        period_end=date(2025, 5, 31),
        threshold_z=1.8,
        history_window=3,
        top_n=10,
    )

    assert any(item.cost_center == "Operacoes" and item.category == "Logistica" for item in result.items)


def test_quick_wins_returns_ranked_opportunities() -> None:
    service = AnalyticsService(FakeAnalyticsRepository())  # type: ignore[arg-type]

    result = service.quick_wins(
        period_start=date(2025, 1, 1),
        period_end=date(2025, 5, 31),
        target_reduction_percent=10.0,
        minimum_total=10000.0,
        top_n=5,
    )

    assert len(result.items) == 2
    assert result.items[0].opportunity_score >= result.items[1].opportunity_score
    assert result.items[0].estimated_savings > 0
