"use client";

import { useState, useEffect } from "react";
import { SCENARIO_TEMPLATES, type ScenarioTemplate } from "@/lib/scenarios/templates";
import FlowBuilder, { FlowStep } from "@/components/scenarios/FlowBuilder";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "../shared/template-card";
import { JsonPreview } from "../shared/json-preview";
import { useWizard } from "../wizard-context";
import { useToast } from "@/components/ui/toast";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Plus,
} from "lucide-react";

type SubStep = "choose" | "customize" | "review";

interface StatusCodeRule {
  codes: string;
  action: "skip" | "abort" | "retry";
  maxRetries: number;
  delayMs: number;
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
  { value: "minimal", label: "Minimal" },
  { value: "basic", label: "Basic" },
  { value: "normal", label: "Normal" },
  { value: "verbose", label: "Verbose" },
  { value: "extreme", label: "Extreme" },
];

const TEMPLATE_CATEGORIES = ["All", ...new Set(SCENARIO_TEMPLATES.map((t) => t.category))];
const CATEGORY_LABELS: Record<string, string> = {
  All: "All",
  STRESS_TEST: "Stress Test",
  EDGE_CASE: "Edge Case",
  CONTEXT: "Context",
  PERFORMANCE: "Performance",
  LOGIC: "Logic",
  KRAWALL: "Krawall",
  ATTACK_SURFACE: "Attack Surface",
};

// Quick Start template built into the guide
const QUICK_START: ScenarioTemplate = {
  id: "quick-start",
  name: "Quick Smoke Test",
  description: "A simple 3-message scenario to verify your chatbot responds correctly. Recommended for first-time setup.",
  category: "QUICK_START",
  flowConfig: [
    { type: "message", content: "Hello! Can you introduce yourself?" },
    { type: "message", content: "What is the capital of France?" },
    { type: "message", content: "Thank you for your help!" },
  ],
  verbosityLevel: "normal",
  repetitions: 1,
  concurrency: 1,
  delayBetweenMs: 500,
  messageTemplates: {},
};

let stepCounter = 0;
function generateId(): string {
  stepCounter++;
  return "tpl_" + stepCounter + "_" + Math.random().toString(36).substring(2, 7);
}

/**
 * Convert template flowConfig entries into FlowStep[] format
 * compatible with the FlowBuilder component.
 */
function convertTemplateFlow(flowConfig: any[]): FlowStep[] {
  return flowConfig.map((entry) => {
    if (entry.type === "message") {
      return {
        id: generateId(),
        type: "message" as const,
        config: { content: entry.content || "" },
      };
    }
    if (entry.type === "loop") {
      return {
        id: generateId(),
        type: "loop" as const,
        config: {
          iterations: entry.iterations || 1,
          bodySteps: convertTemplateFlow(entry.steps || []),
        },
      };
    }
    if (entry.type === "conditional") {
      return {
        id: generateId(),
        type: "conditional" as const,
        config: {
          condition: entry.condition || "",
          thenSteps: convertTemplateFlow(entry.thenSteps || []),
          elseSteps: convertTemplateFlow(entry.elseSteps || []),
        },
      };
    }
    if (entry.type === "delay") {
      return {
        id: generateId(),
        type: "delay" as const,
        config: { durationMs: entry.durationMs || 1000 },
      };
    }
    // Fallback: treat unknown as message
    return {
      id: generateId(),
      type: "message" as const,
      config: { content: String(entry.content || "") },
    };
  });
}

function buildFlowConfig(steps: FlowStep[]): FlowStep[] {
  return steps.map((step, index) => ({
    ...step,
    next: index < steps.length - 1 ? steps[index + 1].id : undefined,
  }));
}

export function StepScenario() {
  const {
    selectedTemplateId,
    setSelectedTemplateId,
    setCreatedScenarioId,
    createdScenarioId,
    markComplete,
    currentStep,
    goNext,
    setNavProps,
  } = useWizard();
  const { toast } = useToast();
  const [subStep, setSubStep] = useState<SubStep>(createdScenarioId ? "review" : "choose");
  const [activeCategory, setActiveCategory] = useState("All");
  const [templatePage, setTemplatePage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(() => {
    if (selectedTemplateId === "quick-start") return QUICK_START.name;
    const tmpl = SCENARIO_TEMPLATES.find((t) => t.id === selectedTemplateId);
    return tmpl?.name || QUICK_START.name;
  });
  const [description, setDescription] = useState(() => {
    if (selectedTemplateId === "quick-start") return QUICK_START.description;
    const tmpl = SCENARIO_TEMPLATES.find((t) => t.id === selectedTemplateId);
    return tmpl?.description || QUICK_START.description;
  });
  const [category, setCategory] = useState("");
  const [repetitions, setRepetitions] = useState(() => {
    if (selectedTemplateId === "quick-start") return QUICK_START.repetitions;
    const tmpl = SCENARIO_TEMPLATES.find((t) => t.id === selectedTemplateId);
    return tmpl?.repetitions || 1;
  });
  const [concurrency, setConcurrency] = useState(() => {
    if (selectedTemplateId === "quick-start") return QUICK_START.concurrency;
    const tmpl = SCENARIO_TEMPLATES.find((t) => t.id === selectedTemplateId);
    return tmpl?.concurrency || 1;
  });
  const [delayBetweenMs, setDelayBetweenMs] = useState(() => {
    if (selectedTemplateId === "quick-start") return QUICK_START.delayBetweenMs;
    const tmpl = SCENARIO_TEMPLATES.find((t) => t.id === selectedTemplateId);
    return tmpl?.delayBetweenMs || 0;
  });
  const [verbosityLevel, setVerbosityLevel] = useState(() => {
    if (selectedTemplateId === "quick-start") return QUICK_START.verbosityLevel || "normal";
    const tmpl = SCENARIO_TEMPLATES.find((t) => t.id === selectedTemplateId);
    return tmpl?.verbosityLevel || "normal";
  });

  // FlowBuilder state
  const [flowBuilderKey, setFlowBuilderKey] = useState(0);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>(() => {
    if (selectedTemplateId === "quick-start") return convertTemplateFlow(QUICK_START.flowConfig);
    const tmpl = SCENARIO_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (tmpl) return convertTemplateFlow(tmpl.flowConfig);
    return [];
  });

  // Error handling state
  const [onError, setOnError] = useState<"skip" | "abort" | "retry">("skip");
  const [retryMaxRetries, setRetryMaxRetries] = useState(3);
  const [retryDelayMs, setRetryDelayMs] = useState(1000);
  const [retryBackoffMultiplier, setRetryBackoffMultiplier] = useState(1.5);
  const [statusCodeRules, setStatusCodeRules] = useState<StatusCodeRule[]>([]);

  const selectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = id === "quick-start" ? QUICK_START : SCENARIO_TEMPLATES.find((t) => t.id === id);
    if (tmpl) {
      setName(tmpl.name);
      setDescription(tmpl.description);
      setRepetitions(tmpl.repetitions);
      setConcurrency(tmpl.concurrency);
      setDelayBetweenMs(tmpl.delayBetweenMs);
      setVerbosityLevel(tmpl.verbosityLevel || "normal");
      const converted = convertTemplateFlow(tmpl.flowConfig);
      setFlowSteps(converted);
      setFlowBuilderKey((k) => k + 1);
    }
  };

  const TEMPLATES_PER_PAGE = 4;
  const filteredTemplates = activeCategory === "All"
    ? SCENARIO_TEMPLATES
    : SCENARIO_TEMPLATES.filter((t) => t.category === activeCategory);
  const totalPages = Math.ceil(filteredTemplates.length / TEMPLATES_PER_PAGE);
  const paginatedTemplates = filteredTemplates.slice(
    templatePage * TEMPLATES_PER_PAGE,
    (templatePage + 1) * TEMPLATES_PER_PAGE
  );

  // Reset page when category changes
  useEffect(() => {
    setTemplatePage(0);
  }, [activeCategory]);

  // Set nav props based on substep
  useEffect(() => {
    if (createdScenarioId && subStep === "review") {
      setNavProps({ canProceed: true });
    } else {
      setNavProps({ canProceed: false });
    }
  }, [createdScenarioId, subStep, setNavProps]);

  const createScenario = async () => {
    setCreating(true);
    setError(null);

    try {
      const errorHandling: Record<string, unknown> = {
        onError,
        retryConfig: {
          maxRetries: retryMaxRetries,
          delayMs: retryDelayMs,
          backoffMultiplier: retryBackoffMultiplier,
          maxDelayMs: 30000,
        },
        statusCodeRules: statusCodeRules.map((r) => ({
          codes: r.codes
            .split(",")
            .map((c) => parseInt(c.trim(), 10))
            .filter((c) => !isNaN(c)),
          action: r.action,
          ...(r.action === "retry"
            ? { retryConfig: { maxRetries: r.maxRetries, delayMs: r.delayMs } }
            : {}),
        })),
      };

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        flowConfig: buildFlowConfig(flowSteps),
        repetitions,
        concurrency,
        delayBetweenMs,
        verbosityLevel,
        errorHandling,
      };

      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setCreatedScenarioId(data.data.id);
        markComplete(currentStep);
        toast({ type: "success", message: `Scenario "${data.data.name}" created` });
        setTimeout(() => goNext(), 800);
      } else {
        setError(data.error || data.message || "Failed to create scenario");
        if (data.details) {
          const fieldErrors = data.details.map((d: any) => `${d.path?.join(".")}: ${d.message}`).join("; ");
          setError(fieldErrors);
        }
      }
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  };

  // If scenario already created
  if (createdScenarioId && subStep === "review") {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 mb-3">
            <Check className="h-6 w-6 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-100 mb-1">Scenario Created</h2>
          <p className="text-sm text-gray-500">ID: {createdScenarioId}</p>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSubStep("choose")}>
            Create Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="shrink-0">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">Create Scenario</h2>
        <p className="text-sm text-gray-500">
          {subStep === "choose" && "Pick a template or build from scratch."}
          {subStep === "customize" && "Configure your scenario with the flow builder."}
          {subStep === "review" && "Review and create your scenario."}
        </p>
        <div className="flex items-center gap-2 mt-3">
          {(["choose", "customize", "review"] as SubStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => s !== "review" && setSubStep(s)}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${
                  subStep === s ? "text-blue-400 bg-blue-500/10" : "text-gray-500 hover:text-gray-400"
                }`}
              >
                <span className="font-mono">{i + 1}</span>
                <span className="capitalize">{s}</span>
              </button>
              {i < 2 && <ChevronRight className="h-3 w-3 text-gray-700" />}
            </div>
          ))}
        </div>
      </div>

      {/* Sub-step: Choose */}
      {subStep === "choose" && (
        <div className="space-y-4 animate-fadeIn max-w-2xl mx-auto flex-1 min-h-0 overflow-y-auto">
          {/* Quick Start */}
          <div>
            <div className="text-xs font-medium text-gray-400 mb-2">Recommended</div>
            <TemplateCard
              template={QUICK_START}
              selected={selectedTemplateId === "quick-start"}
              onClick={() => selectTemplate("quick-start")}
            />
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-2.5 py-1 text-xs rounded-full transition-colors ${
                  activeCategory === cat
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "text-gray-500 hover:text-gray-400"
                }`}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          {/* Template grid with pagination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paginatedTemplates.map((tmpl) => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                selected={selectedTemplateId === tmpl.id}
                onClick={() => selectTemplate(tmpl.id)}
              />
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setTemplatePage((p) => Math.max(0, p - 1))}
                disabled={templatePage === 0}
                className="px-2 py-1 text-xs rounded text-gray-400 hover:text-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-500">
                {templatePage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setTemplatePage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={templatePage >= totalPages - 1}
                className="px-2 py-1 text-xs rounded text-gray-400 hover:text-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Create from scratch */}
          <button
            onClick={() => {
              setSelectedTemplateId(null);
              setName("Custom Scenario");
              setDescription("A custom scenario");
              setCategory("");
              setRepetitions(1);
              setConcurrency(1);
              setDelayBetweenMs(0);
              setVerbosityLevel("normal");
              setFlowSteps([]);
              setFlowBuilderKey((k) => k + 1);
              setOnError("skip");
              setRetryMaxRetries(3);
              setRetryDelayMs(1000);
              setRetryBackoffMultiplier(1.5);
              setStatusCodeRules([]);
              setSubStep("customize");
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 px-4 py-3 text-sm text-gray-500 hover:border-gray-600 hover:text-gray-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create from Scratch
          </button>

          <div className="flex justify-end">
            <Button size="sm" disabled={!selectedTemplateId} onClick={() => setSubStep("customize")}>
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Sub-step: Customize */}
      {subStep === "customize" && (
        <div className="flex flex-col gap-4 animate-fadeIn flex-1 min-h-0">
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Scenario metadata sidebar */}
            <div className="w-64 flex-shrink-0 bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-y-auto min-h-0">
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
                  <label className="block text-xs font-medium text-gray-400 mb-1">Verbosity Level</label>
                  <select
                    value={verbosityLevel}
                    onChange={(e) => setVerbosityLevel(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {VERBOSITY_LEVELS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
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
                  </div>
                </div>

                {/* Error Handling */}
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 mb-3">Error Handling</h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">On Error</label>
                      <select
                        value={onError}
                        onChange={(e) => setOnError(e.target.value as "skip" | "abort" | "retry")}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="skip">Skip</option>
                        <option value="abort">Abort</option>
                        <option value="retry">Retry</option>
                      </select>
                    </div>

                    {onError === "retry" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Max Retries</label>
                          <input
                            type="number"
                            min={0}
                            value={retryMaxRetries}
                            onChange={(e) => setRetryMaxRetries(parseInt(e.target.value) || 0)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-[10px] text-gray-500">0 = unlimited</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Delay (ms)</label>
                          <input
                            type="number"
                            min={100}
                            step={100}
                            value={retryDelayMs}
                            onChange={(e) => setRetryDelayMs(parseInt(e.target.value) || 100)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Backoff Multiplier</label>
                          <input
                            type="number"
                            min={1}
                            step={0.1}
                            value={retryBackoffMultiplier}
                            onChange={(e) => setRetryBackoffMultiplier(parseFloat(e.target.value) || 1)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}

                    {/* Status Code Rules */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-gray-400">Status Code Rules</label>
                        {statusCodeRules.length < 10 && (
                          <button
                            type="button"
                            onClick={() =>
                              setStatusCodeRules([
                                ...statusCodeRules,
                                { codes: "", action: "retry", maxRetries: 3, delayMs: 1000 },
                              ])
                            }
                            className="text-[10px] text-blue-400 hover:text-blue-300"
                          >
                            + Add Rule
                          </button>
                        )}
                      </div>

                      {statusCodeRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-900 border border-gray-700 rounded p-2 mb-2 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Rule {idx + 1}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setStatusCodeRules(statusCodeRules.filter((_, i) => i !== idx))
                              }
                              className="text-[10px] text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">
                              Status Codes (comma-separated)
                            </label>
                            <input
                              value={rule.codes}
                              onChange={(e) => {
                                const updated = [...statusCodeRules];
                                updated[idx] = { ...updated[idx], codes: e.target.value };
                                setStatusCodeRules(updated);
                              }}
                              placeholder="429, 503"
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Action</label>
                            <select
                              value={rule.action}
                              onChange={(e) => {
                                const updated = [...statusCodeRules];
                                updated[idx] = {
                                  ...updated[idx],
                                  action: e.target.value as "skip" | "abort" | "retry",
                                };
                                setStatusCodeRules(updated);
                              }}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="skip">Skip</option>
                              <option value="abort">Abort</option>
                              <option value="retry">Retry</option>
                            </select>
                          </div>
                          {rule.action === "retry" && (
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">
                                  Max Retries
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={rule.maxRetries}
                                  onChange={(e) => {
                                    const updated = [...statusCodeRules];
                                    updated[idx] = {
                                      ...updated[idx],
                                      maxRetries: parseInt(e.target.value) || 0,
                                    };
                                    setStatusCodeRules(updated);
                                  }}
                                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">
                                  Delay (ms)
                                </label>
                                <input
                                  type="number"
                                  min={100}
                                  step={100}
                                  value={rule.delayMs}
                                  onChange={(e) => {
                                    const updated = [...statusCodeRules];
                                    updated[idx] = {
                                      ...updated[idx],
                                      delayMs: parseInt(e.target.value) || 100,
                                    };
                                    setStatusCodeRules(updated);
                                  }}
                                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Flow Builder */}
            <div className="flex-1 min-w-0 min-h-0">
              <FlowBuilder key={flowBuilderKey} initialSteps={flowSteps} onChange={setFlowSteps} />
            </div>
          </div>

          <div className="flex items-center justify-between shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setSubStep("choose")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button size="sm" onClick={() => setSubStep("review")} disabled={!name}>
              Review
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Sub-step: Review & Create */}
      {subStep === "review" && (
        <div className="space-y-4 animate-fadeIn max-w-2xl mx-auto flex-1 min-h-0 overflow-y-auto">
          <Card className="!p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Scenario Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-200 font-medium">{name}</span>
              </div>
              {category && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="text-gray-200">{category}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Steps</span>
                <span className="text-gray-200">{flowSteps.length} steps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Repetitions</span>
                <span className="text-gray-200">{repetitions}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Concurrency</span>
                <span className="text-gray-200">{concurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verbosity</span>
                <span className="text-gray-200 capitalize">{verbosityLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Error Handling</span>
                <span className="text-gray-200 capitalize">{onError}</span>
              </div>
            </div>
          </Card>

          <JsonPreview
            data={{
              name: name.trim(),
              description: description.trim() || undefined,
              category: category || undefined,
              flowConfig: buildFlowConfig(flowSteps),
              repetitions,
              concurrency,
              delayBetweenMs,
              verbosityLevel,
              errorHandling: {
                onError,
                retryConfig: {
                  maxRetries: retryMaxRetries,
                  delayMs: retryDelayMs,
                  backoffMultiplier: retryBackoffMultiplier,
                  maxDelayMs: 30000,
                },
                statusCodeRules: statusCodeRules.map((r) => ({
                  codes: r.codes
                    .split(",")
                    .map((c) => parseInt(c.trim(), 10))
                    .filter((c) => !isNaN(c)),
                  action: r.action,
                  ...(r.action === "retry"
                    ? { retryConfig: { maxRetries: r.maxRetries, delayMs: r.delayMs } }
                    : {}),
                })),
              },
            }}
            title="Full Payload Preview"
          />

          {error && (
            <div className="animate-slideDown rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Failed to create scenario</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {error === "Network error" || error === "Failed to fetch"
                      ? "Can't reach the server. Is the dev server running?"
                      : error}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-2 pl-6">
                <Button variant="ghost" size="sm" onClick={createScenario}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSubStep("customize")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button onClick={createScenario} loading={creating}>
              Create Scenario
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
