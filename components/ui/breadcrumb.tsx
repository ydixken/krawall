"use client";

import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center gap-1 text-sm ${className}`}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-600" />}
            {isLast || !item.href ? (
              <span
                className={
                  isLast
                    ? "text-gray-200 font-medium"
                    : "text-gray-400"
                }
              >
                {item.label}
              </span>
            ) : (
              <a
                href={item.href}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                {item.label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}
