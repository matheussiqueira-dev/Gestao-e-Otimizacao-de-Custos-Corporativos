const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const PERCENT_FORMATTER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

export function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}%`;
}

export function formatCompactPercent(value: number): string {
  return `${PERCENT_FORMATTER.format(value)}%`;
}

export function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-");
  const safe = new Date(Number(year), Number(monthIndex) - 1, 1);
  return safe.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}
