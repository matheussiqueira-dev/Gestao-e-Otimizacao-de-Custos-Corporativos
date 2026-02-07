import type { ReactNode } from "react";

type HeroSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
};

export function HeroSection({ eyebrow, title, description, actions, aside }: HeroSectionProps) {
  return (
    <header className="hero-card">
      <div className="hero-main">
        <p className="hero-eyebrow">{eyebrow}</p>
        <h1 className="hero-title">{title}</h1>
        <p className="hero-description">{description}</p>
        {actions && <div className="hero-actions">{actions}</div>}
      </div>
      {aside && <div className="hero-aside">{aside}</div>}
    </header>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  delta?: string;
  tone?: "neutral" | "positive" | "danger";
  subtitle?: ReactNode;
};

export function KpiCard({ label, value, delta, tone = "neutral", subtitle }: KpiCardProps) {
  return (
    <article className={`metric-card tone-${tone}`} aria-label={`Indicador ${label}`}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {delta && <p className={`metric-delta delta-${tone}`}>{delta}</p>}
      {subtitle && <p className="metric-subtitle">{subtitle}</p>}
    </article>
  );
}

type PanelProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function Panel({ title, subtitle, actions, children }: PanelProps) {
  return (
    <section className="panel-card">
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
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
  const role = kind === "error" ? "alert" : "status";
  return (
    <div className={`notice notice-${kind}`} role={role} aria-live="polite">
      {children}
    </div>
  );
}

type EmptyStateProps = {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title = "Sem dados suficientes", children, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong className="empty-state-title">{title}</strong>
      <p>{children}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "positive" | "danger" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
