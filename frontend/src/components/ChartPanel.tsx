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
  import { useState } from 'react';
  CategoryScale,
  LinearScale,
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
  const defaultBarChartData = {
    labels: [],
    datasets: [
      {
        label: 'Activity',
        data: [],
        backgroundColor: 'rgba(0, 126, 136, 0.7)',
        borderColor: 'rgba(0, 126, 136, 1)',
        borderWidth: 1,
      },
    ],
  };
  datasets: [
    {
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
  const defaultLineChartData = {
    labels: [],
    datasets: [
      {
        label: 'Monthly Trend',
        data: [],
        borderColor: '#007E88',
        backgroundColor: 'rgba(0, 126, 136, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };
      label: 'Monthly Trend',
      data: [300, 420, 380, 500, 450, 520],
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
  const defaultDoughnutData = {
    labels: [],
    datasets: [
      {
        data: [],
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
        '#007E88',
        '#FF6B6B',
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

            <Bar data={barChartData} options={chartOptions} />
            const [barChartData, setBarChartData] = useState(defaultBarChartData);
            const [lineChartData, setLineChartData] = useState(defaultLineChartData);
            const [doughnutData, setDoughnutData] = useState(defaultDoughnutData);
          
            useEffect(() => {
              function fetchChartData() {
                fetch('/api/sensors/history?interval=5min&range=24h')
                  .then(res => res.json())
                  .then(data => {
                    const labels = data.map(r => r.timestamp);
                    const values = data.map(r => r.value);
                    setBarChartData({
                      ...defaultBarChartData,
                      labels,
                      datasets: [{ ...defaultBarChartData.datasets[0], data: values }],
                    });
                    setLineChartData({
                      ...defaultLineChartData,
                      labels,
                      datasets: [{ ...defaultLineChartData.datasets[0], data: values }],
                    });
                    const statusCounts = { Active: 0, Pending: 0, Completed: 0 };
                    data.forEach(r => {
                      if (statusCounts[r.status] !== undefined) statusCounts[r.status]++;
                    });
                    setDoughnutData({
                      ...defaultDoughnutData,
                      labels: Object.keys(statusCounts),
                      datasets: [{ ...defaultDoughnutData.datasets[0], data: Object.values(statusCounts) }],
                    });
                  });
              }
              fetchChartData();
              const interval = setInterval(fetchChartData, 10000);
              return () => clearInterval(interval);
            }, []);
  // Poll chart data every 10 seconds
  // Example: fetch new chart data from backend
  // Replace with actual API endpoints if available
  useEffect(() => {
    function fetchChartData() {
      // Example: fetch and update chart data
      // apiGet('/api/sensors/chart-data').then((data) => { ... });
              <Line data={lineChartData} options={chartOptions} />
    const interval = setInterval(fetchChartData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
              <Doughnut data={doughnutData} options={chartOptions} />
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