"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

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

function getDaxQuickExamples(ds: DatasetMeta | undefined): { label: string; prompt: string }[] {
  if (!ds) return [];
  const numCols = ds.headers.filter((h) => ds.columnTypes[h] === "number");
  const examples: { label: string; prompt: string }[] = [];

  if (numCols.length > 0) {
    examples.push({ label: `Sum ${numCols[0]}`, prompt: `Sum of ${numCols[0]}` });
    examples.push({ label: `Average ${numCols[0]}`, prompt: `Average ${numCols[0]}` });
  }
  if (numCols.length > 1) {
    examples.push({ label: `${numCols[0]} / ${numCols[1]}`, prompt: `Ratio of ${numCols[0]} to ${numCols[1]}` });
  }
  examples.push({ label: "Year-to-date total", prompt: "Year-to-date total revenue" });
  examples.push({ label: "Same period last year", prompt: "Same period last year comparison" });
  examples.push({ label: "Count distinct", prompt: "Count of distinct values" });

  return examples.slice(0, 6);
}

export default function DAXPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("sales_transactions");
  const [formula, setFormula] = useState("SUM(Revenue)");
  const [result, setResult] = useState<DAXResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // AI Write state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTableId, setAiTableId] = useState("sales_transactions");
  const [aiGeneratedFormula, setAiGeneratedFormula] = useState("");
  const [aiRefineInput, setAiRefineInput] = useState("");
  const [aiRefineOpen, setAiRefineOpen] = useState(false);

  useEffect(() => {
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((data: DatasetMeta[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setDatasets(data);
          const hasSales = data.some((d) => d.id === "sales_transactions");
          if (!hasSales) {
            setSelectedDatasetId(data[0].id);
            setAiTableId(data[0].id);
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

  const aiSelectedDataset = useMemo(() => {
    return datasets.find((d) => d.id === aiTableId);
  }, [datasets, aiTableId]);

  const aiQuickExamples = useMemo(() => {
    return getDaxQuickExamples(aiSelectedDataset);
  }, [aiSelectedDataset]);

  const handleAiGenerate = useCallback(async (prompt?: string) => {
    const question = (prompt || aiPrompt).trim();
    if (!question) return;
    setAiLoading(true);
    setAiGeneratedFormula("");
    setAiRefineOpen(false);
    try {
      const ds = datasets.find((d) => d.id === aiTableId);
      const colInfo = ds ? ds.headers.map(h => `${h} (${ds.columnTypes[h] || "string"})`).join(", ") : "";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Generate a single DAX formula for: "${question}".\nThe dataset "${aiTableId}" has these columns: ${colInfo}.\nReturn ONLY the DAX formula, nothing else. No markdown, no explanation, just the raw DAX expression. Example output: TOTALYTD(SUM(Revenue), Date)`,
        }),
      });
      const text = await res.text();
      const cleaned = text.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "").trim();
      if (cleaned) {
        setAiGeneratedFormula(cleaned);
      }
    } catch {
      // ignore - user can retry
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiTableId, datasets]);

  const handleAiUseFormula = useCallback(() => {
    if (aiGeneratedFormula) {
      setFormula(aiGeneratedFormula);
      setAiOpen(false);
      setAiPrompt("");
      setAiGeneratedFormula("");
      setAiRefineOpen(false);
    }
  }, [aiGeneratedFormula]);

  const handleAiRefine = useCallback(async () => {
    if (!aiRefineInput.trim() || !aiGeneratedFormula) return;
    setAiLoading(true);
    try {
      const ds = datasets.find((d) => d.id === aiTableId);
      const colInfo = ds ? ds.headers.map(h => `${h} (${ds.columnTypes[h] || "string"})`).join(", ") : "";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Refine this DAX formula: ${aiGeneratedFormula}\nChanges: ${aiRefineInput.trim()}\nDataset columns: ${colInfo}\nReturn ONLY the updated DAX formula, nothing else.`,
        }),
      });
      const text = await res.text();
      const cleaned = text.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "").trim();
      if (cleaned) {
        setAiGeneratedFormula(cleaned);
        setAiRefineInput("");
      }
    } catch {
      // ignore
    } finally {
      setAiLoading(false);
    }
  }, [aiRefineInput, aiGeneratedFormula, aiTableId, datasets]);

  const handleColumnChipClick = useCallback((col: string) => {
    setAiPrompt((prev) => {
      if (prev && !prev.endsWith(" ")) return prev + " " + col;
      return prev + col;
    });
  }, []);

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
                  onClick={() => { setAiOpen((v) => !v); setAiGeneratedFormula(""); setAiRefineOpen(false); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    aiOpen
                      ? "border-purple-500/50 text-purple-300 bg-purple-500/10"
                      : "border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  }`}
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
          </div>

          {/* AI DAX Assistant Panel */}
          {aiOpen && (
            <div className="bg-bg-card rounded-xl border border-purple-500/30 overflow-hidden mb-4">
              <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/20 bg-purple-500/5">
                <span className="text-sm font-medium text-purple-300 flex items-center gap-2">
                  <span>&#10024;</span> AI DAX Assistant
                </span>
                <button
                  onClick={() => { setAiOpen(false); setAiGeneratedFormula(""); setAiRefineOpen(false); }}
                  className="text-text-muted hover:text-text-secondary text-lg leading-none px-1"
                  aria-label="Close AI panel"
                >
                  &times;
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Table selector */}
                <div>
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider block mb-2">
                    Table
                  </label>
                  <select
                    value={aiTableId}
                    onChange={(e) => setAiTableId(e.target.value)}
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {datasets.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.rowCount} rows)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Column chips */}
                {aiSelectedDataset && (
                  <div>
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider block mb-2">
                      Available Columns
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {aiSelectedDataset.headers.map((h) => (
                        <button
                          key={h}
                          onClick={() => handleColumnChipClick(h)}
                          className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            aiSelectedDataset.columnTypes[h] === "number"
                              ? "bg-blue-900/20 text-blue-400 hover:bg-blue-900/40"
                              : "bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
                          }`}
                          title={`${h} (${aiSelectedDataset.columnTypes[h] || "string"}) - click to insert`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompt input */}
                <div>
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider block mb-2">
                    Describe what you want
                  </label>
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Year-to-date revenue or profit margin percentage"
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-purple-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiGenerate(); }
                      if (e.key === "Escape") setAiOpen(false);
                    }}
                    autoFocus
                    disabled={aiLoading}
                  />
                </div>

                {/* Quick examples */}
                {aiQuickExamples.length > 0 && !aiGeneratedFormula && (
                  <div>
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider block mb-2">
                      Quick Examples
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {aiQuickExamples.map((ex, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setAiPrompt(ex.prompt);
                            handleAiGenerate(ex.prompt);
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-border-subtle text-text-secondary hover:text-purple-400 hover:border-purple-500/30 transition-colors"
                        >
                          {ex.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate button */}
                {!aiGeneratedFormula && (
                  <button
                    onClick={() => handleAiGenerate()}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="w-full px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    {aiLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating DAX...
                      </>
                    ) : (
                      "Generate DAX"
                    )}
                  </button>
                )}

                {/* Generated formula preview */}
                {aiGeneratedFormula && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider block">
                      Generated Formula
                    </label>
                    <div className="bg-[#0d1117] rounded-lg p-3 overflow-x-auto">
                      <pre className="text-xs text-amber-400 font-mono whitespace-pre-wrap">{aiGeneratedFormula}</pre>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAiUseFormula}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
                      >
                        <span>&#9989;</span> Use This Formula
                      </button>
                      <button
                        onClick={() => setAiRefineOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border-subtle text-text-secondary text-sm font-medium hover:bg-bg-card-hover transition-colors"
                      >
                        <span>&#128260;</span> Refine
                      </button>
                      <button
                        onClick={() => { setAiGeneratedFormula(""); setAiRefineOpen(false); }}
                        className="px-3 py-2 text-text-muted hover:text-text-secondary text-sm transition-colors"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Refine input */}
                    {aiRefineOpen && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={aiRefineInput}
                          onChange={(e) => setAiRefineInput(e.target.value)}
                          placeholder='e.g. "make it year-to-date" or "add a filter for Online channel"'
                          className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-purple-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAiRefine();
                          }}
                          autoFocus
                          disabled={aiLoading}
                        />
                        <button
                          onClick={handleAiRefine}
                          disabled={aiLoading || !aiRefineInput.trim()}
                          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition-colors"
                        >
                          {aiLoading ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            "Refine"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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
