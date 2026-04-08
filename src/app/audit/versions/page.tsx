"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  getVersions,
  restoreVersion,
  compareVersions,
  saveVersion,
  type DatasetVersion,
} from "@/lib/audit";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VersionsPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [compareLeft, setCompareLeft] = useState<string>("");
  const [compareRight, setCompareRight] = useState<string>("");
  const [comparison, setComparison] = useState<{
    added: number;
    removed: number;
    changed: number;
  } | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Fetch datasets
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

  // Load versions when dataset changes
  useEffect(() => {
    if (!selectedDatasetId) return;
    const v = getVersions(selectedDatasetId);
    setVersions(v);
    setCompareLeft("");
    setCompareRight("");
    setComparison(null);
    setShowDiff(false);
  }, [selectedDatasetId]);

  const leftVersion = useMemo(
    () => versions.find((v) => v.id === compareLeft) ?? null,
    [versions, compareLeft]
  );
  const rightVersion = useMemo(
    () => versions.find((v) => v.id === compareRight) ?? null,
    [versions, compareRight]
  );

  const handleCompare = useCallback(() => {
    if (!leftVersion || !rightVersion) return;
    const result = compareVersions(leftVersion, rightVersion);
    setComparison(result);
    setShowDiff(true);
  }, [leftVersion, rightVersion]);

  // Compute detailed diff rows
  const diffRows = useMemo(() => {
    if (!showDiff || !leftVersion || !rightVersion) return [];

    let rows1: Record<string, string>[];
    let rows2: Record<string, string>[];
    try {
      rows1 = JSON.parse(leftVersion.snapshot);
      rows2 = JSON.parse(rightVersion.snapshot);
    } catch {
      return [];
    }

    const maxLen = Math.max(rows1.length, rows2.length);
    const allKeys = new Set<string>();
    for (const r of [...rows1, ...rows2]) {
      for (const k of Object.keys(r)) allKeys.add(k);
    }
    const cols = Array.from(allKeys);

    const result: {
      index: number;
      status: "unchanged" | "changed" | "added" | "removed";
      left: Record<string, string>;
      right: Record<string, string>;
      changedCols: Set<string>;
    }[] = [];

    for (let i = 0; i < maxLen; i++) {
      const r1 = rows1[i];
      const r2 = rows2[i];

      if (!r1 && r2) {
        result.push({
          index: i,
          status: "added",
          left: {},
          right: r2,
          changedCols: new Set(cols),
        });
      } else if (r1 && !r2) {
        result.push({
          index: i,
          status: "removed",
          left: r1,
          right: {},
          changedCols: new Set(cols),
        });
      } else if (r1 && r2) {
        const changedCols = new Set<string>();
        for (const k of cols) {
          if ((r1[k] ?? "") !== (r2[k] ?? "")) {
            changedCols.add(k);
          }
        }
        result.push({
          index: i,
          status: changedCols.size > 0 ? "changed" : "unchanged",
          left: r1,
          right: r2,
          changedCols,
        });
      }
    }

    return result.filter((r) => r.status !== "unchanged");
  }, [showDiff, leftVersion, rightVersion]);

  const diffCols = useMemo(() => {
    if (!leftVersion && !rightVersion) return [];
    const allKeys = new Set<string>();
    try {
      if (leftVersion) {
        const rows: Record<string, string>[] = JSON.parse(leftVersion.snapshot);
        for (const r of rows) for (const k of Object.keys(r)) allKeys.add(k);
      }
      if (rightVersion) {
        const rows: Record<string, string>[] = JSON.parse(rightVersion.snapshot);
        for (const r of rows) for (const k of Object.keys(r)) allKeys.add(k);
      }
    } catch {
      // ignore
    }
    return Array.from(allKeys);
  }, [leftVersion, rightVersion]);

  const handleRestore = useCallback(
    async (versionId: string) => {
      if (
        !window.confirm(
          "Restore this version? Current data will be replaced. A snapshot of the current state will be saved first."
        )
      )
        return;

      setRestoring(true);
      try {
        // Get current data to snapshot before restoring
        const currentRes = await fetch(`/api/datasets/${selectedDatasetId}`);
        const currentData = await currentRes.json();
        if (currentData.rows) {
          saveVersion(
            selectedDatasetId,
            currentData.rows,
            "Auto-saved before restore"
          );
        }

        const rows = restoreVersion(selectedDatasetId, versionId);
        if (!rows) {
          alert("Failed to restore version");
          return;
        }

        const res = await fetch(
          `/api/datasets/${selectedDatasetId}/update`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows }),
          }
        );

        if (res.ok) {
          // Refresh versions
          setVersions(getVersions(selectedDatasetId));
          alert("Version restored successfully");
        } else {
          alert("Failed to save restored data");
        }
      } catch {
        alert("Error restoring version");
      } finally {
        setRestoring(false);
      }
    },
    [selectedDatasetId]
  );

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-white">Version History</h1>
            <p className="text-sm text-blue-200 mt-1">
              Compare and restore previous dataset snapshots
            </p>
          </div>
          <Link
            href="/audit"
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Audit Trail
          </Link>
        </div>
      </div>

      {/* Dataset selector */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Dataset
          </label>
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent min-w-[220px]"
          >
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-text-muted">
            {versions.length} version{versions.length !== 1 ? "s" : ""} saved
          </span>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="bg-bg-card rounded-xl border border-border-subtle p-16 text-center">
          <p className="text-text-muted text-sm">
            No versions saved for this dataset yet. Versions are created
            automatically every 10 edits or when you save manually.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Versions list */}
          <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Saved Versions
              </span>
            </div>
            <div className="divide-y divide-border-subtle/50">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 transition-colors ${
                    compareLeft === v.id || compareRight === v.id
                      ? "bg-accent-subtle"
                      : "hover:bg-bg-card-hover"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">
                      {formatTimestamp(v.timestamp)}
                    </span>
                    <span className="text-xs text-text-muted">
                      {v.rowCount} rows
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mb-3">
                    {v.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCompareLeft(v.id)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        compareLeft === v.id
                          ? "bg-blue-600 text-white"
                          : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      Left (A)
                    </button>
                    <button
                      onClick={() => setCompareRight(v.id)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        compareRight === v.id
                          ? "bg-purple-600 text-white"
                          : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      Right (B)
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleRestore(v.id)}
                      disabled={restoring}
                      className="px-2 py-1 text-xs rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison */}
          <div className="space-y-4">
            {/* Compare button */}
            <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <span className="text-xs text-text-muted block mb-1">
                    Version A
                  </span>
                  <span className="text-sm text-text-primary">
                    {leftVersion
                      ? formatTimestamp(leftVersion.timestamp)
                      : "Select from list"}
                  </span>
                </div>
                <span className="text-text-muted">vs</span>
                <div className="flex-1 text-right">
                  <span className="text-xs text-text-muted block mb-1">
                    Version B
                  </span>
                  <span className="text-sm text-text-primary">
                    {rightVersion
                      ? formatTimestamp(rightVersion.timestamp)
                      : "Select from list"}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCompare}
                disabled={
                  !compareLeft ||
                  !compareRight ||
                  compareLeft === compareRight
                }
                className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Compare Versions
              </button>
            </div>

            {/* Comparison result summary */}
            {comparison && (
              <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Comparison Summary
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">
                      {comparison.added}
                    </div>
                    <div className="text-xs text-text-muted">Rows Added</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {comparison.changed}
                    </div>
                    <div className="text-xs text-text-muted">Rows Changed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {comparison.removed}
                    </div>
                    <div className="text-xs text-text-muted">Rows Removed</div>
                  </div>
                </div>
              </div>
            )}

            {/* Diff table */}
            {showDiff && diffRows.length > 0 && (
              <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
                <div className="px-4 py-3 border-b border-border-subtle">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    Diff View ({diffRows.length} row
                    {diffRows.length !== 1 ? "s" : ""} changed)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[60vh]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      <tr className="bg-bg-secondary border-b border-border-subtle">
                        <th className="px-3 py-2 text-left text-text-muted font-medium w-12">
                          Row
                        </th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium w-16">
                          Status
                        </th>
                        {diffCols.map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left text-text-muted font-medium"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {diffRows.slice(0, 100).map((row) => (
                        <tr
                          key={row.index}
                          className={`border-b border-border-subtle/50 ${
                            row.status === "added"
                              ? "bg-emerald-900/10"
                              : row.status === "removed"
                                ? "bg-red-900/10"
                                : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-text-muted font-mono">
                            {row.index + 1}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                row.status === "added"
                                  ? "bg-emerald-900/30 text-emerald-400"
                                  : row.status === "removed"
                                    ? "bg-red-900/30 text-red-400"
                                    : "bg-blue-900/30 text-blue-400"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          {diffCols.map((col) => (
                            <td key={col} className="px-3 py-2">
                              {row.changedCols.has(col) ? (
                                <div className="flex flex-col gap-0.5">
                                  {row.status !== "added" && (
                                    <span className="text-red-400 line-through">
                                      {row.left[col] || "(empty)"}
                                    </span>
                                  )}
                                  {row.status !== "removed" && (
                                    <span className="text-emerald-400">
                                      {row.right[col] || "(empty)"}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-text-muted">
                                  {row.right[col] ?? row.left[col] ?? ""}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {diffRows.length > 100 && (
                    <div className="p-3 text-center text-xs text-text-muted">
                      Showing first 100 of {diffRows.length} changed rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {showDiff && diffRows.length === 0 && comparison && (
              <div className="bg-bg-card rounded-xl border border-border-subtle p-8 text-center">
                <p className="text-text-muted text-sm">
                  No differences found between these versions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
