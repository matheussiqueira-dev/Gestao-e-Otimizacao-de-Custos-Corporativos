export type DateWindow = {
  startDate: string;
  endDate: string;
};

export function toInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultDashboardDates(): DateWindow {
  const now = new Date();
  const endDate = toInputDate(now);
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return { startDate: toInputDate(start), endDate };
}

export function getCurrentMonthWindow(): DateWindow {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toInputDate(startDate), endDate: toInputDate(endDate) };
}

export function getPreviousPeriodRange(window: DateWindow): DateWindow {
  const start = new Date(`${window.startDate}T00:00:00`);
  const end = new Date(`${window.endDate}T00:00:00`);

  const diffMs = end.getTime() - start.getTime();
  const safeDiff = diffMs > 0 ? diffMs : 0;
  const previousEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const previousStart = new Date(previousEnd.getTime() - safeDiff);

  return {
    startDate: toInputDate(previousStart),
    endDate: toInputDate(previousEnd)
  };
}

export function isDateWindowValid(window: DateWindow): boolean {
  return window.startDate <= window.endDate;
}
