"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { getAuditLog, clearAuditLog, type AuditEntry } from "@/lib/audit";

const ACTION_ICONS: Record<string, string> = {
  cell_edit: "\u270f\ufe0f",
  row_add: "\u2795",
  row_delete: "\u274c",
  column_add: "\u2795",
  dataset_upload: "\ud83d\udcc1",
  dataset_delete: "\ud83d\uddd1\ufe0f",
  query_run: "\ud83d\udd0d",
  formula_eval: "\ud83e\uddee",
};

const ACTION_LABELS: Record<string, string> = {
  cell_edit: "Cell Edit",
  row_add: "Row Added",
  row_delete: "Row Deleted",
  column_add: "Column Added",
  dataset_upload: "Dataset Uploaded",
  dataset_delete: "Dataset Deleted",
  query_run: "SQL Query",
  formula_eval: "Formula Evaluated",
};

const ACTION_COLORS: Record<string, string> = {
  cell_edit: "border-l-blue-500 bg-blue-500/5",
  row_add: "border-l-emerald-500 bg-emerald-500/5",
  row_delete: "border-l-red-500 bg-red-500/5",
  column_add: "border-l-emerald-500 bg-emerald-500/5",
  dataset_upload: "border-l-emerald-500 bg-emerald-500/5",
  dataset_delete: "border-l-red-500 bg-red-500/5",
  query_run: "border-l-purple-500 bg-purple-500/5",
  formula_eval: "border-l-purple-500 bg-purple-500/5",
};

const ACTION_BADGE_COLORS: Record<string, string> = {
  cell_edit: "bg-blue-900/30 text-blue-400",
  row_add: "bg-emerald-900/30 text-emerald-400",
  row_delete: "bg-red-900/30 text-red-400",
  column_add: "bg-emerald-900/30 text-emerald-400",
  dataset_upload: "bg-emerald-900/30 text-emerald-400",
  dataset_delete: "bg-red-900/30 text-red-400",
  query_run: "bg-purple-900/30 text-purple-400",
  formula_eval: "bg-purple-900/30 text-purple-400",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function entriesToCSV(entries: AuditEntry[]): string {
  const headers = [
    "Timestamp",
    "Action",
    "Dataset",
    "Description",
    "Row",
    "Column",
    "Old Value",
    "New Value",
    "User",
  ];
  const rows = entries.map((e) => [
    e.timestamp,
    e.action,
    e.datasetName,
    e.details.description,
    e.details.row?.toString() ?? "",
    e.details.column ?? "",
    e.details.oldValue ?? "",
    e.details.newValue ?? "",
    e.user,
  ]);
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
}

export default function AuditPage() {
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [datasetFilter, setDatasetFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLog(getAuditLog());
  }, []);

  // Unique datasets from log
  const datasetOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of log) {
      if (!seen.has(e.datasetId)) {
        seen.set(e.datasetId, e.datasetName);
      }
    }
    return Array.from(seen.entries());
  }, [log]);

  // Unique action types from log
  const actionOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const e of log) {
      seen.add(e.action);
    }
    return Array.from(seen);
  }, [log]);

  // Filtered entries
  const filtered = useMemo(() => {
    let entries = log;
    if (datasetFilter) {
      entries = entries.filter((e) => e.datasetId === datasetFilter);
    }
    if (actionFilter) {
      entries = entries.filter((e) => e.action === actionFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      entries = entries.filter((e) => new Date(e.timestamp) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1); // include the whole day
      entries = entries.filter((e) => new Date(e.timestamp) < to);
    }
    return entries;
  }, [log, datasetFilter, actionFilter, dateFrom, dateTo]);

  // Group entries by date
  const grouped = useMemo(() => {
    const groups: { date: string; entries: AuditEntry[] }[] = [];
    let currentDate = "";
    for (const entry of filtered) {
      const d = formatDate(entry.timestamp);
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, entries: [] });
      }
      groups[groups.length - 1].entries.push(entry);
    }
    return groups;
  }, [filtered]);

  const handleClear = useCallback(() => {
    if (window.confirm("Clear the entire audit log? This cannot be undone.")) {
      clearAuditLog();
      setLog([]);
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    const csv = entriesToCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
            <p className="text-sm text-blue-200 mt-1">
              Track all changes, queries, and actions across your datasets
            </p>
          </div>
          <Link
            href="/audit/versions"
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Version History
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Dataset
            </label>
            <select
              value={datasetFilter}
              onChange={(e) => setDatasetFilter(e.target.value)}
              className="bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent min-w-[160px]"
            >
              <option value="">All datasets</option>
              {datasetOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent min-w-[140px]"
            >
              <option value="">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a] ?? a}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex-1" />

          <span className="text-xs text-text-muted">
            {filtered.length} of {log.length} entries
          </span>

          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>

          <button
            onClick={handleClear}
            disabled={log.length === 0}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-danger-subtle border border-danger/20 text-danger hover:bg-danger/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Log
          </button>
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="bg-bg-card rounded-xl border border-border-subtle p-16 text-center">
          <p className="text-text-muted text-sm">
            {log.length === 0
              ? "No audit entries yet. Changes will appear here as you edit data, run queries, and manage datasets."
              : "No entries match the current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.date}>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {group.date}
              </h3>
              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`border-l-4 rounded-lg p-4 ${ACTION_COLORS[entry.action] ?? "border-l-gray-500 bg-gray-500/5"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">
                            {ACTION_ICONS[entry.action] ?? "\u2022"}
                          </span>
                          <span className="text-sm font-medium text-text-primary">
                            {formatTime(entry.timestamp)}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ACTION_BADGE_COLORS[entry.action] ?? "bg-gray-900/30 text-gray-400"}`}
                          >
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mb-1">
                          {entry.details.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          <span>Dataset: {entry.datasetName}</span>
                          {entry.details.row !== undefined && (
                            <span>Row {entry.details.row + 1}</span>
                          )}
                          {entry.details.column && (
                            <span>Column: {entry.details.column}</span>
                          )}
                        </div>
                        {entry.details.oldValue !== undefined &&
                          entry.details.newValue !== undefined &&
                          entry.action === "cell_edit" && (
                            <div className="mt-2 flex items-center gap-2 text-xs font-mono">
                              <span className="px-2 py-0.5 rounded bg-red-900/20 text-red-400 line-through">
                                {entry.details.oldValue || "(empty)"}
                              </span>
                              <span className="text-text-muted">&rarr;</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-900/20 text-emerald-400">
                                {entry.details.newValue || "(empty)"}
                              </span>
                            </div>
                          )}
                        {entry.details.sql && (
                          <div className="mt-2 font-mono text-xs text-text-muted bg-bg-secondary/50 rounded px-3 py-2 truncate">
                            {entry.details.sql}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {entry.user}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
