"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Layers, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import BatchExecuteForm from "@/components/batches/BatchExecuteForm";

interface BatchSession {
  id: string;
  status: string;
  targetName: string;
}

interface Batch {
  id: string;
  scenarioName: string;
  status: "pending" | "running" | "completed" | "failed" | "partial";
  mode: "parallel" | "sequential";
  targetCount: number;
  completedCount: number;
  failedCount: number;
  sessions: BatchSession[];
  createdAt: string;
  completedAt: string | null;
}

const STATUS_VARIANT: Record<string, "success" | "error" | "warning" | "info" | "neutral"> = {
  completed: "success",
  failed: "error",
  running: "info",
  pending: "neutral",
  partial: "warning",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch("/api/execute/batch");
      if (!response.ok) {
        if (response.status === 404) {
          setBatches([]);
          return;
        }
        throw new Error("Failed to fetch batches");
      }
      const data = await response.json();
      if (data.success) setBatches(data.data || []);
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 15000);
    return () => clearInterval(interval);
  }, [fetchBatches]);

  const getProgress = (batch: Batch) => {
    if (batch.targetCount === 0) return 0;
    return Math.round(((batch.completedCount + batch.failedCount) / batch.targetCount) * 100);
  };

  const getProgressColor = (batch: Batch) => {
    if (batch.failedCount > 0 && batch.completedCount === 0) return "bg-red-500";
    if (batch.failedCount > 0) return "bg-amber-500";
    if (batch.status === "completed") return "bg-emerald-500";
    return "bg-blue-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading batches...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Executions"
        description="Run scenarios against multiple targets simultaneously"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Batches" },
        ]}
        actions={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : (
              <>
                <Plus className="h-4 w-4" />
                New Batch
              </>
            )}
          </Button>
        }
      />

      {showForm && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Start Batch Execution</h2>
          <BatchExecuteForm
            onStarted={() => {
              setShowForm(false);
              fetchBatches();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {batches.length === 0 && !showForm ? (
        <EmptyState
          icon={Layers}
          title="No batch executions yet"
          description="Run a scenario across multiple targets to compare results."
          action={{
            label: "Start First Batch",
            onClick: () => setShowForm(true),
          }}
        />
      ) : batches.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Scenario</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Targets</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {batches.map((batch) => {
                const progress = getProgress(batch);
                return (
                  <tr
                    key={batch.id}
                    onClick={() => router.push(`/batches/${batch.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-100">{batch.scenarioName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[batch.status] || "neutral"} size="sm">
                        {batch.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{batch.mode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-300">{batch.targetCount}</span>
                        {batch.completedCount > 0 && (
                          <span className="text-emerald-400">{batch.completedCount} done</span>
                        )}
                        {batch.failedCount > 0 && (
                          <span className="text-red-400">{batch.failedCount} failed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(batch)} ${
                              batch.status === "running" ? "animate-pulse" : ""
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 w-8 text-right">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {timeAgo(batch.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
