"use client";

import { useState, useEffect, useCallback } from "react";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
  rowCount: number;
}

interface DAXResult {
  value: number | string;
  error?: string;
}

const exampleFormulas = [
  { label: "Sum Revenue", dax: "SUM(Revenue)" },
  { label: "Average Profit", dax: "AVERAGE(Profit)" },
  { label: "Count Rows", dax: "COUNTROWS()" },
  { label: "Distinct Products", dax: "DISTINCTCOUNT(Product_ID)" },
  { label: "Year-to-Date Revenue", dax: "TOTALYTD(SUM(Revenue), Date)" },
  { label: "Quarter-to-Date Revenue", dax: "TOTALQTD(SUM(Revenue), Date)" },
  { label: "Same Period Last Year", dax: "SAMEPERIODLASTYEAR(SUM(Revenue), Date)" },
  { label: "Online Channel Revenue", dax: 'CALCULATE(SUM(Revenue), Channel = "Online")' },
  { label: "Profit Margin", dax: "DIVIDE(SUM(Profit), SUM(Revenue), 0)" },
  { label: "Safe Division", dax: "DIVIDE(SUM(Profit), SUM(Revenue), 0)" },
  { label: "Max Revenue", dax: "MAX(Revenue)" },
  { label: "Min Quantity", dax: "MIN(Quantity)" },
];

export default function DAXPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("sales_transactions");
  const [formula, setFormula] = useState("SUM(Revenue)");
  const [result, setResult] = useState<DAXResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((data: DatasetMeta[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setDatasets(data);
          const hasSales = data.some((d) => d.id === "sales_transactions");
          if (!hasSales) {
            setSelectedDatasetId(data[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const evaluateDAX = useCallback(async () => {
    if (!formula.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dax: formula.trim(), datasetId: selectedDatasetId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "DAX evaluation failed");
        return;
      }

      setResult({ value: data.value });
    } catch {
      setError("Failed to evaluate DAX expression");
    } finally {
      setLoading(false);
    }
  }, [formula, selectedDatasetId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      evaluateDAX();
    }
  };

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Generate a single DAX formula for: "${aiPrompt.trim()}". Return ONLY the DAX formula, nothing else. No markdown, no explanation, just the raw DAX expression. Example output: TOTALYTD(SUM(Revenue), Date)`,
        }),
      });
      const text = await res.text();
      const cleaned = text.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "").trim();
      if (cleaned) {
        setFormula(cleaned);
        setAiOpen(false);
        setAiPrompt("");
      }
    } catch {
      // ignore - user can retry
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt]);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">DAX Formula Editor</h1>
        <p className="text-sm text-blue-200 mt-1">
          Evaluate DAX-like formulas with time intelligence on your datasets.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Main editor area */}
        <div className="flex-1 min-w-0">
          {/* Dataset selector */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4 mb-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-text-secondary">Dataset:</label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent cursor-pointer"
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.rowCount} rows)
                  </option>
                ))}
              </select>
            </div>
            {selectedDataset && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedDataset.headers.map((h) => (
                  <span
                    key={h}
                    className={`text-xs px-2 py-1 rounded-md cursor-pointer hover:opacity-80 ${
                      selectedDataset.columnTypes[h] === "number"
                        ? "bg-blue-900/20 text-blue-400"
                        : "bg-emerald-900/20 text-emerald-400"
                    }`}
                    onClick={() => setFormula((f) => f + h)}
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* DAX Editor */}
          <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                DAX Formula
              </span>
              <span className="text-xs text-text-muted">
                {"\u2318"}+Enter to evaluate
              </span>
            </div>
            <textarea
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#0d1117] text-amber-400 font-mono text-sm p-4 min-h-[140px] resize-y focus:outline-none placeholder-text-muted"
              placeholder="SUM(Revenue)"
              spellCheck={false}
            />
            <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-between">
              <div className="text-xs text-text-muted">
                SUM, AVERAGE, COUNT, COUNTROWS, MIN, MAX, DISTINCTCOUNT, TOTALYTD, TOTALQTD, TOTALMTD, SAMEPERIODLASTYEAR, DATEADD, CALCULATE, IF, SWITCH, DIVIDE, ABS, ROUND
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAiOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/10 transition-colors"
                >
                  &#10024; AI Write
                </button>
                <button
                  onClick={evaluateDAX}
                  disabled={loading || !formula.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Evaluate
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* AI Write panel */}
            {aiOpen && (
              <div className="px-4 py-3 border-t border-border-subtle bg-purple-500/5 flex items-center gap-2">
                <span className="text-xs text-purple-400 whitespace-nowrap">&#10024;</span>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="What DAX formula do you need? e.g. Year-to-date revenue"
                  className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-purple-500"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAiGenerate(); if (e.key === "Escape") setAiOpen(false); }}
                  autoFocus
                  disabled={aiLoading}
                />
                <button
                  onClick={handleAiGenerate}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  {aiLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </button>
                <button
                  onClick={() => setAiOpen(false)}
                  className="px-2 py-1.5 text-text-muted hover:text-text-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-sm font-mono">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Result
                </span>
              </div>
              <div className="p-8 text-center">
                <p className="text-5xl font-bold text-text-primary tracking-tight">
                  {typeof result.value === "number"
                    ? result.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : result.value}
                </p>
                <p className="text-sm text-text-muted mt-3 font-mono">{formula}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Example DAX formulas */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden sticky top-20">
            <div className="px-4 py-3 border-b border-border-subtle">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Example Formulas
              </span>
            </div>
            <div className="divide-y divide-border-subtle/50 max-h-[70vh] overflow-y-auto">
              {exampleFormulas.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setFormula(ex.dax)}
                  className="w-full text-left px-4 py-3 hover:bg-bg-card-hover transition-colors group"
                >
                  <div className="text-xs font-medium text-text-secondary group-hover:text-accent mb-1">
                    {ex.label}
                  </div>
                  <div className="font-mono text-[11px] text-text-muted truncate">
                    {ex.dax}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
