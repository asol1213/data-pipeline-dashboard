"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface TourStep {
  title: string;
  icon: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to DataPipe",
    icon: "\uD83D\uDE80",
    description:
      "Your all-in-one data platform. SQL, Excel, BI, Planning, and AI \u2014 all in your browser. Let\u2019s take a quick tour!",
  },
  {
    title: "Load Demo Data",
    icon: "\uD83D\uDCCA",
    description:
      "Start with enterprise data from Revolut (FinTech), Siemens (Industrial), or Deloitte (Consulting). Each includes 7\u20138 interconnected tables.",
    actionLabel: "Load Revolut Demo \u2192",
    actionHref: "/demo",
  },
  {
    title: "AI-Powered Analysis",
    icon: "\u2728",
    description:
      "Ask questions in plain English: \u201CTop 5 customers by revenue\u201D \u2014 AI generates SQL, executes it, and shows charts automatically. Try it in the SQL editor with the AI Write button.",
  },
  {
    title: "Full SQL & Spreadsheet",
    icon: "\uD83D\uDD0D",
    description:
      "Complete SQLite SQL engine: JOINs, CTEs, window functions, date functions. Plus a full spreadsheet editor with formulas, undo/redo, and find & replace.",
  },
  {
    title: "Planning & Budgeting",
    icon: "\uD83D\uDCC8",
    description:
      "P&L Simulator, Budget Builder, Variance Analysis, Cash Flow Projections, Goal Seek \u2014 everything a controller needs. Go to Planning in the nav to explore.",
    actionLabel: "Open Planning \u2192",
    actionHref: "/planning",
  },
];

const STORAGE_KEY = "datapipe-tour-done";

export default function GuidedTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [fadeClass, setFadeClass] = useState("opacity-100");
  const router = useRouter();

  const startTour = useCallback(() => {
    setStep(0);
    setFadeClass("opacity-100");
    setActive(true);
  }, []);

  // Check first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const timer = setTimeout(() => setActive(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // SSR or storage error
    }
  }, []);

  // Expose restart function on window for the nav help button
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__datapipeStartTour =
      startTour;
    return () => {
      delete (window as unknown as Record<string, unknown>).__datapipeStartTour;
    };
  }, [startTour]);

  function completeTour() {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  }

  function goToStep(nextStep: number) {
    setFadeClass("opacity-0");
    setTimeout(() => {
      setStep(nextStep);
      setFadeClass("opacity-100");
    }, 200);
  }

  function nextStep() {
    if (step >= TOUR_STEPS.length - 1) {
      completeTour();
    } else {
      goToStep(step + 1);
    }
  }

  function skipTour() {
    completeTour();
  }

  function handleAction(href: string) {
    completeTour();
    router.push(href);
  }

  if (!active) return null;

  const currentStep = TOUR_STEPS[step];
  const isLastStep = step >= TOUR_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={skipTour}
      />

      {/* Card */}
      <div
        className={`relative z-[210] w-full max-w-md mx-4 bg-bg-card border border-border-subtle rounded-2xl shadow-2xl overflow-hidden transition-opacity duration-200 ${fadeClass}`}
      >
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-accent to-[#8b5cf6]" />

        <div className="p-8">
          {/* Step counter */}
          <div className="text-xs font-medium text-text-muted mb-6">
            Step {step + 1} of {TOUR_STEPS.length}
          </div>

          {/* Large icon */}
          <div className="text-6xl mb-6 text-center" aria-hidden="true">
            {currentStep.icon}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-text-primary text-center mb-3">
            {currentStep.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-text-secondary text-center leading-relaxed mb-6">
            {currentStep.description}
          </p>

          {/* Quick action button */}
          {currentStep.actionLabel && currentStep.actionHref && (
            <div className="flex justify-center mb-6">
              <button
                onClick={() => handleAction(currentStep.actionHref!)}
                className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
              >
                {currentStep.actionLabel}
              </button>
            </div>
          )}

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className={`rounded-full transition-all ${
                  i === step
                    ? "w-3 h-3 bg-accent"
                    : i < step
                      ? "w-2.5 h-2.5 bg-accent/40"
                      : "w-2.5 h-2.5 bg-border-subtle"
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={skipTour}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors px-3 py-2"
            >
              Skip Tour
            </button>
            <button
              onClick={nextStep}
              className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
            >
              {isLastStep ? "Get Started \u2192" : "Next \u2192"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
