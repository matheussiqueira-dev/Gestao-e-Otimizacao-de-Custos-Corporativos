import Link from "next/link";

export default function HomePage() {
  return (
    <section className="hero">
      <h1>Plataforma de Gestão e Otimização de Custos Corporativos</h1>
      <p>
        Solução para CFOs e controllers com análise por centro de custo, detecção de desperdício, simulações e camada BI integrada para decisões
        orientadas por impacto financeiro.
      </p>
      <div className="inline-actions" style={{ marginTop: "1rem" }}>
        <Link href="/dashboard" className="button">
          Abrir dashboard executivo
        </Link>
        <Link href="/simulacoes" className="button secondary">
          Executar simulação "e se..."
        </Link>
      </div>
    </section>
  );
}

