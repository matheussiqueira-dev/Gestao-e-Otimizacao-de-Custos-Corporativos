# Superset BI Layer

Este diretório concentra a camada de BI baseada em Apache Superset.

## Pré-requisitos
- Superset rodando (via `docker-compose` deste projeto ou instalação própria).
- Banco PostgreSQL com `db/schema.sql`, `db/seeds/seed_data.sql` e `db/bi_views.sql` aplicados.

## Passos de configuração
1. No Superset, crie a conexão para PostgreSQL:
   - URI: `postgresql://cost_user:cost_pass@postgres:5432/costintel`
2. Importe os datasets a partir das views:
   - `vw_costs_monthly`
   - `vw_waste_signals`
3. Monte os dashboards descritos em `dashboard_blueprints.md`.
4. Gere o link de embed do dashboard principal e configure no frontend:
   - `NEXT_PUBLIC_SUPERSET_EMBED_URL=http://localhost:8088/superset/dashboard/<id>/?standalone=1`

## Observação
Para ambientes corporativos, habilite JWT/SSO no Superset e use embedding assinado.

