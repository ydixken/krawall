"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExportYamlButton, YamlImportModal } from "@/components/scenarios/YamlImportExport";

interface Scenario {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  target: {
    name: string;
  } | null;
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const response = await fetch("/api/scenarios");
      const data = await response.json();

      if (data.success) {
        setScenarios(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch scenarios:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Test Scenarios</h1>
          <p className="text-gray-400 mt-1">Manage your chatbot test scenarios</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            Import YAML
          </button>
          <Link
            href="/scenarios/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Scenario
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">Loading scenarios...</div>
        </div>
      ) : scenarios.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No scenarios yet</h3>
          <p className="text-gray-400 mb-6">Create your first test scenario to get started</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/scenarios/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Scenario
            </Link>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-block px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Import from YAML
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{scenario.name}</h3>
                  {scenario.category && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-900/50 text-blue-300 rounded">
                      {scenario.category}
                    </span>
                  )}
                </div>
              </div>

              {scenario.description && (
                <p className="text-gray-400 text-sm mb-4">{scenario.description}</p>
              )}

              {scenario.target && (
                <div className="text-sm text-gray-500 mb-4">
                  Target: <span className="text-gray-300">{scenario.target.name}</span>
                </div>
              )}

              <div className="flex gap-2 mt-4 items-center">
                <Link
                  href={`/scenarios/${scenario.id}/edit`}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-center text-sm"
                >
                  Edit
                </Link>
                <button
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Execute
                </button>
                <ExportYamlButton scenarioId={scenario.id} scenarioName={scenario.name} />
              </div>
            </div>
          ))}
        </div>
      )}

      <YamlImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={fetchScenarios}
      />
    </div>
  );
}
