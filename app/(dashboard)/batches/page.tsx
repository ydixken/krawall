"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-900/50 text-green-300",
  failed: "bg-red-900/50 text-red-300",
  running: "bg-blue-900/50 text-blue-300",
  pending: "bg-gray-700 text-gray-300",
  partial: "bg-yellow-900/50 text-yellow-300",
};

export default function BatchesPage() {
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
      if (data.success) {
        setBatches(data.data || []);
      }
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

  const getProgressPercent = (batch: Batch) => {
    if (batch.targetCount === 0) return 0;
    return Math.round(((batch.completedCount + batch.failedCount) / batch.targetCount) * 100);
  };

  const getProgressBarColor = (batch: Batch) => {
    if (batch.failedCount > 0 && batch.completedCount === 0) return "bg-red-500";
    if (batch.failedCount > 0) return "bg-yellow-500";
    if (batch.status === "completed") return "bg-green-500";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Batch Executions</h1>
          <p className="text-gray-400 mt-1">Run scenarios against multiple targets at once</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          {showForm ? "Hide Form" : "+ New Batch"}
        </button>
      </div>

      {/* Batch Execute Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Start Batch Execution</h2>
          <BatchExecuteForm
            onStarted={() => {
              setShowForm(false);
              fetchBatches();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Batch List */}
      {batches.length === 0 && !showForm ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <div className="text-gray-400 mb-2">No batch executions yet</div>
          <p className="text-sm text-gray-500 mb-6">
            Run a scenario across multiple targets to compare results.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            Start Your First Batch
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => {
            const progress = getProgressPercent(batch);
            return (
              <Link
                key={batch.id}
                href={`/batches/${batch.id}`}
                className="block bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-gray-600 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">{batch.scenarioName}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[batch.status] || STATUS_STYLES.pending}`}>
                        {batch.status.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-400">
                        {batch.mode}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {batch.targetCount} target{batch.targetCount !== 1 ? "s" : ""}
                      {batch.completedCount > 0 && (
                        <span className="text-green-400 ml-2">{batch.completedCount} completed</span>
                      )}
                      {batch.failedCount > 0 && (
                        <span className="text-red-400 ml-2">{batch.failedCount} failed</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{new Date(batch.createdAt).toLocaleString()}</div>
                    {batch.completedAt && (
                      <div className="text-gray-600 mt-0.5">
                        Completed: {new Date(batch.completedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(batch)} ${
                        batch.status === "running" ? "animate-pulse" : ""
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right">{progress}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
