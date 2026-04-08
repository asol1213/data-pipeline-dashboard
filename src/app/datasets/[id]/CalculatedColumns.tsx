"use client";

import { useState, useCallback } from "react";
import { evaluateFormula, FormulaError } from "@/lib/formulas";
import DataTable from "@/components/DataTable";

interface CalculatedColumn {
  name: string;
  formula: string;
}

interface CalculatedColumnsProps {
  headers: string[];
  rows: Record<string, string>[];
  columnTypes: Record<string, string>;
  anomalyIndices: Record<string, number[]>;
  columnStats: Record<string, { mean: number; stddev: number }>;
}

export default function CalculatedColumns({
  headers,
  rows,
  columnTypes,
  anomalyIndices,
  columnStats,
}: CalculatedColumnsProps) {
  const [calcColumns, setCalcColumns] = useState<CalculatedColumn[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFormula, setNewFormula] = useState("");
  const [previewValues, setPreviewValues] = useState<(string | number)[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = useCallback(() => {
    setError(null);
    setPreviewValues(null);
    if (!newFormula.trim()) {
      setError("Please enter a formula");
      return;
    }
    try {
      const results = rows.slice(0, 5).map((row) =>
        evaluateFormula(newFormula, row, headers)
      );
      setPreviewValues(results);
    } catch (e) {
      if (e instanceof FormulaError) {
        setError(e.message);
      } else {
        setError("Invalid formula");
      }
    }
  }, [newFormula, rows, headers]);

  const handleAdd = useCallback(() => {
    setError(null);
    if (!newName.trim()) {
      setError("Please enter a column name");
      return;
    }
    if (!newFormula.trim()) {
      setError("Please enter a formula");
      return;
    }
    // Verify it works on first row
    try {
      if (rows.length > 0) {
        evaluateFormula(newFormula, rows[0], headers);
      }
    } catch (e) {
      if (e instanceof FormulaError) {
        setError(e.message);
      } else {
        setError("Invalid formula");
      }
      return;
    }

    setCalcColumns((prev) => [...prev, { name: newName.trim(), formula: newFormula.trim() }]);
    setNewName("");
    setNewFormula("");
    setPreviewValues(null);
    setShowForm(false);
  }, [newName, newFormula, rows, headers]);

  const handleRemove = useCallback((index: number) => {
    setCalcColumns((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Compute extended rows with calculated columns
  const extendedHeaders = [...headers, ...calcColumns.map((c) => c.name)];
  const extendedColumnTypes: Record<string, string> = { ...columnTypes };
  calcColumns.forEach((c) => {
    extendedColumnTypes[c.name] = "number";
  });

  const extendedRows = rows.map((row) => {
    const extended: Record<string, string> = { ...row };
    for (const col of calcColumns) {
      try {
        const val = evaluateFormula(col.formula, row, headers);
        extended[col.name] = String(val);
      } catch {
        extended[col.name] = "ERR";
      }
    }
    return extended;
  });

  return (
    <div>
      {/* Calculated Columns Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-[#f59e0b]"></div>
            <h2 className="text-lg font-semibold text-text-primary">Calculated Columns</h2>
            {calcColumns.length > 0 && (
              <span className="text-xs bg-[#f59e0b]/10 text-[#f59e0b] px-2 py-0.5 rounded-full font-medium">
                {calcColumns.length} added
              </span>
            )}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Column
          </button>
        </div>

        {/* Active calculated columns list */}
        {calcColumns.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {calcColumns.map((col, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-sm"
              >
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#f59e0b]">Calc</span>
                <span className="text-text-primary font-medium">{col.name}</span>
                <span className="text-text-muted text-xs">= {col.formula}</span>
                <button
                  onClick={() => handleRemove(i)}
                  className="ml-1 text-text-muted hover:text-danger transition-colors"
                  title="Remove"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add column form */}
        {showForm && (
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Column Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Gross_Profit"
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Formula
                </label>
                <input
                  type="text"
                  value={newFormula}
                  onChange={(e) => {
                    setNewFormula(e.target.value);
                    setPreviewValues(null);
                    setError(null);
                  }}
                  placeholder="e.g., Revenue - COGS"
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent font-mono"
                />
              </div>
            </div>

            {/* Example formulas */}
            <div className="mb-4">
              <p className="text-[11px] text-text-muted mb-2">Example formulas:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { formula: "Revenue - COGS", label: "Gross Profit" },
                  { formula: "Revenue * 0.25", label: "Tax Estimate" },
                  { formula: 'IF(Churn_Rate > 3, "High Risk", "OK")', label: "Risk Flag" },
                  { formula: "ROUND(Revenue / Customers, 2)", label: "ARPU" },
                ].map((ex) => (
                  <button
                    key={ex.formula}
                    onClick={() => {
                      setNewFormula(ex.formula);
                      setNewName(ex.label.replace(/\s/g, "_"));
                      setPreviewValues(null);
                      setError(null);
                    }}
                    className="text-[11px] px-2 py-1 rounded-md bg-bg-secondary text-text-muted hover:text-accent transition-colors border border-border-subtle"
                  >
                    <span className="font-mono text-accent">{ex.formula}</span>
                    <span className="text-text-muted ml-1">({ex.label})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
                {error}
              </div>
            )}

            {/* Preview results */}
            {previewValues && (
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-2">Preview (first 5 rows):</p>
                <div className="flex gap-2">
                  {previewValues.map((val, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-bg-secondary text-sm font-mono text-text-primary border border-border-subtle"
                    >
                      {String(val)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handlePreview}
                className="px-4 py-2 rounded-lg bg-bg-secondary border border-border-subtle text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Preview
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm transition-colors"
              >
                Add Column
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                  setPreviewValues(null);
                }}
                className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Data Table with extended columns */}
      <DataTable
        headers={extendedHeaders}
        rows={extendedRows}
        columnTypes={extendedColumnTypes}
        anomalyIndices={anomalyIndices}
        columnStats={columnStats}
        calculatedColumns={calcColumns.map((c) => c.name)}
      />
    </div>
  );
}
