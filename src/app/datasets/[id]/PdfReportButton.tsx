"use client";

import { useState } from "react";
import { generateReport } from "@/lib/pdf-report";
import type { DatasetStats } from "@/lib/stats";
import type { Insight } from "@/lib/insights";
import type { QualityMetrics } from "@/lib/quality";

interface PdfReportButtonProps {
  datasetName: string;
  stats: DatasetStats;
  insights: Insight[];
  quality: QualityMetrics;
}

export default function PdfReportButton({
  datasetName,
  stats,
  insights,
  quality,
}: PdfReportButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Small delay to show loading state
      await new Promise((r) => setTimeout(r, 100));
      generateReport({ datasetName, stats, insights, quality });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-card border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-border-color transition-colors disabled:opacity-50"
    >
      {generating ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating...
        </>
      ) : (
        <>
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Generate PDF Report
        </>
      )}
    </button>
  );
}
