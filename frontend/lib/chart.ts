import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";

let chartsReady = false;

export function ensureChartsRegistered() {
  if (chartsReady) {
    return;
  }

  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);
  chartsReady = true;
}
