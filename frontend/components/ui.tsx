import type { ReactNode } from "react";

type HeroSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function HeroSection({ eyebrow, title, description, actions }: HeroSectionProps) {
  return (
    <header className="hero-card">
      <p className="hero-eyebrow">{eyebrow}</p>
      <h1 className="hero-title">{title}</h1>
      <p className="hero-description">{description}</p>
      {actions && <div className="hero-actions">{actions}</div>}
    </header>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "danger";
  subtitle?: string;
};

export function KpiCard({ label, value, tone = "neutral", subtitle }: KpiCardProps) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {subtitle && <p className="metric-subtitle">{subtitle}</p>}
    </article>
  );
}

type PanelProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function Panel({ title, subtitle, children }: PanelProps) {
  return (
    <section className="panel-card">
      <header className="panel-head">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

type NoticeProps = {
  kind?: "info" | "error";
  children: ReactNode;
};

export function Notice({ kind = "info", children }: NoticeProps) {
  return <div className={`notice notice-${kind}`}>{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
