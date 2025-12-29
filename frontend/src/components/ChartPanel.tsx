import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const barChartData = {
  labels: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Miami'],
  datasets: [
    {
      label: 'Activity',
      data: [450, 320, 280, 210, 185, 240],
      backgroundColor: 'rgba(0, 126, 136, 0.7)',
      borderColor: 'rgba(0, 126, 136, 1)',
      borderWidth: 1,
    },
  ],
};

const lineChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Monthly Trend',
      data: [300, 420, 380, 500, 450, 520],
      borderColor: '#007E88',
      backgroundColor: 'rgba(0, 126, 136, 0.1)',
      tension: 0.4,
      fill: true,
    },
  ],
};

const doughnutData = {
  labels: ['Active', 'Pending', 'Completed'],
  datasets: [
    {
      data: [45, 25, 30],
      backgroundColor: [
        'rgba(0, 126, 136, 0.8)',
        'rgba(255, 107, 107, 0.8)',
        'rgba(40, 167, 69, 0.8)',
      ],
      borderColor: [
        '#007E88',
        '#FF6B6B',
        '#28A745',
      ],
      borderWidth: 2,
    },
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
};

export function ChartPanel() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-schistoguard-navy mb-4">Location Activity</h2>
        <div className="h-[300px]">
          <Bar data={barChartData} options={chartOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-schistoguard-navy mb-4">Trends Over Time</h2>
          <div className="h-[250px]">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-schistoguard-navy mb-4">Status Distribution</h2>
          <div className="h-[250px] flex items-center justify-center">
            <Doughnut data={doughnutData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}