"use client";

import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";

import { EmptyState, HeroSection, KpiCard, Notice, Panel } from "@/components/ui";
import { getAnomalies, getCostOverview, getQuickWins, getWasteRanking, listCostCenters, listProjects } from "@/lib/api";
import {
  AnomalyDetectionResponse,
  CostOverviewResponse,
  DimensionItem,
  QuickWinsResponse,
  WasteRankingResponse
} from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-");
  const safe = new Date(Number(year), Number(monthIndex) - 1, 1);
  return safe.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function getDefaultDates() {
  const now = new Date();
  const endDate = toInputDate(now);
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startDate = toInputDate(start);
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
  const [anomalies, setAnomalies] = useState<AnomalyDetectionResponse | null>(null);
  const [quickWins, setQuickWins] = useState<QuickWinsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDimensions = async () => {
      const [loadedCenters, loadedProjects] = await Promise.all([listCostCenters(), listProjects()]);
      setCenters(loadedCenters);
      setProjects(loadedProjects);
    };

    loadDimensions().catch(() => setError("Falha ao carregar dimensões de filtro."));
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewData, wasteData, anomalyData, quickWinData] = await Promise.all([
          getCostOverview({
            startDate,
            endDate,
            costCenterIds: selectedCenterId ? [selectedCenterId] : undefined,
            projectIds: selectedProjectId ? [selectedProjectId] : undefined
          }),
          getWasteRanking({ endDate, lookbackMonths: 3, topN: 10 }),
          getAnomalies({ endDate, lookbackMonths: 12, thresholdZ: 2.0, topN: 8 }),
          getQuickWins({ endDate, lookbackMonths: 6, topN: 8, minimumTotal: 7000, targetReductionPercent: 8 })
        ]);

        setOverview(overviewData);
        setWaste(wasteData);
        setAnomalies(anomalyData);
        setQuickWins(quickWinData);
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
      labels: overview.trend.map((item) => (item.month ? formatMonthLabel(item.month) : "")),
      datasets: [
        {
          label: "Custos totais",
          data: overview.trend.map((item) => item.total_amount),
          borderColor: "#0f7b8f",
          backgroundColor: "rgba(15, 123, 143, 0.14)",
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3
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
          backgroundColor: "#d68b23"
        }
      ]
    };
  }, [overview]);

  const categoryDonut = useMemo(() => {
    if (!overview) {
      return null;
    }

    const palette = ["#0f7b8f", "#d68b23", "#1f8a5c", "#2f4f88", "#bf3f4a", "#8f6cb7"];
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

  const quickWinPotential = useMemo(() => {
    return (quickWins?.items ?? []).slice(0, 3).reduce((sum, item) => sum + item.estimated_savings, 0);
  }, [quickWins]);

  return (
    <>
      <HeroSection
        eyebrow="Visão executiva"
        title="Dashboard de custos com alertas de desperdício e oportunidades priorizadas"
        description="Monitore tendência, distribuição, desperdícios, anomalias e quick wins financeiros para direcionar ações de redução com maior retorno."
      />

      <section className="filters-grid" aria-label="Filtros do dashboard">
        <div className="field">
          <label htmlFor="dashboard-start-date">Data inicial</label>
          <input id="dashboard-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="dashboard-end-date">Data final</label>
          <input id="dashboard-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="dashboard-center">Centro de custo</label>
          <select
            id="dashboard-center"
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
          <label htmlFor="dashboard-project">Projeto</label>
          <select
            id="dashboard-project"
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
      </section>

      {error && <Notice kind="error">{error}</Notice>}
      {loading && <Notice>Carregando indicadores financeiros...</Notice>}

      {!loading && overview && (
        <>
          <section className="grid metrics-grid">
            <KpiCard label="Custo total" value={money.format(overview.total_cost)} subtitle="Período filtrado" />
            <KpiCard label="Média mensal" value={money.format(overview.monthly_average)} subtitle="Referência de baseline" />
            <KpiCard
              label="Quick wins (top 3)"
              value={money.format(quickWinPotential)}
              subtitle="Potencial de economia imediata"
              tone="positive"
            />
            <KpiCard
              label="Maior desperdício"
              value={money.format(waste?.items[0]?.estimated_waste ?? 0)}
              subtitle="Comparação com período anterior"
              tone="danger"
            />
          </section>

          <section className="grid panels-grid">
            <Panel title="Tendência temporal" subtitle="Evolução mensal consolidada de custos no período filtrado.">
              <div className="chart-shell">{trendChart && <Line data={trendChart} />}</div>
            </Panel>

            <Panel title="Distribuição por categoria" subtitle="Participação relativa das categorias no custo total.">
              <div className="chart-shell">{categoryDonut && <Doughnut data={categoryDonut} />}</div>
            </Panel>
          </section>

          <section className="grid panels-grid">
            <Panel title="Ranking por centro de custo" subtitle="Centros com maior impacto financeiro absoluto.">
              <div className="chart-shell">{centerBarChart && <Bar data={centerBarChart} />}</div>
            </Panel>

            <Panel title="Top desperdícios recentes" subtitle="Itens com maior variação positiva contra período comparável.">
              <div className="table-shell">
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
                        <td>{money.format(item.estimated_waste)}</td>
                        <td>
                          <span className={`badge ${item.variation_percent >= 0 ? "badge-danger" : "badge-positive"}`}>
                            {item.variation_percent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>

          <section className="grid panels-grid">
            <Panel title="Anomalias de custo" subtitle="Eventos com z-score acima do limiar estatístico monitorado.">
              {anomalies && anomalies.items.length > 0 ? (
                <div className="table-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>Mês</th>
                        <th>Centro</th>
                        <th>Categoria</th>
                        <th>Valor</th>
                        <th>Z-score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.items.map((item, index) => (
                        <tr key={`${item.month}-${item.cost_center}-${index}`}>
                          <td>{formatMonthLabel(item.month)}</td>
                          <td>{item.cost_center}</td>
                          <td>{item.category}</td>
                          <td>{money.format(item.amount)}</td>
                          <td>{item.z_score.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>Nenhuma anomalia relevante foi detectada no período analisado.</EmptyState>
              )}
            </Panel>

            <Panel title="Quick wins recomendados" subtitle="Priorize combinações centro/categoria com maior score de oportunidade.">
              {quickWins && quickWins.items.length > 0 ? (
                <div className="grid">
                  {quickWins.items.map((item) => (
                    <article key={`${item.cost_center}-${item.category}`} className="cut-item">
                      <div className="cut-item-head">
                        <strong>
                          {item.cost_center} / {item.category}
                        </strong>
                        <span className="badge badge-positive">Score {item.opportunity_score.toFixed(1)}</span>
                      </div>
                      <div className="progress" aria-label="Score de oportunidade">
                        <span style={{ width: `${Math.min(100, item.opportunity_score)}%` }} />
                      </div>
                      <p className="helper-text">
                        Potencial estimado: <strong>{money.format(item.estimated_savings)}</strong> com redução alvo de{" "}
                        {quickWins.target_reduction_percent.toFixed(0)}%.
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState>Não foram encontradas oportunidades acima do mínimo configurado.</EmptyState>
              )}
            </Panel>
          </section>
        </>
      )}
    </>
  );
}
