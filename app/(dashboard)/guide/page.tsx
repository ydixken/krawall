"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Check,
  Play,
  Server,
  Crosshair,
  Zap,
  FileText,
  Activity,
  BarChart3,
  Rocket,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tokenburn-guide-progress";

interface StepConfig {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => Promise<{ success: boolean; message: string }>;
  };
  link?: { label: string; href: string };
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300 font-mono overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

export default function GuidePage() {
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1]));
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionResult, setActionResult] = useState<{
    step: number;
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCompleted(new Set(parsed));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveProgress = useCallback((steps: Set<number>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...steps]));
    } catch {
      // ignore
    }
  }, []);

  const markComplete = (stepId: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(stepId);
      saveProgress(next);
      return next;
    });
  };

  const toggleExpand = (stepId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const runAction = async (step: StepConfig) => {
    if (!step.action) return;
    setActionLoading(step.id);
    setActionResult(null);
    try {
      const result = await step.action.onClick();
      setActionResult({ step: step.id, ...result });
      if (result.success) {
        markComplete(step.id);
      }
    } catch (err) {
      setActionResult({
        step: step.id,
        success: false,
        message: err instanceof Error ? err.message : "Action failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const steps: StepConfig[] = [
    {
      id: 1,
      title: "Welcome to Token-Burn",
      icon: BookOpen,
      description: "Overview of the platform",
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <strong className="text-gray-100">Token-Burn</strong> is an
            automated chatbot testing platform that helps you evaluate AI
            chatbot endpoints through structured scenarios, track token usage,
            and measure response quality.
          </p>
          <p>
            This guide will walk you through setting up your first target,
            creating test scenarios, running sessions, and analyzing results.
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>Configure chatbot targets with connection templates</li>
            <li>Create test scenarios with predefined or custom prompts</li>
            <li>Execute sessions and batches with real-time monitoring</li>
            <li>Analyze metrics, compare runs, and set up webhook alerts</li>
          </ul>
        </div>
      ),
    },
    {
      id: 2,
      title: "Start Infrastructure",
      icon: Server,
      description: "Launch required services with Docker",
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            Token-Burn requires PostgreSQL and Redis. Start them with Docker
            Compose:
          </p>
          <CodeBlock>task docker:up</CodeBlock>
          <p className="text-xs text-gray-500">
            This starts PostgreSQL (port 5432), Redis (port 6379), and Redis
            Commander (port 8081). Run{" "}
            <code className="text-gray-400">docker-compose ps</code> to verify.
          </p>
        </div>
      ),
    },
    {
      id: 3,
      title: "Create Your First Target",
      icon: Crosshair,
      description: "Set up a mock chatbot endpoint",
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            A <strong className="text-gray-100">target</strong> represents a
            chatbot API endpoint. We&apos;ll create one pointing at the built-in
            mock chatbot server.
          </p>
          <p className="text-xs text-gray-500">
            The mock server runs at{" "}
            <code className="text-gray-400">
              http://localhost:3001/v1/chat/completions
            </code>{" "}
            and mimics an OpenAI-compatible API.
          </p>
        </div>
      ),
      action: {
        label: "Create Mock Target",
        onClick: async () => {
          const res = await fetch("/api/targets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Mock Chatbot",
              endpoint: "http://localhost:3001/v1/chat/completions",
              connectorType: "HTTP_REST",
              authType: "NONE",
              authConfig: {},
              requestTemplate: {
                messagePath: "messages[-1].content",
                structure: {
                  model: "gpt-4",
                  messages: [{ role: "user", content: "{{message}}" }],
                },
              },
              responseTemplate: {
                contentPath: "choices[0].message.content",
              },
            }),
          });
          const data = await res.json();
          if (data.success) {
            return {
              success: true,
              message: `Target "${data.data.name}" created (ID: ${data.data.id})`,
            };
          }
          return {
            success: false,
            message: data.error || "Failed to create target",
          };
        },
      },
    },
    {
      id: 4,
      title: "Test the Connection",
      icon: Zap,
      description: "Verify your target is reachable",
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            Go to the{" "}
            <a
              href="/targets"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Targets page
            </a>{" "}
            and click the lightning bolt icon next to your target to test the
            connection.
          </p>
          <p className="text-xs text-gray-500">
            A successful test will show a green &quot;Healthy&quot; status and
            the round-trip latency in milliseconds.
          </p>
        </div>
      ),
      link: { label: "Go to Targets", href: "/targets" },
    },
    {
      id: 5,
      title: "Create a Scenario",
      icon: FileText,
      description: "Define a set of test prompts",
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            A <strong className="text-gray-100">scenario</strong> is a
            collection of prompts sent to a target. We&apos;ll create a basic
            one with greeting and knowledge prompts.
          </p>
        </div>
      ),
      action: {
        label: "Create Basic Scenario",
        onClick: async () => {
          const res = await fetch("/api/scenarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Quick Smoke Test",
              description:
                "A basic scenario to verify the chatbot responds correctly",
              steps: [
                {
                  order: 1,
                  content: "Hello! Can you introduce yourself?",
                  type: "PROMPT",
                  expectedBehavior: "Should respond with a greeting",
                },
                {
                  order: 2,
                  content: "What is the capital of France?",
                  type: "PROMPT",
                  expectedBehavior: "Should answer Paris",
                },
                {
                  order: 3,
                  content: "Thank you for your help!",
                  type: "PROMPT",
                  expectedBehavior: "Should respond politely",
                },
              ],
            }),
          });
          const data = await res.json();
          if (data.success) {
            return {
              success: true,
              message: `Scenario "${data.data.name}" created (ID: ${data.data.id})`,
            };
          }
          return {
            success: false,
            message: data.error || "Failed to create scenario",
          };
        },
      },
    },
    {
      id: 6,
      title: "Run Your First Test",
      icon: Play,
      description: "Execute a scenario against your target",
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            Execute a test session by pairing a target with a scenario. The
            system will send each prompt and record the responses.
          </p>
          <p className="text-xs text-gray-500">
            Make sure you&apos;ve created both a target and scenario in the
            previous steps. The button below uses the first available target and
            scenario.
          </p>
        </div>
      ),
      action: {
        label: "Run Test",
        onClick: async () => {
          // Fetch first target and scenario
          const [targetsRes, scenariosRes] = await Promise.all([
            fetch("/api/targets"),
            fetch("/api/scenarios"),
          ]);
          const targetsData = await targetsRes.json();
          const scenariosData = await scenariosRes.json();

          if (
            !targetsData.data?.length ||
            !scenariosData.data?.length
          ) {
            return {
              success: false,
              message:
                "Please create a target and scenario first (steps 3 & 5)",
            };
          }

          const res = await fetch("/api/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetId: targetsData.data[0].id,
              scenarioId: scenariosData.data[0].id,
            }),
          });
          const data = await res.json();
          if (data.success) {
            return {
              success: true,
              message: `Session started (ID: ${data.data.sessionId || data.data.id})`,
            };
          }
          return {
            success: false,
            message: data.error || "Failed to start session",
          };
        },
      },
    },
    {
      id: 7,
      title: "Watch it Live",
      icon: Activity,
      description: "Monitor your running session in real-time",
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            Navigate to the Sessions page to see your test running in real-time.
            You can watch prompts being sent and responses coming back.
          </p>
          <p className="text-xs text-gray-500">
            Active sessions appear with a blue pulsing indicator. Click on a
            session to see the full conversation log.
          </p>
        </div>
      ),
      link: { label: "Go to Sessions", href: "/sessions" },
    },
    {
      id: 8,
      title: "Analyze Results",
      icon: BarChart3,
      description: "Review metrics and performance data",
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            After your session completes, head to the Metrics page to see token
            usage, response times, and error rates across all your tests.
          </p>
          <p className="text-xs text-gray-500">
            Use the Compare page to see side-by-side results between different
            targets or scenarios.
          </p>
        </div>
      ),
      link: { label: "Go to Metrics", href: "/metrics" },
    },
    {
      id: 9,
      title: "Next Steps",
      icon: Rocket,
      description: "Explore advanced features",
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>You&apos;re all set! Here are some advanced features to explore:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {[
              {
                label: "Batch Execution",
                href: "/batches",
                desc: "Run multiple scenarios at once",
              },
              {
                label: "Compare Targets",
                href: "/compare",
                desc: "Side-by-side target comparison",
              },
              {
                label: "Webhooks",
                href: "/settings/webhooks",
                desc: "Get notified on events",
              },
              {
                label: "API Docs",
                href: "/api-docs",
                desc: "Full API reference",
              },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex flex-col rounded-md border border-gray-800 bg-gray-900/50 p-3 hover:border-gray-700 transition-colors"
              >
                <span className="text-sm font-medium text-blue-400">
                  {item.label}
                </span>
                <span className="text-xs text-gray-500">{item.desc}</span>
              </a>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const totalSteps = steps.length;
  const completedCount = completed.size;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Getting Started Guide"
        description="Follow these steps to set up and run your first chatbot test"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Guide" },
        ]}
        actions={
          completedCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCompleted(new Set());
                saveProgress(new Set());
              }}
            >
              Reset Progress
            </Button>
          ) : undefined
        }
      />

      {/* Progress bar */}
      <Card>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300 font-medium">
              Progress: {completedCount} of {totalSteps} steps
            </span>
            <span className="text-gray-500">{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {completedCount === totalSteps && (
            <p className="text-xs text-emerald-400 mt-1">
              All steps completed! You&apos;re ready to use Token-Burn.
            </p>
          )}
        </div>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isCompleted = completed.has(step.id);
          const isExpanded = expanded.has(step.id);
          const Icon = step.icon;

          return (
            <Card
              key={step.id}
              className={`transition-colors ${isCompleted ? "border-emerald-500/20" : ""}`}
            >
              {/* Step header */}
              <button
                onClick={() => toggleExpand(step.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    isCompleted
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-gray-700 bg-gray-800"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <span className="text-xs font-mono text-gray-400">
                      {step.id}
                    </span>
                  )}
                </div>
                <Icon
                  className={`h-4 w-4 shrink-0 ${isCompleted ? "text-emerald-400" : "text-gray-500"}`}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${isCompleted ? "text-emerald-300" : "text-gray-100"}`}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {step.description}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                )}
              </button>

              {/* Step content */}
              {isExpanded && (
                <div className="mt-4 pl-11 space-y-3 animate-fadeIn">
                  {step.content}

                  <div className="flex items-center gap-2 pt-2">
                    {step.action && (
                      <Button
                        size="sm"
                        loading={actionLoading === step.id}
                        onClick={() => runAction(step)}
                      >
                        {step.action.label}
                      </Button>
                    )}
                    {step.link && (
                      <a href={step.link.href}>
                        <Button variant="secondary" size="sm">
                          {step.link.label}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </a>
                    )}
                    {!isCompleted && !step.action && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markComplete(step.id)}
                      >
                        Mark as done
                      </Button>
                    )}
                  </div>

                  {/* Action result */}
                  {actionResult && actionResult.step === step.id && (
                    <div
                      className={`rounded-md border px-3 py-2 text-xs ${
                        actionResult.success
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500/20 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {actionResult.message}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
