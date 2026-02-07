"use client";

import { useState } from "react";
import Link from "next/link";
import StepProvider from "@/components/targets/wizard/StepProvider";
import StepConnection from "@/components/targets/wizard/StepConnection";
import StepTemplates from "@/components/targets/wizard/StepTemplates";
import StepReview from "@/components/targets/wizard/StepReview";
import { INITIAL_WIZARD_DATA, type WizardData } from "@/components/targets/wizard/types";

const STEPS = [
  { label: "Provider", number: 1 },
  { label: "Connection", number: 2 },
  { label: "Templates", number: 3 },
  { label: "Review", number: 4 },
];

export default function NewTargetPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL_WIZARD_DATA);

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Link href="/targets" className="text-gray-400 hover:text-white text-sm">
            Targets
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-white text-sm">New Target</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Create Target</h1>
        <p className="text-gray-400 mt-1">
          Set up a new chatbot endpoint for testing
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  step > s.number - 1 ? "bg-blue-500" : "bg-gray-700"
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s.number
                    ? "bg-blue-600 text-white"
                    : step > s.number
                    ? "bg-blue-800 text-blue-300"
                    : "bg-gray-700 text-gray-500"
                }`}
              >
                {step > s.number ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.number
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  step === s.number ? "text-white" : "text-gray-500"
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        {step === 1 && (
          <StepProvider
            data={data}
            onUpdate={updateData}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepConnection
            data={data}
            onUpdate={updateData}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepTemplates
            data={data}
            onUpdate={updateData}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepReview
            data={data}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  );
}
