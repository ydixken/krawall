"use client";

import { useState, useCallback } from "react";

// --- Types ---

export interface FlowStep {
  id: string;
  type: "message" | "delay" | "conditional" | "loop";
  config: Record<string, unknown>;
  next?: string;
}

interface FlowBuilderProps {
  initialSteps?: FlowStep[];
  onChange: (steps: FlowStep[]) => void;
}

const STEP_COLORS: Record<FlowStep["type"], string> = {
  message: "border-l-blue-500",
  delay: "border-l-yellow-500",
  conditional: "border-l-purple-500",
  loop: "border-l-green-500",
};

const STEP_LABELS: Record<FlowStep["type"], string> = {
  message: "Message",
  delay: "Delay",
  conditional: "Conditional",
  loop: "Loop",
};

const STEP_ICONS: Record<FlowStep["type"], string> = {
  message: "M",
  delay: "D",
  conditional: "C",
  loop: "L",
};

const STEP_ICON_BG: Record<FlowStep["type"], string> = {
  message: "bg-blue-600",
  delay: "bg-yellow-600",
  conditional: "bg-purple-600",
  loop: "bg-green-600",
};

function generateId(): string {
  return "step_" + Math.random().toString(36).substring(2, 9);
}

function createDefaultConfig(type: FlowStep["type"]): Record<string, unknown> {
  switch (type) {
    case "message":
      return { content: "" };
    case "delay":
      return { durationMs: 1000 };
    case "conditional":
      return { condition: "", thenSteps: [], elseSteps: [] };
    case "loop":
      return { iterations: 1, bodySteps: [] };
  }
}

function getStepSummary(step: FlowStep): string {
  switch (step.type) {
    case "message": {
      const content = (step.config.content as string) || "";
      return content ? content.substring(0, 50) + (content.length > 50 ? "..." : "") : "Empty message";
    }
    case "delay":
      return `Wait ${step.config.durationMs || 0}ms`;
    case "conditional": {
      const cond = (step.config.condition as string) || "";
      return cond ? `If: ${cond.substring(0, 40)}` : "No condition set";
    }
    case "loop":
      return `Repeat ${step.config.iterations || 0} times`;
  }
}

// --- Nested Step List (reusable for conditional then/else, loop body) ---

function NestedStepList({
  steps,
  label,
  onChange,
}: {
  steps: FlowStep[];
  label: string;
  onChange: (steps: FlowStep[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addStep = (type: FlowStep["type"]) => {
    const newStep: FlowStep = {
      id: generateId(),
      type,
      config: createDefaultConfig(type),
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (id: string, config: Record<string, unknown>) => {
    onChange(steps.map((s) => (s.id === id ? { ...s, config } : s)));
  };

  const removeStep = (id: string) => {
    onChange(steps.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="mt-2 ml-4 pl-3 border-l-2 border-gray-600">
      <div className="text-xs font-medium text-gray-400 mb-2">{label}</div>
      {steps.map((step) => (
        <div key={step.id} className="mb-2">
          <div
            className={`bg-gray-800 rounded border border-gray-600 border-l-4 ${STEP_COLORS[step.type]} p-2 cursor-pointer ${
              selectedId === step.id ? "ring-1 ring-blue-500" : ""
            }`}
            onClick={() => setSelectedId(selectedId === step.id ? null : step.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-white ${STEP_ICON_BG[step.type]}`}>
                  {STEP_ICONS[step.type]}
                </span>
                <span className="text-xs text-gray-300">{getStepSummary(step)}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeStep(step.id);
                }}
                className="text-gray-500 hover:text-red-400 text-xs"
              >
                x
              </button>
            </div>
          </div>
          {selectedId === step.id && (
            <div className="mt-1 p-2 bg-gray-800 rounded border border-gray-600">
              <InlineStepConfig step={step} onChange={(config) => updateStep(step.id, config)} />
            </div>
          )}
        </div>
      ))}
      <div className="flex gap-1 mt-1">
        {(["message", "delay", "conditional", "loop"] as const).map((type) => (
          <button
            key={type}
            onClick={() => addStep(type)}
            className="text-[10px] px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
          >
            + {STEP_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Inline Step Config (for nested editing) ---

function InlineStepConfig({
  step,
  onChange,
}: {
  step: FlowStep;
  onChange: (config: Record<string, unknown>) => void;
}) {
  switch (step.type) {
    case "message":
      return (
        <textarea
          value={(step.config.content as string) || ""}
          onChange={(e) => onChange({ ...step.config, content: e.target.value })}
          placeholder="Enter message content..."
          className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-gray-200 resize-none"
          rows={2}
        />
      );
    case "delay":
      return (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Duration (ms):</label>
          <input
            type="number"
            min={0}
            max={60000}
            value={(step.config.durationMs as number) || 0}
            onChange={(e) => onChange({ ...step.config, durationMs: parseInt(e.target.value) || 0 })}
            className="w-24 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
          />
        </div>
      );
    case "conditional":
      return (
        <div className="text-xs text-gray-400">
          <input
            value={(step.config.condition as string) || ""}
            onChange={(e) => onChange({ ...step.config, condition: e.target.value })}
            placeholder="e.g. contains:hello, matches:regex, length>10"
            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 mb-2"
          />
          <NestedStepList
            steps={(step.config.thenSteps as FlowStep[]) || []}
            label="Then:"
            onChange={(thenSteps) => onChange({ ...step.config, thenSteps })}
          />
          <NestedStepList
            steps={(step.config.elseSteps as FlowStep[]) || []}
            label="Else:"
            onChange={(elseSteps) => onChange({ ...step.config, elseSteps })}
          />
        </div>
      );
    case "loop":
      return (
        <div className="text-xs text-gray-400">
          <div className="flex items-center gap-2 mb-2">
            <label>Iterations:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={(step.config.iterations as number) || 1}
              onChange={(e) => onChange({ ...step.config, iterations: parseInt(e.target.value) || 1 })}
              className="w-20 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
            />
          </div>
          <NestedStepList
            steps={(step.config.bodySteps as FlowStep[]) || []}
            label="Loop Body:"
            onChange={(bodySteps) => onChange({ ...step.config, bodySteps })}
          />
        </div>
      );
  }
}

// --- Variable Picker ---

function VariablePicker({ onInsert }: { onInsert: (variable: string) => void }) {
  const [open, setOpen] = useState(false);
  const variables = [
    { name: "{{response}}", desc: "Last bot response" },
    { name: "{{messageIndex}}", desc: "Current message index" },
    { name: "{{timestamp}}", desc: "Current timestamp" },
    { name: "{{sessionId}}", desc: "Current session ID" },
    { name: "{{randomInt}}", desc: "Random integer" },
    { name: "{{randomText}}", desc: "Random text string" },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600"
      >
        Insert Variable
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-gray-800 border border-gray-600 rounded shadow-lg z-10">
          {variables.map((v) => (
            <button
              key={v.name}
              type="button"
              onClick={() => {
                onInsert(v.name);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 text-xs"
            >
              <span className="text-blue-400 font-mono">{v.name}</span>
              <span className="text-gray-500 ml-2">{v.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Right Panel: Step Configuration ---

function StepConfigPanel({
  step,
  onUpdate,
  onDelete,
}: {
  step: FlowStep;
  onUpdate: (config: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Configure {STEP_LABELS[step.type]} Step
        </h3>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Delete?</span>
            <button
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      <div className="text-xs text-gray-500 font-mono">ID: {step.id}</div>

      {step.type === "message" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Message Content</label>
            <textarea
              value={(step.config.content as string) || ""}
              onChange={(e) => onUpdate({ ...step.config, content: e.target.value })}
              placeholder="Enter message content... Use {{variable}} for dynamic values"
              className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-sm text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={5}
            />
          </div>
          <VariablePicker
            onInsert={(v) => {
              const current = (step.config.content as string) || "";
              onUpdate({ ...step.config, content: current + v });
            }}
          />
        </div>
      )}

      {step.type === "delay" && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Duration (milliseconds)</label>
          <input
            type="number"
            min={0}
            max={60000}
            step={100}
            value={(step.config.durationMs as number) || 0}
            onChange={(e) => onUpdate({ ...step.config, durationMs: parseInt(e.target.value) || 0 })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-yellow-500"
          />
          <div className="mt-2 flex gap-2">
            {[500, 1000, 2000, 5000].map((ms) => (
              <button
                key={ms}
                type="button"
                onClick={() => onUpdate({ ...step.config, durationMs: ms })}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
              >
                {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
              </button>
            ))}
          </div>
        </div>
      )}

      {step.type === "conditional" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Condition</label>
            <input
              value={(step.config.condition as string) || ""}
              onChange={(e) => onUpdate({ ...step.config, condition: e.target.value })}
              placeholder="e.g. contains:hello, matches:^yes, length>10"
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="mt-1 text-[10px] text-gray-500">
              Operators: contains:, matches:, length&gt;, length&lt;, equals:
            </div>
          </div>
          <NestedStepList
            steps={(step.config.thenSteps as FlowStep[]) || []}
            label="Then (condition true):"
            onChange={(thenSteps) => onUpdate({ ...step.config, thenSteps })}
          />
          <NestedStepList
            steps={(step.config.elseSteps as FlowStep[]) || []}
            label="Else (condition false):"
            onChange={(elseSteps) => onUpdate({ ...step.config, elseSteps })}
          />
        </div>
      )}

      {step.type === "loop" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Iterations</label>
            <input
              type="number"
              min={1}
              max={100}
              value={(step.config.iterations as number) || 1}
              onChange={(e) => onUpdate({ ...step.config, iterations: parseInt(e.target.value) || 1 })}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <NestedStepList
            steps={(step.config.bodySteps as FlowStep[]) || []}
            label="Loop Body:"
            onChange={(bodySteps) => onUpdate({ ...step.config, bodySteps })}
          />
        </div>
      )}
    </div>
  );
}

// --- Main FlowBuilder Component ---

export default function FlowBuilder({ initialSteps = [], onChange }: FlowBuilderProps) {
  const [steps, setSteps] = useState<FlowStep[]>(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const selectedStep = steps.find((s) => s.id === selectedStepId) || null;

  const updateSteps = useCallback(
    (newSteps: FlowStep[]) => {
      setSteps(newSteps);
      onChange(newSteps);
    },
    [onChange]
  );

  const addStep = (type: FlowStep["type"], atIndex?: number) => {
    const newStep: FlowStep = {
      id: generateId(),
      type,
      config: createDefaultConfig(type),
    };
    const newSteps = [...steps];
    const insertAt = atIndex !== undefined ? atIndex : newSteps.length;
    newSteps.splice(insertAt, 0, newStep);
    updateSteps(newSteps);
    setSelectedStepId(newStep.id);
  };

  const updateStepConfig = (id: string, config: Record<string, unknown>) => {
    updateSteps(steps.map((s) => (s.id === id ? { ...s, config } : s)));
  };

  const deleteStep = (id: string) => {
    updateSteps(steps.filter((s) => s.id !== id));
    if (selectedStepId === id) setSelectedStepId(null);
  };

  // --- Drag & Drop ---
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newSteps = [...steps];
    const [moved] = newSteps.splice(dragIndex, 1);
    newSteps.splice(dropIndex > dragIndex ? dropIndex - 1 : dropIndex, 0, moved);
    updateSteps(newSteps);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // --- Add Step Button between cards ---
  const AddStepButton = ({ atIndex }: { atIndex: number }) => {
    const [showPalette, setShowPalette] = useState(false);
    return (
      <div className="flex justify-center py-1 relative">
        <div className="w-px h-4 bg-gray-600" />
        <button
          onClick={() => setShowPalette(!showPalette)}
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 border border-gray-500 text-gray-400 hover:text-white text-xs flex items-center justify-center transition-colors"
          title="Add step here"
        >
          +
        </button>
        {showPalette && (
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded shadow-lg z-10 flex gap-1 p-2">
            {(["message", "delay", "conditional", "loop"] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  addStep(type, atIndex);
                  setShowPalette(false);
                }}
                className={`px-3 py-1.5 text-xs rounded text-white hover:opacity-80 ${STEP_ICON_BG[type]}`}
              >
                {STEP_LABELS[type]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Left Panel: Step Palette */}
      <div className="w-48 flex-shrink-0 bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Step Types</h3>
        <div className="space-y-2">
          {(["message", "delay", "conditional", "loop"] as const).map((type) => (
            <button
              key={type}
              onClick={() => addStep(type)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded border border-gray-600 hover:border-gray-500 bg-gray-700 hover:bg-gray-600 transition-colors text-left`}
            >
              <span className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white ${STEP_ICON_BG[type]}`}>
                {STEP_ICONS[type]}
              </span>
              <span className="text-sm text-gray-200">{STEP_LABELS[type]}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 text-xs text-gray-500 space-y-2">
          <p>Click a type to add it to the end of your flow.</p>
          <p>Use + buttons between steps to insert at a position.</p>
          <p>Drag steps to reorder.</p>
        </div>
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 bg-gray-800/50 rounded-lg border border-gray-700 p-4 overflow-y-auto">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-400">No steps yet</h3>
              <p className="text-sm text-gray-500 mt-1">Add steps from the palette on the left to build your flow</p>
            </div>
            <div className="flex gap-2">
              {(["message", "delay", "conditional", "loop"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => addStep(type)}
                  className={`px-3 py-2 text-sm rounded text-white hover:opacity-80 ${STEP_ICON_BG[type]}`}
                >
                  + {STEP_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {steps.map((step, index) => (
              <div key={step.id}>
                {index > 0 && <AddStepButton atIndex={index} />}
                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedStepId(selectedStepId === step.id ? null : step.id)}
                  className={`bg-gray-700 rounded-lg border border-gray-600 border-l-4 ${STEP_COLORS[step.type]} p-3 cursor-pointer transition-all ${
                    selectedStepId === step.id ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/10" : "hover:border-gray-500"
                  } ${dragIndex === index ? "opacity-50" : ""} ${
                    dragOverIndex === index && dragIndex !== index ? "border-t-2 border-t-blue-400" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Drag handle */}
                    <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 select-none">
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="5" cy="3" r="1.5" />
                        <circle cx="11" cy="3" r="1.5" />
                        <circle cx="5" cy="8" r="1.5" />
                        <circle cx="11" cy="8" r="1.5" />
                        <circle cx="5" cy="13" r="1.5" />
                        <circle cx="11" cy="13" r="1.5" />
                      </svg>
                    </div>

                    {/* Type icon */}
                    <span className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center text-white flex-shrink-0 ${STEP_ICON_BG[step.type]}`}>
                      {STEP_ICONS[step.type]}
                    </span>

                    {/* Step info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-200">{STEP_LABELS[step.type]}</div>
                      <div className="text-xs text-gray-400 truncate">{getStepSummary(step)}</div>
                    </div>

                    {/* Step number */}
                    <span className="text-xs text-gray-500 flex-shrink-0">#{index + 1}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Add step at end */}
            <div className="flex justify-center py-2">
              <div className="w-px h-4 bg-gray-600" />
            </div>
            <div className="flex justify-center">
              <div className="flex gap-2">
                {(["message", "delay", "conditional", "loop"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => addStep(type)}
                    className={`px-3 py-1.5 text-xs rounded text-white hover:opacity-80 ${STEP_ICON_BG[type]}`}
                  >
                    + {STEP_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Step Configuration */}
      <div className="w-72 flex-shrink-0 bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-y-auto">
        {selectedStep ? (
          <StepConfigPanel
            step={selectedStep}
            onUpdate={(config) => updateStepConfig(selectedStep.id, config)}
            onDelete={() => deleteStep(selectedStep.id)}
          />
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Select a step to configure</p>
            <p className="text-xs mt-2">Click on any step in the canvas to edit its settings</p>
          </div>
        )}
      </div>
    </div>
  );
}
