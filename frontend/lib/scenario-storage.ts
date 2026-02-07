import { SimulationCutCategory, SimulationCutCenter } from "@/lib/types";

const STORAGE_KEY = "costintel.saved-scenarios";

export type SavedScenario = {
  id: string;
  name: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  centerCuts: SimulationCutCenter[];
  categoryCuts: SimulationCutCategory[];
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function listSavedScenarios(): SavedScenario[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SavedScenario[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScenario(scenario: Omit<SavedScenario, "id" | "createdAt">): SavedScenario[] {
  const current = listSavedScenarios();
  const nextItem: SavedScenario = {
    ...scenario,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };

  const next = [nextItem, ...current].slice(0, 12);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteScenario(id: string): SavedScenario[] {
  const next = listSavedScenarios().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
