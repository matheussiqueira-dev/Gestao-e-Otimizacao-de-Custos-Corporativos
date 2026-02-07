export type DimensionItem = {
  id: number;
  code: string;
  name: string;
};

export type CostAggregateItem = {
  month?: string;
  cost_center?: string;
  project?: string;
  category?: string;
  total_amount: number;
};

export type CostOverviewResponse = {
  total_cost: number;
  monthly_average: number;
  period_start: string;
  period_end: string;
  trend: CostAggregateItem[];
  by_cost_center: CostAggregateItem[];
  by_category: CostAggregateItem[];
};

export type WasteRankingItem = {
  cost_center: string;
  category: string;
  previous_period_total: number;
  current_period_total: number;
  estimated_waste: number;
  variation_percent: number;
};

export type WasteRankingResponse = {
  period_start: string;
  period_end: string;
  items: WasteRankingItem[];
};

export type AnomalyItem = {
  month: string;
  cost_center: string;
  category: string;
  amount: number;
  baseline_mean: number;
  baseline_std: number;
  z_score: number;
};

export type AnomalyDetectionResponse = {
  period_start: string;
  period_end: string;
  threshold_z: number;
  items: AnomalyItem[];
};

export type QuickWinOpportunity = {
  cost_center: string;
  category: string;
  period_total: number;
  monthly_average: number;
  trend_percent: number;
  volatility: number;
  opportunity_score: number;
  estimated_savings: number;
};

export type QuickWinsResponse = {
  period_start: string;
  period_end: string;
  target_reduction_percent: number;
  minimum_total: number;
  items: QuickWinOpportunity[];
};

export type ImpactRankingItem = {
  entity_id: number;
  entity_name: string;
  baseline_amount: number;
  projected_amount: number;
  estimated_savings: number;
  impact_percent: number;
};

export type SimulationResponse = {
  baseline_total: number;
  projected_total: number;
  estimated_savings: number;
  impact_percent: number;
  center_impact_ranking: ImpactRankingItem[];
  category_impact_ranking: ImpactRankingItem[];
};

export type SimulationComparisonScenario = {
  scenario_name: string;
  center_cuts: SimulationCutCenter[];
  category_cuts: SimulationCutCategory[];
};

export type SimulationComparisonItem = {
  scenario_name: string;
  baseline_total: number;
  projected_total: number;
  estimated_savings: number;
  impact_percent: number;
  rank: number;
};

export type SimulationComparisonResponse = {
  period_start: string;
  period_end: string;
  best_scenario: string | null;
  items: SimulationComparisonItem[];
};

export type SimulationCutCenter = {
  cost_center_id: number;
  percent_cut: number;
  absolute_cut: number;
};

export type SimulationCutCategory = {
  category_id: number;
  percent_cut: number;
  absolute_cut: number;
};

export type BudgetVarianceStatus = "over_budget" | "on_track" | "under_budget";

export type BudgetVarianceItem = {
  cost_center_id: number;
  cost_center: string;
  planned_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percent: number;
  status: BudgetVarianceStatus;
};

export type BudgetVarianceResponse = {
  period_start: string;
  period_end: string;
  tolerance_percent: number;
  total_planned: number;
  total_actual: number;
  total_variance: number;
  items: BudgetVarianceItem[];
};
