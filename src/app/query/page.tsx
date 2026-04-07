"use client";

import { useState, useCallback } from "react";

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

export default function QueryPage() {
  const [sql, setSql] = useState(
    "SELECT * FROM sales-q1-2026 LIMIT 10"
  );
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  const runQuery = useCallback(async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

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

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">SQL Query Editor</h1>
        <p className="text-sm text-text-muted mt-1">
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
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#0d1117] text-emerald-400 font-mono text-sm p-4 min-h-[180px] resize-y focus:outline-none placeholder-text-muted"
              placeholder="SELECT * FROM dataset_id WHERE column > value"
              spellCheck={false}
            />
            <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-between">
              <div className="text-xs text-text-muted">
                Supports: SELECT, WHERE, ORDER BY, LIMIT, GROUP BY, COUNT, SUM, AVG, MIN, MAX
              </div>
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

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-sm font-mono">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    Results
                  </span>
                  <span className="text-xs text-text-secondary">
                    {result.rowCount} row{result.rowCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-xs text-text-muted">
                  {result.executionTime}ms
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      {result.columns.map((col) => (
                        <th
                          key={col}
                          className="text-left px-4 py-2.5 text-text-muted font-medium"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
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

        {/* History sidebar */}
        {showHistory && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden sticky top-20">
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
                <div className="max-h-[60vh] overflow-y-auto">
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
            Show History
          </button>
        )}
      </div>
    </div>
  );
}
