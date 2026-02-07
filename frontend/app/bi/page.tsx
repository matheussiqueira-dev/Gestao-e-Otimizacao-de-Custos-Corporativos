const supersetEmbedUrl = process.env.NEXT_PUBLIC_SUPERSET_EMBED_URL;

export default function BIPage() {
  return (
    <section>
      <div className="hero">
        <h1>Camada BI Integrada (Apache Superset)</h1>
        <p>
          Dashboards de custos, tendência temporal e desperdícios podem ser consumidos no próprio portal para reduzir tempo entre análise e decisão.
        </p>
      </div>

      <div className="grid panels-2">
        <article className="panel">
          <h2>Dashboards disponíveis</h2>
          <table>
            <thead>
              <tr>
                <th>Dashboard</th>
                <th>Objetivo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Visão geral de custos</td>
                <td>Consolidação por período, centro, projeto e categoria.</td>
              </tr>
              <tr>
                <td>Tendência temporal</td>
                <td>Monitoramento de evolução mensal e sazonalidade.</td>
              </tr>
              <tr>
                <td>Maiores desperdícios</td>
                <td>Priorizar frentes com maior potencial de economia.</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article className="panel">
          <h2>Integração embed</h2>
          {!supersetEmbedUrl && (
            <p>Defina `NEXT_PUBLIC_SUPERSET_EMBED_URL` no arquivo `.env.local` para exibir o dashboard embedado nesta tela.</p>
          )}
          {supersetEmbedUrl && (
            <iframe
              title="Superset Dashboard"
              src={supersetEmbedUrl}
              width="100%"
              height="440"
              style={{ border: "1px solid rgba(160, 203, 227, 0.25)", borderRadius: 12 }}
            />
          )}
        </article>
      </div>
    </section>
  );
}

