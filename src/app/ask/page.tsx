"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface NL2SQLResult {
  sql: string;
  columns: string[];
  rows: Record<string, string | number>[];
  rowCount: number;
  executionTime: number;
  chartType: "bar" | "line" | "pie" | "kpi" | "none";
  labelColumn: string;
  valueColumns: string[];
}

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
  rowCount: number;
}

const CHART_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#ec4899",
  "#14b8a6",
];

function highlightSQL(sql: string): string {
  const keywords =
    /\b(SELECT|FROM|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|ASC|DESC|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|UNION|DISTINCT|COUNT|SUM|AVG|MIN|MAX)\b/gi;
  const strings = /('[^']*')/g;
  let result = sql;
  result = result.replace(strings, '<span class="sql-string">$1</span>');
  result = result.replace(
    keywords,
    '<span class="sql-keyword">$1</span>'
  );
  result = result.replace(
    /(?<![\w">])(\d+\.?\d*)(?![^<]*>)/g,
    '<span class="sql-number">$1</span>'
  );
  return result;
}

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<NL2SQLResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingSQL, setEditingSQL] = useState(false);
  const [editedSQL, setEditedSQL] = useState("");
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [overrideChartType, setOverrideChartType] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((data: DatasetMeta[]) => {
        if (Array.isArray(data)) setDatasets(data);
      })
      .catch(() => {});
  }, []);

  const suggestedQuestions = useMemo(() => {
    const suggestions: string[] = [];
    for (const ds of datasets) {
      const numericCols = ds.headers.filter(
        (h) => ds.columnTypes[h] === "number"
      );
      const stringCols = ds.headers.filter(
        (h) => ds.columnTypes[h] === "string"
      );

      if (stringCols.length > 0 && numericCols.length > 0) {
        suggestions.push(
          `Top 10 ${stringCols[0]} by ${numericCols[0]} in ${ds.name}`
        );
        if (numericCols.length >= 2) {
          suggestions.push(
            `Compare ${numericCols[0]} vs ${numericCols[1]} in ${ds.name}`
          );
        }
      }
    }

    // Add some universal suggestions
    suggestions.push("Revenue by channel");
    suggestions.push("Monthly revenue trend");
    suggestions.push("Which product has the highest profit margin?");
    suggestions.push("Compare budget vs actual by department");
    suggestions.push("Top 10 customers by Annual_Contract_Value");

    return suggestions.slice(0, 8);
  }, [datasets]);

  const askQuestion = useCallback(
    async (q?: string) => {
      const query = q || question;
      if (!query.trim()) return;
      setLoading(true);
      setError("");
      setResult(null);
      setEditingSQL(false);
      setOverrideChartType(null);

      try {
        const res = await fetch("/api/nl2sql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query.trim() }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to generate SQL");
          return;
        }

        setResult(data);
        setEditedSQL(data.sql);
      } catch {
        setError("Failed to process question");
      } finally {
        setLoading(false);
      }
    },
    [question]
  );

  const runEditedSQL = useCallback(async () => {
    if (!editedSQL.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: editedSQL.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Query failed");
        return;
      }

      // Re-detect chart type for edited SQL results
      setResult({
        sql: editedSQL,
        columns: data.columns,
        rows: data.rows,
        rowCount: data.rowCount,
        executionTime: data.executionTime,
        chartType: "bar",
        labelColumn: data.columns[0] || "",
        valueColumns: data.columns.slice(1).filter((c: string) => {
          if (data.rows.length === 0) return false;
          const v = data.rows[0][c];
          return (
            typeof v === "number" ||
            (typeof v === "string" && !isNaN(Number(v)) && v !== "")
          );
        }),
      });
      setEditingSQL(false);
      setOverrideChartType(null);
    } catch {
      setError("Failed to execute query");
    } finally {
      setLoading(false);
    }
  }, [editedSQL]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  const chartType = overrideChartType || result?.chartType || "none";

  const chartData = useMemo(() => {
    if (!result || chartType === "none" || chartType === "kpi") return [];
    return result.rows.map((row) => {
      const entry: Record<string, string | number> = {};
      entry[result.labelColumn] = row[result.labelColumn] ?? "";
      for (const vc of result.valueColumns) {
        const raw = row[vc];
        entry[vc] = typeof raw === "number" ? raw : Number(raw) || 0;
      }
      return entry;
    });
  }, [result, chartType]);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="text-3xl">&#10024;</div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ask Your Data</h1>
            <p className="text-sm text-blue-200 mt-1">
              Type a question in natural language. AI generates SQL, executes it,
              and shows results with charts.
            </p>
          </div>
        </div>
      </div>

      {/* Search input */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your data..."
            className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted"
            disabled={loading}
          />
          <button
            onClick={() => askQuestion()}
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Thinking...
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Ask
              </>
            )}
          </button>
        </div>
      </div>

      {/* Suggested questions */}
      {!result && !loading && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Suggested Questions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {suggestedQuestions.map((sq, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuestion(sq);
                  askQuestion(sq);
                }}
                className="text-left p-3 rounded-lg bg-bg-card border border-border-subtle hover:border-accent hover:bg-bg-card-hover transition-colors group"
              >
                <div className="text-sm text-text-secondary group-hover:text-accent">
                  {sq}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary text-sm">
              Generating SQL and executing query...
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-sm font-mono">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Generated SQL */}
          <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Generated SQL
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">
                  {result.executionTime}ms &middot; {result.rowCount} row
                  {result.rowCount !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setEditingSQL(!editingSQL)}
                  className="px-3 py-1 rounded-lg border border-border-subtle text-xs text-text-secondary hover:text-accent hover:border-accent transition-colors"
                >
                  {editingSQL ? "Cancel Edit" : "Edit SQL"}
                </button>
              </div>
            </div>
            {editingSQL ? (
              <div>
                <textarea
                  value={editedSQL}
                  onChange={(e) => setEditedSQL(e.target.value)}
                  className="w-full bg-[#0d1117] text-emerald-400 font-mono text-sm p-4 min-h-[100px] resize-y focus:outline-none"
                  spellCheck={false}
                />
                <div className="px-4 py-2 border-t border-border-subtle flex justify-end">
                  <button
                    onClick={runEditedSQL}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium"
                  >
                    Run Modified SQL
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="p-4 bg-[#0d1117] font-mono text-sm text-emerald-400 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightSQL(result.sql) }}
              />
            )}
          </div>

          {/* Chart type selector */}
          {result.labelColumn && result.valueColumns.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Chart type:</span>
              {(["bar", "line", "pie"] as const).map((ct) => (
                <button
                  key={ct}
                  onClick={() => setOverrideChartType(ct)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    chartType === ct
                      ? "bg-accent text-white"
                      : "bg-bg-card border border-border-subtle text-text-secondary hover:text-accent"
                  }`}
                >
                  {ct.charAt(0).toUpperCase() + ct.slice(1)}
                </button>
              ))}
              <button
                onClick={() => setOverrideChartType("none")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  chartType === "none"
                    ? "bg-accent text-white"
                    : "bg-bg-card border border-border-subtle text-text-secondary hover:text-accent"
                }`}
              >
                Table Only
              </button>
            </div>
          )}

          {/* KPI Card */}
          {chartType === "kpi" && result.rows.length === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {result.columns.map((col) => (
                <div
                  key={col}
                  className="bg-bg-card rounded-xl border border-border-subtle p-6 text-center"
                >
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-2">
                    {col}
                  </div>
                  <div className="text-3xl font-bold text-accent">
                    {typeof result.rows[0][col] === "number"
                      ? Number(result.rows[0][col]).toLocaleString()
                      : result.rows[0][col]}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {chartType !== "none" &&
            chartType !== "kpi" &&
            chartData.length > 0 && (
              <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
                <ResponsiveContainer width="100%" height={350}>
                  {chartType === "line" ? (
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border-subtle)"
                      />
                      <XAxis
                        dataKey={result.labelColumn}
                        tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                          color: "var(--text-primary)",
                        }}
                      />
                      <Legend />
                      {result.valueColumns.map((vc, i) => (
                        <Line
                          key={vc}
                          type="monotone"
                          dataKey={vc}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  ) : chartType === "pie" ? (
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey={result.valueColumns[0]}
                        nameKey={result.labelColumn}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                      >
                        {chartData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                          color: "var(--text-primary)",
                        }}
                      />
                    </PieChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border-subtle)"
                      />
                      <XAxis
                        dataKey={result.labelColumn}
                        tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                          color: "var(--text-primary)",
                        }}
                      />
                      <Legend />
                      {result.valueColumns.map((vc, i) => (
                        <Bar
                          key={vc}
                          dataKey={vc}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

          {/* Results Table */}
          <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Results ({result.rowCount} row{result.rowCount !== 1 ? "s" : ""})
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
        </div>
      )}
    </div>
  );
}
