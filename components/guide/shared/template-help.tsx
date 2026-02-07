"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronRight, ArrowRight, ArrowDown } from "lucide-react";

export function TemplateHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
      >
        <HelpCircle className="h-3.5 w-3.5 text-blue-400" />
        <span>How do templates work?</span>
        <span className="ml-auto">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-4 text-xs bg-gray-950/30">

          {/* Overview */}
          <p className="text-gray-500">
            Templates tell Krawall how to talk to your API. The <strong className="text-gray-300">Request Template</strong>{" "}
            defines the JSON body to send, and the <strong className="text-gray-300">Response Template</strong>{" "}
            tells Krawall where to find the chatbot&apos;s reply.
          </p>

          {/* Section 1: Request Template */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-200">Request Template</h4>
            <p className="text-gray-500">
              The <strong className="text-gray-300">structure</strong> is the JSON body sent to your API.
              The <code className="text-blue-400 bg-blue-500/10 px-1 rounded">{"{{message}}"}</code>{" "}
              placeholder marks where Krawall inserts each test message.
            </p>

            {/* Visual: structure with placeholder → actual request */}
            <div className="space-y-2">
              <div className="rounded-md bg-gray-900 border border-gray-800 p-3 font-mono text-[11px] leading-relaxed">
                <div className="text-gray-600 mb-1">{"// Your template (structure)"}</div>
                <div className="text-gray-300">{"{"}</div>
                <div className="text-gray-300 pl-4">{'"model": "gpt-4",'}</div>
                <div className="text-gray-300 pl-4">{'"messages": [{'}</div>
                <div className="text-gray-300 pl-8">{'"role": "user",'}</div>
                <div className="pl-8">
                  <span className="text-gray-300">{'"content": '}</span>
                  <span className="text-blue-400 bg-blue-500/10 px-1 rounded">{'"{{message}}"'}</span>
                </div>
                <div className="text-gray-300 pl-4">{"}]"}</div>
                <div className="text-gray-300">{"}"}</div>
              </div>

              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-gray-600">
                  <ArrowDown className="h-3.5 w-3.5" />
                  <span className="text-[10px]">Krawall replaces the placeholder at <code className="text-blue-400">messagePath</code></span>
                  <ArrowDown className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="rounded-md bg-gray-900 border border-blue-500/20 p-3 font-mono text-[11px] leading-relaxed">
                <div className="text-gray-600 mb-1">{"// What actually gets sent to the API"}</div>
                <div className="text-gray-300">{"{"}</div>
                <div className="text-gray-300 pl-4">{'"model": "gpt-4",'}</div>
                <div className="text-gray-300 pl-4">{'"messages": [{'}</div>
                <div className="text-gray-300 pl-8">{'"role": "user",'}</div>
                <div className="pl-8">
                  <span className="text-gray-300">{'"content": '}</span>
                  <span className="text-blue-400">{'"Hello, how are you?"'}</span>
                </div>
                <div className="text-gray-300 pl-4">{"}]"}</div>
                <div className="text-gray-300">{"}"}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-gray-500">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-blue-400 shrink-0" />
                <span>
                  <strong className="text-gray-300">messagePath</strong> &mdash; dot-notation path to the{" "}
                  <code className="text-blue-400 bg-blue-500/10 px-0.5 rounded">{"{{message}}"}</code> field.
                  For the example above: <code className="text-gray-300">messages.0.content</code>{" "}
                  (first array element&apos;s content).
                </span>
              </div>
              <div className="flex items-start gap-2 text-gray-500">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-blue-400 shrink-0" />
                <span>
                  <strong className="text-gray-300">structure</strong> &mdash; the base JSON payload. Krawall
                  clones it for every test message and replaces the value at <code className="text-gray-300">messagePath</code>.
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800" />

          {/* Section 2: Response Template */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-200">Response Template</h4>
            <p className="text-gray-500">
              When your API responds, Krawall needs to know where the chatbot&apos;s reply is
              in the JSON response.
            </p>

            <div className="rounded-md bg-gray-900 border border-gray-800 p-3 font-mono text-[11px] leading-relaxed">
              <div className="text-gray-600 mb-1">{"// API response from your chatbot"}</div>
              <div className="text-gray-300">{"{"}</div>
              <div className="text-gray-300 pl-4">{'"choices": [{'}</div>
              <div className="text-gray-300 pl-8">{'"message": {'}</div>
              <div className="pl-12">
                <span className="text-gray-300">{'"content": '}</span>
                <span className="text-emerald-400 bg-emerald-500/10 px-1 rounded">{'"I\'m doing well!"'}</span>
                <span className="text-gray-600">{" \u2190 contentPath extracts this"}</span>
              </div>
              <div className="text-gray-300 pl-8">{"}"}</div>
              <div className="text-gray-300 pl-4">{"}],"}</div>
              <div className="pl-4">
                <span className="text-gray-500">{'"usage": { "prompt_tokens": 10, ... }'}</span>
                <span className="text-gray-600">{" \u2190 tokenUsagePath"}</span>
              </div>
              <div className="text-gray-300">{"}"}</div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-gray-500">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-gray-300">contentPath</strong> &mdash; path to the reply text.
                  Example: <code className="text-gray-300">choices.0.message.content</code>
                </span>
              </div>
              <div className="flex items-start gap-2 text-gray-500">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-gray-600 shrink-0" />
                <span>
                  <strong className="text-gray-300">tokenUsagePath</strong> (optional) &mdash; path to token
                  usage for cost tracking. Example: <code className="text-gray-300">usage</code>
                </span>
              </div>
              <div className="flex items-start gap-2 text-gray-500">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-gray-600 shrink-0" />
                <span>
                  <strong className="text-gray-300">errorPath</strong> (optional) &mdash; path to error messages
                  when the API fails. Example: <code className="text-gray-300">error.message</code>
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800" />

          {/* Section 3: Path Syntax */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-200">Path Syntax</h4>
            <p className="text-gray-500">
              Use dot notation to navigate nested JSON. Array elements use numeric indices (0-based).
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-gray-500">
              <code className="text-gray-300">message</code>
              <span>Top-level field</span>
              <code className="text-gray-300">key.subkey</code>
              <span>Nested object</span>
              <code className="text-gray-300">arr.0</code>
              <span>First array element</span>
              <code className="text-gray-300">choices.0.message.content</code>
              <span>Mixed nesting</span>
            </div>
          </div>

          {/* Tip */}
          <div className="rounded-md bg-blue-500/5 border border-blue-500/20 px-3 py-2 text-blue-400">
            Presets fill these automatically. You only need to edit templates when using a custom API
            or when your endpoint has a different request/response shape.
          </div>
        </div>
      )}
    </div>
  );
}
