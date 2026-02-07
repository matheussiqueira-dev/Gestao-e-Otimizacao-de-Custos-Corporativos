# Arquitetura Incremental

## Fase 1 - Fundação
- Monorepo com módulos: `backend`, `frontend`, `db`, `bi`.
- Definição de stack obrigatória.
- Padronização de variáveis de ambiente e Docker.

## Fase 2 - Dados
- Modelo relacional normalizado em `db/schema.sql`.
- Seeds sintéticos em `db/seeds/seed_data.sql`.
- Views analíticas para BI em `db/bi_views.sql`.

## Fase 3 - Backend
- API FastAPI por camadas.
- Endpoints de agregação, simulação, desperdício e anomalias.
- Cache Redis para consultas pesadas.

## Fase 4 - Frontend
- Dashboard executivo com filtros e gráficos interativos.
- Tela de simulação com sliders e inputs.
- Página de integração BI embed.

## Fase 5 - BI
- Blueprint de dashboards no Superset.
- Queries de apoio e guia de embedding.

