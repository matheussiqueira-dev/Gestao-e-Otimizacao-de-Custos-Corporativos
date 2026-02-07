# Dashboards Prontos (Blueprint)

## 1) Visao Geral de Custos
- KPI 1: `SUM(total_amount)` no periodo.
- KPI 2: custo medio mensal.
- Donut: distribuicao por `cost_center`.
- Tabela: top 10 combinacoes `cost_center + category`.

Fonte sugerida: `vw_costs_monthly`.

## 2) Tendencia Temporal
- Linha: `month_ref` x `SUM(total_amount)`.
- Linha empilhada: `month_ref` x `SUM(total_amount)` por `category`.
- Filtro global: periodo, centro de custo, projeto.

Fonte sugerida: `vw_costs_monthly`.

## 3) Maiores Fontes de Desperdicio
- Barras horizontais: maiores `delta_from_baseline` positivos.
- Heatmap: `cost_center` x `category` com intensidade por `delta_from_baseline`.
- Tabela detalhada com drill-down mensal.

Fonte sugerida: `vw_waste_signals`.

