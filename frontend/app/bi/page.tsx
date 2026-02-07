import { EmptyState, HeroSection, Panel } from "@/components/ui";

const supersetEmbedUrl = process.env.NEXT_PUBLIC_SUPERSET_EMBED_URL;
const hasEmbed = Boolean(supersetEmbedUrl);

export default function BIPage() {
  return (
    <>
      <HeroSection
        eyebrow="BI Layer"
        title="Camada analítica para governança de custos em escala"
        description="Use o Superset para aprofundar análises, compartilhar painéis por área e acompanhar execução de planos financeiros."
        aside={
          <div className="hero-score">
            <p className="hero-score-label">Status da integração</p>
            <div className="hero-score-grid">
              <div>
                <strong>{hasEmbed ? "On" : "Off"}</strong>
                <span>embed Superset</span>
              </div>
              <div>
                <strong>3</strong>
                <span>dashboards recomendados</span>
              </div>
              <div>
                <strong>1</strong>
                <span>hub analítico central</span>
              </div>
            </div>
          </div>
        }
      />

      <section className="grid panels-grid">
        <Panel title="Dashboards recomendados" subtitle="Conjunto mínimo para rotina de governança financeira semanal.">
          <div className="table-shell">
            <table>
              <caption className="table-caption">Painéis sugeridos para ritos de gestão financeira.</caption>
              <thead>
                <tr>
                  <th scope="col">Dashboard</th>
                  <th scope="col">Decisão suportada</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Visão geral de custos</td>
                  <td>Controle de execução orçamentária por dimensão.</td>
                </tr>
                <tr>
                  <td>Tendência temporal</td>
                  <td>Antecipação de sazonalidade e desvios relevantes.</td>
                </tr>
                <tr>
                  <td>Maiores desperdícios</td>
                  <td>Priorização de frentes com maior retorno financeiro.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Embed do Superset"
          subtitle="A URL é configurada via variável de ambiente e pode apontar para dashboards standalone."
          actions={
            hasEmbed ? (
              <a className="button" href={supersetEmbedUrl ?? "#"} target="_blank" rel="noreferrer">
                Abrir em nova aba
              </a>
            ) : null
          }
        >
          {!supersetEmbedUrl ? (
            <EmptyState title="Integração não configurada">
              Defina `NEXT_PUBLIC_SUPERSET_EMBED_URL` no `.env.local` para habilitar o iframe do BI.
            </EmptyState>
          ) : (
            <div className="iframe-shell">
              <iframe
                title="Superset Dashboard"
                src={supersetEmbedUrl}
                width="100%"
                height="520"
                style={{ border: 0, display: "block" }}
              />
            </div>
          )}
        </Panel>
      </section>

      <section className="timeline-card">
        <h2>Rotina de governança sugerida</h2>
        <ol>
          <li>Revisar desvios de custo por área no início da semana.</li>
          <li>Validar quick wins e cenários de corte no módulo de Simulações.</li>
          <li>Atualizar plano de execução e responsáveis em ritos quinzenais.</li>
        </ol>
      </section>
    </>
  );
}
