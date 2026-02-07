"use client";

import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";

import { listCategories, listCostCenters, runSimulation } from "@/lib/api";
import { DimensionItem, SimulationCutCategory, SimulationCutCenter, SimulationResponse } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function getCurrentMonthWindow() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { startDate, endDate };
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

  const run = async () => {
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
          backgroundColor: "#30d5c8"
        }
      ]
    };
  }, [result]);

  return (
    <section>
      <div className="hero">
        <h1>Simulações Interativas "E se..."</h1>
        <p>Defina cortes percentuais e absolutos por centro de custo e categoria para projetar economia e priorizar iniciativas de eficiência.</p>
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
          <label>Adicionar corte por centro</label>
          <div className="inline-actions">
            <select value={draftCenterId} onChange={(event) => setDraftCenterId(event.target.value ? Number(event.target.value) : "")}>
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
          <label>Adicionar corte por categoria</label>
          <div className="inline-actions">
            <select value={draftCategoryId} onChange={(event) => setDraftCategoryId(event.target.value ? Number(event.target.value) : "")}>
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
      </div>

      <div className="grid panels-2">
        <article className="panel">
          <h2>Cortes por centro de custo</h2>
          <div className="cut-list">
            {centerCuts.length === 0 && <span>Nenhum centro configurado.</span>}
            {centerCuts.map((cut, index) => {
              const centerName = centers.find((center) => center.id === cut.cost_center_id)?.name ?? "Centro";
              return (
                <div className="cut-item" key={cut.cost_center_id}>
                  <div className="cut-item-header">
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
                      step={1000}
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
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <h2>Cortes por categoria</h2>
          <div className="cut-list">
            {categoryCuts.length === 0 && <span>Nenhuma categoria configurada.</span>}
            {categoryCuts.map((cut, index) => {
              const categoryName = categories.find((category) => category.id === cut.category_id)?.name ?? "Categoria";
              return (
                <div className="cut-item" key={cut.category_id}>
                  <div className="cut-item-header">
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
                      step={1000}
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
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <div className="inline-actions" style={{ marginTop: "1rem" }}>
        <button className="button secondary" type="button" onClick={run} disabled={loading}>
          {loading ? "Calculando..." : "Rodar Simulação"}
        </button>
      </div>

      {error && (
        <div className="panel" style={{ marginTop: "1rem", borderColor: "rgba(243, 118, 103, 0.6)" }}>
          <strong>Erro:</strong> {error}
        </div>
      )}

      {result && (
        <>
          <div className="grid kpis">
            <article className="kpi">
              <p className="kpi-label">Baseline</p>
              <p className="kpi-value">{money.format(result.baseline_total)}</p>
            </article>
            <article className="kpi">
              <p className="kpi-label">Total projetado</p>
              <p className="kpi-value">{money.format(result.projected_total)}</p>
            </article>
            <article className="kpi">
              <p className="kpi-label">Economia estimada</p>
              <p className="kpi-value" style={{ color: "#30d5c8" }}>
                {money.format(result.estimated_savings)}
              </p>
            </article>
            <article className="kpi">
              <p className="kpi-label">Impacto percentual</p>
              <p className="kpi-value">{result.impact_percent.toFixed(2)}%</p>
            </article>
          </div>

          <div className="grid panels-2">
            <article className="panel">
              <h2>Ranking de impacto por centro</h2>
              <div className="chart-container">{centerImpactChart && <Bar data={centerImpactChart} />}</div>
            </article>
            <article className="panel">
              <h2>Ranking de impacto por categoria</h2>
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
                      <td style={{ color: "#30d5c8" }}>{money.format(item.estimated_savings)}</td>
                      <td>{item.impact_percent.toFixed(2)}%</td>
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

