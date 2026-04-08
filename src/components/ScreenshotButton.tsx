"use client";

import { useState, useCallback } from "react";

export default function ScreenshotButton() {
  const [capturing, setCapturing] = useState(false);

  const capture = useCallback(async () => {
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const mainEl = document.querySelector("main");
      if (!mainEl) return;

      const canvas = await html2canvas(mainEl as HTMLElement, {
        backgroundColor:
          getComputedStyle(document.documentElement).getPropertyValue(
            "--bg-primary"
          ) || "#0b0f19",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement("a");
      const page = window.location.pathname.replace(/\//g, "-").replace(/^-/, "") || "home";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      link.download = `datapipe-${page}-${timestamp}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Screenshot capture failed:", err);
    } finally {
      setCapturing(false);
    }
  }, []);

  return (
    <button
      onClick={capture}
      disabled={capturing}
      className={`w-9 h-9 rounded-lg bg-bg-card border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-color transition-colors ${
        capturing ? "opacity-50 cursor-wait" : ""
      }`}
      title="Screenshot current view"
      aria-label="Screenshot current view"
    >
      {capturing ? (
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      )}
    </button>
  );
}
