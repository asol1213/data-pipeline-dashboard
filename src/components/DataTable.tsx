"use client";

import { useState, useMemo } from "react";

interface DataTableProps {
  headers: string[];
  rows: Record<string, string>[];
  columnTypes: Record<string, string>;
  anomalyIndices?: Record<string, number[]>;
}

export default function DataTable({
  headers,
  rows,
  columnTypes,
  anomalyIndices = {},
}: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

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

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-secondary">Data Table</h3>
          <span className="text-xs text-text-muted">
            {sortedRows.length} rows
          </span>
        </div>
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
                    {typeTag(columnTypes[h])}
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
                    return (
                      <td
                        key={h}
                        className={`px-4 py-2.5 ${
                          anomaly
                            ? "text-danger bg-danger-subtle font-medium"
                            : "text-text-primary"
                        }`}
                        title={anomaly ? "Anomaly: >2 std deviations from mean" : undefined}
                      >
                        {row[h]}
                        {anomaly && (
                          <span className="ml-1.5 text-[10px] text-danger">
                            !!
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
