import { EmptyState, HeroSection, Panel } from "@/components/ui";

const supersetEmbedUrl = process.env.NEXT_PUBLIC_SUPERSET_EMBED_URL;

export default function BIPage() {
  return (
    <>
      <HeroSection
        eyebrow="BI Layer"
        title="Integração analítica com Apache Superset"
        description="Use dashboards compartilháveis para análises aprofundadas por área, tendência e fontes de desperdício sem sair do portal executivo."
      />

      <section className="grid panels-grid">
        <Panel title="Dashboards recomendados" subtitle="Conjunto mínimo para rotina de governança financeira semanal.">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Dashboard</th>
                  <th>Decisão suportada</th>
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

        <Panel title="Embed do Superset" subtitle="A URL é configurada via variável de ambiente e pode apontar para dashboards standalone.">
          {!supersetEmbedUrl ? (
            <EmptyState>Defina `NEXT_PUBLIC_SUPERSET_EMBED_URL` no `.env.local` para habilitar o iframe do BI.</EmptyState>
          ) : (
            <div className="iframe-shell">
              <iframe
                title="Superset Dashboard"
                src={supersetEmbedUrl}
                width="100%"
                height="460"
                style={{ border: 0, display: "block" }}
              />
            </div>
          )}
        </Panel>
      </section>
    </>
  );
}
