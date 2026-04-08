"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface GlobalFilterProps {
  headers: string[];
  rows: Record<string, string>[];
  columnTypes: Record<string, string>;
  onFilteredData: (rows: Record<string, string>[]) => void;
}

export default function GlobalFilter({
  headers,
  rows,
  columnTypes,
  onFilteredData,
}: GlobalFilterProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // String columns suitable for filtering (limit to reasonable cardinality)
  const filterableColumns = useMemo(() => {
    return headers.filter((h) => {
      if (columnTypes[h] !== "string") return false;
      const unique = new Set(rows.map((r) => r[h]).filter(Boolean));
      return unique.size > 1 && unique.size <= 50;
    });
  }, [headers, rows, columnTypes]);

  // Get unique values for each filterable column
  const columnOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    for (const col of filterableColumns) {
      const unique = [...new Set(rows.map((r) => r[col]).filter(Boolean))].sort();
      opts[col] = unique;
    }
    return opts;
  }, [filterableColumns, rows]);

  // Initialize filters from URL search params
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const col of filterableColumns) {
      const val = searchParams.get(`filter_${col}`);
      if (val) initial[col] = val;
    }
    return initial;
  });

  // Update URL when filters change
  const updateURL = useCallback(
    (newFilters: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Remove old filter params
      for (const key of Array.from(params.keys())) {
        if (key.startsWith("filter_")) params.delete(key);
      }
      // Add new ones
      for (const [col, val] of Object.entries(newFilters)) {
        if (val) params.set(`filter_${col}`, val);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Apply filters and notify parent
  useEffect(() => {
    let filtered = rows;
    for (const [col, val] of Object.entries(filters)) {
      if (val) {
        filtered = filtered.filter((r) => r[col] === val);
      }
    }
    onFilteredData(filtered);
  }, [filters, rows, onFilteredData]);

  const handleFilterChange = (column: string, value: string) => {
    const newFilters = { ...filters };
    if (value) {
      newFilters[column] = value;
    } else {
      delete newFilters[column];
    }
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const clearAll = () => {
    setFilters({});
    updateURL({});
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  if (filterableColumns.length === 0) return null;

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-text-secondary">Slicers</span>
          {activeCount > 0 && (
            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
              {activeCount} filter{activeCount !== 1 ? "s" : ""} active
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-text-muted hover:text-danger transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {filterableColumns.map((col) => (
          <div key={col} className="flex items-center gap-2">
            <label className="text-xs text-text-muted whitespace-nowrap">{col.replace(/_/g, " ")}:</label>
            <select
              value={filters[col] || ""}
              onChange={(e) => handleFilterChange(col, e.target.value)}
              className="bg-bg-input border border-border-subtle rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer min-w-[120px]"
            >
              <option value="">All</option>
              {columnOptions[col]?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
