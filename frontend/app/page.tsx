import Link from "next/link";

import { HeroSection, Panel, Pill } from "@/components/ui";

export default function HomePage() {
  return (
    <>
      <HeroSection
        eyebrow="Plataforma corporativa"
        title="Centro de comando para decisões de custos em ritmo executivo"
        description="Unifique diagnóstico de despesas, simulações de redução e governança analítica em uma única jornada para CFOs, controllers e líderes financeiros."
        actions={
          <>
            <Link href="/dashboard" className="button button-primary">
              Abrir Dashboard Executivo
            </Link>
            <Link href="/simulacoes" className="button button-secondary">
              Modelar cenário de economia
            </Link>
          </>
        }
        aside={
          <div className="hero-score">
            <p className="hero-score-label">Métricas-chave da plataforma</p>
            <div className="hero-score-grid">
              <div>
                <strong>4</strong>
                <span>módulos integrados</span>
              </div>
              <div>
                <strong>3</strong>
                <span>camadas analíticas</span>
              </div>
              <div>
                <strong>1</strong>
                <span>fonte única de decisão</span>
              </div>
            </div>
          </div>
        }
      />

      <section className="grid summary-grid">
        <Panel
          title="Monitoramento orientado por impacto"
          subtitle="KPIs financeiros, tendência temporal e desperdícios consolidados para priorizar iniciativas de redução."
        >
          <p className="helper-text">Visão contínua da saúde de custos com filtros por período, centro e projeto.</p>
          <div className="inline-tags">
            <Pill tone="positive">Visibilidade executiva</Pill>
            <Pill>Diagnóstico rápido</Pill>
          </div>
        </Panel>

        <Panel
          title="Simulação com critérios reais"
          subtitle="Combine cortes percentuais e absolutos por centro e categoria para projetar impacto antes da execução."
        >
          <p className="helper-text">Construa cenários, salve estratégias e compare planos de ação em minutos.</p>
          <div className="inline-tags">
            <Pill tone="positive">Planejamento proativo</Pill>
            <Pill>Decisão baseada em impacto</Pill>
          </div>
        </Panel>

        <Panel
          title="Camada BI para escala analítica"
          subtitle="Integração com Apache Superset para análise exploratória e dashboards compartilháveis."
        >
          <p className="helper-text">Conecta operações e gestão em um ecossistema único de inteligência financeira.</p>
          <div className="inline-tags">
            <Pill>Escala analítica</Pill>
            <Pill tone="positive">Colaboração entre áreas</Pill>
          </div>
        </Panel>
      </section>

      <section className="timeline-card">
        <h2>Fluxo recomendado de uso</h2>
        <ol>
          <li>Diagnostique tendência e variabilidade no Dashboard.</li>
          <li>Simule cortes e priorize as maiores alavancas de economia.</li>
          <li>Leve análises avançadas para BI e acompanhe execução semanal.</li>
        </ol>
      </section>
    </>
  );
}
