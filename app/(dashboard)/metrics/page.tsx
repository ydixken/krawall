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
  Tooltip as ChartTooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Download, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
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
    inputTokens?: number;
    outputTokens?: number;
  } | null;
  target: {
    name: string;
    connectorType: string;
  };
  scenario: {
    name: string;
  } | null;
}

const TIME_RANGES = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
];

export default function MetricsPage() {
  const [sessions, setSessions] = useState<SessionMetrics[]>([]);
  const [aggregate, setAggregate] = useState<{
    totalSessions: number;
    totalMessages: number;
    totalTokens: number;
    avgResponseTimeMs: number;
    totalErrors: number;
    errorRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
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

  const exportData = (format: "csv" | "json") => {
    if (!sessions.length) return;
    if (format === "json") {
      const blob = new Blob([JSON.stringify({ sessions, aggregate }, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `metrics-${timeRange}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = "Target,Scenario,Messages,Tokens,Avg Response (ms),Errors\n";
      const rows = sessions
        .map(
          (s) =>
            `"${s.target.name}","${s.scenario?.name || "Custom"}",${s.summaryMetrics?.messageCount || 0},${s.summaryMetrics?.totalTokens || 0},${(s.summaryMetrics?.avgResponseTimeMs || 0).toFixed(0)},${s.summaryMetrics?.errorCount || 0}`
        )
        .join("\n");
      const blob = new Blob([headers + rows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `metrics-${timeRange}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Token cost estimation
  const totalInputTokens = sessions.reduce(
    (sum, s) => sum + (s.summaryMetrics?.inputTokens || Math.floor((s.summaryMetrics?.totalTokens || 0) * 0.4)),
    0
  );
  const totalOutputTokens = sessions.reduce(
    (sum, s) => sum + (s.summaryMetrics?.outputTokens || Math.floor((s.summaryMetrics?.totalTokens || 0) * 0.6)),
    0
  );
  const estimatedCost = (totalInputTokens / 1000) * 0.01 + (totalOutputTokens / 1000) * 0.03;

  // Chart data
  const chartSessions = sessions.slice(0, 20).reverse();
  const responseTimeData = {
    labels: chartSessions.map((_, i) => `S${i + 1}`),
    datasets: [
      {
        label: "Avg (ms)",
        data: chartSessions.map((s) => s.summaryMetrics?.avgResponseTimeMs || 0),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "P95 (ms)",
        data: chartSessions.map((s) => s.summaryMetrics?.p95ResponseTimeMs || 0),
        borderColor: "rgb(249, 115, 22)",
        backgroundColor: "rgba(249, 115, 22, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const tokenUsageData = {
    labels: chartSessions.map((_, i) => `S${i + 1}`),
    datasets: [
      {
        label: "Total Tokens",
        data: chartSessions.map((s) => s.summaryMetrics?.totalTokens || 0),
        backgroundColor: "rgba(16, 185, 129, 0.6)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 1,
        borderRadius: 4,
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

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#9ca3af", font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { color: "#6b7280", font: { size: 10 } }, grid: { color: "#1f2937" } },
      y: { ticks: { color: "#6b7280", font: { size: 10 } }, grid: { color: "#1f2937" } },
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metrics"
        description="Performance metrics, token usage, and cost analysis"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Metrics" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* Time range pills */}
            {TIME_RANGES.map((range) => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === range.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {range.label}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-700 mx-1" />
            <Button variant="secondary" size="sm" onClick={() => exportData("csv")}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => exportData("json")}>
              <Download className="h-3.5 w-3.5" />
              JSON
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">Loading metrics...</div>
        </div>
      ) : (
        <>
          {/* Summary Metrics */}
          {aggregate && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard label="Total Sessions" value={aggregate.totalSessions} />
              <MetricCard
                label="Total Messages"
                value={aggregate.totalMessages.toLocaleString()}
              />
              <MetricCard
                label="Total Tokens"
                value={aggregate.totalTokens.toLocaleString()}
              />
              <MetricCard
                label="Avg Response"
                value={`${(aggregate.avgResponseTimeMs || 0).toFixed(0)}ms`}
              />
              <MetricCard
                label="Error Rate"
                value={`${aggregate.errorRate.toFixed(2)}%`}
                trend={
                  aggregate.errorRate > 5
                    ? { direction: "up", value: "High" }
                    : aggregate.errorRate > 0
                    ? { direction: "down", value: "Low" }
                    : undefined
                }
              />
            </div>
          )}

          {/* Token Cost Estimation */}
          <Card>
            <CardHeader>
              <CardTitle>Token Cost Estimation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Input Tokens</div>
                  <div className="text-lg font-semibold text-gray-100">
                    {totalInputTokens.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-600">@ $0.01/1K</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Output Tokens</div>
                  <div className="text-lg font-semibold text-gray-100">
                    {totalOutputTokens.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-600">@ $0.03/1K</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total Tokens</div>
                  <div className="text-lg font-semibold text-gray-100">
                    {(totalInputTokens + totalOutputTokens).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Est. Cost</div>
                  <div className="text-lg font-semibold text-emerald-400">
                    ${estimatedCost.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-gray-600">approximate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: "280px" }}>
                  <Line data={responseTimeData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Token Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: "280px" }}>
                  <Bar
                    data={tokenUsageData}
                    options={chartOptions as ChartOptions<"bar">}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success vs Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center" style={{ height: "280px" }}>
                  <div style={{ width: "240px", height: "240px" }}>
                    <Doughnut
                      data={errorRateData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { labels: { color: "#9ca3af", font: { size: 11 } } },
                        },
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto" style={{ maxHeight: "280px" }}>
                  <table className="w-full text-sm">
                    <thead className="text-gray-500 border-b border-gray-800">
                      <tr>
                        <th className="text-left py-2 text-xs font-medium">Target</th>
                        <th className="text-left py-2 text-xs font-medium">Scenario</th>
                        <th className="text-right py-2 text-xs font-medium">Msgs</th>
                        <th className="text-right py-2 text-xs font-medium">Tokens</th>
                        <th className="text-right py-2 text-xs font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {sessions.slice(0, 10).map((session) => (
                        <tr key={session.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="py-2 text-xs">{session.target.name}</td>
                          <td className="py-2 text-xs text-gray-400">{session.scenario?.name || "Custom"}</td>
                          <td className="text-right text-xs">{session.summaryMetrics?.messageCount || 0}</td>
                          <td className="text-right text-xs">{(session.summaryMetrics?.totalTokens || 0).toLocaleString()}</td>
                          <td className="text-right text-xs">
                            <span className={(session.summaryMetrics?.errorCount || 0) > 0 ? "text-red-400" : ""}>
                              {session.summaryMetrics?.errorCount || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sessions.length === 0 && (
                    <div className="text-center text-gray-500 text-xs py-8">No sessions in range</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
