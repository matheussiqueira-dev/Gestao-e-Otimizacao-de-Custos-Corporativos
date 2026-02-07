# Cost Intelligence Platform - Backend

Backend da plataforma de gestão e otimização de custos corporativos, construído para cenários reais de governança financeira com foco em robustez, segurança e escalabilidade.

## Visão geral do backend

O backend expõe APIs para:

- Consolidação de custos por período, centro, projeto e categoria.
- Simulações de redução com impacto financeiro estimado.
- Detecção de desperdícios, anomalias e oportunidades (quick wins).
- Governança orçamentária com análise de variação entre orçado e realizado.
- Comparação de múltiplos cenários de simulação para priorização executiva.

## Domínio e regras principais

- O custo é registrado por `CostEntry` (centro de custo, projeto, categoria, data de referência e valor).
- Simulações aceitam cortes percentuais e absolutos por centro/categoria.
- Simulações exigem pelo menos um corte válido e não aceitam entidades duplicadas.
- Analytics compara períodos equivalentes e classifica maior desperdício por variação positiva.
- Orçamento (`BudgetEntry`) é consolidado por mês e comparado com realizado para alertas de desvio.

## Arquitetura adotada

Arquitetura modular em camadas (monólito modular):

1. `API` (FastAPI): rotas, contratos HTTP e autorização.
2. `Services`: regras de negócio e orquestração de casos de uso.
3. `Repository` (SQLAlchemy): acesso ao banco e consultas agregadas.
4. `Core`: configuração, observabilidade, cache, segurança e middlewares.

## Tecnologias utilizadas

- Python 3.12+
- FastAPI
- SQLAlchemy 2
- PostgreSQL
- Redis
- Pydantic v2
- Uvicorn
- Pytest

## Estrutura do projeto

```text
backend
├── app
│   ├── api
│   │   ├── dependencies.py
│   │   ├── router.py
│   │   └── v1
│   │       ├── routes_analytics.py
│   │       ├── routes_budgets.py
│   │       ├── routes_costs.py
│   │       └── routes_simulations.py
│   ├── core
│   │   ├── cache.py
│   │   ├── config.py
│   │   ├── exceptions.py
│   │   ├── observability.py
│   │   └── security.py
│   ├── db
│   │   ├── init_db.py
│   │   └── session.py
│   ├── models
│   ├── repositories
│   │   └── cost_repository.py
│   ├── schemas
│   │   ├── analytics.py
│   │   ├── budgets.py
│   │   ├── costs.py
│   │   ├── opportunities.py
│   │   └── simulations.py
│   ├── services
│   │   ├── analytics_service.py
│   │   ├── budget_service.py
│   │   ├── cost_service.py
│   │   └── simulation_service.py
│   └── main.py
└── tests
    ├── test_analytics_service.py
    ├── test_budget_service.py
    ├── test_security.py
    └── test_simulation_service.py
```

## Segurança e confiabilidade

### Autenticação e autorização

- API Key opcional por ambiente (`AUTH_ENABLED`).
- Autorização por escopo (`require_scope`) por endpoint.
- Comparação de chave com `secrets.compare_digest` (mitiga timing attack).
- Suporte a múltiplas chaves e escopos via `API_KEYS_JSON`.

Escopos usados:

- `costs:read`
- `analytics:read`
- `budgets:read`
- `simulations:write`

### Proteções e hardening

- `TrustedHostMiddleware` para host allowlist.
- Rate limiting por IP (`RateLimitMiddleware`).
- Security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Content-Security-Policy`
- Tratamento global de exceções com `request_id` para rastreabilidade.

### Observabilidade

- Request ID propagado em logs e resposta (`X-Request-ID`).
- Logging contextual por request.
- Alertas de latência alta por request no middleware.

## Performance e escalabilidade

- Pool de conexões SQL configurável (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_RECYCLE_SECONDS`).
- Cache Redis com chaves estáveis hashadas (SHA-256).
- `get_or_set_json` para evitar repetição de lógica de cache.
- GZip middleware para redução de payload.
- Filtros defensivos com limite de cardinalidade para evitar consultas abusivas.

## API (v1)

Base path: `/api/v1`

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
- `POST /simulations/compare` (nova feature)

### Orçamento

- `GET /budgets/variance` (nova feature)

## Setup e execução

### Variáveis de ambiente (`backend/.env`)

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
API_KEYS_JSON={"costintel-dev-key": ["*"]}

RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=120
RATE_LIMIT_WINDOW_SECONDS=60

LOG_LEVEL=INFO
```

### Execução local

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Inicialização do banco

```bash
python -m app.db.init_db
```

ou via SQL do monorepo:

```bash
psql -h localhost -U cost_user -d costintel -f db/schema.sql
psql -h localhost -U cost_user -d costintel -f db/seeds/seed_data.sql
```

### Testes

```bash
cd backend
python -m pytest
```

## Boas práticas e padrões aplicados

- Separação clara por camada (API, serviços, repositório, core).
- Contratos tipados com Pydantic e validações de domínio.
- DRY em cache, composição de query SQL e validação de filtros.
- Tratamento de erro consistente com payload padronizado.
- Princípio de menor privilégio por escopo de rota.
- Testes unitários para regras críticas de simulação, analytics, orçamento e segurança.

## Melhorias futuras

- Persistência de cenários de simulação (versionamento e auditoria).
- RBAC completo com identidade de usuário (JWT/OAuth2).
- Métricas Prometheus e dashboards operacionais (SLO/SLI).
- Workers assíncronos para cálculos analíticos pesados.
- Alembic para versionamento de schema e migrações automatizadas.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
