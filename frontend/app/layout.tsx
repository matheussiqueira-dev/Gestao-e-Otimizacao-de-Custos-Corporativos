import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";

import { TopNavigation } from "@/components/top-navigation";

import "./globals.css";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600", "700"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cost-intelligence.local"),
  title: {
    default: "Cost Intelligence Platform",
    template: "%s | Cost Intelligence Platform"
  },
  description: "Plataforma para gestão, simulação e otimização de custos corporativos.",
  keywords: ["gestão de custos", "otimização financeira", "cfo", "simulação de custos", "business intelligence"],
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Cost Intelligence Platform",
    description: "Plataforma para gestão, simulação e otimização de custos corporativos.",
    type: "website",
    locale: "pt_BR",
    siteName: "Cost Intelligence Platform"
  },
  twitter: {
    card: "summary_large_image",
    title: "Cost Intelligence Platform",
    description: "Gestão e otimização de custos corporativos com inteligência analítica."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} ${serif.variable}`}>
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo
        </a>
        <div className="app-backdrop" />
        <header className="topbar">
          <div className="topbar-brand" role="presentation">
            <p className="brand-kicker">Cost Command Center</p>
            <p className="brand-subtitle">Gestão orientada por impacto financeiro</p>
          </div>
          <TopNavigation />
        </header>
        <main id="main-content" className="main-container">
          {children}
        </main>
      </body>
    </html>
  );
}
