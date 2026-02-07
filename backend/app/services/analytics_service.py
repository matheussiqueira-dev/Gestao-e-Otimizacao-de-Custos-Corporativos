from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from statistics import fmean, pstdev
from typing import Any

from app.repositories.cost_repository import CostRepository
from app.schemas.analytics import AnomalyDetectionResponse, AnomalyItem, WasteRankingItem, WasteRankingResponse
from app.schemas.opportunities import QuickWinOpportunity, QuickWinsResponse


class AnalyticsService:
    def __init__(self, repository: CostRepository) -> None:
        self.repository = repository

    def waste_ranking(
        self,
        period_start: date,
        period_end: date,
        comparison_period_days: int | None = None,
        top_n: int = 10,
    ) -> WasteRankingResponse:
        days = comparison_period_days or max(30, (period_end - period_start).days + 1)
        previous_end = period_start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=days - 1)

        current_data = self.repository.get_bucket_totals(period_start, period_end)
        previous_data = self.repository.get_bucket_totals(previous_start, previous_end)
        previous_map = {(item["cost_center"], item["category"]): item["total_amount"] for item in previous_data}

        ranking: list[WasteRankingItem] = []
        for row in current_data:
            key = (row["cost_center"], row["category"])
            current_total = row["total_amount"]
            previous_total = previous_map.get(key, 0.0)
            estimated_waste = max(0.0, current_total - previous_total)
            variation_percent = ((current_total - previous_total) / previous_total * 100) if previous_total else 100.0
            ranking.append(
                WasteRankingItem(
                    cost_center=row["cost_center"],
                    category=row["category"],
                    previous_period_total=round(previous_total, 2),
                    current_period_total=round(current_total, 2),
                    estimated_waste=round(estimated_waste, 2),
                    variation_percent=round(variation_percent, 2),
                )
            )

        ranking.sort(key=lambda item: item.estimated_waste, reverse=True)
        return WasteRankingResponse(period_start=period_start, period_end=period_end, items=ranking[:top_n])

    def detect_anomalies(
        self,
        period_start: date,
        period_end: date,
        threshold_z: float = 2.0,
        history_window: int = 4,
        top_n: int = 20,
    ) -> AnomalyDetectionResponse:
        data = self.repository.get_monthly_bucket_totals(period_start, period_end)
        grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        for item in data:
            grouped[(item["cost_center"], item["category"])].append(item)

        anomalies: list[AnomalyItem] = []
        for (cost_center, category), series in grouped.items():
            series = sorted(series, key=lambda item: item["month"])
            amounts = [row["total_amount"] for row in series]

            for idx in range(history_window, len(series)):
                history = amounts[max(0, idx - history_window) : idx]
                if len(history) < 2:
                    continue
                mean_value = fmean(history)
                std_value = pstdev(history)
                if std_value == 0:
                    continue
                current_amount = amounts[idx]
                z_score = (current_amount - mean_value) / std_value
                if z_score >= threshold_z and current_amount > mean_value:
                    anomalies.append(
                        AnomalyItem(
                            month=series[idx]["month"],
                            cost_center=cost_center,
                            category=category,
                            amount=round(current_amount, 2),
                            baseline_mean=round(mean_value, 2),
                            baseline_std=round(std_value, 2),
                            z_score=round(z_score, 2),
                        )
                    )

        anomalies.sort(key=lambda item: item.z_score, reverse=True)
        return AnomalyDetectionResponse(
            period_start=period_start,
            period_end=period_end,
            threshold_z=threshold_z,
            items=anomalies[:top_n],
        )

    def quick_wins(
        self,
        period_start: date,
        period_end: date,
        target_reduction_percent: float = 8.0,
        minimum_total: float = 10000.0,
        top_n: int = 10,
    ) -> QuickWinsResponse:
        monthly_data = self.repository.get_monthly_bucket_totals(period_start, period_end)
        grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        for item in monthly_data:
            grouped[(item["cost_center"], item["category"])].append(item)

        portfolio_total = sum(item["total_amount"] for item in monthly_data)
        opportunities: list[QuickWinOpportunity] = []

        for (cost_center, category), rows in grouped.items():
            rows = sorted(rows, key=lambda item: item["month"])
            amounts = [row["total_amount"] for row in rows]
            period_total = sum(amounts)
            if period_total < minimum_total:
                continue

            monthly_average = period_total / max(1, len(amounts))
            latest_amount = amounts[-1] if amounts else 0.0
            baseline_samples = amounts[:-1] if len(amounts) > 1 else amounts
            baseline_average = fmean(baseline_samples) if baseline_samples else 0.0
            trend_percent = ((latest_amount - baseline_average) / baseline_average * 100) if baseline_average else 0.0

            std = pstdev(amounts) if len(amounts) > 1 else 0.0
            volatility = (std / monthly_average * 100) if monthly_average else 0.0
            concentration = (period_total / portfolio_total) if portfolio_total else 0.0

            spend_score = min(55.0, concentration * 140)
            trend_score = min(30.0, max(0.0, trend_percent) * 0.7)
            volatility_score = min(15.0, volatility * 0.35)
            opportunity_score = round(spend_score + trend_score + volatility_score, 2)
            estimated_savings = round(period_total * (target_reduction_percent / 100), 2)

            opportunities.append(
                QuickWinOpportunity(
                    cost_center=cost_center,
                    category=category,
                    period_total=round(period_total, 2),
                    monthly_average=round(monthly_average, 2),
                    trend_percent=round(trend_percent, 2),
                    volatility=round(volatility, 2),
                    opportunity_score=opportunity_score,
                    estimated_savings=estimated_savings,
                )
            )

        opportunities.sort(key=lambda item: (item.opportunity_score, item.estimated_savings), reverse=True)
        return QuickWinsResponse(
            period_start=period_start,
            period_end=period_end,
            target_reduction_percent=target_reduction_percent,
            minimum_total=minimum_total,
            items=opportunities[:top_n],
        )
