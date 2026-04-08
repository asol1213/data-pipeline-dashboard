"use client";

import DataTable from "@/components/DataTable";

interface DrillDownPanelProps {
  label: string;
  column: string;
  rows: Record<string, string>[];
  headers: string[];
  columnTypes: Record<string, string>;
  onClose: () => void;
}

export default function DrillDownPanel({
  label,
  column,
  rows,
  headers,
  columnTypes,
  onClose,
}: DrillDownPanelProps) {
  return (
    <div className="drilldown-enter mt-3 bg-bg-card rounded-xl border border-accent/30 overflow-hidden shadow-lg shadow-accent/5">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-accent"></div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              Drill-Down Results
            </h4>
            <p className="text-xs text-text-muted mt-0.5">
              Showing {rows.length} row{rows.length !== 1 ? "s" : ""} where{" "}
              <span className="text-accent font-medium">{column}</span> ={" "}
              <span className="text-text-primary font-medium">{label}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-bg-secondary border border-border-subtle text-text-muted hover:text-text-primary hover:border-accent/30 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>
      </div>
      {rows.length > 0 ? (
        <DataTable
          headers={headers}
          rows={rows}
          columnTypes={columnTypes}
          compact
          conditionalFormatting="heatmap"
        />
      ) : (
        <div className="p-8 text-center text-text-muted text-sm">
          No matching rows found.
        </div>
      )}
    </div>
  );
}
