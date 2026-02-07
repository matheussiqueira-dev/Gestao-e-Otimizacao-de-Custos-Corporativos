"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";

import { EmptyState, HeroSection, KpiCard, Notice, Panel, Pill } from "@/components/ui";
import { listCategories, listCostCenters, runSimulation } from "@/lib/api";
import { ensureChartsRegistered } from "@/lib/chart";
import { getCurrentMonthWindow, isDateWindowValid } from "@/lib/date";
import { formatCompactPercent, formatCurrency } from "@/lib/format";
import { deleteScenario, listSavedScenarios, SavedScenario, saveScenario } from "@/lib/scenario-storage";
import { DimensionItem, SimulationCutCategory, SimulationCutCenter, SimulationResponse } from "@/lib/types";

ensureChartsRegistered();

type CenterCutEditorProps = {
  centers: DimensionItem[];
  cuts: SimulationCutCenter[];
  onChange: (next: SimulationCutCenter[]) => void;
};

type CategoryCutEditorProps = {
  categories: DimensionItem[];
  cuts: SimulationCutCategory[];
  onChange: (next: SimulationCutCategory[]) => void;
};

function CenterCutEditor({ centers, cuts, onChange }: CenterCutEditorProps) {
  return cuts.length === 0 ? (
    <EmptyState title="Nenhum centro configurado">Adicione pelo menos um centro para simular impacto.</EmptyState>
  ) : (
    <div className="cut-list">
      {cuts.map((cut, index) => {
        const centerName = centers.find((center) => center.id === cut.cost_center_id)?.name ?? "Centro";

        return (
          <article className="cut-item" key={cut.cost_center_id}>
            <div className="cut-item-head">
              <strong>{centerName}</strong>
              <button
                className="button"
                type="button"
                onClick={() => onChange(cuts.filter((item) => item.cost_center_id !== cut.cost_center_id))}
              >
                Remover
              </button>
            </div>

            <div className="field">
              <label htmlFor={`center-percent-${cut.cost_center_id}`}>Corte percentual</label>
              <div className="range-shell">
                <input
                  id={`center-percent-${cut.cost_center_id}`}
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={cut.percent_cut}
                  onChange={(event) =>
                    onChange(cuts.map((item, itemIndex) => (itemIndex === index ? { ...item, percent_cut: Number(event.target.value) } : item)))
                  }
                />
                <output>{formatCompactPercent(cut.percent_cut)}</output>
              </div>
            </div>

            <div className="field">
              <label htmlFor={`center-absolute-${cut.cost_center_id}`}>Corte absoluto (R$)</label>
              <input
                id={`center-absolute-${cut.cost_center_id}`}
                type="number"
                min={0}
                step={500}
                value={cut.absolute_cut}
                onChange={(event) =>
                  onChange(cuts.map((item, itemIndex) => (itemIndex === index ? { ...item, absolute_cut: Number(event.target.value) } : item)))
                }
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CategoryCutEditor({ categories, cuts, onChange }: CategoryCutEditorProps) {
  return cuts.length === 0 ? (
    <EmptyState title="Nenhuma categoria configurada">Adicione categorias para avaliar frentes de economia.</EmptyState>
  ) : (
    <div className="cut-list">
      {cuts.map((cut, index) => {
        const categoryName = categories.find((category) => category.id === cut.category_id)?.name ?? "Categoria";

        return (
          <article className="cut-item" key={cut.category_id}>
            <div className="cut-item-head">
              <strong>{categoryName}</strong>
              <button
                className="button"
                type="button"
                onClick={() => onChange(cuts.filter((item) => item.category_id !== cut.category_id))}
              >
                Remover
              </button>
            </div>

            <div className="field">
              <label htmlFor={`category-percent-${cut.category_id}`}>Redução percentual</label>
              <div className="range-shell">
                <input
                  id={`category-percent-${cut.category_id}`}
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={cut.percent_cut}
                  onChange={(event) =>
                    onChange(cuts.map((item, itemIndex) => (itemIndex === index ? { ...item, percent_cut: Number(event.target.value) } : item)))
                  }
                />
                <output>{formatCompactPercent(cut.percent_cut)}</output>
              </div>
            </div>

            <div className="field">
              <label htmlFor={`category-absolute-${cut.category_id}`}>Redução absoluta (R$)</label>
              <input
                id={`category-absolute-${cut.category_id}`}
                type="number"
                min={0}
                step={500}
                value={cut.absolute_cut}
                onChange={(event) =>
                  onChange(cuts.map((item, itemIndex) => (itemIndex === index ? { ...item, absolute_cut: Number(event.target.value) } : item)))
                }
              />
            </div>
          </article>
        );
      })}
    </div>
  );
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
  const [scenarioName, setScenarioName] = useState("");
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenarioFeedback, setScenarioFeedback] = useState<string | null>(null);

  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [dimensionsLoading, setDimensionsLoading] = useState(true);
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
      setDimensionsLoading(false);
    };

    loadDimensions().catch(() => {
      setDimensionsLoading(false);
      setError("Falha ao carregar dimensões para simulação.");
    });
    setSavedScenarios(listSavedScenarios());
  }, []);

  useEffect(() => {
    if (!scenarioFeedback) {
      return;
    }
    const timer = setTimeout(() => setScenarioFeedback(null), 2800);
    return () => clearTimeout(timer);
  }, [scenarioFeedback]);

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

  const applySavedScenario = (scenario: SavedScenario) => {
    setScenarioName(scenario.name);
    setStartDate(scenario.startDate);
    setEndDate(scenario.endDate);
    setCenterCuts(scenario.centerCuts);
    setCategoryCuts(scenario.categoryCuts);
    setScenarioFeedback(`Cenário "${scenario.name}" carregado.`);
  };

  const persistScenario = () => {
    const normalizedName = scenarioName.trim();
    if (!normalizedName) {
      setScenarioFeedback("Defina um nome para salvar o cenário.");
      return;
    }
    if (!hasCuts) {
      setScenarioFeedback("Adicione ao menos um corte antes de salvar.");
      return;
    }

    const next = saveScenario({
      name: normalizedName,
      startDate,
      endDate,
      centerCuts,
      categoryCuts
    });
    setSavedScenarios(next);
    setScenarioFeedback(`Cenário "${normalizedName}" salvo.`);
  };

  const removeScenario = (id: string) => {
    setSavedScenarios(deleteScenario(id));
    setScenarioFeedback("Cenário removido.");
  };

  const executeSimulation = async () => {
    if (!isDateWindowValid({ startDate, endDate })) {
      setError("A data inicial precisa ser menor ou igual à data final.");
      return;
    }

    if (!hasCuts) {
      setError("Adicione pelo menos um corte para executar a simulação.");
      return;
    }

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

  const exportCsv = () => {
    if (!result) {
      return;
    }

    const header = ["Tipo", "Entidade", "Baseline", "Projetado", "Economia", "Impacto%"];
    const centerRows = result.center_impact_ranking.map((item) => [
      "Centro",
      item.entity_name,
      item.baseline_amount,
      item.projected_amount,
      item.estimated_savings,
      item.impact_percent
    ]);
    const categoryRows = result.category_impact_ranking.map((item) => [
      "Categoria",
      item.entity_name,
      item.baseline_amount,
      item.projected_amount,
      item.estimated_savings,
      item.impact_percent
    ]);

    const rows = [header, ...centerRows, ...categoryRows];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "simulacao-custos.csv";
    link.click();
    window.URL.revokeObjectURL(url);
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
          backgroundColor: "#0f4c81"
        }
      ]
    };
  }, [result]);

  return (
    <>
      <HeroSection
        eyebrow="Simulação estratégica"
        title="Planeje, simule e salve estratégias de redução de custos"
        description="Defina cortes percentuais e absolutos por centro/categoria, rode o cenário e transforme resultados em plano executável."
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
        aside={
          <div className="hero-score">
            <p className="hero-score-label">Status do cenário</p>
            <div className="hero-score-grid">
              <div>
                <strong>{centerCuts.length}</strong>
                <span>centros configurados</span>
              </div>
              <div>
                <strong>{categoryCuts.length}</strong>
                <span>categorias configuradas</span>
              </div>
              <div>
                <strong>{savedScenarios.length}</strong>
                <span>cenários salvos</span>
              </div>
            </div>
          </div>
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
              disabled={dimensionsLoading}
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
              disabled={dimensionsLoading}
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

        <div className="field">
          <label htmlFor="scenario-name">Nome do cenário</label>
          <input
            id="scenario-name"
            type="text"
            placeholder="Ex.: Redução operacional Q2"
            value={scenarioName}
            onChange={(event) => setScenarioName(event.target.value)}
          />
        </div>

        <div className="filters-actions">
          <button type="button" className="button button-secondary" onClick={persistScenario}>
            Salvar cenário
          </button>
          {scenarioFeedback && <p className="helper-text">{scenarioFeedback}</p>}
        </div>
      </section>

      <section className="grid panels-grid">
        <Panel title="Cortes por centro de custo" subtitle="Ajustes direcionados para estruturas organizacionais específicas.">
          <CenterCutEditor centers={centers} cuts={centerCuts} onChange={setCenterCuts} />
        </Panel>

        <Panel title="Cortes por categoria" subtitle="Ajustes para atacar grupos de despesa com maior potencial de redução.">
          <CategoryCutEditor categories={categories} cuts={categoryCuts} onChange={setCategoryCuts} />
        </Panel>
      </section>

      <section className="grid panels-grid">
        <Panel title="Biblioteca de cenários salvos" subtitle="Reaproveite estratégias anteriores e acelere ciclos de decisão.">
          {savedScenarios.length === 0 ? (
            <EmptyState title="Nenhum cenário salvo">
              Salve um cenário para reutilizar rapidamente em próximas simulações.
            </EmptyState>
          ) : (
            <div className="saved-scenario-list">
              {savedScenarios.map((scenario) => (
                <article className="saved-scenario-item" key={scenario.id}>
                  <div>
                    <h3>{scenario.name}</h3>
                    <p>
                      {scenario.startDate} a {scenario.endDate}
                    </p>
                    <div className="inline-tags">
                      <Pill>{scenario.centerCuts.length} centros</Pill>
                      <Pill>{scenario.categoryCuts.length} categorias</Pill>
                    </div>
                  </div>
                  <div className="inline-actions">
                    <button className="button" type="button" onClick={() => applySavedScenario(scenario)}>
                      Carregar
                    </button>
                    <button className="button button-danger" type="button" onClick={() => removeScenario(scenario.id)}>
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <div className="inline-actions simulation-actions">
        <button className="button button-primary" type="button" onClick={executeSimulation} disabled={loading}>
          {loading ? "Calculando cenário..." : "Executar simulação"}
        </button>
        {!hasCuts && <p className="helper-text">Adicione pelo menos um corte para executar.</p>}
        {result && (
          <button className="button" type="button" onClick={exportCsv}>
            Exportar resultado (CSV)
          </button>
        )}
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      {result && (
        <>
          <section className="grid metrics-grid">
            <KpiCard label="Baseline" value={formatCurrency(result.baseline_total)} subtitle="Custo total de referência" />
            <KpiCard label="Projetado" value={formatCurrency(result.projected_total)} subtitle="Após aplicação dos cortes" />
            <KpiCard label="Economia estimada" value={formatCurrency(result.estimated_savings)} tone="positive" />
            <KpiCard label="Impacto percentual" value={formatCompactPercent(result.impact_percent)} tone="positive" />
          </section>

          <section className="grid panels-grid">
            <Panel title="Ranking de impacto por centro" subtitle="Centros com maior economia absoluta no cenário projetado.">
              <div className="chart-shell">{centerImpactChart && <Bar data={centerImpactChart} />}</div>
            </Panel>

            <Panel title="Ranking de impacto por categoria" subtitle="Categorias priorizadas para execução do plano de redução.">
              <div className="table-shell" role="region" aria-label="Tabela de impacto por categoria">
                <table>
                  <caption className="table-caption">Resumo consolidado das categorias no cenário simulado.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Categoria</th>
                      <th scope="col">Baseline</th>
                      <th scope="col">Projetado</th>
                      <th scope="col">Economia</th>
                      <th scope="col">Impacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.category_impact_ranking.map((item) => (
                      <tr key={item.entity_id}>
                        <td>{item.entity_name}</td>
                        <td>{formatCurrency(item.baseline_amount)}</td>
                        <td>{formatCurrency(item.projected_amount)}</td>
                        <td>
                          <span className="badge badge-positive">{formatCurrency(item.estimated_savings)}</span>
                        </td>
                        <td>{formatCompactPercent(item.impact_percent)}</td>
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
