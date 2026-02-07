"use client";

import { useState, useRef, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  danger?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  className?: string;
}

export function Dropdown({ trigger, items, className = "" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-gray-800 bg-gray-900 py-1 shadow-xl animate-fadeIn">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  item.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DropdownButtonProps {
  label: string;
  items: DropdownItem[];
  className?: string;
}

export function DropdownButton({
  label,
  items,
  className = "",
}: DropdownButtonProps) {
  return (
    <Dropdown
      trigger={
        <div
          className={`inline-flex items-center gap-2 rounded-md bg-gray-700 px-3 py-2 text-sm font-medium text-gray-100 hover:bg-gray-600 transition-colors ${className}`}
        >
          {label}
          <ChevronDown className="h-4 w-4" />
        </div>
      }
      items={items}
    />
  );
}
