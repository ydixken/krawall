"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FlowBuilder, { FlowStep } from "@/components/scenarios/FlowBuilder";

interface Target {
  id: string;
  name: string;
  connectorType: string;
}

const CATEGORIES = [
  "Stress Test",
  "Functional Test",
  "Edge Case",
  "Load Test",
  "Regression",
  "Integration",
  "Custom",
];

const VERBOSITY_LEVELS = [
  { value: 1, label: "1 - Minimal" },
  { value: 2, label: "2 - Basic" },
  { value: 3, label: "3 - Normal" },
  { value: 4, label: "4 - Verbose" },
  { value: 5, label: "5 - Debug" },
];

export default function NewScenarioPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [targetId, setTargetId] = useState("");
  const [repetitions, setRepetitions] = useState(1);
  const [concurrency, setConcurrency] = useState(1);
  const [delayBetweenMs, setDelayBetweenMs] = useState(0);
  const [verbosityLevel, setVerbosityLevel] = useState(1);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const response = await fetch("/api/targets");
      const data = await response.json();
      if (data.success) {
        setTargets(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch targets:", err);
    }
  };

  const buildFlowConfig = (steps: FlowStep[]): FlowStep[] => {
    return steps.map((step, index) => ({
      ...step,
      next: index < steps.length - 1 ? steps[index + 1].id : undefined,
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Scenario name is required");
      return;
    }
    if (flowSteps.length === 0) {
      setError("At least one flow step is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        flowConfig: buildFlowConfig(flowSteps),
        repetitions,
        concurrency,
        delayBetweenMs,
        verbosityLevel,
      };

      const response = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        router.push("/scenarios");
      } else {
        setError(data.error || "Failed to create scenario");
      }
    } catch (err) {
      console.error("Failed to save scenario:", err);
      setError("Failed to save scenario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/scenarios")}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            &larr; Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">New Scenario</h1>
            <p className="text-sm text-gray-400">Design a conversation flow for testing</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/scenarios")}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save Scenario"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm mb-4 flex-shrink-0">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-300">
            x
          </button>
        </div>
      )}

      {/* Metadata + Flow Builder */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Scenario metadata sidebar */}
        <div className="w-64 flex-shrink-0 bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Scenario Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Test Scenario"
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this scenario tests..."
                rows={3}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Target</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select target...</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.connectorType})
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-xs font-semibold text-gray-400 mb-3">Execution Settings</h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Repetitions</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={repetitions}
                    onChange={(e) => setRepetitions(parseInt(e.target.value) || 1)}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Concurrency</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={concurrency}
                    onChange={(e) => setConcurrency(parseInt(e.target.value) || 1)}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Delay Between Messages (ms)</label>
                  <input
                    type="number"
                    min={0}
                    max={60000}
                    step={100}
                    value={delayBetweenMs}
                    onChange={(e) => setDelayBetweenMs(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Verbosity Level</label>
                  <select
                    value={verbosityLevel}
                    onChange={(e) => setVerbosityLevel(parseInt(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {VERBOSITY_LEVELS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flow Builder */}
        <div className="flex-1 min-w-0">
          <FlowBuilder initialSteps={[]} onChange={setFlowSteps} />
        </div>
      </div>
    </div>
  );
}
