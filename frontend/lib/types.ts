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

