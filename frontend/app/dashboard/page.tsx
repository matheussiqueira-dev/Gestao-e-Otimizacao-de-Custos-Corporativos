"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";

import { EmptyState, HeroSection, KpiCard, Notice, Panel, Pill } from "@/components/ui";
import { getAnomalies, getCostOverview, getQuickWins, getWasteRanking, listCategories, listCostCenters, listProjects } from "@/lib/api";
import { ensureChartsRegistered } from "@/lib/chart";
import { getDefaultDashboardDates, getPreviousPeriodRange, isDateWindowValid } from "@/lib/date";
import { formatCompactPercent, formatCurrency, formatMonthLabel } from "@/lib/format";
import {
  AnomalyDetectionResponse,
  CostOverviewResponse,
  DimensionItem,
  QuickWinsResponse,
  WasteRankingResponse
} from "@/lib/types";

ensureChartsRegistered();

type DashboardFilters = {
  startDate: string;
  endDate: string;
  centerId: number | "";
  projectId: number | "";
  categoryId: number | "";
};

function parseNumericParam(value: string | null): number | "" {
  if (!value) {
    return "";
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const defaults = useMemo(() => getDefaultDashboardDates(), []);
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>({
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    centerId: "",
    projectId: "",
    categoryId: ""
  });
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>({
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    centerId: "",
    projectId: "",
    categoryId: ""
  });
  const [centers, setCenters] = useState<DimensionItem[]>([]);
  const [projects, setProjects] = useState<DimensionItem[]>([]);
  const [categories, setCategories] = useState<DimensionItem[]>([]);
  const [overview, setOverview] = useState<CostOverviewResponse | null>(null);
  const [previousOverview, setPreviousOverview] = useState<CostOverviewResponse | null>(null);
  const [waste, setWaste] = useState<WasteRankingResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyDetectionResponse | null>(null);
  const [quickWins, setQuickWins] = useState<QuickWinsResponse | null>(null);
  const [dimensionsLoading, setDimensionsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl: DashboardFilters = {
      startDate: params.get("start") ?? defaults.startDate,
      endDate: params.get("end") ?? defaults.endDate,
      centerId: parseNumericParam(params.get("center")),
      projectId: parseNumericParam(params.get("project")),
      categoryId: parseNumericParam(params.get("category"))
    };
    setDraftFilters(fromUrl);
    setAppliedFilters(fromUrl);
  }, [defaults.endDate, defaults.startDate]);

  useEffect(() => {
    const loadDimensions = async () => {
      const [loadedCenters, loadedProjects, loadedCategories] = await Promise.all([
        listCostCenters(),
        listProjects(),
        listCategories()
      ]);
      setCenters(loadedCenters);
      setProjects(loadedProjects);
      setCategories(loadedCategories);
      setDimensionsLoading(false);
    };

    loadDimensions().catch(() => {
      setDimensionsLoading(false);
      setError("Falha ao carregar dimensões de filtro.");
    });
  }, []);

  useEffect(() => {
    const isWindowValid = isDateWindowValid({
      startDate: appliedFilters.startDate,
      endDate: appliedFilters.endDate
    });

    if (!isWindowValid) {
      setError("A data inicial precisa ser menor ou igual à data final.");
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      const previousWindow = getPreviousPeriodRange({
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate
      });

      try {
        const [overviewData, previousOverviewData, wasteData, anomalyData, quickWinData] = await Promise.all([
          getCostOverview({
            startDate: appliedFilters.startDate,
            endDate: appliedFilters.endDate,
            costCenterIds: appliedFilters.centerId ? [appliedFilters.centerId] : undefined,
            projectIds: appliedFilters.projectId ? [appliedFilters.projectId] : undefined,
            categoryIds: appliedFilters.categoryId ? [appliedFilters.categoryId] : undefined
          }),
          getCostOverview({
            startDate: previousWindow.startDate,
            endDate: previousWindow.endDate,
            costCenterIds: appliedFilters.centerId ? [appliedFilters.centerId] : undefined,
            projectIds: appliedFilters.projectId ? [appliedFilters.projectId] : undefined,
            categoryIds: appliedFilters.categoryId ? [appliedFilters.categoryId] : undefined
          }),
          getWasteRanking({ endDate: appliedFilters.endDate, lookbackMonths: 3, topN: 10 }),
          getAnomalies({ endDate: appliedFilters.endDate, lookbackMonths: 12, thresholdZ: 2.0, topN: 8 }),
          getQuickWins({ endDate: appliedFilters.endDate, lookbackMonths: 6, topN: 8, minimumTotal: 7000, targetReductionPercent: 8 })
        ]);

        setOverview(overviewData);
        setPreviousOverview(previousOverviewData);
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
  }, [appliedFilters]);

  useEffect(() => {
    if (!shareFeedback) {
      return;
    }
    const timer = setTimeout(() => setShareFeedback(null), 2500);
    return () => clearTimeout(timer);
  }, [shareFeedback]);

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
          borderColor: "#0f4c81",
          backgroundColor: "rgba(15, 76, 129, 0.18)",
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
          backgroundColor: "#3db9a8"
        }
      ]
    };
  }, [overview]);

  const categoryDonut = useMemo(() => {
    if (!overview) {
      return null;
    }

    const palette = ["#0f4c81", "#3db9a8", "#f29f4b", "#6a7ccf", "#de5f54", "#47a2d7"];
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

  const totalDelta = useMemo(() => {
    if (!overview || !previousOverview || previousOverview.total_cost <= 0) {
      return null;
    }

    return ((overview.total_cost - previousOverview.total_cost) / previousOverview.total_cost) * 100;
  }, [overview, previousOverview]);

  const activeFilterCount = useMemo(() => {
    return [appliedFilters.centerId, appliedFilters.projectId, appliedFilters.categoryId].filter(Boolean).length;
  }, [appliedFilters.categoryId, appliedFilters.centerId, appliedFilters.projectId]);

  const applyFilters = () => {
    if (!isDateWindowValid({ startDate: draftFilters.startDate, endDate: draftFilters.endDate })) {
      setError("A data inicial precisa ser menor ou igual à data final.");
      return;
    }

    setAppliedFilters(draftFilters);
    const params = new URLSearchParams();
    params.set("start", draftFilters.startDate);
    params.set("end", draftFilters.endDate);
    if (draftFilters.centerId) {
      params.set("center", String(draftFilters.centerId));
    }
    if (draftFilters.projectId) {
      params.set("project", String(draftFilters.projectId));
    }
    if (draftFilters.categoryId) {
      params.set("category", String(draftFilters.categoryId));
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    const reset = {
      startDate: defaults.startDate,
      endDate: defaults.endDate,
      centerId: "",
      projectId: "",
      categoryId: ""
    } as DashboardFilters;

    setDraftFilters(reset);
    setAppliedFilters(reset);
    router.replace(pathname, { scroll: false });
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareFeedback("Link copiado.");
    } catch {
      setShareFeedback("Não foi possível copiar o link.");
    }
  };

  return (
    <>
      <HeroSection
        eyebrow="Visão executiva"
        title="Dashboard de custos com foco em ação, não apenas visualização"
        description="Monitore tendência, distribuição, desperdícios, anomalias e quick wins com filtros compartilháveis e comparação automática com o período anterior."
        aside={
          <div className="hero-score">
            <p className="hero-score-label">Contexto da análise</p>
            <div className="hero-score-grid">
              <div>
                <strong>{activeFilterCount}</strong>
                <span>filtros ativos</span>
              </div>
              <div>
                <strong>{overview ? overview.trend.length : "-"}</strong>
                <span>meses analisados</span>
              </div>
              <div>
                <strong>{quickWins ? quickWins.items.length : "-"}</strong>
                <span>quick wins mapeados</span>
              </div>
            </div>
          </div>
        }
      />

      <section className="filters-grid" aria-label="Filtros do dashboard">
        <div className="field">
          <label htmlFor="dashboard-start-date">Data inicial</label>
          <input
            id="dashboard-start-date"
            type="date"
            value={draftFilters.startDate}
            onChange={(event) => setDraftFilters((current) => ({ ...current, startDate: event.target.value }))}
          />
        </div>

        <div className="field">
          <label htmlFor="dashboard-end-date">Data final</label>
          <input
            id="dashboard-end-date"
            type="date"
            value={draftFilters.endDate}
            onChange={(event) => setDraftFilters((current) => ({ ...current, endDate: event.target.value }))}
          />
        </div>

        <div className="field">
          <label htmlFor="dashboard-center">Centro de custo</label>
          <select
            id="dashboard-center"
            value={draftFilters.centerId}
            onChange={(event) => setDraftFilters((current) => ({ ...current, centerId: parseNumericParam(event.target.value) }))}
            disabled={dimensionsLoading}
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
            value={draftFilters.projectId}
            onChange={(event) => setDraftFilters((current) => ({ ...current, projectId: parseNumericParam(event.target.value) }))}
            disabled={dimensionsLoading}
          >
            <option value="">Todos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="dashboard-category">Categoria</label>
          <select
            id="dashboard-category"
            value={draftFilters.categoryId}
            onChange={(event) => setDraftFilters((current) => ({ ...current, categoryId: parseNumericParam(event.target.value) }))}
            disabled={dimensionsLoading}
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filters-actions">
          <button type="button" className="button button-primary" onClick={applyFilters} disabled={loading}>
            Aplicar filtros
          </button>
          <button type="button" className="button" onClick={clearFilters}>
            Limpar
          </button>
          <button type="button" className="button button-secondary" onClick={copyShareLink}>
            Compartilhar visão
          </button>
          {shareFeedback && <p className="helper-text">{shareFeedback}</p>}
        </div>
      </section>

      {error && <Notice kind="error">{error}</Notice>}
      {loading && <Notice>Carregando indicadores financeiros...</Notice>}

      {!loading && overview && (
        <>
          <section className="grid metrics-grid">
            <KpiCard
              label="Custo total"
              value={formatCurrency(overview.total_cost)}
              subtitle={
                <>
                  Período filtrado
                  {totalDelta !== null && (
                    <>
                      {" "}
                      <Pill tone={totalDelta <= 0 ? "positive" : "danger"}>{`${totalDelta <= 0 ? "↓" : "↑"} ${formatCompactPercent(
                        Math.abs(totalDelta)
                      )}`}</Pill>
                    </>
                  )}
                </>
              }
            />
            <KpiCard label="Média mensal" value={formatCurrency(overview.monthly_average)} subtitle="Referência de baseline" />
            <KpiCard
              label="Quick wins (top 3)"
              value={formatCurrency(quickWinPotential)}
              subtitle="Potencial de economia imediata"
              tone="positive"
            />
            <KpiCard
              label="Maior desperdício"
              value={formatCurrency(waste?.items[0]?.estimated_waste ?? 0)}
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
              <div className="table-shell" role="region" aria-label="Tabela de desperdícios recentes">
                <table>
                  <caption className="table-caption">Desperdícios com maior desvio percentual no período.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Centro</th>
                      <th scope="col">Categoria</th>
                      <th scope="col">Desperdício</th>
                      <th scope="col">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(waste?.items ?? []).map((item) => (
                      <tr key={`${item.cost_center}-${item.category}`}>
                        <td>{item.cost_center}</td>
                        <td>{item.category}</td>
                        <td>{formatCurrency(item.estimated_waste)}</td>
                        <td>
                          <span className={`badge ${item.variation_percent >= 0 ? "badge-danger" : "badge-positive"}`}>
                            {formatCompactPercent(item.variation_percent)}
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
                <div className="table-shell" role="region" aria-label="Tabela de anomalias de custo">
                  <table>
                    <caption className="table-caption">Ocorrências com comportamento anômalo frente ao histórico.</caption>
                    <thead>
                      <tr>
                        <th scope="col">Mês</th>
                        <th scope="col">Centro</th>
                        <th scope="col">Categoria</th>
                        <th scope="col">Valor</th>
                        <th scope="col">Z-score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.items.map((item, index) => (
                        <tr key={`${item.month}-${item.cost_center}-${index}`}>
                          <td>{formatMonthLabel(item.month)}</td>
                          <td>{item.cost_center}</td>
                          <td>{item.category}</td>
                          <td>{formatCurrency(item.amount)}</td>
                          <td>{item.z_score.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="Sem anomalias relevantes">
                  Nenhuma anomalia relevante foi detectada para os filtros aplicados.
                </EmptyState>
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
                        Potencial estimado: <strong>{formatCurrency(item.estimated_savings)}</strong> com redução alvo de{" "}
                        {quickWins.target_reduction_percent.toFixed(0)}%.
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem quick wins acima do limiar">
                  Não foram encontradas oportunidades acima do mínimo configurado.
                </EmptyState>
              )}
            </Panel>
          </section>
        </>
      )}
    </>
  );
}
