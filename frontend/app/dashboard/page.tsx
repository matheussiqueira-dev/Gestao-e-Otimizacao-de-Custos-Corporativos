"use client";

import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";

import { getCostOverview, getWasteRanking, listCostCenters, listProjects } from "@/lib/api";
import { CostOverviewResponse, DimensionItem, WasteRankingResponse } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function getDefaultDates() {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startDate = start.toISOString().slice(0, 10);
  return { startDate, endDate };
}

export default function DashboardPage() {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [selectedCenterId, setSelectedCenterId] = useState<number | "">("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [centers, setCenters] = useState<DimensionItem[]>([]);
  const [projects, setProjects] = useState<DimensionItem[]>([]);
  const [overview, setOverview] = useState<CostOverviewResponse | null>(null);
  const [waste, setWaste] = useState<WasteRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDimensions = async () => {
      const [loadedCenters, loadedProjects] = await Promise.all([listCostCenters(), listProjects()]);
      setCenters(loadedCenters);
      setProjects(loadedProjects);
    };

    loadDimensions().catch(() => setError("Falha ao carregar dimensões."));
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewData, wasteData] = await Promise.all([
          getCostOverview({
            startDate,
            endDate,
            costCenterIds: selectedCenterId ? [selectedCenterId] : undefined,
            projectIds: selectedProjectId ? [selectedProjectId] : undefined
          }),
          getWasteRanking({ endDate, lookbackMonths: 3, topN: 10 })
        ]);
        setOverview(overviewData);
        setWaste(wasteData);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Erro ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard().catch(() => setError("Erro ao carregar dashboard."));
  }, [startDate, endDate, selectedCenterId, selectedProjectId]);

  const trendChart = useMemo(() => {
    if (!overview) {
      return null;
    }
    return {
      labels: overview.trend.map((item) => (item.month ? new Date(item.month).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) : "")),
      datasets: [
        {
          label: "Custos totais",
          data: overview.trend.map((item) => item.total_amount),
          borderColor: "#30d5c8",
          backgroundColor: "rgba(48, 213, 200, 0.2)",
          borderWidth: 2,
          tension: 0.26
        }
      ]
    };
  }, [overview]);

  const centerBarChart = useMemo(() => {
    if (!overview) {
      return null;
    }
    return {
      labels: overview.by_cost_center.map((item) => item.cost_center ?? "N/A"),
      datasets: [
        {
          label: "Total por centro",
          data: overview.by_cost_center.map((item) => item.total_amount),
          backgroundColor: "#f0b14b"
        }
      ]
    };
  }, [overview]);

  const categoryDonut = useMemo(() => {
    if (!overview) {
      return null;
    }
    const palette = ["#30d5c8", "#f0b14b", "#6cc0f4", "#f37667", "#8ad165", "#91a6ff"];
    return {
      labels: overview.by_category.map((item) => item.category ?? "N/A"),
      datasets: [
        {
          label: "Distribuição por categoria",
          data: overview.by_category.map((item) => item.total_amount),
          backgroundColor: overview.by_category.map((_, index) => palette[index % palette.length])
        }
      ]
    };
  }, [overview]);

  return (
    <section>
      <div className="hero">
        <h1>Dashboard Executivo de Custos</h1>
        <p>Acompanhe tendência temporal, distribuição por centro e sinais de desperdício para priorizar ações de redução com maior retorno financeiro.</p>
      </div>

      <div className="filters" style={{ marginTop: "1rem" }}>
        <div className="field">
          <label>Data inicial</label>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="field">
          <label>Data final</label>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <div className="field">
          <label>Centro de custo</label>
          <select
            value={selectedCenterId}
            onChange={(event) => setSelectedCenterId(event.target.value ? Number(event.target.value) : "")}
          >
            <option value="">Todos</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Projeto</label>
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value ? Number(event.target.value) : "")}
          >
            <option value="">Todos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="panel" style={{ marginTop: "1rem", borderColor: "rgba(243, 118, 103, 0.6)" }}>
          <strong>Erro:</strong> {error}
        </div>
      )}

      {loading && <div className="panel" style={{ marginTop: "1rem" }}>Carregando indicadores...</div>}

      {!loading && overview && (
        <>
          <div className="grid kpis">
            <article className="kpi">
              <p className="kpi-label">Custo total no período</p>
              <p className="kpi-value">{money.format(overview.total_cost)}</p>
            </article>
            <article className="kpi">
              <p className="kpi-label">Média mensal</p>
              <p className="kpi-value">{money.format(overview.monthly_average)}</p>
            </article>
            <article className="kpi">
              <p className="kpi-label">Categorias monitoradas</p>
              <p className="kpi-value">{overview.by_category.length}</p>
            </article>
            <article className="kpi">
              <p className="kpi-label">Maior desperdício identificado</p>
              <p className="kpi-value danger">{money.format(waste?.items[0]?.estimated_waste ?? 0)}</p>
            </article>
          </div>

          <div className="grid panels-2">
            <article className="panel">
              <h2>Tendência de custos</h2>
              <div className="chart-container">{trendChart && <Line data={trendChart} />}</div>
            </article>
            <article className="panel">
              <h2>Distribuição por categoria</h2>
              <div className="chart-container">{categoryDonut && <Doughnut data={categoryDonut} />}</div>
            </article>
          </div>

          <div className="grid panels-2">
            <article className="panel">
              <h2>Ranking por centro de custo</h2>
              <div className="chart-container">{centerBarChart && <Bar data={centerBarChart} />}</div>
            </article>
            <article className="panel">
              <h2>Top desperdícios recentes</h2>
              <table>
                <thead>
                  <tr>
                    <th>Centro</th>
                    <th>Categoria</th>
                    <th>Desperdício</th>
                    <th>Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {(waste?.items ?? []).map((item) => (
                    <tr key={`${item.cost_center}-${item.category}`}>
                      <td>{item.cost_center}</td>
                      <td>{item.category}</td>
                      <td className="danger">{money.format(item.estimated_waste)}</td>
                      <td>{item.variation_percent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </div>
        </>
      )}
    </section>
  );
}

