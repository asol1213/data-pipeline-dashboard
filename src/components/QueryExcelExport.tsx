"use client";

import { exportToExcel } from "@/lib/excel-export";

interface QueryExcelExportProps {
  columns: string[];
  rows: Record<string, string | number>[];
}

export default function QueryExcelExport({ columns, rows }: QueryExcelExportProps) {
  const handleExport = () => {
    exportToExcel(rows, columns, "query-results");
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-color transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3"
        />
      </svg>
      Export Results as Excel
    </button>
  );
}
