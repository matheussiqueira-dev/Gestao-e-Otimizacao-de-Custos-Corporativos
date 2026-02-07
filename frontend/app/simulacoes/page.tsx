"use client";

import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";

import { EmptyState, HeroSection, KpiCard, Notice, Panel } from "@/components/ui";
import { listCategories, listCostCenters, runSimulation } from "@/lib/api";
import { DimensionItem, SimulationCutCategory, SimulationCutCenter, SimulationResponse } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthWindow() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toInputDate(startDate), endDate: toInputDate(endDate) };
}

export default function SimulacoesPage() {
  const defaults = getCurrentMonthWindow();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);

  const [centers, setCenters] = useState<DimensionItem[]>([]);
  const [categories, setCategories] = useState<DimensionItem[]>([]);
  const [centerCuts, setCenterCuts] = useState<SimulationCutCenter[]>([]);
  const [categoryCuts, setCategoryCuts] = useState<SimulationCutCategory[]>([]);
  const [draftCenterId, setDraftCenterId] = useState<number | "">("");
  const [draftCategoryId, setDraftCategoryId] = useState<number | "">("");

  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCuts = centerCuts.length > 0 || categoryCuts.length > 0;

  useEffect(() => {
    const loadDimensions = async () => {
      const [loadedCenters, loadedCategories] = await Promise.all([listCostCenters(), listCategories()]);
      setCenters(loadedCenters);
      setCategories(loadedCategories);
      if (loadedCenters.length > 0) {
        setDraftCenterId(loadedCenters[0].id);
      }
      if (loadedCategories.length > 0) {
        setDraftCategoryId(loadedCategories[0].id);
      }
    };

    loadDimensions().catch(() => setError("Falha ao carregar dimensões para simulação."));
  }, []);

  const addCenterCut = () => {
    if (!draftCenterId || centerCuts.some((item) => item.cost_center_id === draftCenterId)) {
      return;
    }
    setCenterCuts((current) => [...current, { cost_center_id: draftCenterId, percent_cut: 0, absolute_cut: 0 }]);
  };

  const addCategoryCut = () => {
    if (!draftCategoryId || categoryCuts.some((item) => item.category_id === draftCategoryId)) {
      return;
    }
    setCategoryCuts((current) => [...current, { category_id: draftCategoryId, percent_cut: 0, absolute_cut: 0 }]);
  };

  const clearScenario = () => {
    setCenterCuts([]);
    setCategoryCuts([]);
    setResult(null);
  };

  const applyTemplate = (mode: "conservative" | "aggressive") => {
    if (centers.length === 0 || categories.length === 0) {
      return;
    }

    const centerPercent = mode === "conservative" ? 6 : 12;
    const categoryPercent = mode === "conservative" ? 4 : 10;

    setCenterCuts(
      centers.slice(0, 2).map((center) => ({
        cost_center_id: center.id,
        percent_cut: centerPercent,
        absolute_cut: 0
      }))
    );

    setCategoryCuts(
      categories.slice(0, 2).map((category) => ({
        category_id: category.id,
        percent_cut: categoryPercent,
        absolute_cut: 0
      }))
    );
  };

  const executeSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await runSimulation({
        startDate,
        endDate,
        centerCuts,
        categoryCuts
      });
      setResult(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao executar simulação.");
    } finally {
      setLoading(false);
    }
  };

  const centerImpactChart = useMemo(() => {
    if (!result) {
      return null;
    }

    return {
      labels: result.center_impact_ranking.map((item) => item.entity_name),
      datasets: [
        {
          label: "Economia estimada por centro",
          data: result.center_impact_ranking.map((item) => item.estimated_savings),
          backgroundColor: "#0f7b8f"
        }
      ]
    };
  }, [result]);

  return (
    <>
      <HeroSection
        eyebrow="Simulação estratégica"
        title="Modele cenários de redução e priorize ações com maior economia"
        description="Defina cortes percentuais e absolutos por centro de custo e categoria para testar impacto financeiro antes da execução."
        actions={
          <>
            <button type="button" className="button" onClick={() => applyTemplate("conservative")}>
              Aplicar template conservador
            </button>
            <button type="button" className="button button-secondary" onClick={() => applyTemplate("aggressive")}>
              Aplicar template agressivo
            </button>
            <button type="button" className="button button-danger" onClick={clearScenario}>
              Limpar cenário
            </button>
          </>
        }
      />

      <section className="filters-grid" aria-label="Parâmetros de simulação">
        <div className="field">
          <label htmlFor="simulation-start-date">Data inicial</label>
          <input id="simulation-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="simulation-end-date">Data final</label>
          <input id="simulation-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="simulation-center">Adicionar corte por centro</label>
          <div className="inline-actions">
            <select
              id="simulation-center"
              value={draftCenterId}
              onChange={(event) => setDraftCenterId(event.target.value ? Number(event.target.value) : "")}
            >
              {centers.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
            <button className="button" onClick={addCenterCut} type="button">
              + Centro
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="simulation-category">Adicionar corte por categoria</label>
          <div className="inline-actions">
            <select
              id="simulation-category"
              value={draftCategoryId}
              onChange={(event) => setDraftCategoryId(event.target.value ? Number(event.target.value) : "")}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="button" onClick={addCategoryCut} type="button">
              + Categoria
            </button>
          </div>
        </div>
      </section>

      <section className="grid panels-grid">
        <Panel title="Cortes por centro de custo" subtitle="Ajustes direcionados para estruturas organizacionais específicas.">
          {centerCuts.length === 0 ? (
            <EmptyState>Nenhum centro configurado.</EmptyState>
          ) : (
            <div className="cut-list">
              {centerCuts.map((cut, index) => {
                const centerName = centers.find((center) => center.id === cut.cost_center_id)?.name ?? "Centro";

                return (
                  <article className="cut-item" key={cut.cost_center_id}>
                    <div className="cut-item-head">
                      <strong>{centerName}</strong>
                      <button
                        className="button"
                        type="button"
                        onClick={() => setCenterCuts((current) => current.filter((item) => item.cost_center_id !== cut.cost_center_id))}
                      >
                        Remover
                      </button>
                    </div>

                    <div className="field">
                      <label>Corte percentual: {cut.percent_cut}%</label>
                      <input
                        type="range"
                        min={0}
                        max={60}
                        step={1}
                        value={cut.percent_cut}
                        onChange={(event) =>
                          setCenterCuts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, percent_cut: Number(event.target.value) } : item
                            )
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Corte absoluto (R$)</label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={cut.absolute_cut}
                        onChange={(event) =>
                          setCenterCuts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, absolute_cut: Number(event.target.value) } : item
                            )
                          )
                        }
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Cortes por categoria" subtitle="Ajustes para atacar grupos de despesa com maior potencial de redução.">
          {categoryCuts.length === 0 ? (
            <EmptyState>Nenhuma categoria configurada.</EmptyState>
          ) : (
            <div className="cut-list">
              {categoryCuts.map((cut, index) => {
                const categoryName = categories.find((category) => category.id === cut.category_id)?.name ?? "Categoria";

                return (
                  <article className="cut-item" key={cut.category_id}>
                    <div className="cut-item-head">
                      <strong>{categoryName}</strong>
                      <button
                        className="button"
                        type="button"
                        onClick={() => setCategoryCuts((current) => current.filter((item) => item.category_id !== cut.category_id))}
                      >
                        Remover
                      </button>
                    </div>

                    <div className="field">
                      <label>Redução percentual: {cut.percent_cut}%</label>
                      <input
                        type="range"
                        min={0}
                        max={60}
                        step={1}
                        value={cut.percent_cut}
                        onChange={(event) =>
                          setCategoryCuts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, percent_cut: Number(event.target.value) } : item
                            )
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Redução absoluta (R$)</label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={cut.absolute_cut}
                        onChange={(event) =>
                          setCategoryCuts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, absolute_cut: Number(event.target.value) } : item
                            )
                          )
                        }
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </section>

      <div className="inline-actions">
        <button className="button button-primary" type="button" onClick={executeSimulation} disabled={loading || !hasCuts}>
          {loading ? "Calculando cenário..." : "Executar simulação"}
        </button>
        {!hasCuts && <p className="helper-text">Adicione pelo menos um corte para executar.</p>}
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      {result && (
        <>
          <section className="grid metrics-grid">
            <KpiCard label="Baseline" value={money.format(result.baseline_total)} subtitle="Custo total de referência" />
            <KpiCard label="Projetado" value={money.format(result.projected_total)} subtitle="Após aplicação dos cortes" />
            <KpiCard label="Economia estimada" value={money.format(result.estimated_savings)} tone="positive" />
            <KpiCard label="Impacto percentual" value={`${result.impact_percent.toFixed(2)}%`} tone="positive" />
          </section>

          <section className="grid panels-grid">
            <Panel title="Ranking de impacto por centro" subtitle="Centros com maior economia absoluta no cenário projetado.">
              <div className="chart-shell">{centerImpactChart && <Bar data={centerImpactChart} />}</div>
            </Panel>

            <Panel title="Ranking de impacto por categoria" subtitle="Categorias priorizadas para execução do plano de redução.">
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Baseline</th>
                      <th>Projetado</th>
                      <th>Economia</th>
                      <th>Impacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.category_impact_ranking.map((item) => (
                      <tr key={item.entity_id}>
                        <td>{item.entity_name}</td>
                        <td>{money.format(item.baseline_amount)}</td>
                        <td>{money.format(item.projected_amount)}</td>
                        <td>
                          <span className="badge badge-positive">{money.format(item.estimated_savings)}</span>
                        </td>
                        <td>{item.impact_percent.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>
        </>
      )}
    </>
  );
}
