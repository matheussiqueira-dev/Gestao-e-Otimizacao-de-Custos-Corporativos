from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from app.repositories.cost_repository import CostRepository
from app.schemas.costs import CostFilters
from app.schemas.simulations import (
    CutByCategory,
    CutByCenter,
    ImpactRankingItem,
    SimulationComparisonItem,
    SimulationComparisonRequest,
    SimulationComparisonResponse,
    SimulationRequest,
    SimulationResponse,
)


@dataclass
class SimulationBucket:
    cost_center_id: int
    cost_center_name: str
    category_id: int
    category_name: str
    baseline_amount: float
    projected_amount: float


class SimulationService:
    def __init__(self, repository: CostRepository) -> None:
        self.repository = repository

    def run(self, payload: SimulationRequest) -> SimulationResponse:
        filters = CostFilters(start_date=payload.start_date, end_date=payload.end_date)
        matrix = self.repository.get_simulation_matrix(filters)
        buckets = self._build_projected_buckets(matrix, payload.center_cuts, payload.category_cuts)
        return self._build_response(buckets)

    def compare(self, payload: SimulationComparisonRequest) -> SimulationComparisonResponse:
        filters = CostFilters(start_date=payload.start_date, end_date=payload.end_date)
        matrix = self.repository.get_simulation_matrix(filters)
        results: list[SimulationComparisonItem] = []

        for scenario in payload.scenarios:
            buckets = self._build_projected_buckets(matrix, scenario.center_cuts, scenario.category_cuts)
            response = self._build_response(buckets)
            results.append(
                SimulationComparisonItem(
                    scenario_name=scenario.scenario_name,
                    baseline_total=response.baseline_total,
                    projected_total=response.projected_total,
                    estimated_savings=response.estimated_savings,
                    impact_percent=response.impact_percent,
                    rank=0,
                )
            )

        ranked = sorted(results, key=lambda item: (item.estimated_savings, item.impact_percent), reverse=True)
        for idx, item in enumerate(ranked, start=1):
            item.rank = idx

        return SimulationComparisonResponse(
            period_start=payload.start_date,
            period_end=payload.end_date,
            best_scenario=ranked[0].scenario_name if ranked else None,
            items=ranked,
        )

    @staticmethod
    def _build_projected_buckets(
        matrix: list[dict[str, Any]],
        center_cuts: list[CutByCenter],
        category_cuts: list[CutByCategory],
    ) -> list[SimulationBucket]:
        center_pct = {item.cost_center_id: item.percent_cut / 100 for item in center_cuts}
        center_abs = {item.cost_center_id: item.absolute_cut for item in center_cuts if item.absolute_cut > 0}
        category_pct = {item.category_id: item.percent_cut / 100 for item in category_cuts}
        category_abs = {item.category_id: item.absolute_cut for item in category_cuts if item.absolute_cut > 0}

        buckets: list[SimulationBucket] = []
        for bucket in matrix:
            baseline = float(bucket["total_amount"])
            reduction_pct = 1 - (1 - center_pct.get(bucket["cost_center_id"], 0)) * (1 - category_pct.get(bucket["category_id"], 0))
            projected = baseline * max(0.0, 1 - reduction_pct)
            buckets.append(
                SimulationBucket(
                    cost_center_id=bucket["cost_center_id"],
                    cost_center_name=bucket["cost_center_name"],
                    category_id=bucket["category_id"],
                    category_name=bucket["category_name"],
                    baseline_amount=baseline,
                    projected_amount=projected,
                )
            )

        SimulationService._apply_absolute_cuts(buckets, center_abs, "cost_center_id")
        SimulationService._apply_absolute_cuts(buckets, category_abs, "category_id")
        return buckets

    @staticmethod
    def _apply_absolute_cuts(
        buckets: list[SimulationBucket],
        absolute_cuts: dict[int, float],
        group_field: str,
    ) -> None:
        if not absolute_cuts:
            return

        grouped: dict[int, list[SimulationBucket]] = defaultdict(list)
        for bucket in buckets:
            grouped[getattr(bucket, group_field)].append(bucket)

        for entity_id, absolute_cut in absolute_cuts.items():
            selected = grouped.get(entity_id, [])
            current_total = sum(item.projected_amount for item in selected)
            if current_total <= 0:
                continue
            factor = min(1.0, absolute_cut / current_total)
            for item in selected:
                item.projected_amount = item.projected_amount * (1 - factor)

    @staticmethod
    def _build_entity_ranking(
        buckets: list[SimulationBucket],
        id_field: str,
        name_field: str,
    ) -> list[ImpactRankingItem]:
        aggregates: dict[int, dict[str, float | str]] = {}
        for item in buckets:
            entity_id = int(getattr(item, id_field))
            if entity_id not in aggregates:
                aggregates[entity_id] = {"name": str(getattr(item, name_field)), "baseline": 0.0, "projected": 0.0}
            aggregates[entity_id]["baseline"] = float(aggregates[entity_id]["baseline"]) + item.baseline_amount
            aggregates[entity_id]["projected"] = float(aggregates[entity_id]["projected"]) + item.projected_amount

        ranking: list[ImpactRankingItem] = []
        for entity_id, values in aggregates.items():
            baseline = round(float(values["baseline"]), 2)
            projected = round(float(values["projected"]), 2)
            savings = round(max(0.0, baseline - projected), 2)
            impact_percent = round((savings / baseline) * 100, 2) if baseline else 0.0
            ranking.append(
                ImpactRankingItem(
                    entity_id=entity_id,
                    entity_name=str(values["name"]),
                    baseline_amount=baseline,
                    projected_amount=projected,
                    estimated_savings=savings,
                    impact_percent=impact_percent,
                )
            )

        ranking.sort(key=lambda item: item.estimated_savings, reverse=True)
        return ranking

    def _build_response(self, buckets: list[SimulationBucket]) -> SimulationResponse:
        baseline_total = round(sum(item.baseline_amount for item in buckets), 2)
        projected_total = round(sum(item.projected_amount for item in buckets), 2)
        estimated_savings = round(max(0.0, baseline_total - projected_total), 2)
        impact_percent = round((estimated_savings / baseline_total) * 100, 2) if baseline_total else 0.0
        center_ranking = self._build_entity_ranking(buckets, "cost_center_id", "cost_center_name")
        category_ranking = self._build_entity_ranking(buckets, "category_id", "category_name")

        return SimulationResponse(
            baseline_total=baseline_total,
            projected_total=projected_total,
            estimated_savings=estimated_savings,
            impact_percent=impact_percent,
            center_impact_ranking=center_ranking,
            category_impact_ranking=category_ranking,
        )
