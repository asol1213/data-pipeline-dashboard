"use client";

import { useState, useEffect, useCallback } from "react";

interface TourStep {
  title: string;
  description: string;
  targetSelector: string;
  fallbackPosition?: { top: number; left: number };
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to DataPipe!",
    description:
      "Your all-in-one data platform. Let's take a quick tour.",
    targetSelector: "[data-tour='hero']",
    fallbackPosition: { top: 200, left: 400 },
  },
  {
    title: "Load Demo Data",
    description:
      "Start with enterprise data from Revolut, Siemens, or Deloitte.",
    targetSelector: "[data-tour='demos']",
    fallbackPosition: { top: 500, left: 400 },
  },
  {
    title: "Ask AI",
    description:
      "Type any question in plain English — AI generates SQL and charts automatically.",
    targetSelector: "[data-tour='nav-ai']",
    fallbackPosition: { top: 56, left: 600 },
  },
  {
    title: "SQL & Spreadsheet",
    description:
      "Full SQL with JOINs, window functions, and a spreadsheet with formulas.",
    targetSelector: "[data-tour='nav-analyze']",
    fallbackPosition: { top: 56, left: 400 },
  },
  {
    title: "Planning Tools",
    description:
      "Budget builder, P&L simulator, cash flow, variance analysis — all built in.",
    targetSelector: "[data-tour='nav-planning']",
    fallbackPosition: { top: 56, left: 500 },
  },
];

const STORAGE_KEY = "datapipe-tour-done";

export default function GuidedTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const startTour = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  // Check first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Small delay to let the page render
        const timer = setTimeout(() => setActive(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // SSR or storage error
    }
  }, []);

  // Expose restart function on window for the nav help button
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__datapipeStartTour = startTour;
    return () => {
      delete (window as unknown as Record<string, unknown>).__datapipeStartTour;
    };
  }, [startTour]);

  // Position spotlight relative to target element (viewport-relative for fixed positioning)
  useEffect(() => {
    if (!active) return;

    async function positionTooltip() {
      const currentStep = TOUR_STEPS[step];
      if (!currentStep) return;

      const target = document.querySelector(currentStep.targetSelector);
      if (target) {
        // Scroll target into view
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        // Wait a tick for scroll to complete before measuring
        await new Promise((r) => setTimeout(r, 400));
        // Use getBoundingClientRect for VIEWPORT-relative coordinates (since overlay is fixed)
        const rect = target.getBoundingClientRect();
        setTooltipPos({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else if (currentStep.fallbackPosition) {
        setTooltipPos({
          top: currentStep.fallbackPosition.top,
          left: currentStep.fallbackPosition.left,
          width: 200,
          height: 40,
        });
      }
    }

    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    return () => window.removeEventListener("resize", positionTooltip);
  }, [active, step]);

  function completeTour() {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  }

  function nextStep() {
    if (step >= TOUR_STEPS.length - 1) {
      completeTour();
    } else {
      setStep(step + 1);
    }
  }

  function skipTour() {
    completeTour();
  }

  if (!active || !tooltipPos) return null;

  const currentStep = TOUR_STEPS[step];
  const targetRect = tooltipPos;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none" aria-modal="true">
      {/* Spotlight highlight around target — box-shadow covers rest of screen */}
      <div
        className="fixed z-[201] rounded-lg ring-4 ring-accent/50 pointer-events-none transition-all duration-500"
        style={{
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
        }}
      />

      {/* Tooltip — fixed at bottom center so buttons are always visible */}
      <div
        className="fixed z-[210] w-96 bg-bg-card border border-border-subtle rounded-xl shadow-2xl p-5 transition-all duration-300 pointer-events-auto"
        style={{ bottom: 32, left: "50%", transform: "translateX(-50%)" }}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-3">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-accent"
                  : i < step
                    ? "w-3 bg-accent/50"
                    : "w-3 bg-border-subtle"
              }`}
            />
          ))}
          <span className="ml-auto text-[11px] text-text-muted">
            {step + 1}/{TOUR_STEPS.length}
          </span>
        </div>

        <h3 className="text-base font-bold text-text-primary mb-1">
          {currentStep.title}
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          {currentStep.description}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={skipTour}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip Tour
          </button>
          <button
            onClick={nextStep}
            className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          >
            {step >= TOUR_STEPS.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
