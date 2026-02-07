# Cost Intelligence Platform - Frontend

Aplicação web executiva para gestão e otimização de custos corporativos, com foco em tomada de decisão financeira baseada em dados.

## Visão geral do frontend

O frontend foi projetado para apoiar CFOs, controllers e lideranças financeiras em três fluxos principais:

1. Monitoramento executivo de custos (`/dashboard`): visão consolidada de tendência, distribuição, desperdícios, anomalias e quick wins.
2. Simulação de cenários (`/simulacoes`): planejamento de cortes por centro/categoria com impacto estimado e ranking de prioridade.
3. Camada analítica (`/bi`): integração com Apache Superset para exploração avançada e governança recorrente.

## Stack e tecnologias utilizadas

- Next.js 14 (App Router)
- React 18
- TypeScript (strict)
- Chart.js + react-chartjs-2
- CSS global com design tokens e componentes reutilizáveis

## Arquitetura frontend

### Organização

```text
frontend
├── app
│   ├── bi/page.tsx
│   ├── dashboard/page.tsx
│   ├── simulacoes/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components
│   ├── top-navigation.tsx
│   └── ui.tsx
├── lib
│   ├── api.ts
│   ├── chart.ts
│   ├── date.ts
│   ├── format.ts
│   ├── scenario-storage.ts
│   └── types.ts
├── package.json
└── tsconfig.json
```

### Padrões adotados

- UI componentizada em `components/ui.tsx` (Hero, Panel, KPI, Notice, Empty State, Pill).
- Tokens visuais centralizados em `app/globals.css` para consistência de cores, espaçamentos, estados e responsividade.
- Camada de API isolada em `lib/api.ts` com timeout, tratamento de erro e headers padronizados.
- Utilitários de data/formatação em `lib/date.ts` e `lib/format.ts` para reduzir duplicação.

## Melhorias implementadas nesta refatoração

### 1) UI/UX (refactor completo)

- Redesign completo da interface com nova hierarquia visual e identidade mais executiva.
- Navegação mobile acessível com menu colapsável.
- Hero sections com contexto operacional por módulo.
- Superfícies, cards, tabelas e formulários padronizados por design system.
- Melhorias de leitura, contraste, feedback visual e estados vazios.

### 2) Performance e escalabilidade

- Remoção de duplicação de lógica de datas e formatação.
- Registro de Chart.js centralizado (`lib/chart.ts`) para evitar repetição.
- Fluxo de filtros no dashboard otimizado com ação explícita de “Aplicar filtros” (menos requisições desnecessárias).
- Refactor da página de simulação com componentes internos reutilizáveis para edição de cortes.

### 3) Acessibilidade e usabilidade

- `skip link` para navegação por teclado.
- `aria-label`, `aria-live`, `caption` e `scope` em tabelas/feedbacks críticos.
- Estados de foco visíveis em controles interativos.
- Melhor responsividade para desktop e mobile.

### 4) Novas funcionalidades

- Dashboard:
  - Comparação automática com período anterior.
  - Compartilhamento de visão por URL (filtros persistidos em query string).
  - Novo filtro por categoria.
- Simulações:
  - Biblioteca de cenários salva no `localStorage` (salvar, carregar e excluir).
  - Exportação de resultado para CSV.
- BI:
  - Status visual de integração do Superset.
  - Ação direta para abrir dashboard em nova aba.

## SEO técnico

- Metadados globais melhorados em `app/layout.tsx`:
  - `title` com template
  - `description`
  - `openGraph`
  - `twitter`
  - `robots`
  - `canonical`

## Instruções de setup e execução

### Pré-requisitos

- Node.js 20+
- npm 10+
- Backend da plataforma disponível (FastAPI)

### Variáveis de ambiente (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPERSET_EMBED_URL=http://localhost:8088/superset/dashboard/1/?standalone=1
NEXT_PUBLIC_API_KEY=costintel-dev-key
```

### Instalação

```bash
cd frontend
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Aplicação disponível em `http://localhost:3000`.

### Build de produção

```bash
npm run build
npm run start
```

### Qualidade

```bash
npm run lint
npm run build
```

## Boas práticas adotadas

- Componentização com responsabilidade única.
- Reutilização de utilitários para evitar divergência de regra.
- Tratamento defensivo de erros de rede e timeout.
- Estrutura visual baseada em tokens e semântica consistente.
- Foco em acessibilidade e navegabilidade por teclado.

## Melhorias futuras

- Testes E2E com Playwright para fluxos críticos.
- Internacionalização (i18n) para múltiplos idiomas.
- Persistência server-side de cenários com versionamento.
- Camada de autenticação/autorização por perfil (RBAC).
- Monitoramento de Web Vitals e orçamento de performance por rota.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
