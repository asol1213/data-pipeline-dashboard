"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
}

interface PivotResult {
  rowHeaders: string[];
  colHeaders: string[];
  cells: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

type AggregationType = "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";

function clientPivot(
  data: Record<string, string>[],
  rowField: string,
  colField: string,
  valueField: string,
  aggregation: AggregationType
): PivotResult {
  if (data.length === 0) {
    return { rowHeaders: [], colHeaders: [], cells: [], rowTotals: [], colTotals: [], grandTotal: 0 };
  }

  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  for (const row of data) {
    rowSet.add(row[rowField] ?? "");
    colSet.add(row[colField] ?? "");
  }
  const rowHeaders = Array.from(rowSet);
  const colHeaders = Array.from(colSet);

  const grouped = new Map<string, number[]>();
  for (const row of data) {
    const rKey = row[rowField] ?? "";
    const cKey = row[colField] ?? "";
    const key = `${rKey}|||${cKey}`;
    if (!grouped.has(key)) grouped.set(key, []);
    const val = Number(row[valueField]);
    if (!isNaN(val)) grouped.get(key)!.push(val);
  }

  function agg(values: number[]): number {
    if (values.length === 0) return 0;
    switch (aggregation) {
      case "SUM": return Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
      case "AVG": return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
      case "COUNT": return values.length;
      case "MIN": return Math.min(...values);
      case "MAX": return Math.max(...values);
      default: return 0;
    }
  }

  const cells: number[][] = [];
  for (let ri = 0; ri < rowHeaders.length; ri++) {
    const rowCells: number[] = [];
    for (let ci = 0; ci < colHeaders.length; ci++) {
      const key = `${rowHeaders[ri]}|||${colHeaders[ci]}`;
      rowCells.push(agg(grouped.get(key) ?? []));
    }
    cells.push(rowCells);
  }

  const rowTotals = rowHeaders.map((rh) => {
    const all: number[] = [];
    for (const ch of colHeaders) {
      all.push(...(grouped.get(`${rh}|||${ch}`) ?? []));
    }
    return agg(all);
  });

  const colTotals = colHeaders.map((ch) => {
    const all: number[] = [];
    for (const rh of rowHeaders) {
      all.push(...(grouped.get(`${rh}|||${ch}`) ?? []));
    }
    return agg(all);
  });

  const allValues: number[] = [];
  for (const row of data) {
    const val = Number(row[valueField]);
    if (!isNaN(val)) allValues.push(val);
  }

  return { rowHeaders, colHeaders, cells, rowTotals, colTotals, grandTotal: agg(allValues) };
}

export default function PivotPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [datasetRows, setDatasetRows] = useState<Record<string, string>[]>([]);
  const [rowField, setRowField] = useState("");
  const [colField, setColField] = useState("");
  const [valueField, setValueField] = useState("");
  const [aggregation, setAggregation] = useState<AggregationType>("SUM");
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((data: DatasetMeta[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setDatasets(data);
          setSelectedDatasetId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDatasetId) return;
    setLoading(true);
    fetch(`/api/datasets/${selectedDatasetId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.rows) {
          setDatasetRows(data.rows);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDatasetId]);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);
  const headers = selectedDataset?.headers ?? [];
  const numericHeaders = headers.filter((h) => selectedDataset?.columnTypes[h] === "number");
  const stringHeaders = headers.filter((h) => selectedDataset?.columnTypes[h] === "string");
  const allFieldHeaders = headers;

  // Auto-set fields when dataset changes
  useEffect(() => {
    if (allFieldHeaders.length > 0) {
      if (stringHeaders.length >= 2) {
        setRowField(stringHeaders[0]);
        setColField(stringHeaders[1]);
      } else if (allFieldHeaders.length >= 2) {
        setRowField(allFieldHeaders[0]);
        setColField(allFieldHeaders[1]);
      }
      if (numericHeaders.length > 0) {
        setValueField(numericHeaders[0]);
      } else if (allFieldHeaders.length > 2) {
        setValueField(allFieldHeaders[2]);
      }
    }
  }, [selectedDatasetId, allFieldHeaders.length, stringHeaders.length, numericHeaders.length]);

  const handleAiSuggest = useCallback(async () => {
    if (!aiPrompt.trim() || !selectedDataset) return;
    setAiLoading(true);
    try {
      const cols = selectedDataset.headers.join(", ");
      const numCols = numericHeaders.join(", ");
      const strCols = stringHeaders.join(", ");
      const prompt = `Given a pivot table with these columns:
All columns: ${cols}
String columns: ${strCols}
Numeric columns: ${numCols}
Available aggregations: SUM, AVG, COUNT, MIN, MAX

User wants: "${aiPrompt.trim()}"

Return ONLY a JSON object with exactly these fields (no markdown, no explanation):
{"rowField":"...","colField":"...","valueField":"...","aggregation":"..."}

Use exact column names from the lists above.`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      const text = await res.text();
      // Extract JSON from response
      const jsonMatch = text.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          rowField?: string;
          colField?: string;
          valueField?: string;
          aggregation?: string;
        };
        if (parsed.rowField && allFieldHeaders.includes(parsed.rowField)) setRowField(parsed.rowField);
        if (parsed.colField && allFieldHeaders.includes(parsed.colField)) setColField(parsed.colField);
        if (parsed.valueField && allFieldHeaders.includes(parsed.valueField)) setValueField(parsed.valueField);
        if (parsed.aggregation && ["SUM", "AVG", "COUNT", "MIN", "MAX"].includes(parsed.aggregation.toUpperCase())) {
          setAggregation(parsed.aggregation.toUpperCase() as AggregationType);
        }
        setAiOpen(false);
        setAiPrompt("");
      }
    } catch {
      // ignore - user can retry
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, selectedDataset, allFieldHeaders, numericHeaders, stringHeaders]);

  const pivotResult = useMemo(() => {
    if (!rowField || !colField || !valueField || datasetRows.length === 0) return null;
    return clientPivot(datasetRows, rowField, colField, valueField, aggregation);
  }, [datasetRows, rowField, colField, valueField, aggregation]);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">Pivot Tables</h1>
        <p className="text-sm text-blue-200 mt-1">
          Cross-tabulate your data with configurable aggregations
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Configuration</span>
          <button
            onClick={() => setAiOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/10 transition-colors"
          >
            &#10024; AI Suggest
          </button>
        </div>
        {aiOpen && (
          <div className="mb-4 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 flex items-center gap-2">
            <span className="text-xs text-purple-400 whitespace-nowrap">&#10024;</span>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe your pivot, e.g. Revenue by channel and quarter"
              className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-purple-500"
              onKeyDown={(e) => { if (e.key === "Enter") handleAiSuggest(); if (e.key === "Escape") setAiOpen(false); }}
              autoFocus
              disabled={aiLoading}
            />
            <button
              onClick={handleAiSuggest}
              disabled={aiLoading || !aiPrompt.trim()}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {aiLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Suggesting...
                </>
              ) : (
                "Suggest"
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Dataset */}
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Dataset
            </label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>{ds.name}</option>
              ))}
            </select>
          </div>

          {/* Row Field */}
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Row Field
            </label>
            <select
              value={rowField}
              onChange={(e) => setRowField(e.target.value)}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {allFieldHeaders.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* Column Field */}
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Column Field
            </label>
            <select
              value={colField}
              onChange={(e) => setColField(e.target.value)}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {allFieldHeaders.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* Value Field */}
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Value Field
            </label>
            <select
              value={valueField}
              onChange={(e) => setValueField(e.target.value)}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {numericHeaders.length > 0
                ? numericHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))
                : allFieldHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
            </select>
          </div>

          {/* Aggregation */}
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Aggregation
            </label>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as AggregationType)}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="SUM">SUM</option>
              <option value="AVG">AVG</option>
              <option value="COUNT">COUNT</option>
              <option value="MIN">MIN</option>
              <option value="MAX">MAX</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pivot Table */}
      {loading && (
        <div className="text-center py-12 text-text-muted">Loading dataset...</div>
      )}

      {!loading && pivotResult && pivotResult.rowHeaders.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Pivot Table: {aggregation}({valueField})
            </span>
            <span className="text-xs text-text-muted">
              {pivotResult.rowHeaders.length} rows x {pivotResult.colHeaders.length} columns
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-4 py-2.5 text-text-muted font-medium bg-bg-secondary/50">
                    {rowField} \ {colField}
                  </th>
                  {pivotResult.colHeaders.map((ch) => (
                    <th key={ch} className="text-right px-4 py-2.5 text-text-muted font-medium">
                      {ch}
                    </th>
                  ))}
                  <th className="text-right px-4 py-2.5 text-accent font-semibold bg-accent/5">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {pivotResult.rowHeaders.map((rh, ri) => (
                  <tr key={rh} className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors">
                    <td className="px-4 py-2.5 text-text-primary font-medium bg-bg-secondary/50">
                      {rh}
                    </td>
                    {pivotResult.cells[ri].map((cell, ci) => (
                      <td key={ci} className="px-4 py-2 text-right text-text-secondary font-mono text-xs">
                        {cell.toLocaleString()}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-accent bg-accent/5">
                      {pivotResult.rowTotals[ri].toLocaleString()}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t-2 border-border-subtle bg-bg-secondary/30">
                  <td className="px-4 py-2.5 font-semibold text-accent">Total</td>
                  {pivotResult.colTotals.map((ct, ci) => (
                    <td key={ci} className="px-4 py-2 text-right font-mono text-xs font-semibold text-accent">
                      {ct.toLocaleString()}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-mono text-xs font-bold text-accent bg-accent/10">
                    {pivotResult.grandTotal.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && pivotResult && pivotResult.rowHeaders.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          No data available for the selected configuration
        </div>
      )}

      {!loading && !pivotResult && (
        <div className="text-center py-12 text-text-muted">
          Select a dataset and configure the pivot fields above
        </div>
      )}
    </div>
  );
}
