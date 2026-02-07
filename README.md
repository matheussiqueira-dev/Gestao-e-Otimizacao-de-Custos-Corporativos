# Cost Intelligence Platform

Plataforma fullstack para gestão e otimização de custos corporativos, com foco em decisões financeiras orientadas por dados para CFOs, controllers e lideranças de operações.

## Visão geral do projeto

O sistema integra quatro pilares:

1. Diagnóstico financeiro: consolidação e análise de custos por centro, projeto, categoria e período.
2. Simulação estratégica: cenários de redução com ranking de impacto e comparação entre estratégias.
3. Governança orçamentária: monitoramento de variação entre orçado e realizado.
4. Inteligência analítica: detecção de desperdícios, anomalias e oportunidades (quick wins).

## Arquitetura e decisões técnicas

A solução adota monorepo com monólito modular em camadas no backend e frontend desacoplado por contrato HTTP.

### Backend (FastAPI)

Arquitetura em camadas:

- `API`: roteamento, contratos e autorização por escopo.
- `Services`: regras de negócio por domínio (`cost`, `simulation`, `analytics`, `budget`).
- `Repository`: consultas SQL agregadas via SQLAlchemy.
- `Core`: configuração, cache, segurança, observabilidade e middlewares.

Principais decisões:

- Separação de serviços por responsabilidade (SOLID/DRY).
- API key com escopos (`costs:read`, `analytics:read`, `budgets:read`, `simulations:write`).
- Rate limiting por IP e hardening de headers HTTP.
- Cache Redis com chaves estáveis hashadas (SHA-256).
- Inicialização lazy da engine SQL para reduzir acoplamento de import e facilitar testes.

### Frontend (Next.js)

Arquitetura baseada em App Router com design system customizado:

- UI orientada a decisão executiva.
- Tokens visuais e componentes reutilizáveis.
- Fluxos avançados de dashboard e simulação.
- Integração direta com APIs versionadas do backend.

Principais decisões:

- Refactor completo de UI/UX com foco em hierarquia visual e acessibilidade.
- Filtros aplicáveis e compartilháveis por URL.
- Simulações com biblioteca de cenários no `localStorage`.
- Integração de features analíticas e orçamentárias no dashboard.

## Stack e tecnologias

### Frontend

- Next.js 14
- React 18
- TypeScript
- Chart.js + react-chartjs-2

### Backend

- FastAPI
- SQLAlchemy 2
- Pydantic v2
- PostgreSQL
- Redis
- Pytest

### Infra

- Docker Compose
- Superset (opcional via profile `bi`)

## Estrutura do projeto

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
│   └── requirements*.txt
├── frontend
│   ├── app
│   ├── components
│   ├── lib
│   └── package*.json
├── db
│   ├── schema.sql
│   ├── bi_views.sql
│   └── seeds/seed_data.sql
├── bi/superset
├── infra
└── docker-compose.yml
```

## APIs principais

Base: `http://localhost:8000/api/v1`

### Custos

- `GET /costs/aggregate`
- `GET /costs/overview`
- `GET /dimensions/cost-centers`
- `GET /dimensions/projects`
- `GET /dimensions/categories`

### Analytics

- `GET /waste/ranking`
- `GET /anomalies/detect`
- `GET /opportunities/quick-wins`

### Simulações

- `POST /simulations/run`
- `POST /simulations/compare`

### Orçamento

- `GET /budgets/variance`

## Features implementadas (impacto funcional)

1. Comparação de cenários de simulação:
- Seleção de múltiplos cenários e ranking automático do melhor plano.
- Reduz tempo de decisão entre alternativas de redução.

2. Governança orçamentária no dashboard:
- KPI e tabela de variação orçado vs realizado por centro.
- Aumenta capacidade de intervenção preventiva em desvios.

3. Segurança e confiabilidade backend:
- Escopo por endpoint, tratamento de erro padronizado, rate limiting e headers de proteção.
- Melhora postura para produção e rastreabilidade operacional.

4. Performance e escalabilidade:
- Cache padronizado com `get_or_set`, pool de conexão configurável e gzip.
- Menor latência e melhor throughput em rotas analíticas.

## Setup e execução

### Pré-requisitos

- Docker e Docker Compose
- Node.js 20+
- Python 3.12+
- PostgreSQL e Redis (para execução manual)

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
- Superset: `http://localhost:8088` (profile `bi`)

### Opção B: execução manual

### Banco e dados

```bash
psql -h localhost -U cost_user -d costintel -f db/schema.sql
psql -h localhost -U cost_user -d costintel -f db/seeds/seed_data.sql
psql -h localhost -U cost_user -d costintel -f db/bi_views.sql
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variáveis de ambiente

### Backend (`backend/.env`)

```env
APP_NAME=Cost Intelligence Platform
APP_VERSION=1.2.0
API_V1_PREFIX=/api/v1
DEBUG=true
ENVIRONMENT=development
DATABASE_URL=postgresql+psycopg://cost_user:cost_pass@localhost:5432/costintel
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_RECYCLE_SECONDS=1800
REDIS_URL=redis://localhost:6379/0
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_HOSTS=*
AUTH_ENABLED=false
API_KEY_HEADER_NAME=X-API-Key
API_KEY_VALUE=costintel-dev-key
API_KEYS_JSON={"costintel-dev-key":["*"]}
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=120
RATE_LIMIT_WINDOW_SECONDS=60
LOG_LEVEL=INFO
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPERSET_EMBED_URL=http://localhost:8088/superset/dashboard/1/?standalone=1
NEXT_PUBLIC_API_KEY=costintel-dev-key
```

## Testes e qualidade

### Backend

```bash
cd backend
python -m pytest
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

## Boas práticas adotadas

- Clean architecture por camadas no backend.
- SOLID e DRY com separação clara de responsabilidades.
- Contratos de API tipados e validação de domínio.
- Design system consistente com foco em acessibilidade.
- Documentação de decisões UX/UI em `frontend/UX_UI_DECISIONS.md`.
- Observabilidade com request id e logging contextual.
- Segurança incremental para cenários reais de produção.

## Melhorias futuras

- E2E frontend com Playwright e testes de contrato automatizados entre frontend/backend.
- RBAC completo com identidade de usuário (JWT/OAuth2).
- Métricas Prometheus + dashboard de SLI/SLO.
- Pipeline de migração de schema com Alembic.
- Processamento assíncrono para analytics pesados.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
