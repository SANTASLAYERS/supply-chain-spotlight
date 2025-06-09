import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { QuakeKpiPayload } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  data?: QuakeKpiPayload;
}

export function QuakeMagnitudeDistribution({ data }: Props) {
  if (!data) {
    return <div>Loading magnitude distribution...</div>;
  }

  const chartData = {
    labels: ['0-1', '1-2', '2-3', '3-4', '4-5', '5+'],
    datasets: [
      {
        label: 'Earthquake Count',
        data: [
          data.mag0to1 || 0,
          data.mag1to2 || 0,
          data.mag2to3 || 0,
          data.mag3to4 || 0,
          data.mag4to5 || 0,
          data.bigQuakes || 0
        ],
        backgroundColor: [
          'rgba(108, 117, 125, 0.8)',
          'rgba(40, 167, 69, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(255, 102, 0, 0.8)',
          'rgba(220, 53, 69, 0.8)',
          'rgba(108, 117, 125, 0.9)',
        ],
        borderColor: [
          'rgba(108, 117, 125, 1)',
          'rgba(40, 167, 69, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(255, 102, 0, 1)',
          'rgba(220, 53, 69, 1)',
          'rgba(108, 117, 125, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Magnitude Distribution (Today)',
      },
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Earthquakes',
        },
        ticks: {
          stepSize: 1,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Magnitude Range',
        },
      },
    },
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
} 