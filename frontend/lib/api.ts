import {
  AnomalyDetectionResponse,
  BudgetVarianceResponse,
  CostOverviewResponse,
  DimensionItem,
  QuickWinsResponse,
  SimulationComparisonResponse,
  SimulationComparisonScenario,
  SimulationCutCategory,
  SimulationCutCenter,
  SimulationResponse,
  WasteRankingResponse
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const API_TIMEOUT_MS = 20000;
const PUBLIC_API_KEY = process.env.NEXT_PUBLIC_API_KEY;

type QueryValue = string | number | undefined | null;

function appendParam(url: URL, key: string, value: QueryValue | QueryValue[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item !== undefined && item !== null && item !== "") {
        url.searchParams.append(key, String(item));
      }
    });
    return;
  }

  if (value !== undefined && value !== null && value !== "") {
    url.searchParams.set(key, String(value));
  }
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(PUBLIC_API_KEY ? { "X-API-Key": PUBLIC_API_KEY } : {}),
        ...(init?.method && init.method !== "GET" ? { "Content-Type": "application/json" } : {})
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error (${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A API demorou para responder. Tente novamente.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCostOverview(params: {
  startDate: string;
  endDate: string;
  costCenterIds?: number[];
  projectIds?: number[];
  categoryIds?: number[];
}) {
  const url = new URL("/api/v1/costs/overview", API_BASE_URL);
  appendParam(url, "start_date", params.startDate);
  appendParam(url, "end_date", params.endDate);
  appendParam(url, "cost_center_ids", params.costCenterIds);
  appendParam(url, "project_ids", params.projectIds);
  appendParam(url, "category_ids", params.categoryIds);
  return fetchJSON<CostOverviewResponse>(url.pathname + url.search);
}

export async function getWasteRanking(params: { endDate?: string; lookbackMonths?: number; topN?: number }) {
  const url = new URL("/api/v1/waste/ranking", API_BASE_URL);
  appendParam(url, "end_date", params.endDate);
  appendParam(url, "lookback_months", params.lookbackMonths ?? 3);
  appendParam(url, "top_n", params.topN ?? 10);
  return fetchJSON<WasteRankingResponse>(url.pathname + url.search);
}

export async function getAnomalies(params: { endDate?: string; lookbackMonths?: number; thresholdZ?: number; topN?: number }) {
  const url = new URL("/api/v1/anomalies/detect", API_BASE_URL);
  appendParam(url, "end_date", params.endDate);
  appendParam(url, "lookback_months", params.lookbackMonths ?? 12);
  appendParam(url, "threshold_z", params.thresholdZ ?? 2);
  appendParam(url, "top_n", params.topN ?? 20);
  return fetchJSON<AnomalyDetectionResponse>(url.pathname + url.search);
}

export async function getQuickWins(params: {
  endDate?: string;
  lookbackMonths?: number;
  targetReductionPercent?: number;
  minimumTotal?: number;
  topN?: number;
}) {
  const url = new URL("/api/v1/opportunities/quick-wins", API_BASE_URL);
  appendParam(url, "end_date", params.endDate);
  appendParam(url, "lookback_months", params.lookbackMonths ?? 6);
  appendParam(url, "target_reduction_percent", params.targetReductionPercent ?? 8);
  appendParam(url, "minimum_total", params.minimumTotal ?? 10000);
  appendParam(url, "top_n", params.topN ?? 10);
  return fetchJSON<QuickWinsResponse>(url.pathname + url.search);
}

export async function listCostCenters() {
  return fetchJSON<DimensionItem[]>("/api/v1/dimensions/cost-centers");
}

export async function listProjects() {
  return fetchJSON<DimensionItem[]>("/api/v1/dimensions/projects");
}

export async function listCategories() {
  return fetchJSON<DimensionItem[]>("/api/v1/dimensions/categories");
}

export async function runSimulation(payload: {
  startDate: string;
  endDate: string;
  centerCuts: SimulationCutCenter[];
  categoryCuts: SimulationCutCategory[];
}) {
  return fetchJSON<SimulationResponse>("/api/v1/simulations/run", {
    method: "POST",
    body: JSON.stringify({
      start_date: payload.startDate,
      end_date: payload.endDate,
      center_cuts: payload.centerCuts,
      category_cuts: payload.categoryCuts
    })
  });
}

export async function compareSimulations(payload: {
  startDate: string;
  endDate: string;
  scenarios: SimulationComparisonScenario[];
}) {
  return fetchJSON<SimulationComparisonResponse>("/api/v1/simulations/compare", {
    method: "POST",
    body: JSON.stringify({
      start_date: payload.startDate,
      end_date: payload.endDate,
      scenarios: payload.scenarios
    })
  });
}

export async function getBudgetVariance(params: {
  startDate: string;
  endDate: string;
  costCenterIds?: number[];
  tolerancePercent?: number;
  includeOnTrack?: boolean;
  topN?: number;
}) {
  const url = new URL("/api/v1/budgets/variance", API_BASE_URL);
  const includeOnTrack = params.includeOnTrack ?? true;
  appendParam(url, "start_date", params.startDate);
  appendParam(url, "end_date", params.endDate);
  appendParam(url, "cost_center_ids", params.costCenterIds);
  appendParam(url, "tolerance_percent", params.tolerancePercent ?? 3);
  appendParam(url, "include_on_track", includeOnTrack ? "true" : "false");
  appendParam(url, "top_n", params.topN);
  return fetchJSON<BudgetVarianceResponse>(url.pathname + url.search);
}
