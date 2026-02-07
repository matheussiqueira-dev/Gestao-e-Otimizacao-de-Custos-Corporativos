from collections import defaultdict
from datetime import date, timedelta
from statistics import fmean, pstdev
from typing import Any

from app.repositories.cost_repository import AggregationDimension, CostRepository
from app.schemas.analytics import AnomalyDetectionResponse, AnomalyItem, WasteRankingItem, WasteRankingResponse
from app.schemas.costs import CostAggregateResponse, CostFilters, CostOverviewResponse
from app.schemas.simulations import ImpactRankingItem, SimulationRequest, SimulationResponse


def _months_between(start_date: date, end_date: date) -> int:
    return max(1, (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1)


class CostService:
    def __init__(self, repository: CostRepository) -> None:
        self.repository = repository

    def aggregate_costs(self, filters: CostFilters, group_by: list[AggregationDimension]) -> CostAggregateResponse:
        items = self.repository.get_aggregated_costs(filters, group_by)
        total_amount = self.repository.get_total_cost(filters)
        return CostAggregateResponse(group_by=group_by, total_amount=total_amount, items=items)

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


class SimulationService:
    def __init__(self, repository: CostRepository) -> None:
        self.repository = repository

    def run(self, payload: SimulationRequest) -> SimulationResponse:
        filters = CostFilters(start_date=payload.start_date, end_date=payload.end_date)
        matrix = self.repository.get_simulation_matrix(filters)

        center_pct = {item.cost_center_id: item.percent_cut / 100 for item in payload.center_cuts}
        center_abs = {item.cost_center_id: item.absolute_cut for item in payload.center_cuts if item.absolute_cut > 0}
        category_pct = {item.category_id: item.percent_cut / 100 for item in payload.category_cuts}
        category_abs = {item.category_id: item.absolute_cut for item in payload.category_cuts if item.absolute_cut > 0}

        buckets: list[dict[str, Any]] = []
        for bucket in matrix:
            baseline = bucket["total_amount"]
            projected = baseline

            reduction_pct = 1 - (1 - center_pct.get(bucket["cost_center_id"], 0)) * (1 - category_pct.get(bucket["category_id"], 0))
            projected *= max(0.0, 1 - reduction_pct)

            buckets.append({**bucket, "baseline_amount": baseline, "projected_amount": projected})

        self._apply_absolute_center_cuts(buckets, center_abs)
        self._apply_absolute_category_cuts(buckets, category_abs)

        baseline_total = round(sum(item["baseline_amount"] for item in buckets), 2)
        projected_total = round(sum(item["projected_amount"] for item in buckets), 2)
        estimated_savings = round(max(0.0, baseline_total - projected_total), 2)
        impact_percent = round((estimated_savings / baseline_total) * 100, 2) if baseline_total else 0.0

        center_ranking = self._build_center_ranking(buckets)
        category_ranking = self._build_category_ranking(buckets)

        return SimulationResponse(
            baseline_total=baseline_total,
            projected_total=projected_total,
            estimated_savings=estimated_savings,
            impact_percent=impact_percent,
            center_impact_ranking=center_ranking,
            category_impact_ranking=category_ranking,
        )

    @staticmethod
    def _apply_absolute_center_cuts(buckets: list[dict[str, Any]], center_abs: dict[int, float]) -> None:
        if not center_abs:
            return
        grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for bucket in buckets:
            grouped[bucket["cost_center_id"]].append(bucket)

        for cost_center_id, absolute_cut in center_abs.items():
            selected = grouped.get(cost_center_id, [])
            current_total = sum(item["projected_amount"] for item in selected)
            if current_total <= 0:
                continue
            factor = min(1.0, absolute_cut / current_total)
            for item in selected:
                item["projected_amount"] = item["projected_amount"] * (1 - factor)

    @staticmethod
    def _apply_absolute_category_cuts(buckets: list[dict[str, Any]], category_abs: dict[int, float]) -> None:
        if not category_abs:
            return
        grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for bucket in buckets:
            grouped[bucket["category_id"]].append(bucket)

        for category_id, absolute_cut in category_abs.items():
            selected = grouped.get(category_id, [])
            current_total = sum(item["projected_amount"] for item in selected)
            if current_total <= 0:
                continue
            factor = min(1.0, absolute_cut / current_total)
            for item in selected:
                item["projected_amount"] = item["projected_amount"] * (1 - factor)

    @staticmethod
    def _build_center_ranking(buckets: list[dict[str, Any]]) -> list[ImpactRankingItem]:
        aggregates: dict[int, dict[str, Any]] = {}
        for item in buckets:
            center_id = item["cost_center_id"]
            if center_id not in aggregates:
                aggregates[center_id] = {
                    "name": item["cost_center_name"],
                    "baseline": 0.0,
                    "projected": 0.0,
                }
            aggregates[center_id]["baseline"] += item["baseline_amount"]
            aggregates[center_id]["projected"] += item["projected_amount"]

        ranking: list[ImpactRankingItem] = []
        for entity_id, data in aggregates.items():
            baseline = round(data["baseline"], 2)
            projected = round(data["projected"], 2)
            savings = round(max(0.0, baseline - projected), 2)
            impact_percent = round((savings / baseline) * 100, 2) if baseline else 0.0
            ranking.append(
                ImpactRankingItem(
                    entity_id=entity_id,
                    entity_name=data["name"],
                    baseline_amount=baseline,
                    projected_amount=projected,
                    estimated_savings=savings,
                    impact_percent=impact_percent,
                )
            )
        ranking.sort(key=lambda item: item.estimated_savings, reverse=True)
        return ranking

    @staticmethod
    def _build_category_ranking(buckets: list[dict[str, Any]]) -> list[ImpactRankingItem]:
        aggregates: dict[int, dict[str, Any]] = {}
        for item in buckets:
            category_id = item["category_id"]
            if category_id not in aggregates:
                aggregates[category_id] = {
                    "name": item["category_name"],
                    "baseline": 0.0,
                    "projected": 0.0,
                }
            aggregates[category_id]["baseline"] += item["baseline_amount"]
            aggregates[category_id]["projected"] += item["projected_amount"]

        ranking: list[ImpactRankingItem] = []
        for entity_id, data in aggregates.items():
            baseline = round(data["baseline"], 2)
            projected = round(data["projected"], 2)
            savings = round(max(0.0, baseline - projected), 2)
            impact_percent = round((savings / baseline) * 100, 2) if baseline else 0.0
            ranking.append(
                ImpactRankingItem(
                    entity_id=entity_id,
                    entity_name=data["name"],
                    baseline_amount=baseline,
                    projected_amount=projected,
                    estimated_savings=savings,
                    impact_percent=impact_percent,
                )
            )
        ranking.sort(key=lambda item: item.estimated_savings, reverse=True)
        return ranking


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
