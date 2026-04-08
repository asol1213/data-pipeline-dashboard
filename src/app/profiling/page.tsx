"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
  rowCount: number;
}

interface ColumnProfile {
  column: string;
  type: "number" | "string";
  totalCount: number;
  nullCount: number;
  uniqueCount: number;
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  stddev?: number;
  q1?: number;
  q3?: number;
  histogram?: { bin: string; count: number }[];
  outlierCount?: number;
  top5?: { value: number; count: number }[];
  bottom5?: { value: number; count: number }[];
  mostCommon?: { value: string; count: number };
  avgLength?: number;
  valueFrequency?: { value: string; count: number }[];
}

interface CorrelationPair {
  col1: string;
  col2: string;
  correlation: number;
}

interface ProfilingResult {
  columns: ColumnProfile[];
  correlations: CorrelationPair[];
  completeness: number;
  totalCells: number;
  missingCells: number;
}

function HistogramBar({
  bin,
  count,
  maxCount,
}: {
  bin: string;
  count: number;
  maxCount: number;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-24 text-text-muted truncate text-right" title={bin}>
        {bin}
      </div>
      <div className="flex-1 h-5 bg-bg-input rounded overflow-hidden">
        <div
          className="h-full bg-accent/60 rounded"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-8 text-text-muted text-right">{count}</div>
    </div>
  );
}

function FrequencyBar({
  value,
  count,
  maxCount,
}: {
  value: string;
  count: number;
  maxCount: number;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-28 text-text-secondary truncate" title={value}>
        {value}
      </div>
      <div className="flex-1 h-5 bg-bg-input rounded overflow-hidden">
        <div
          className="h-full bg-[#8b5cf6]/60 rounded"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-8 text-text-muted text-right">{count}</div>
    </div>
  );
}

function CorrelationHeatmap({
  correlations,
  columns,
}: {
  correlations: CorrelationPair[];
  columns: string[];
}) {
  if (columns.length < 2) return null;

  const matrix = new Map<string, number>();
  for (const c of correlations) {
    matrix.set(`${c.col1}|${c.col2}`, c.correlation);
    matrix.set(`${c.col2}|${c.col1}`, c.correlation);
  }

  function getColor(r: number): string {
    if (r >= 0.7) return "rgba(59, 130, 246, 0.8)";
    if (r >= 0.3) return "rgba(59, 130, 246, 0.4)";
    if (r > 0) return "rgba(59, 130, 246, 0.15)";
    if (r === 0) return "transparent";
    if (r >= -0.3) return "rgba(239, 68, 68, 0.15)";
    if (r >= -0.7) return "rgba(239, 68, 68, 0.4)";
    return "rgba(239, 68, 68, 0.8)";
  }

  function getTextColor(r: number): string {
    if (Math.abs(r) >= 0.7) return "#ffffff";
    return "var(--text-secondary)";
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1"></th>
            {columns.map((c) => (
              <th
                key={c}
                className="px-2 py-1 text-text-muted font-medium max-w-[80px] truncate"
                title={c}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((row) => (
            <tr key={row}>
              <td className="px-2 py-1 text-text-muted font-medium max-w-[100px] truncate text-right" title={row}>
                {row}
              </td>
              {columns.map((col) => {
                if (row === col) {
                  return (
                    <td
                      key={col}
                      className="px-2 py-1 text-center"
                      style={{
                        background: "rgba(59, 130, 246, 0.8)",
                        color: "#ffffff",
                      }}
                    >
                      1.00
                    </td>
                  );
                }
                const r = matrix.get(`${row}|${col}`) ?? 0;
                return (
                  <td
                    key={col}
                    className="px-2 py-1 text-center min-w-[60px]"
                    style={{
                      background: getColor(r),
                      color: getTextColor(r),
                    }}
                  >
                    {r.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProfilingPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [profile, setProfile] = useState<ProfilingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [missingMap, setMissingMap] = useState<boolean[][] | null>(null);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((data: DatasetMeta[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setDatasets(data);
          setSelectedId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const loadProfile = useCallback(async (dsId: string) => {
    if (!dsId) return;
    setLoading(true);
    setError("");
    setProfile(null);
    setMissingMap(null);

    try {
      const res = await fetch(`/api/datasets/${dsId}/stats?profile=true`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load profile");
        return;
      }

      setProfile(data.profile);

      // Build missing map from the raw data
      if (data.missingMap) {
        setMissingMap(data.missingMap);
        setMissingHeaders(data.missingHeaders || []);
      }
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadProfile(selectedId);
  }, [selectedId, loadProfile]);

  const numericColumns = useMemo(
    () => (profile ? profile.columns.filter((c) => c.type === "number") : []),
    [profile]
  );

  const stringColumns = useMemo(
    () => (profile ? profile.columns.filter((c) => c.type === "string") : []),
    [profile]
  );

  const numericColNames = useMemo(
    () => numericColumns.map((c) => c.column),
    [numericColumns]
  );

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">Data Profiling</h1>
        <p className="text-sm text-blue-200 mt-1">
          Automatic data profiling: distributions, statistics, correlations, and
          missing value analysis.
        </p>
      </div>

      {/* Dataset selector */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-4 mb-6">
        <label className="text-xs text-text-muted uppercase tracking-wider block mb-2">
          Select Dataset
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent cursor-pointer"
        >
          {datasets.map((ds) => (
            <option key={ds.id} value={ds.id}>
              {ds.name} ({ds.rowCount} rows, {ds.headers.length} columns)
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      {profile && !loading && (
        <div className="space-y-8">
          {/* Completeness summary */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Dataset Completeness
            </h2>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="h-4 bg-bg-input rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${profile.completeness}%`,
                      background:
                        profile.completeness >= 95
                          ? "var(--success)"
                          : profile.completeness >= 80
                          ? "var(--warning)"
                          : "var(--danger)",
                    }}
                  />
                </div>
              </div>
              <div className="text-2xl font-bold text-text-primary">
                {profile.completeness}%
              </div>
            </div>
            <div className="mt-2 text-sm text-text-muted">
              {profile.totalCells - profile.missingCells} of{" "}
              {profile.totalCells} cells have data ({profile.missingCells}{" "}
              missing)
            </div>
          </div>

          {/* Numeric Column Profiles */}
          {numericColumns.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Numeric Columns
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {numericColumns.map((col) => (
                  <div
                    key={col.column}
                    className="bg-bg-card rounded-xl border border-border-subtle p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-text-primary">
                        {col.column}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">
                        numeric
                      </span>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Mean</div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.mean?.toLocaleString() ?? "-"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Median</div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.median?.toLocaleString() ?? "-"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Min</div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.min?.toLocaleString() ?? "-"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Max</div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.max?.toLocaleString() ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Std Dev</div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.stddev?.toLocaleString() ?? "-"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Q1</div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.q1?.toLocaleString() ?? "-"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Q3</div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.q3?.toLocaleString() ?? "-"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Outliers</div>
                        <div
                          className={`text-sm font-semibold ${
                            (col.outlierCount ?? 0) > 0
                              ? "text-warning"
                              : "text-text-primary"
                          }`}
                        >
                          {col.outlierCount ?? 0}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-xs text-text-muted">
                          Null/Missing
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            col.nullCount > 0
                              ? "text-danger"
                              : "text-success"
                          }`}
                        >
                          {col.nullCount}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Unique</div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.uniqueCount}
                        </div>
                      </div>
                    </div>

                    {/* Histogram */}
                    {col.histogram && col.histogram.length > 0 && (
                      <div>
                        <div className="text-xs text-text-muted mb-2">
                          Distribution
                        </div>
                        <div className="space-y-1">
                          {col.histogram.map((h, i) => (
                            <HistogramBar
                              key={i}
                              bin={h.bin}
                              count={h.count}
                              maxCount={Math.max(
                                ...col.histogram!.map((x) => x.count)
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* String Column Profiles */}
          {stringColumns.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                String Columns
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {stringColumns.map((col) => (
                  <div
                    key={col.column}
                    className="bg-bg-card rounded-xl border border-border-subtle p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-text-primary">
                        {col.column}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">
                        string
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Unique</div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.uniqueCount}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-text-muted">Total</div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.totalCount}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-text-muted">
                          Null/Missing
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            col.nullCount > 0
                              ? "text-danger"
                              : "text-success"
                          }`}
                        >
                          {col.nullCount}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-text-muted">
                          Avg Length
                        </div>
                        <div className="text-sm font-semibold text-text-primary">
                          {col.avgLength ?? "-"}
                        </div>
                      </div>
                    </div>

                    {col.mostCommon && (
                      <div className="mb-3 text-xs text-text-muted">
                        Most common:{" "}
                        <span className="text-text-primary font-medium">
                          {col.mostCommon.value}
                        </span>{" "}
                        ({col.mostCommon.count}x)
                      </div>
                    )}

                    {/* Value frequency */}
                    {col.valueFrequency && col.valueFrequency.length > 0 && (
                      <div>
                        <div className="text-xs text-text-muted mb-2">
                          Top Values
                        </div>
                        <div className="space-y-1">
                          {col.valueFrequency.map((v, i) => (
                            <FrequencyBar
                              key={i}
                              value={v.value}
                              count={v.count}
                              maxCount={col.valueFrequency![0].count}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correlation Matrix */}
          {profile.correlations.length > 0 && (
            <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Correlation Matrix
              </h2>
              <p className="text-xs text-text-muted mb-4">
                Pearson correlation between numeric columns. Blue = positive,
                Red = negative. Bold values indicate strong correlation (|r|
                &gt; 0.7).
              </p>
              <CorrelationHeatmap
                correlations={profile.correlations}
                columns={numericColNames}
              />
            </div>
          )}

          {/* Missing Values Map */}
          {missingMap && missingMap.length > 0 && (
            <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Missing Values Map
              </h2>
              <p className="text-xs text-text-muted mb-4">
                Dark = data present, Red = missing. Showing first{" "}
                {Math.min(missingMap.length, 100)} rows.
              </p>
              <div className="overflow-x-auto">
                <div className="inline-block">
                  {/* Column headers */}
                  <div className="flex gap-px mb-1">
                    {missingHeaders.map((h) => (
                      <div
                        key={h}
                        className="w-5 text-[8px] text-text-muted truncate text-center"
                        title={h}
                      >
                        {h.slice(0, 3)}
                      </div>
                    ))}
                  </div>
                  {/* Grid */}
                  {missingMap.slice(0, 100).map((row, ri) => (
                    <div key={ri} className="flex gap-px">
                      {row.map((present, ci) => (
                        <div
                          key={ci}
                          className="w-5 h-2"
                          style={{
                            background: present
                              ? "var(--border-color)"
                              : "#ef4444",
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
