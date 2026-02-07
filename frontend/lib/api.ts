import {
  CostOverviewResponse,
  DimensionItem,
  SimulationCutCategory,
  SimulationCutCenter,
  SimulationResponse,
  WasteRankingResponse
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
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

