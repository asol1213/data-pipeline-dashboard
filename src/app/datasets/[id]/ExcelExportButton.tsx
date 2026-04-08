"use client";

import { useState } from "react";
import { exportToExcel } from "@/lib/excel-export";

interface ExcelExportButtonProps {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
}

export default function ExcelExportButton({
  headers,
  rows,
  fileName,
}: ExcelExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 50));
      exportToExcel(rows, headers, fileName);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-card border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-border-color transition-colors disabled:opacity-50"
    >
      {exporting ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Exporting...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3"
            />
          </svg>
          Export as Excel
        </>
      )}
    </button>
  );
}
