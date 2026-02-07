"use client";

interface CardProps {
  variant?: "default" | "bordered" | "interactive" | "stat";
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  default: "bg-gray-900 border border-gray-800",
  bordered: "bg-gray-900 border-2 border-gray-700",
  interactive:
    "bg-gray-900 border border-gray-800 hover:border-blue-500/30 transition-colors duration-150 cursor-pointer",
  stat: "bg-gray-900 border border-gray-800 p-4",
};

export function Card({
  variant = "default",
  className = "",
  children,
}: CardProps) {
  return (
    <div className={`rounded-lg p-6 ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3 className={`text-lg font-semibold text-gray-100 ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}
