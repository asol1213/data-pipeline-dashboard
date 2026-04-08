"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { getSavedQueries, saveQuery, deleteSavedQuery, type SavedQuery } from "@/lib/saved-queries";
import QueryExcelExport from "@/components/QueryExcelExport";

interface QueryResult {
  columns: string[];
  rows: Record<string, string | number>[];
  rowCount: number;
  executionTime: number;
}

interface QueryHistoryItem {
  sql: string;
  timestamp: number;
  rowCount: number;
  executionTime: number;
  error?: string;
}

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
  rowCount: number;
}

interface ExampleQuery {
  label: string;
  sql: string;
}

function generateExampleQueries(dataset: DatasetMeta): ExampleQuery[] {
  const { id, headers, columnTypes, rowCount } = dataset;
  const numericCols = headers.filter((h) => columnTypes[h] === "number");
  const queries: ExampleQuery[] = [];

  queries.push({
    label: "All data (first 5)",
    sql: `SELECT * FROM ${id} LIMIT 5`,
  });

  if (numericCols.length >= 2) {
    queries.push({
      label: `${numericCols[0]} & ${numericCols[1]} sorted`,
      sql: `SELECT ${numericCols[0]}, ${numericCols[1]} FROM ${id} ORDER BY ${numericCols[0]} DESC`,
    });
  } else if (numericCols.length === 1) {
    queries.push({
      label: `${numericCols[0]} sorted`,
      sql: `SELECT ${numericCols[0]} FROM ${id} ORDER BY ${numericCols[0]} DESC`,
    });
  }

  if (numericCols.length >= 1) {
    queries.push({
      label: `${numericCols[0]} aggregates`,
      sql: `SELECT AVG(${numericCols[0]}), MAX(${numericCols[0]}) FROM ${id}`,
    });

    const medianEstimate = Math.round(rowCount / 2);
    queries.push({
      label: `Count where ${numericCols[0]} > ${medianEstimate}`,
      sql: `SELECT COUNT(*) FROM ${id} WHERE ${numericCols[0]} > ${medianEstimate}`,
    });
  }

  return queries;
}

function highlightSQL(sql: string): string {
  const keywords = /\b(SELECT|FROM|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|ASC|DESC|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|UNION|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INTO|VALUES|SET|DISTINCT)\b/gi;
  const functions = /\b(COUNT|SUM|AVG|MIN|MAX|ROUND|UPPER|LOWER|LENGTH|COALESCE|IFNULL|CAST)\b/gi;
  const strings = /('[^']*')/g;

  let result = sql;
  result = result.replace(strings, '<span class="sql-string">$1</span>');
  result = result.replace(functions, '<span class="sql-function">$1</span>');
  result = result.replace(keywords, '<span class="sql-keyword">$1</span>');
  result = result.replace(/(?<![\w">])(\d+\.?\d*)(?![^<]*>)/g, '<span class="sql-number">$1</span>');
  return result;
}

type SortDir = "asc" | "desc" | null;

export default function QueryPage() {
  const [sql, setSql] = useState(
    "SELECT * FROM sales-q1-2026 LIMIT 10"
  );
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("sales-q1-2026");
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    setSavedQueries(getSavedQueries());
  }, []);

  const handleSaveQuery = useCallback(() => {
    if (!saveName.trim() || !sql.trim()) return;
    saveQuery(saveName.trim(), sql.trim());
    setSavedQueries(getSavedQueries());
    setSaveDialogOpen(false);
    setSaveName("");
  }, [saveName, sql]);

  const handleDeleteSaved = useCallback((name: string) => {
    deleteSavedQuery(name);
    setSavedQueries(getSavedQueries());
  }, []);

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

  const exampleQueries = useMemo(() => {
    const ds = datasets.find((d) => d.id === selectedDatasetId);
    if (!ds) return [];
    return generateExampleQueries(ds);
  }, [datasets, selectedDatasetId]);

  const runQuery = useCallback(async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSortCol(null);
    setSortDir(null);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sql.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || "Query failed";
        setError(errMsg);
        setHistory((prev) => [
          { sql: sql.trim(), timestamp: Date.now(), rowCount: 0, executionTime: 0, error: errMsg },
          ...prev,
        ].slice(0, 10));
        return;
      }

      setResult(data);
      setHistory((prev) => [
        { sql: sql.trim(), timestamp: Date.now(), rowCount: data.rowCount, executionTime: data.executionTime },
        ...prev,
      ].slice(0, 10));
    } catch {
      setError("Failed to execute query");
    } finally {
      setLoading(false);
    }
  }, [sql]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortCol(null); setSortDir(null); }
      else setSortDir("asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!result || !sortCol || !sortDir) return result?.rows ?? [];
    const rows = [...result.rows];
    rows.sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal ?? "");
      const bStr = String(bVal ?? "");
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return rows;
  }, [result, sortCol, sortDir]);

  const sortIndicator = (col: string) => {
    if (sortCol !== col) return " \u2195";
    if (sortDir === "asc") return " \u2191";
    return " \u2193";
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">SQL Query Editor</h1>
        <p className="text-sm text-blue-200 mt-1">
          Query your datasets using SQL. Use dataset IDs or names as table names.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Main editor area */}
        <div className="flex-1 min-w-0">
          {/* SQL Editor */}
          <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                SQL Editor
              </span>
              <span className="text-xs text-text-muted">
                {"\u2318"}+Enter to run
              </span>
            </div>
            <div className="relative">
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-[#0d1117] text-emerald-400 font-mono text-sm p-4 min-h-[180px] resize-y focus:outline-none placeholder-text-muted"
                placeholder="SELECT * FROM dataset_id WHERE column > value"
                spellCheck={false}
              />
              <div
                className="absolute top-0 left-0 w-full p-4 font-mono text-sm pointer-events-none whitespace-pre-wrap break-words min-h-[180px] opacity-0"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: highlightSQL(sql) }}
              />
            </div>
            <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-between">
              <div className="text-xs text-text-muted">
                SELECT, WHERE, ORDER BY, LIMIT, GROUP BY, HAVING, JOIN, CASE WHEN, IN, BETWEEN, UNION, window functions
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={!sql.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-subtle text-text-secondary text-sm font-medium hover:bg-bg-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save
                </button>
                <button
                  onClick={runQuery}
                  disabled={loading || !sql.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Run Query
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* Save dialog */}
            {saveDialogOpen && (
              <div className="px-4 py-3 border-t border-border-subtle bg-bg-card flex items-center gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Query name..."
                  className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveQuery(); if (e.key === "Escape") setSaveDialogOpen(false); }}
                  autoFocus
                />
                <button
                  onClick={handleSaveQuery}
                  disabled={!saveName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setSaveDialogOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border-subtle text-text-muted text-sm"
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

          {/* Result Stats Banner */}
          {result && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-bg-card rounded-xl border border-border-subtle">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
                <span className="text-sm font-semibold text-text-primary">{result.rowCount} row{result.rowCount !== 1 ? "s" : ""} returned</span>
              </div>
              <div className="w-px h-4 bg-border-subtle"></div>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-text-primary">{result.executionTime}ms</span>
              </div>
              <div className="w-px h-4 bg-border-subtle"></div>
              <span className="text-xs text-text-muted">{result.columns.length} column{result.columns.length !== 1 ? "s" : ""}</span>
              <div className="ml-auto">
                <QueryExcelExport columns={result.columns} rows={result.rows} />
              </div>
            </div>
          )}

          {/* Results Table */}
          {result && (
            <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Results
                </span>
                <span className="text-xs text-text-muted">Click column headers to sort</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      {result.columns.map((col) => (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className="text-left px-4 py-2.5 text-text-muted font-medium sortable-header"
                        >
                          {col}{sortIndicator(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                      >
                        {result.columns.map((col) => (
                          <td
                            key={col}
                            className="px-4 py-2 text-text-primary font-mono text-xs"
                          >
                            {String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.rowCount === 0 && (
                <div className="p-8 text-center text-text-muted text-sm">
                  No rows returned
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showHistory && (
          <div className="w-80 flex-shrink-0 space-y-4">
            {/* Example Queries */}
            <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden sticky top-20">
              <div className="px-4 py-3 border-b border-border-subtle">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Example Queries
                </span>
              </div>
              {/* Dataset selector for examples */}
              {datasets.length > 0 && (
                <div className="px-4 py-3 border-b border-border-subtle">
                  <select
                    value={selectedDatasetId}
                    onChange={(e) => setSelectedDatasetId(e.target.value)}
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent cursor-pointer"
                  >
                    {datasets.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="divide-y divide-border-subtle/50">
                {exampleQueries.map((eq, i) => (
                  <button
                    key={i}
                    onClick={() => setSql(eq.sql)}
                    className="w-full text-left px-4 py-3 hover:bg-bg-card-hover transition-colors group"
                  >
                    <div className="text-xs font-medium text-text-secondary group-hover:text-accent mb-1">
                      {eq.label}
                    </div>
                    <div className="font-mono text-[11px] text-text-muted truncate">
                      {eq.sql}
                    </div>
                  </button>
                ))}
                {exampleQueries.length === 0 && (
                  <div className="px-4 py-3 text-xs text-text-muted">
                    Loading datasets...
                  </div>
                )}
              </div>
            </div>

            {/* Saved Queries */}
            {savedQueries.length > 0 && (
              <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
                <div className="px-4 py-3 border-b border-border-subtle">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    Saved Queries
                  </span>
                </div>
                <div className="divide-y divide-border-subtle/50">
                  {savedQueries.map((sq) => (
                    <div key={sq.name} className="flex items-center group">
                      <button
                        onClick={() => setSql(sq.sql)}
                        className="flex-1 text-left px-4 py-3 hover:bg-bg-card-hover transition-colors min-w-0"
                      >
                        <div className="text-xs font-medium text-text-secondary group-hover:text-accent mb-1 truncate">
                          {sq.name}
                        </div>
                        <div className="font-mono text-[11px] text-text-muted truncate">
                          {sq.sql}
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(sq.name)}
                        className="px-2 py-1 mr-2 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        title="Delete"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JOIN Example Queries */}
            <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  JOIN Queries
                </span>
              </div>
              <div className="divide-y divide-border-subtle/50">
                <button
                  onClick={() => setSql("SELECT p.Month, p.Revenue, s.MRR FROM pnl-2025 p JOIN saas-kpis s ON p.Month = s.Month")}
                  className="w-full text-left px-4 py-3 hover:bg-bg-card-hover transition-colors group"
                >
                  <div className="text-xs font-medium text-text-secondary group-hover:text-accent mb-1">
                    P&L + SaaS KPIs (JOIN)
                  </div>
                  <div className="font-mono text-[11px] text-text-muted truncate">
                    SELECT p.Month, p.Revenue, s.MRR FROM pnl-2025 p JOIN saas-kpis s ON p.Month = s.Month
                  </div>
                </button>
                <button
                  onClick={() => setSql("SELECT p.Revenue, f.Forecast FROM pnl-2025 p JOIN revenue-forecast f ON p.Month = f.Month")}
                  className="w-full text-left px-4 py-3 hover:bg-bg-card-hover transition-colors group"
                >
                  <div className="text-xs font-medium text-text-secondary group-hover:text-accent mb-1">
                    Revenue vs Forecast (JOIN)
                  </div>
                  <div className="font-mono text-[11px] text-text-muted truncate">
                    SELECT p.Revenue, f.Forecast FROM pnl-2025 p JOIN revenue-forecast f ON p.Month = f.Month
                  </div>
                </button>
              </div>
            </div>

            {/* Query History */}
            <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Query History
                </span>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-text-muted hover:text-text-secondary text-xs"
                >
                  Hide
                </button>
              </div>
              {history.length === 0 ? (
                <div className="p-4 text-center text-text-muted text-xs">
                  No queries yet
                </div>
              ) : (
                <div className="max-h-[40vh] overflow-y-auto">
                  {history.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setSql(item.sql)}
                      className="w-full text-left px-4 py-3 border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                    >
                      <div className="font-mono text-xs text-text-primary truncate mb-1">
                        {item.sql}
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        {item.error ? (
                          <span className="text-danger">Error</span>
                        ) : (
                          <>
                            <span className="text-text-muted">
                              {item.rowCount} rows
                            </span>
                            <span className="text-text-muted">
                              {item.executionTime}ms
                            </span>
                          </>
                        )}
                        <span className="text-text-muted ml-auto">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!showHistory && (
          <button
            onClick={() => setShowHistory(true)}
            className="fixed right-6 top-24 px-3 py-1.5 rounded-lg bg-bg-card border border-border-subtle text-xs text-text-muted hover:text-text-secondary"
          >
            Show Sidebar
          </button>
        )}
      </div>
    </div>
  );
}
