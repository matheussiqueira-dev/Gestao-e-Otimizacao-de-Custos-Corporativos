# Cost Intelligence Platform

Plataforma de Gestão e Otimização de Custos Corporativos com foco em CFOs, controllers e gestores financeiros.

## Objetivo
Permitir identificação, análise e otimização de custos operacionais com:
- visão por centro de custo, projeto e período;
- simulações interativas "e se...";
- alertas analíticos de desperdício e anomalias;
- ranking de impacto financeiro por área.

## Stack
- Frontend: Next.js + Chart.js
- Backend: FastAPI (Python)
- Banco: PostgreSQL
- Cache: Redis
- BI Layer: Apache Superset (embed)

## Arquitetura Geral
1. Dados financeiros entram no PostgreSQL em modelo relacional normalizado.
2. FastAPI fornece APIs de agregação, simulação, desperdício e anomalias.
3. Redis armazena respostas de consultas pesadas para reduzir latência.
4. Next.js consome APIs e exibe dashboards e simulações executivas.
5. Superset usa views SQL para dashboards analíticos e embed no frontend.

## Estrutura de Pastas
```text
.
├── backend
│   ├── app
│   │   ├── api/v1
│   │   ├── core
│   │   ├── db
│   │   ├── models
│   │   ├── repositories
│   │   ├── schemas
│   │   └── services
│   ├── tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend
│   ├── app
│   │   ├── dashboard
│   │   ├── simulacoes
│   │   └── bi
│   ├── lib
│   ├── Dockerfile
│   └── package.json
├── db
│   ├── schema.sql
│   ├── bi_views.sql
│   └── seeds/seed_data.sql
├── bi/superset
│   ├── README.md
│   ├── dashboard_blueprints.md
│   └── queries.sql
└── docker-compose.yml
```

## Modelo de Dados (PostgreSQL)
Principais tabelas:
- `cost_centers`: centros de custo.
- `projects`: projetos corporativos.
- `categories`: categorias hierárquicas de custo.
- `cost_entries`: lançamentos de custos com data, centro, projeto e categoria.
- `budget_entries`: orçamento planejado mensal.

Arquivo principal: `db/schema.sql`

Seeds com dados de exemplo + outliers para anomalia:
- `db/seeds/seed_data.sql`

Views para BI:
- `db/bi_views.sql`

## Backend (FastAPI)
Base URL: `http://localhost:8000`

Endpoints:
- `GET /health`
- `GET /api/v1/costs/aggregate`
- `GET /api/v1/costs/overview`
- `GET /api/v1/dimensions/cost-centers`
- `GET /api/v1/dimensions/projects`
- `GET /api/v1/dimensions/categories`
- `POST /api/v1/simulations/run`
- `GET /api/v1/waste/ranking`
- `GET /api/v1/anomalies/detect`

### Regras de Negócio
- Simulações combinam cortes percentuais e absolutos por centro/categoria.
- Ranking de desperdício compara período atual vs período anterior equivalente.
- Anomalias usam z-score com janela histórica por centro + categoria.
- Respostas de agregação/overview/waste/anomalias usam cache Redis.

## Frontend (Next.js + Chart.js)
Base URL: `http://localhost:3000`

Páginas:
- `/dashboard`: visão executiva, tendência temporal, distribuição e desperdícios.
- `/simulacoes`: simulação "e se..." com sliders e inputs.
- `/bi`: integração embed do Superset.

## BI Layer (Superset)
Diretório: `bi/superset`

Dashboards definidos:
1. Visão geral de custos
2. Tendência temporal
3. Maiores fontes de desperdício

Guia de configuração:
- `bi/superset/README.md`

## Como Rodar Localmente
### Opção A: Docker Compose (recomendado)
```bash
docker compose up --build
```

Com BI:
```bash
docker compose --profile bi up --build
```

Serviços:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Superset: `http://localhost:8088` (com profile `bi`)

### Opção B: Manual
1. Suba PostgreSQL e Redis.
2. Execute schema + seeds:
```bash
psql -h localhost -U cost_user -d costintel -f db/schema.sql
psql -h localhost -U cost_user -d costintel -f db/seeds/seed_data.sql
psql -h localhost -U cost_user -d costintel -f db/bi_views.sql
```
3. Backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
4. Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Testes
Backend:
```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Decisões Técnicas
- Arquitetura por camadas no backend (API -> Service -> Repository -> DB) para manutenção e evolução.
- Modelo SQL normalizado para evitar redundância e facilitar rastreabilidade de custos.
- Cache Redis para rotas analíticas com maior custo de processamento.
- Superset escolhido por ser open source e aderente a cenários corporativos com embed.
- Frontend orientado a decisão executiva: KPIs, rankings e simulações com feedback imediato.

