"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAlerts,
  saveAlerts,
  removeAlert,
  toggleAlert,
  evaluateAlerts,
  getAlertHistory,
  saveAlertHistory,
} from "@/lib/alerts";
import type { AlertRule, AlertResult, AlertHistoryEntry } from "@/lib/alerts";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
  rowCount: number;
}

const OPERATORS = [">", "<", ">=", "<=", "="] as const;
const SEVERITIES = ["info", "warning", "critical"] as const;

const severityColors: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

const severityBadge: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [results, setResults] = useState<AlertResult[]>([]);
  const [history, setHistory] = useState<AlertHistoryEntry[]>([]);
  const [checking, setChecking] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [column, setColumn] = useState("");
  const [operator, setOperator] = useState<AlertRule["operator"]>(">");
  const [threshold, setThreshold] = useState("");
  const [severity, setSeverity] = useState<AlertRule["severity"]>("warning");

  useEffect(() => {
    setAlerts(getAlerts());
    setHistory(getAlertHistory());
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((data: DatasetMeta[]) => {
        if (Array.isArray(data)) setDatasets(data);
      })
      .catch(() => {});
  }, []);

  const selectedDataset = datasets.find((d) => d.id === datasetId);
  const numericColumns = selectedDataset
    ? selectedDataset.headers.filter(
        (h) => selectedDataset.columnTypes[h] === "number"
      )
    : [];

  const handleCreate = useCallback(() => {
    if (!name.trim() || !datasetId || !column || !threshold) return;
    const newAlert: AlertRule = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      datasetId,
      column,
      operator,
      threshold: Number(threshold),
      severity,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...alerts, newAlert];
    saveAlerts(updated);
    setAlerts(updated);
    setName("");
    setThreshold("");
  }, [name, datasetId, column, operator, threshold, severity, alerts]);

  const handleRemove = useCallback(
    (id: string) => {
      removeAlert(id);
      setAlerts(alerts.filter((a) => a.id !== id));
      setResults(results.filter((r) => r.rule.id !== id));
    },
    [alerts, results]
  );

  const handleToggle = useCallback(
    (id: string) => {
      toggleAlert(id);
      setAlerts(
        alerts.map((a) =>
          a.id === id ? { ...a, enabled: !a.enabled } : a
        )
      );
    },
    [alerts]
  );

  const handleCheckNow = useCallback(async () => {
    setChecking(true);
    try {
      // Fetch all datasets' rows
      const datasetRows = new Map<
        string,
        Record<string, string | number>[]
      >();
      const uniqueIds = [...new Set(alerts.map((a) => a.datasetId))];

      for (const dsId of uniqueIds) {
        try {
          const res = await fetch(`/api/datasets/${dsId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.rows) datasetRows.set(dsId, data.rows);
          }
        } catch {
          // skip
        }
      }

      const evaluated = evaluateAlerts(alerts, datasetRows);
      setResults(evaluated);

      // Save to history
      const newEntries: AlertHistoryEntry[] = evaluated
        .filter((r) => r.rule.enabled)
        .map((r) => ({
          ruleId: r.rule.id,
          ruleName: r.rule.name,
          severity: r.rule.severity,
          triggered: r.triggered,
          currentValue: r.currentValue,
          threshold: r.rule.threshold,
          operator: r.rule.operator,
          message: r.message,
          timestamp: new Date().toISOString(),
        }));

      const updatedHistory = [...newEntries, ...history].slice(0, 100);
      saveAlertHistory(updatedHistory);
      setHistory(updatedHistory);
    } finally {
      setChecking(false);
    }
  }, [alerts, history]);

  const triggeredCount = results.filter((r) => r.triggered).length;
  const enabledCount = alerts.filter((a) => a.enabled).length;

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">&#128276;</div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Automated Alerts
              </h1>
              <p className="text-sm text-blue-200 mt-1">
                Create alert rules that trigger when data conditions are met
              </p>
            </div>
          </div>
          <button
            onClick={handleCheckNow}
            disabled={checking || alerts.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium backdrop-blur-sm transition-colors disabled:opacity-50"
          >
            {checking ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Checking...
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Check Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Check results summary */}
      {results.length > 0 && (
        <div
          className={`mb-6 p-4 rounded-xl border ${
            triggeredCount > 0
              ? "bg-red-500/5 border-red-500/20"
              : "bg-emerald-500/5 border-emerald-500/20"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {triggeredCount > 0 ? "\u26A0\uFE0F" : "\u2705"}
            </span>
            <span className="text-sm font-medium text-text-primary">
              {triggeredCount} of {enabledCount} alert
              {enabledCount !== 1 ? "s" : ""} triggered
            </span>
          </div>
        </div>
      )}

      {/* Create Alert Form */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Alert Rule
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Alert Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g., "Revenue below 100K"'
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent placeholder-text-muted"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Dataset
            </label>
            <select
              value={datasetId}
              onChange={(e) => {
                setDatasetId(e.target.value);
                setColumn("");
              }}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">Select dataset...</option>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Column (numeric)
            </label>
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              disabled={!datasetId}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent disabled:opacity-50"
            >
              <option value="">Select column...</option>
              {numericColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Condition
            </label>
            <select
              value={operator}
              onChange={(e) =>
                setOperator(e.target.value as AlertRule["operator"])
              }
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Threshold
            </label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="100000"
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent placeholder-text-muted"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Severity
            </label>
            <select
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as AlertRule["severity"])
              }
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !datasetId || !column || !threshold}
            className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Alert
          </button>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Active Alerts ({alerts.length})
          </span>
        </div>
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No alerts configured yet. Create one above.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle/50">
            {alerts.map((alert) => {
              const result = results.find((r) => r.rule.id === alert.id);
              const ds = datasets.find((d) => d.id === alert.datasetId);
              return (
                <div
                  key={alert.id}
                  className={`px-4 py-3 flex items-center gap-4 hover:bg-bg-card-hover transition-colors ${
                    !alert.enabled ? "opacity-50" : ""
                  }`}
                >
                  {/* Enabled toggle */}
                  <button
                    onClick={() => handleToggle(alert.id)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      alert.enabled ? "bg-accent" : "bg-border-subtle"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                        alert.enabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {alert.name}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${severityColors[alert.severity]}`}
                      >
                        {alert.severity}
                      </span>
                      {result?.triggered && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-500/20 text-red-400">
                          TRIGGERED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {ds?.name ?? alert.datasetId} &middot; {alert.column}{" "}
                      {alert.operator} {alert.threshold.toLocaleString()}
                    </p>
                    {result && alert.enabled && (
                      <p className="text-xs text-text-secondary mt-1">
                        Current value:{" "}
                        <span className="font-mono font-medium">
                          {result.currentValue.toLocaleString()}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(alert.id)}
                    className="p-1 text-text-muted hover:text-danger transition-colors"
                  >
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alert History */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Alert History
          </span>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No alert history. Click &quot;Check Now&quot; to evaluate alerts.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle/50 max-h-80 overflow-y-auto">
            {history.map((entry, i) => (
              <div
                key={i}
                className="px-4 py-2.5 flex items-center gap-3 text-sm"
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    entry.triggered ? "bg-red-400" : "bg-emerald-400"
                  }`}
                />
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${severityBadge[entry.severity]}`}
                >
                  {entry.severity}
                </span>
                <span className="text-text-primary truncate flex-1">
                  {entry.message}
                </span>
                <span className="text-[10px] text-text-muted flex-shrink-0">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
