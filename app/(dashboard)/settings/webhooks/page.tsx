"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import WebhookForm, { WebhookFormData } from "@/components/webhooks/WebhookForm";

interface Webhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isEnabled: boolean;
  alertThresholds: {
    errorRatePercent: number | null;
    p95ResponseTimeMs: number | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface DeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  status: "success" | "failed" | "pending";
  responseCode: number | null;
  responseBody?: string;
  error?: string;
  timestamp: string;
  durationMs?: number;
}

type ViewState = "list" | "create" | "edit";

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>("list");
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<Record<string, DeliveryLog[]>>({});
  const [logsLoading, setLogsLoading] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch("/api/webhooks");
      if (!response.ok) {
        if (response.status === 404) {
          // API not available yet
          setWebhooks([]);
          setLoading(false);
          return;
        }
        throw new Error("Failed to fetch webhooks");
      }
      const data = await response.json();
      if (data.success) {
        setWebhooks(data.data || []);
      }
    } catch (err) {
      // Graceful handling when API doesn't exist yet
      setWebhooks([]);
      console.error("Webhook API not available:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const fetchDeliveryLogs = async (webhookId: string) => {
    if (deliveryLogs[webhookId]) {
      // Already loaded, just toggle
      setExpandedLogs(expandedLogs === webhookId ? null : webhookId);
      return;
    }

    setLogsLoading(webhookId);
    setExpandedLogs(webhookId);

    try {
      const response = await fetch(`/api/webhooks/${webhookId}/deliveries?limit=50`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDeliveryLogs((prev) => ({ ...prev, [webhookId]: data.data || [] }));
        }
      } else {
        setDeliveryLogs((prev) => ({ ...prev, [webhookId]: [] }));
      }
    } catch {
      setDeliveryLogs((prev) => ({ ...prev, [webhookId]: [] }));
    } finally {
      setLogsLoading(null);
    }
  };

  const handleCreate = async (data: WebhookFormData) => {
    const response = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || "Failed to create webhook");
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to create webhook");
    }

    setViewState("list");
    await fetchWebhooks();
  };

  const handleUpdate = async (data: WebhookFormData) => {
    if (!editingWebhook) return;

    const response = await fetch(`/api/webhooks/${editingWebhook.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || "Failed to update webhook");
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to update webhook");
    }

    setViewState("list");
    setEditingWebhook(null);
    await fetchWebhooks();
  };

  const handleDelete = async (webhook: Webhook) => {
    if (!confirm(`Delete webhook "${webhook.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== webhook.id));
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to delete webhook");
      }
    } catch {
      alert("Failed to delete webhook");
    }
  };

  const handleToggleEnabled = async (webhook: Webhook) => {
    try {
      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !webhook.isEnabled }),
      });

      if (response.ok) {
        setWebhooks((prev) =>
          prev.map((w) =>
            w.id === webhook.id ? { ...w, isEnabled: !w.isEnabled } : w
          )
        );
      }
    } catch {
      console.error("Failed to toggle webhook");
    }
  };

  const handleTest = async (webhook: Webhook) => {
    setTestingId(webhook.id);
    setTestResult(null);

    try {
      const response = await fetch(`/api/webhooks/${webhook.id}/test`, {
        method: "POST",
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        setTestResult({ id: webhook.id, success: true, message: data.message || "Test delivered successfully" });
      } else {
        setTestResult({ id: webhook.id, success: false, message: data?.error || "Test delivery failed" });
      }
    } catch {
      setTestResult({ id: webhook.id, success: false, message: "Failed to reach test endpoint" });
    } finally {
      setTestingId(null);
    }
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setViewState("edit");
  };

  const handleCancel = () => {
    setViewState("list");
    setEditingWebhook(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-900/50 text-green-300";
      case "failed":
        return "bg-red-900/50 text-red-300";
      default:
        return "bg-gray-700 text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading webhooks...</div>
      </div>
    );
  }

  // Create / Edit view
  if (viewState === "create" || viewState === "edit") {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition"
          >
            &larr; Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {viewState === "create" ? "Create Webhook" : "Edit Webhook"}
            </h1>
            <p className="text-sm text-gray-400">
              {viewState === "create"
                ? "Configure a new webhook endpoint"
                : `Editing: ${editingWebhook?.name}`}
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <WebhookForm
            initialData={
              editingWebhook
                ? {
                    name: editingWebhook.name,
                    url: editingWebhook.url,
                    secret: editingWebhook.secret || "",
                    events: editingWebhook.events,
                    isEnabled: editingWebhook.isEnabled,
                    alertThresholds: editingWebhook.alertThresholds,
                  }
                : undefined
            }
            onSubmit={viewState === "create" ? handleCreate : handleUpdate}
            onCancel={handleCancel}
            submitLabel={viewState === "create" ? "Create Webhook" : "Update Webhook"}
          />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              &larr; Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white">Webhooks</h1>
          </div>
          <p className="text-gray-400 mt-1">
            Configure webhook endpoints for event notifications
          </p>
        </div>
        <button
          onClick={() => setViewState("create")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          + Create Webhook
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <div className="text-gray-400 mb-2">No webhooks configured</div>
          <p className="text-sm text-gray-500 mb-6">
            Create a webhook to receive notifications when sessions complete, fail, or exceed thresholds.
          </p>
          <button
            onClick={() => setViewState("create")}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            Create Your First Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="bg-gray-800 rounded-lg border border-gray-700"
            >
              {/* Webhook header */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">{webhook.name}</h3>
                      <button
                        onClick={() => handleToggleEnabled(webhook)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          webhook.isEnabled ? "bg-blue-600" : "bg-gray-600"
                        }`}
                        title={webhook.isEnabled ? "Enabled - click to disable" : "Disabled - click to enable"}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            webhook.isEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className={`text-xs ${webhook.isEnabled ? "text-green-400" : "text-gray-500"}`}>
                        {webhook.isEnabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 font-mono truncate" title={webhook.url}>
                      {webhook.url}
                    </div>
                  </div>
                </div>

                {/* Event badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {webhook.events.map((event) => (
                    <span
                      key={event}
                      className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 border border-gray-600"
                    >
                      {event}
                    </span>
                  ))}
                </div>

                {/* Test result */}
                {testResult && testResult.id === webhook.id && (
                  <div
                    className={`mb-3 p-2 rounded text-xs ${
                      testResult.success
                        ? "bg-green-900/20 border border-green-800 text-green-400"
                        : "bg-red-900/20 border border-red-800 text-red-400"
                    }`}
                  >
                    {testResult.message}
                    <button
                      onClick={() => setTestResult(null)}
                      className="ml-2 text-gray-500 hover:text-gray-300"
                    >
                      x
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(webhook)}
                    disabled={testingId === webhook.id}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm transition flex items-center gap-1.5"
                  >
                    {testingId === webhook.id ? (
                      <>
                        <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test"
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(webhook)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(webhook)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded text-sm transition"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => fetchDeliveryLogs(webhook.id)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition ml-auto"
                  >
                    {expandedLogs === webhook.id ? "Hide Logs" : "Delivery Logs"}
                  </button>
                </div>
              </div>

              {/* Delivery Logs (expandable) */}
              {expandedLogs === webhook.id && (
                <div className="border-t border-gray-700 p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">
                    Recent Deliveries
                  </h4>
                  {logsLoading === webhook.id ? (
                    <div className="text-sm text-gray-500 text-center py-4">Loading delivery logs...</div>
                  ) : (deliveryLogs[webhook.id]?.length || 0) === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">No delivery logs yet</div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {deliveryLogs[webhook.id].map((log) => (
                        <div
                          key={log.id}
                          className="bg-gray-900 rounded p-3 border border-gray-700 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(log.status)}`}>
                                {log.status.toUpperCase()}
                              </span>
                              <span className="text-gray-400">{log.event}</span>
                              {log.responseCode !== null && (
                                <span className="text-gray-500">HTTP {log.responseCode}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                              {log.durationMs !== undefined && (
                                <span>{log.durationMs}ms</span>
                              )}
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                          {log.error && (
                            <div className="text-red-400 mt-1">{log.error}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
