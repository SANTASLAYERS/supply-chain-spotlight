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
import type { QuakeHourlyKpiPayload } from "../types";

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
  data: QuakeHourlyKpiPayload[];
}

export function QuakeHourlyChart({ data }: Props) {
  const chartData = {
    labels: data.map((d) => {
      const hour = new Date(d.hour).getHours();
      return `${hour.toString().padStart(2, '0')}:00`;
    }),
    datasets: [
      {
        label: "Earthquake Count",
        data: data.map((d) => d.totalCount),
        borderColor: "rgb(220, 53, 69)",
        backgroundColor: "rgba(220, 53, 69, 0.2)",
        yAxisID: "y",
        tension: 0.2,
      },
      {
        label: "Average Magnitude",
        data: data.map((d) => d.avgMag),
        borderColor: "rgb(255, 102, 0)",
        backgroundColor: "rgba(255, 102, 0, 0.2)",
        yAxisID: "y1",
        tension: 0.2,
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
        text: "24-Hour Earthquake Activity",
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Hour",
        },
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: true,
          text: "Number of Earthquakes",
        },
        beginAtZero: true,
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        title: {
          display: true,
          text: "Average Magnitude",
        },
        grid: {
          drawOnChartArea: false,
        },
        beginAtZero: true,
      },
    },
  };

  return <Line data={chartData} options={options} />;
} 