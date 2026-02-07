"use client";

interface StatusIndicatorProps {
  status: "live" | "idle" | "error" | "running";
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const statusStyles: Record<string, string> = {
  live: "bg-emerald-500 animate-live-pulse",
  idle: "bg-gray-500",
  error: "bg-red-500",
  running: "bg-blue-500 animate-live-pulse",
};

const sizeStyles: Record<string, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

export function StatusIndicator({
  status,
  size = "md",
  className = "",
  label,
}: StatusIndicatorProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`inline-block rounded-full ${statusStyles[status]} ${sizeStyles[size]}`}
      />
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </span>
  );
}
