"use client";

import { useState, useEffect } from "react";

interface Target {
  id: string;
  name: string;
  connectorType: string;
  isActive: boolean;
}

interface Scenario {
  id: string;
  name: string;
  category: string | null;
}

interface BatchExecuteFormProps {
  onStarted?: (batchId: string) => void;
  onCancel?: () => void;
}

export default function BatchExecuteForm({ onStarted, onCancel }: BatchExecuteFormProps) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedScenario, setSelectedScenario] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [executionMode, setExecutionMode] = useState<"parallel" | "sequential">("parallel");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tRes, sRes] = await Promise.allSettled([
        fetch("/api/targets"),
        fetch("/api/scenarios"),
      ]);

      if (tRes.status === "fulfilled" && tRes.value.ok) {
        const d = await tRes.value.json();
        if (d.success) setTargets(d.data || []);
      }
      if (sRes.status === "fulfilled" && sRes.value.ok) {
        const d = await sRes.value.json();
        if (d.success) setScenarios(d.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const toggleTarget = (id: string) => {
    setSelectedTargets((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const activeTargets = targets.filter((t) => t.isActive).map((t) => t.id);
    setSelectedTargets(activeTargets);
  };

  const selectNone = () => {
    setSelectedTargets([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedScenario) {
      setError("Select a scenario");
      return;
    }
    if (selectedTargets.length === 0) {
      setError("Select at least one target");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/execute/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: selectedScenario,
          targetIds: selectedTargets,
          mode: executionMode,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError("Batch execution API not available yet");
          return;
        }
        const data = await response.json().catch(() => null);
        setError(data?.error || "Failed to start batch");
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSuccess(`Batch started: ${data.data?.id || "OK"}`);
        setSelectedScenario("");
        setSelectedTargets([]);
        onStarted?.(data.data?.id);
      } else {
        setError(data.error || "Failed to start batch");
      }
    } catch {
      setError("Failed to start batch execution");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 text-center py-6 text-sm">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Scenario select */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Scenario <span className="text-red-400">*</span>
        </label>
        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select scenario...</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.category ? `(${s.category})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Target multi-select */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-400">
            Targets <span className="text-red-400">*</span>
            {selectedTargets.length > 0 && (
              <span className="ml-2 text-blue-400">({selectedTargets.length} selected)</span>
            )}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] text-blue-400 hover:text-blue-300"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="text-[10px] text-gray-500 hover:text-gray-400"
            >
              Clear
            </button>
          </div>
        </div>

        {targets.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4 bg-gray-900 rounded border border-gray-700">
            No targets available
          </div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto bg-gray-900 rounded border border-gray-700 p-2">
            {targets.map((target) => (
              <label
                key={target.id}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition ${
                  selectedTargets.includes(target.id)
                    ? "bg-blue-900/20 border border-blue-700"
                    : "hover:bg-gray-800 border border-transparent"
                } ${!target.isActive ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedTargets.includes(target.id)}
                  onChange={() => toggleTarget(target.id)}
                  disabled={!target.isActive}
                  className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{target.name}</div>
                  <div className="text-[10px] text-gray-500">{target.connectorType}</div>
                </div>
                {!target.isActive && (
                  <span className="text-[10px] text-gray-500">Inactive</span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Execution mode */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Execution Mode</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setExecutionMode("parallel")}
            className={`flex-1 py-2 rounded text-sm font-medium transition border ${
              executionMode === "parallel"
                ? "bg-blue-900/30 border-blue-700 text-blue-300"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            Parallel
            <div className="text-[10px] font-normal mt-0.5 opacity-70">All targets at once</div>
          </button>
          <button
            type="button"
            onClick={() => setExecutionMode("sequential")}
            className={`flex-1 py-2 rounded text-sm font-medium transition border ${
              executionMode === "sequential"
                ? "bg-blue-900/30 border-blue-700 text-blue-300"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            Sequential
            <div className="text-[10px] font-normal mt-0.5 opacity-70">One at a time</div>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || !selectedScenario || selectedTargets.length === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
        >
          {submitting ? "Starting..." : `Run Batch (${selectedTargets.length} target${selectedTargets.length !== 1 ? "s" : ""})`}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
