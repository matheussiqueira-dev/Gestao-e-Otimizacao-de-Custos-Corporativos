from datetime import date

from pydantic import BaseModel, Field, model_validator


class CutByCenter(BaseModel):
    cost_center_id: int
    percent_cut: float = Field(default=0, ge=0, le=100)
    absolute_cut: float = Field(default=0, ge=0)


class CutByCategory(BaseModel):
    category_id: int
    percent_cut: float = Field(default=0, ge=0, le=100)
    absolute_cut: float = Field(default=0, ge=0)


class SimulationRequest(BaseModel):
    start_date: date
    end_date: date
    center_cuts: list[CutByCenter] = Field(default_factory=list)
    category_cuts: list[CutByCategory] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_cuts(self) -> "SimulationRequest":
        if self.start_date > self.end_date:
            raise ValueError("start_date must be <= end_date")

        has_center_cut = any((cut.percent_cut > 0 or cut.absolute_cut > 0) for cut in self.center_cuts)
        has_category_cut = any((cut.percent_cut > 0 or cut.absolute_cut > 0) for cut in self.category_cuts)
        if not (has_center_cut or has_category_cut):
            raise ValueError("At least one cut (center or category) must be provided.")

        center_ids = [cut.cost_center_id for cut in self.center_cuts]
        if len(center_ids) != len(set(center_ids)):
            raise ValueError("center_cuts must not contain duplicate cost_center_id values.")

        category_ids = [cut.category_id for cut in self.category_cuts]
        if len(category_ids) != len(set(category_ids)):
            raise ValueError("category_cuts must not contain duplicate category_id values.")
        return self


class ImpactRankingItem(BaseModel):
    entity_id: int
    entity_name: str
    baseline_amount: float
    projected_amount: float
    estimated_savings: float
    impact_percent: float


class SimulationResponse(BaseModel):
    baseline_total: float
    projected_total: float
    estimated_savings: float
    impact_percent: float
    center_impact_ranking: list[ImpactRankingItem]
    category_impact_ranking: list[ImpactRankingItem]
