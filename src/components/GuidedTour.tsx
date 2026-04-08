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

  // Position tooltip relative to target element
  useEffect(() => {
    if (!active) return;

    function positionTooltip() {
      const currentStep = TOUR_STEPS[step];
      if (!currentStep) return;

      const target = document.querySelector(currentStep.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTooltipPos({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
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

  // Calculate tooltip position (below or above target)
  const tooltipTop = tooltipPos.top + tooltipPos.height + 12;
  const tooltipLeft = Math.max(
    16,
    Math.min(
      tooltipPos.left + tooltipPos.width / 2 - 160,
      (typeof window !== "undefined" ? window.innerWidth : 1000) - 336
    )
  );

  // Spotlight clip path
  const spotX = tooltipPos.left - 4;
  const spotY = tooltipPos.top - 4;
  const spotW = tooltipPos.width + 8;
  const spotH = tooltipPos.height + 8;

  return (
    <div className="fixed inset-0 z-[200]" aria-modal="true">
      {/* Dark overlay with spotlight cutout */}
      <div className="absolute inset-0 bg-black/70 transition-all duration-300">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <mask id="tour-spotlight">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={spotX}
                y={spotY}
                width={spotW}
                height={spotH}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.7)"
            mask="url(#tour-spotlight)"
          />
        </svg>
      </div>

      {/* Tooltip */}
      <div
        className="absolute z-10 w-80 bg-bg-card border border-border-subtle rounded-xl shadow-2xl p-5 transition-all duration-300"
        style={{ top: tooltipTop, left: tooltipLeft }}
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
