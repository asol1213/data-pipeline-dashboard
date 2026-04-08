"use client";

import { useState, useMemo } from "react";
import { formatNumber, autoFormat } from "@/lib/format";

interface ColumnStatInfo {
  mean: number;
  stddev: number;
}

export type ConditionalFormattingMode = "heatmap" | "databars" | "none";

interface DataTableProps {
  headers: string[];
  rows: Record<string, string>[];
  columnTypes: Record<string, string>;
  anomalyIndices?: Record<string, number[]>;
  columnStats?: Record<string, ColumnStatInfo>;
  calculatedColumns?: string[];
  conditionalFormatting?: ConditionalFormattingMode;
  compact?: boolean;
}

/**
 * Compute the heatmap background color for a numeric value.
 * Low = red/orange, medium = yellow, high = green. Uses 0.15 opacity.
 */
export function getHeatmapColor(value: number, min: number, max: number): string {
  if (max === min) return "rgba(250, 204, 21, 0.15)"; // yellow if all same
  const ratio = (value - min) / (max - min);
  // Interpolate: red (0) -> yellow (0.5) -> green (1)
  let r: number, g: number, b: number;
  if (ratio <= 0.5) {
    // red to yellow
    const t = ratio / 0.5;
    r = 239;
    g = Math.round(68 + (204 - 68) * t);
    b = Math.round(68 * (1 - t) + 21 * t);
  } else {
    // yellow to green
    const t = (ratio - 0.5) / 0.5;
    r = Math.round(250 - (250 - 34) * t);
    g = Math.round(204 + (197 - 204) * t);
    b = Math.round(21 + (94 - 21) * t);
  }
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
}

/**
 * Compute data bar width as a percentage of the max value.
 */
export function getDataBarWidth(value: number, min: number, max: number): number {
  if (max === min) {
    // All values identical: show full bar if non-zero, empty if zero
    return value === 0 ? 0 : 100;
  }
  // Handle negative ranges: bar from 0 to value proportion
  const absMax = Math.max(Math.abs(min), Math.abs(max));
  if (absMax === 0) return 0;
  return Math.min(100, (Math.abs(value) / absMax) * 100);
}

/**
 * Determine sign-based CSS class for a value.
 */
export function getSignClass(value: number): string {
  if (value < 0) return "cell-negative";
  if (value > 0) return "cell-positive";
  return "";
}

export default function DataTable({
  headers,
  rows,
  columnTypes,
  anomalyIndices = {},
  columnStats = {},
  calculatedColumns = [],
  conditionalFormatting: externalFormatting,
  compact = false,
}: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [formatting, setFormatting] = useState<ConditionalFormattingMode>(
    externalFormatting ?? "heatmap"
  );
  const [showFormatted, setShowFormatted] = useState(true);
  const pageSize = compact ? 10 : 25;

  const numericColumns = useMemo(
    () => headers.filter((h) => columnTypes[h] === "number"),
    [headers, columnTypes]
  );

  // Compute min/max for each numeric column
  const columnMinMax = useMemo(() => {
    const result: Record<string, { min: number; max: number }> = {};
    for (const col of numericColumns) {
      let min = Infinity;
      let max = -Infinity;
      for (const row of rows) {
        const val = Number(row[col]);
        if (!isNaN(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
      if (min === Infinity) {
        min = 0;
        max = 0;
      }
      result[col] = { min, max };
    }
    return result;
  }, [rows, numericColumns]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const lower = search.toLowerCase();
    return rows.filter((row) =>
      headers.some((h) => (row[h] ?? "").toLowerCase().includes(lower))
    );
  }, [rows, search, headers]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortColumn] ?? "";
      const bVal = b[sortColumn] ?? "";
      if (columnTypes[sortColumn] === "number") {
        const diff = Number(aVal) - Number(bVal);
        return sortDir === "asc" ? diff : -diff;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredRows, sortColumn, sortDir, columnTypes]);

  const pagedRows = sortedRows.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sortedRows.length / pageSize);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDir("asc");
    }
  };

  const isAnomaly = (col: string, rowIndex: number): boolean => {
    return anomalyIndices[col]?.includes(rowIndex) ?? false;
  };

  // Map filtered/sorted rows back to original indices
  const getOriginalIndex = (row: Record<string, string>): number => {
    return rows.indexOf(row);
  };

  const typeTag = (type: string) => {
    const colors: Record<string, string> = {
      number: "bg-blue-900/30 text-blue-400",
      date: "bg-purple-900/30 text-purple-400",
      string: "bg-emerald-900/30 text-emerald-400",
    };
    return (
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors[type] ?? "bg-gray-800 text-gray-400"}`}
      >
        {type}
      </span>
    );
  };

  const formatModes: { key: ConditionalFormattingMode; label: string }[] = [
    { key: "heatmap", label: "Heatmap" },
    { key: "databars", label: "Data Bars" },
    { key: "none", label: "None" },
  ];

  const getCellStyle = (
    col: string,
    value: string
  ): { style?: React.CSSProperties; className?: string; barWidth?: number } => {
    if (columnTypes[col] !== "number" || formatting === "none") return {};
    const numVal = Number(value);
    if (isNaN(numVal)) return {};

    const mm = columnMinMax[col];
    if (!mm) return {};

    if (formatting === "heatmap") {
      return {
        style: { backgroundColor: getHeatmapColor(numVal, mm.min, mm.max) },
        className: getSignClass(numVal),
      };
    }

    if (formatting === "databars") {
      return {
        className: `cell-databar ${getSignClass(numVal)}`,
        barWidth: getDataBarWidth(numVal, mm.min, mm.max),
      };
    }

    return {};
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-secondary">Data Table</h3>
          <span className="text-xs text-text-muted">
            {sortedRows.length} rows
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Raw / Formatted toggle */}
          {numericColumns.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5 bg-bg-secondary rounded-lg p-0.5">
                {(["Raw", "Formatted"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setShowFormatted(mode === "Formatted")}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                      (mode === "Formatted") === showFormatted
                        ? "bg-accent text-white shadow-sm"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Conditional formatting toggle */}
          {numericColumns.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-text-muted">Formatting:</span>
              <div className="flex gap-0.5 bg-bg-secondary rounded-lg p-0.5">
                {formatModes.map((fm) => (
                  <button
                    key={fm.key}
                    onClick={() => setFormatting(fm.key)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                      formatting === fm.key
                        ? "bg-accent text-white shadow-sm"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {fm.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent w-64"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              {headers.map((h) => (
                <th
                  key={h}
                  onClick={() => handleSort(h)}
                  className="text-left px-4 py-3 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none"
                >
                  <div className="flex items-center gap-2">
                    <span>{h}</span>
                    {!compact && typeTag(columnTypes[h])}
                    {calculatedColumns.includes(h) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#f59e0b] font-bold">
                        Calculated
                      </span>
                    )}
                    {sortColumn === h && (
                      <span className="text-accent">
                        {sortDir === "asc" ? "\u2191" : "\u2193"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, i) => {
              const origIdx = getOriginalIndex(row);
              return (
                <tr
                  key={i}
                  className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                >
                  {headers.map((h) => {
                    const anomaly = isAnomaly(h, origIdx);
                    let deviations = "";
                    if (anomaly && columnStats[h] && columnStats[h].stddev > 0) {
                      const val = Number(row[h]);
                      const dev = Math.abs(val - columnStats[h].mean) / columnStats[h].stddev;
                      deviations = dev.toFixed(1);
                    }

                    const cellFormat = getCellStyle(h, row[h]);
                    const combinedClassName = [
                      "px-4 py-2.5",
                      anomaly ? "text-danger font-medium" : "text-text-primary",
                      cellFormat.className ?? "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const combinedStyle: React.CSSProperties = {
                      ...(anomaly ? { backgroundColor: "rgba(239, 68, 68, 0.15)" } : {}),
                      ...(cellFormat.style ?? {}),
                    };

                    return (
                      <td
                        key={h}
                        className={combinedClassName}
                        style={Object.keys(combinedStyle).length > 0 ? combinedStyle : undefined}
                        title={anomaly && deviations ? `Anomaly: ${deviations} standard deviations from mean` : anomaly ? "Anomaly: >2 std deviations from mean" : undefined}
                      >
                        {cellFormat.barWidth !== undefined && (
                          <span
                            className="cell-databar-fill"
                            style={{ width: `${cellFormat.barWidth}%` }}
                          />
                        )}
                        <span style={{ position: "relative", zIndex: 1 }}>
                          {showFormatted && columnTypes[h] === "number" && !isNaN(Number(row[h]))
                            ? formatNumber(Number(row[h]), autoFormat(h, Number(row[h])))
                            : row[h]}
                        </span>
                        {anomaly && (
                          <span className="ml-1.5 inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-danger/20 text-danger">
                            {deviations ? `${deviations}\u03C3` : "!!"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="p-4 border-t border-border-subtle flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded-md bg-bg-secondary text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded-md bg-bg-secondary text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
