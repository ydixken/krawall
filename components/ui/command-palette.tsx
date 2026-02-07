"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Crosshair,
  FileText,
  Play,
  Layers,
  GitCompare,
  BarChart3,
  Settings,
  BookOpen,
  Code2,
  Plus,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PaletteItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group: "navigation" | "action";
  keywords?: string[];
}

const ITEMS: PaletteItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard, group: "navigation", keywords: ["home"] },
  { id: "targets", label: "Targets", href: "/targets", icon: Crosshair, group: "navigation", keywords: ["endpoints"] },
  { id: "scenarios", label: "Scenarios", href: "/scenarios", icon: FileText, group: "navigation", keywords: ["flows", "tests"] },
  { id: "sessions", label: "Sessions", href: "/sessions", icon: Play, group: "navigation", keywords: ["runs", "execution"] },
  { id: "batches", label: "Batches", href: "/batches", icon: Layers, group: "navigation", keywords: ["bulk"] },
  { id: "compare", label: "Compare", href: "/compare", icon: GitCompare, group: "navigation", keywords: ["diff", "ab"] },
  { id: "metrics", label: "Metrics", href: "/metrics", icon: BarChart3, group: "navigation", keywords: ["stats", "analytics"] },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings, group: "navigation", keywords: ["config"] },
  { id: "guide", label: "Guide", href: "/guide", icon: BookOpen, group: "navigation", keywords: ["help", "docs"] },
  { id: "api-docs", label: "API Docs", href: "/docs", icon: Code2, group: "navigation", keywords: ["swagger", "openapi"] },
  { id: "create-target", label: "Create Target", href: "/targets/new", icon: Plus, group: "action" },
  { id: "create-scenario", label: "Create Scenario", href: "/scenarios/new", icon: Plus, group: "action" },
  { id: "view-metrics", label: "View Metrics", href: "/metrics", icon: ArrowRight, group: "action" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = ITEMS.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.includes(q))
    );
  });

  const navItems = filtered.filter((i) => i.group === "navigation");
  const actionItems = filtered.filter((i) => i.group === "action");
  const allFiltered = [...navItems, ...actionItems];

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const navigate = useCallback(
    (href: string) => {
      handleClose();
      router.push(href);
    },
    [handleClose, router]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) handleClose();
        else handleOpen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleOpen, handleClose]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % allFiltered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + allFiltered.length) % allFiltered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = allFiltered[selectedIndex];
      if (item) navigate(item.href);
    } else if (e.key === "Escape") {
      handleClose();
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  let itemIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={handleClose}
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-lg border border-gray-800 bg-gray-900 shadow-2xl animate-slideIn"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-800 px-4">
          <Search className="h-4 w-4 text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and actions..."
            className="flex-1 bg-transparent py-3.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none"
          />
          <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[10px] font-mono text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-2">
          {allFiltered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No results found
            </div>
          )}

          {navItems.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Pages
              </div>
              {navItems.map((item) => {
                const idx = itemIndex++;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      selectedIndex === idx
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {actionItems.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </div>
              {actionItems.map((item) => {
                const idx = itemIndex++;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      selectedIndex === idx
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-gray-800 px-4 py-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-700 bg-gray-800 px-1 py-0.5 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-700 bg-gray-800 px-1 py-0.5 font-mono">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-700 bg-gray-800 px-1 py-0.5 font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
