import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";
import Link from "next/link";

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
  title: "Cost Intelligence Platform",
  description: "Plataforma para gestão, simulação e otimização de custos corporativos."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} ${serif.variable}`}>
        <div className="app-background" />
        <header className="topbar">
          <div className="topbar-brand">
            <span className="brand-title">Cost Intelligence</span>
            <span className="brand-subtitle">Visão executiva para CFOs</span>
          </div>
          <nav className="topbar-nav">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/simulacoes">Simulações</Link>
            <Link href="/bi">BI Layer</Link>
          </nav>
        </header>
        <main className="main-container">{children}</main>
      </body>
    </html>
  );
}

