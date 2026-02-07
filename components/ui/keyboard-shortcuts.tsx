"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const CHORDS: Record<string, Record<string, string>> = {
  g: {
    d: "/",
    t: "/targets",
    s: "/sessions",
    m: "/metrics",
  },
  n: {
    t: "/targets/new",
    s: "/scenarios/new",
  },
};

const SHORTCUT_DESCRIPTIONS = [
  { keys: "G → D", action: "Go to Dashboard" },
  { keys: "G → T", action: "Go to Targets" },
  { keys: "G → S", action: "Go to Sessions" },
  { keys: "G → M", action: "Go to Metrics" },
  { keys: "N → T", action: "New Target" },
  { keys: "N → S", action: "New Scenario" },
  { keys: "⌘ K", action: "Command Palette" },
  { keys: "?", action: "Show Shortcuts" },
  { keys: "Esc", action: "Close Modal" },
];

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const firstKeyRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetChord = useCallback(() => {
    firstKeyRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Ignore if modifier keys are held (except for Cmd+K handled by command palette)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // ? → show help
      if (key === "?" || (e.shiftKey && key === "/")) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      // Escape → close help
      if (key === "escape") {
        if (showHelp) {
          setShowHelp(false);
          e.preventDefault();
        }
        return;
      }

      // Second key of chord
      if (firstKeyRef.current) {
        const chordMap = CHORDS[firstKeyRef.current];
        if (chordMap && chordMap[key]) {
          e.preventDefault();
          router.push(chordMap[key]);
        }
        resetChord();
        return;
      }

      // First key of chord
      if (CHORDS[key]) {
        e.preventDefault();
        firstKeyRef.current = key;
        timerRef.current = setTimeout(resetChord, 1000);
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router, showHelp, resetChord]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={() => setShowHelp(false)}
      />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-gray-800 bg-gray-900 shadow-2xl animate-slideIn">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-100">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setShowHelp(false)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-2">
          {SHORTCUT_DESCRIPTIONS.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-800/50"
            >
              <span className="text-sm text-gray-300">{s.action}</span>
              <kbd className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-400">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
