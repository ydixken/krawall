"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  className = "",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`relative rounded-lg border border-gray-800 bg-gray-950 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        {language && (
          <span className="text-xs font-medium text-gray-500 uppercase">
            {language}
          </span>
        )}
        <button
          onClick={handleCopy}
          className="ml-auto rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <pre className="overflow-auto p-4 text-xs leading-relaxed">
        <code className="font-mono text-gray-300">{code}</code>
      </pre>
    </div>
  );
}
