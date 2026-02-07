import Link from "next/link";

import { HeroSection, Panel } from "@/components/ui";

export default function HomePage() {
  return (
    <>
      <HeroSection
        eyebrow="Plataforma corporativa"
        title="Gestão e otimização de custos com visão executiva em tempo real"
        description="Centralize análise de custos, simulações de redução e inteligência de desperdícios para acelerar decisões de CFOs e controllers com mais previsibilidade financeira."
        actions={
          <>
            <Link href="/dashboard" className="button button-primary">
              Abrir Dashboard Executivo
            </Link>
            <Link href="/simulacoes" className="button button-secondary">
              Criar Simulação &quot;E se...&quot;
            </Link>
          </>
        }
      />

      <section className="grid summary-grid">
        <Panel
          title="Monitoramento orientado por impacto"
          subtitle="KPIs financeiros, tendência temporal e desperdícios consolidados em uma única visão para priorização de iniciativas."
        >
          <p className="helper-text">Reduz tempo de diagnóstico e melhora a governança dos custos operacionais.</p>
        </Panel>

        <Panel
          title="Simulação com critérios reais"
          subtitle="Combine cortes percentuais e absolutos por centro e categoria para construir cenários com estimativa de economia."
        >
          <p className="helper-text">As projeções retornam ranking de impacto para apoiar o plano de ação.</p>
        </Panel>

        <Panel
          title="Camada BI para escala analítica"
          subtitle="Integração com Apache Superset para dashboards compartilháveis, análise exploratória e execução orientada por dados."
        >
          <p className="helper-text">Mantém visão operacional e visão executiva no mesmo ecossistema.</p>
        </Panel>
      </section>
    </>
  );
}
