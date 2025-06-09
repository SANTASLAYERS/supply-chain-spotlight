import { Line } from "react-chartjs-2";
import { 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend 
} from "chart.js";
import type { KpiPayload } from "../types";

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  Title,
  Tooltip,
  Legend
);

type Props = { history: KpiPayload[] };

export default function KpiTrendChart({ history }: Props) {
  if (!history.length) return null;

  const labels = history.map(h => h.day);
  const data = {
    labels,
    datasets: [
      {
        label: "On-Time %",
        data: history.map(h => h.onTimePct),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        fill: false,
      },
      {
        label: "Avg Lead Time (days)",
        data: history.map(h => h.avgLead),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'KPI Trends - Last 7 Days',
      },
    },
  };

  return <Line data={data} options={options} />;
} 