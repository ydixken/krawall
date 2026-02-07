"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: { direction: "up" | "down"; value: string };
  className?: string;
}

export function MetricCard({
  label,
  value,
  trend,
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-800 bg-gray-900 p-4 ${className}`}
    >
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-2xl font-semibold text-gray-100">{value}</span>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              trend.direction === "up" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
