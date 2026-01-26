"use client";

import { useState, useEffect } from "react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface SessionMetrics {
  id: string;
  targetId: string;
  scenarioId: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  summaryMetrics: {
    messageCount?: number;
    totalTokens?: number;
    avgResponseTimeMs?: number;
    errorCount?: number;
    errorRate?: number;
    p50ResponseTimeMs?: number;
    p95ResponseTimeMs?: number;
    p99ResponseTimeMs?: number;
  } | null;
  target: {
    name: string;
    connectorType: string;
  };
  scenario: {
    name: string;
  } | null;
}

export default function MetricsPage() {
  const [sessions, setSessions] = useState<SessionMetrics[]>([]);
  const [aggregate, setAggregate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("7d");

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case "24h":
          startDate.setHours(startDate.getHours() - 24);
          break;
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: "COMPLETED",
        limit: "100",
      });

      const response = await fetch(`/api/metrics?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSessions(data.data.sessions);
        setAggregate(data.data.aggregate);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const responseTimeData = {
    labels: sessions.slice(0, 20).reverse().map((s, i) => `Session ${i + 1}`),
    datasets: [
      {
        label: "Avg Response Time (ms)",
        data: sessions.slice(0, 20).reverse().map((s) => s.summaryMetrics?.avgResponseTimeMs || 0),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
      {
        label: "P95 Response Time (ms)",
        data: sessions.slice(0, 20).reverse().map((s) => s.summaryMetrics?.p95ResponseTimeMs || 0),
        borderColor: "rgb(249, 115, 22)",
        backgroundColor: "rgba(249, 115, 22, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const tokenUsageData = {
    labels: sessions.slice(0, 20).reverse().map((s, i) => `Session ${i + 1}`),
    datasets: [
      {
        label: "Total Tokens",
        data: sessions.slice(0, 20).reverse().map((s) => s.summaryMetrics?.totalTokens || 0),
        backgroundColor: "rgba(16, 185, 129, 0.6)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 1,
      },
    ],
  };

  const errorRateData = {
    labels: ["Successful", "Errors"],
    datasets: [
      {
        data: [
          (aggregate?.totalMessages || 0) - (aggregate?.totalErrors || 0),
          aggregate?.totalErrors || 0,
        ],
        backgroundColor: ["rgba(16, 185, 129, 0.6)", "rgba(239, 68, 68, 0.6)"],
        borderColor: ["rgb(16, 185, 129)", "rgb(239, 68, 68)"],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#9ca3af",
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#9ca3af",
        },
        grid: {
          color: "#374151",
        },
      },
      y: {
        ticks: {
          color: "#9ca3af",
        },
        grid: {
          color: "#374151",
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Metrics Dashboard</h1>
          <p className="text-gray-400 mt-1">Performance metrics and analytics</p>
        </div>

        {/* Time range selector */}
        <div className="flex gap-2">
          {["24h", "7d", "30d"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {range === "24h" ? "Last 24 Hours" : range === "7d" ? "Last 7 Days" : "Last 30 Days"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">Loading metrics...</div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {aggregate && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">Total Sessions</div>
                <div className="text-3xl font-bold text-white">{aggregate.totalSessions}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">Total Messages</div>
                <div className="text-3xl font-bold text-white">
                  {aggregate.totalMessages.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">Total Tokens</div>
                <div className="text-3xl font-bold text-white">
                  {aggregate.totalTokens.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">Error Rate</div>
                <div className="text-3xl font-bold text-white">{aggregate.errorRate.toFixed(2)}%</div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Chart */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Response Time Trends</h2>
              <div style={{ height: "300px" }}>
                <Line data={responseTimeData} options={chartOptions} />
              </div>
            </div>

            {/* Token Usage Chart */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Token Usage</h2>
              <div style={{ height: "300px" }}>
                <Bar data={tokenUsageData} options={chartOptions} />
              </div>
            </div>

            {/* Error Rate Chart */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Success vs Errors</h2>
              <div style={{ height: "300px" }}>
                <Doughnut
                  data={errorRateData}
                  options={{
                    ...chartOptions,
                    scales: undefined,
                  }}
                />
              </div>
            </div>

            {/* Recent Sessions Table */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Sessions</h2>
              <div className="overflow-auto" style={{ maxHeight: "300px" }}>
                <table className="w-full text-sm">
                  <thead className="text-gray-400 border-b border-gray-700">
                    <tr>
                      <th className="text-left py-2">Target</th>
                      <th className="text-right py-2">Messages</th>
                      <th className="text-right py-2">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    {sessions.slice(0, 10).map((session) => (
                      <tr key={session.id} className="border-b border-gray-700/50">
                        <td className="py-2">{session.target.name}</td>
                        <td className="text-right">{session.summaryMetrics?.messageCount || 0}</td>
                        <td className="text-right">{session.summaryMetrics?.errorCount || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
