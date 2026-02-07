"use client";

import { useState } from "react";

export interface WebhookFormData {
  name: string;
  url: string;
  secret: string;
  events: string[];
  isEnabled: boolean;
  alertThresholds: {
    errorRatePercent: number | null;
    p95ResponseTimeMs: number | null;
  };
}

interface WebhookFormProps {
  initialData?: Partial<WebhookFormData>;
  onSubmit: (data: WebhookFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const AVAILABLE_EVENTS = [
  { value: "session.completed", label: "Session Completed", desc: "Fires when a session finishes successfully" },
  { value: "session.failed", label: "Session Failed", desc: "Fires when a session errors out" },
  { value: "session.cancelled", label: "Session Cancelled", desc: "Fires when a session is manually cancelled" },
  { value: "metric.threshold", label: "Metric Threshold", desc: "Fires when metrics exceed configured thresholds" },
];

export default function WebhookForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save Webhook",
}: WebhookFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [url, setUrl] = useState(initialData?.url || "");
  const [secret, setSecret] = useState(initialData?.secret || "");
  const [events, setEvents] = useState<string[]>(initialData?.events || []);
  const [isEnabled, setIsEnabled] = useState(initialData?.isEnabled ?? true);
  const [errorRatePercent, setErrorRatePercent] = useState<string>(
    initialData?.alertThresholds?.errorRatePercent?.toString() || ""
  );
  const [p95ResponseTimeMs, setP95ResponseTimeMs] = useState<string>(
    initialData?.alertThresholds?.p95ResponseTimeMs?.toString() || ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!url.trim()) {
      setError("URL is required");
      return;
    }
    try {
      new URL(url);
    } catch {
      setError("URL must be a valid URL (e.g. https://example.com/webhook)");
      return;
    }
    if (events.length === 0) {
      setError("Select at least one event");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        url: url.trim(),
        secret: secret.trim(),
        events,
        isEnabled,
        alertThresholds: {
          errorRatePercent: errorRatePercent ? parseFloat(errorRatePercent) : null,
          p95ResponseTimeMs: p95ResponseTimeMs ? parseInt(p95ResponseTimeMs) : null,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save webhook");
    } finally {
      setSubmitting(false);
    }
  };

  const showThresholds = events.includes("metric.threshold");

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Slack Alerts"
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* URL */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Endpoint URL <span className="text-red-400">*</span>
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/webhook"
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Secret */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Signing Secret</label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Optional: used to sign payloads"
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-[10px] text-gray-500 mt-1">
          If provided, payloads will be signed with HMAC-SHA256. Leave blank to skip signing.
        </p>
      </div>

      {/* Events */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">
          Events <span className="text-red-400">*</span>
        </label>
        <div className="space-y-2">
          {AVAILABLE_EVENTS.map((evt) => (
            <label
              key={evt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                events.includes(evt.value)
                  ? "bg-blue-900/20 border-blue-700"
                  : "bg-gray-800 border-gray-700 hover:border-gray-600"
              }`}
            >
              <input
                type="checkbox"
                checked={events.includes(evt.value)}
                onChange={() => toggleEvent(evt.value)}
                className="mt-0.5 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <div>
                <div className="text-sm text-gray-200">{evt.label}</div>
                <div className="text-[10px] text-gray-500">{evt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Alert Thresholds (shown when metric.threshold event selected) */}
      {showThresholds && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-400">Alert Thresholds</h4>
          <p className="text-[10px] text-gray-500">
            Configure when metric.threshold events should fire.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Error Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={errorRatePercent}
                onChange={(e) => setErrorRatePercent(e.target.value)}
                placeholder="e.g. 10"
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">P95 Response Time (ms)</label>
              <input
                type="number"
                min={0}
                max={60000}
                step={100}
                value={p95ResponseTimeMs}
                onChange={(e) => setP95ResponseTimeMs(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Enabled toggle */}
      <div className="flex items-center justify-between py-2">
        <div>
          <div className="text-sm text-gray-200">Enabled</div>
          <div className="text-[10px] text-gray-500">Disabled webhooks will not receive events</div>
        </div>
        <button
          type="button"
          onClick={() => setIsEnabled(!isEnabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isEnabled ? "bg-blue-600" : "bg-gray-600"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              isEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
