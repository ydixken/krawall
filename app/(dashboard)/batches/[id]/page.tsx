"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface BatchSession {
  id: string;
  status: string;
  targetId: string;
  targetName: string;
  targetConnectorType: string;
  startedAt: string | null;
  completedAt: string | null;
  summaryMetrics: {
    messageCount?: number;
    totalTokens?: number;
    avgResponseTimeMs?: number;
    p95ResponseTimeMs?: number;
    errorRate?: number;
    errorCount?: number;
  } | null;
}

interface BatchDetail {
  id: string;
  scenarioId: string;
  scenarioName: string;
  status: string;
  mode: "parallel" | "sequential";
  targetCount: number;
  completedCount: number;
  failedCount: number;
  sessions: BatchSession[];
  createdAt: string;
  completedAt: string | null;
}

const SESSION_STATUS: Record<string, string> = {
  COMPLETED: "bg-green-900/50 text-green-300",
  FAILED: "bg-red-900/50 text-red-300",
  RUNNING: "bg-blue-900/50 text-blue-300",
  QUEUED: "bg-yellow-900/50 text-yellow-300",
  PENDING: "bg-gray-700 text-gray-300",
  CANCELLED: "bg-gray-700 text-gray-400",
};

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    try {
      const response = await fetch(`/api/execute/batch/${batchId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Batch not found or API not available");
          return;
        }
        throw new Error("Failed to fetch batch");
      }
      const data = await response.json();
      if (data.success) {
        setBatch(data.data);
      } else {
        setError(data.error || "Failed to fetch batch");
      }
    } catch {
      setError("Failed to fetch batch details");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchBatch();
    const interval = setInterval(fetchBatch, 10000);
    return () => clearInterval(interval);
  }, [fetchBatch]);

  const isRunning = batch?.status === "running" || batch?.status === "pending";
  const isComplete = batch?.status === "completed" || batch?.status === "failed" || batch?.status === "partial";

  // Calculate comparison data for completed batches
  const completedSessions = batch?.sessions.filter(
    (s) => s.status === "COMPLETED" && s.summaryMetrics
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading batch details...</div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="space-y-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Error</h3>
          <p className="text-red-300">{error || "Batch not found"}</p>
        </div>
        <Link
          href="/batches"
          className="inline-block px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          &larr; Back to Batches
        </Link>
      </div>
    );
  }

  const progress = batch.targetCount > 0
    ? Math.round(((batch.completedCount + batch.failedCount) / batch.targetCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/batches" className="text-gray-400 hover:text-white text-sm">
              &larr; Batches
            </Link>
            <h1 className="text-3xl font-bold text-white">Batch Detail</h1>
          </div>
          <p className="text-gray-400">
            {batch.scenarioName} &middot; {batch.targetCount} target{batch.targetCount !== 1 ? "s" : ""} &middot; {batch.mode}
          </p>
        </div>
        <div className={`px-3 py-1 rounded text-sm font-medium ${
          SESSION_STATUS[batch.status.toUpperCase()] || "bg-gray-700 text-gray-300"
        }`}>
          {batch.status.toUpperCase()}
          {isRunning && <span className="ml-2 inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Overall Progress</span>
          <span className="text-sm text-gray-300">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              batch.failedCount > 0 && batch.completedCount === 0
                ? "bg-red-500"
                : batch.failedCount > 0
                ? "bg-yellow-500"
                : "bg-blue-500"
            } ${isRunning ? "animate-pulse" : ""}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="text-green-400">{batch.completedCount} completed</span>
          <span className="text-red-400">{batch.failedCount} failed</span>
          <span>{batch.targetCount - batch.completedCount - batch.failedCount} remaining</span>
        </div>
      </div>

      {/* Per-target sessions */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Sessions by Target</h2>
        </div>
        <div className="divide-y divide-gray-700">
          {batch.sessions.map((session) => (
            <div key={session.id} className="p-4 hover:bg-gray-700/30 transition">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">{session.targetName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                    {session.targetConnectorType}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    SESSION_STATUS[session.status] || SESSION_STATUS.PENDING
                  }`}>
                    {session.status}
                  </span>
                </div>
                <Link
                  href={`/sessions/${session.id}`}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  View Details &rarr;
                </Link>
              </div>

              {/* Session metrics */}
              {session.summaryMetrics && (
                <div className="grid grid-cols-5 gap-4 mt-2">
                  <div>
                    <div className="text-[10px] text-gray-500">Messages</div>
                    <div className="text-sm font-medium text-gray-200">
                      {session.summaryMetrics.messageCount ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Avg Response</div>
                    <div className="text-sm font-medium text-gray-200">
                      {session.summaryMetrics.avgResponseTimeMs
                        ? `${session.summaryMetrics.avgResponseTimeMs.toFixed(0)}ms`
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">P95 Response</div>
                    <div className="text-sm font-medium text-gray-200">
                      {session.summaryMetrics.p95ResponseTimeMs
                        ? `${session.summaryMetrics.p95ResponseTimeMs.toFixed(0)}ms`
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Tokens</div>
                    <div className="text-sm font-medium text-gray-200">
                      {session.summaryMetrics.totalTokens?.toLocaleString() ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Error Rate</div>
                    <div className={`text-sm font-medium ${
                      (session.summaryMetrics.errorRate ?? 0) > 10
                        ? "text-red-400"
                        : "text-gray-200"
                    }`}>
                      {session.summaryMetrics.errorRate !== undefined
                        ? `${session.summaryMetrics.errorRate.toFixed(1)}%`
                        : "-"}
                    </div>
                  </div>
                </div>
              )}

              {/* Timing */}
              <div className="text-[10px] text-gray-500 mt-2">
                {session.startedAt && `Started: ${new Date(session.startedAt).toLocaleString()}`}
                {session.completedAt && ` · Completed: ${new Date(session.completedAt).toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table (shown when batch is complete) */}
      {isComplete && completedSessions.length >= 2 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Target Comparison</h2>
            <p className="text-xs text-gray-400 mt-0.5">Side-by-side metrics across targets</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 text-xs font-medium text-gray-400">Target</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">Avg Response</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">P95 Response</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">Error Rate</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">Tokens</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">Messages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {completedSessions.map((session) => {
                  const m = session.summaryMetrics!;
                  // Find best/worst for highlighting
                  const avgTimes = completedSessions
                    .map((s) => s.summaryMetrics?.avgResponseTimeMs)
                    .filter((v): v is number => v !== undefined);
                  const minAvg = Math.min(...avgTimes);
                  const maxAvg = Math.max(...avgTimes);
                  const isbestAvg = m.avgResponseTimeMs === minAvg && avgTimes.length > 1;
                  const isWorstAvg = m.avgResponseTimeMs === maxAvg && avgTimes.length > 1;

                  return (
                    <tr key={session.id} className="hover:bg-gray-700/30">
                      <td className="p-3">
                        <div className="font-medium text-white">{session.targetName}</div>
                        <div className="text-[10px] text-gray-500">{session.targetConnectorType}</div>
                      </td>
                      <td className={`p-3 text-right font-mono ${isbestAvg ? "text-green-400" : isWorstAvg ? "text-red-400" : "text-gray-200"}`}>
                        {m.avgResponseTimeMs?.toFixed(0) ?? "-"}ms
                      </td>
                      <td className="p-3 text-right font-mono text-gray-200">
                        {m.p95ResponseTimeMs?.toFixed(0) ?? "-"}ms
                      </td>
                      <td className={`p-3 text-right font-mono ${(m.errorRate ?? 0) > 10 ? "text-red-400" : "text-gray-200"}`}>
                        {m.errorRate?.toFixed(1) ?? "0"}%
                      </td>
                      <td className="p-3 text-right font-mono text-gray-200">
                        {m.totalTokens?.toLocaleString() ?? "-"}
                      </td>
                      <td className="p-3 text-right font-mono text-gray-200">
                        {m.messageCount ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
