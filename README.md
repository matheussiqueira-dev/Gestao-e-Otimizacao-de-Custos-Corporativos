# Cost Intelligence Platform

Plataforma fullstack para gestão, análise e otimização de custos corporativos com foco em decisões executivas de finanças.

## Visão Geral

O sistema foi desenhado para CFOs, controllers e lideranças financeiras que precisam:
- monitorar custos por centro, projeto, categoria e período;
- detectar desperdícios e anomalias com critérios analíticos;
- simular cenários de redução com impacto financeiro estimado;
- priorizar oportunidades de economia com score de oportunidade (`quick wins`);
- consolidar exploração analítica avançada via Apache Superset.

## Objetivos de Negócio

- Reduzir tempo entre diagnóstico financeiro e tomada de decisão.
- Aumentar previsibilidade de custos operacionais.
- Padronizar governança de eficiência financeira entre áreas.
- Viabilizar execução orientada por impacto econômico real.

## Arquitetura

### Visão de Alto Nível

1. PostgreSQL armazena dados transacionais e históricos financeiros.
2. FastAPI expõe APIs analíticas e de simulação (camadas API -> Service -> Repository).
3. Redis reduz latência de consultas analíticas via cache com chave estável.
4. Next.js oferece experiência executiva (dashboard, simulações e BI embed).
5. Superset entrega análise exploratória e dashboards compartilháveis.

### Decisões Técnicas

- **Backend em camadas** para separação de responsabilidades e maior testabilidade.
- **Validação de contratos com Pydantic** para consistência de entrada/saída.
- **Cache Redis opcional** para throughput em rotas intensivas.
- **Segurança incremental** com API key opcional, cabeçalhos HTTP defensivos e validação de payload.
- **Observabilidade mínima de produção** com request id, logging contextual e tratamento global de exceções.
- **Frontend orientado a decisão** com design system, responsividade e foco em legibilidade executiva.

## Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Chart.js
- **Backend:** FastAPI, SQLAlchemy 2, Pydantic v2
- **Banco:** PostgreSQL 16
- **Cache:** Redis 7
- **BI:** Apache Superset
- **Infra local:** Docker Compose
- **Qualidade:** Pytest, ESLint (Next)

## Estrutura do Projeto

```text
.
├── backend
│   ├── app
│   │   ├── api
│   │   ├── core
│   │   ├── db
│   │   ├── models
│   │   ├── repositories
│   │   ├── schemas
│   │   └── services
│   ├── tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend
│   ├── app
│   ├── components
│   ├── lib
│   └── Dockerfile
├── db
│   ├── schema.sql
│   ├── bi_views.sql
│   └── seeds/seed_data.sql
├── bi/superset
├── infra
└── docker-compose.yml
```

## APIs Principais

Base URL: `http://localhost:8000`

- `GET /health`
- `GET /api/v1/costs/aggregate`
- `GET /api/v1/costs/overview`
- `GET /api/v1/dimensions/cost-centers`
- `GET /api/v1/dimensions/projects`
- `GET /api/v1/dimensions/categories`
- `POST /api/v1/simulations/run`
- `GET /api/v1/waste/ranking`
- `GET /api/v1/anomalies/detect`
- `GET /api/v1/opportunities/quick-wins`

## Segurança e Observabilidade

- API key opcional (via `AUTH_ENABLED=true` + `X-API-Key`).
- Validação de ranges e payloads no backend.
- Cabeçalhos defensivos (`X-Content-Type-Options`, `Referrer-Policy`).
- Request ID por requisição para correlação de logs.
- Tratamento global de exceções com resposta consistente.

## Variáveis de Ambiente

### Backend (`backend/.env`)

```env
APP_NAME=Cost Intelligence Platform
APP_VERSION=1.1.0
API_V1_PREFIX=/api/v1
DEBUG=true
ENVIRONMENT=development
DATABASE_URL=postgresql+psycopg://cost_user:cost_pass@localhost:5432/costintel
REDIS_URL=redis://localhost:6379/0
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_HOSTS=*
AUTH_ENABLED=false
API_KEY_HEADER_NAME=X-API-Key
API_KEY_VALUE=costintel-dev-key
LOG_LEVEL=INFO
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPERSET_EMBED_URL=http://localhost:8088/superset/dashboard/1/?standalone=1
NEXT_PUBLIC_API_KEY=costintel-dev-key
```

## Como Executar

### Opção A: Docker Compose (recomendado)

```bash
docker compose up --build -d
```

Com BI/Superset:

```bash
docker compose --profile bi up --build -d
```

Serviços:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Superset: `http://localhost:8088` (com profile `bi`)
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### Opção B: Execução manual

1. Subir PostgreSQL e Redis.
2. Aplicar SQL base:

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

## Testes e Qualidade

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

## Deploy (Diretrizes)

- Executar migrações de banco antes da troca de versão.
- Publicar backend e frontend com variáveis segregadas por ambiente.
- Habilitar `AUTH_ENABLED=true` em ambientes não-locais.
- Integrar logs com stack centralizada (ex.: OpenSearch, Datadog, Grafana).
- Monitorar latência e acerto de cache das rotas analíticas.

## Boas Práticas Adotadas

- Princípios de modularidade e responsabilidade por camada.
- Padronização de contratos de API e validação de dados.
- Design system com consistência visual e acessibilidade base.
- Componentização de UI para reuso e manutenção.
- Testes unitários para regras críticas de simulação e analytics.

## Melhorias Futuras

- Autenticação RBAC (JWT/OAuth2) com perfis por papel financeiro.
- Pipeline de migrações com Alembic e versionamento de schema.
- Testes E2E de frontend com Playwright.
- Painel de observabilidade (SLI/SLO) para APIs críticas.
- Alertas proativos (email/slack/webhook) para anomalias.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
