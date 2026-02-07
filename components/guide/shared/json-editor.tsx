"use client";

import { useRef, useCallback } from "react";

/**
 * Regex-based JSON syntax highlighting
 * Matches: strings (keys vs values), numbers, booleans, null
 * Same approach as components/ui/json-viewer.tsx
 */
function syntaxHighlight(json: string): string {
  // Escape HTML first
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-amber-300"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-blue-400"; // key
        } else {
          cls = "text-emerald-400"; // string
        }
      } else if (/true|false/.test(match)) {
        cls = "text-purple-400"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-gray-500"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

interface JsonEditorProps {
  value: string;
  onChange: (raw: string, parsed: Record<string, unknown> | null) => void;
  rows?: number;
  placeholder?: string;
}

export function JsonEditor({ value, onChange, rows = 6, placeholder }: JsonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const isValid = (() => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  })();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // invalid JSON — pass null
      }
      onChange(raw, parsed);
    },
    [onChange]
  );

  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const highlighted = syntaxHighlight(value || "");

  return (
    <div className="relative">
      <pre
        ref={preRef}
        className={`absolute inset-0 overflow-hidden pointer-events-none rounded-md border ${
          !isValid && value.length > 0
            ? "border-red-500/50"
            : "border-gray-700"
        } bg-gray-900 px-3 py-2 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words`}
        aria-hidden="true"
      >
        <code dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }} />
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        rows={rows}
        placeholder={placeholder}
        spellCheck={false}
        className={`relative w-full rounded-md border ${
          !isValid && value.length > 0
            ? "border-red-500/50"
            : "border-gray-700"
        } bg-transparent px-3 py-2 font-mono text-sm leading-relaxed text-transparent caret-gray-300 resize-y focus:outline-none focus:ring-1 ${
          !isValid && value.length > 0
            ? "focus:ring-red-500"
            : "focus:ring-blue-500"
        }`}
      />
      {!isValid && value.length > 0 && (
        <p className="text-[10px] text-red-400/70 mt-1">Invalid JSON</p>
      )}
    </div>
  );
}
