import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { QuakeKpiPayload } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  data: QuakeKpiPayload[];
}

export function QuakeTrendChart({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.day),
    datasets: [
      {
        label: "Average Magnitude",
        data: data.map((d) => d.avgMag),
        borderColor: "rgb(220, 53, 69)",
        backgroundColor: "rgba(220, 53, 69, 0.2)",
        yAxisID: "y",
      },
      {
        label: "Max Magnitude",
        data: data.map((d) => d.maxMag),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        yAxisID: "y",
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: "7-Day Earthquake Magnitude Trends",
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: true,
          text: "Magnitude",
        },
        min: 0,
      },
    },
  };

  return <Line data={chartData} options={options} />;
} 