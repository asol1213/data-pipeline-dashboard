"use client";

import { useState, useEffect, useMemo } from "react";
import { computeVariance, type VarianceSummary } from "@/lib/planning-engine";
import { formatNumber } from "@/lib/format";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
}

interface DatasetData {
  rows: Record<string, string>[];
  headers: string[];
}

export default function VariancePage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [budgetId, setBudgetId] = useState("");
  const [actualId, setActualId] = useState("");
  const [budgetData, setBudgetData] = useState<DatasetData | null>(null);
  const [actualData, setActualData] = useState<DatasetData | null>(null);
  const [categoryCol, setCategoryCol] = useState("");
  const [valueCol, setValueCol] = useState("");
  const [isCost, setIsCost] = useState(false);
  const [result, setResult] = useState<VarianceSummary | null>(null);

  useEffect(() => {
    fetch("/api/datasets")
      .then(r => r.json())
      .then((data: DatasetMeta[]) => {
        if (Array.isArray(data)) {
          setDatasets(data);
          // Auto-select budget-vs-actual if available
          const bva = data.find(d => d.id.includes("budget"));
          if (bva) {
            setBudgetId(bva.id);
            setActualId(bva.id);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!budgetId) return;
    fetch(`/api/datasets/${budgetId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.rows) {
          setBudgetData({ rows: data.rows, headers: data.headers });
          // Auto-select columns
          if (data.headers.includes("Department")) setCategoryCol("Department");
          if (data.headers.includes("Budget")) setValueCol("Budget");
        }
      })
      .catch(() => {});
  }, [budgetId]);

  useEffect(() => {
    if (!actualId) return;
    fetch(`/api/datasets/${actualId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.rows) setActualData({ rows: data.rows, headers: data.headers });
      })
      .catch(() => {});
  }, [actualId]);

  const budgetMeta = datasets.find(d => d.id === budgetId);
  const availableHeaders = budgetMeta?.headers || [];

  const handleAnalyze = () => {
    if (!budgetData || !actualData || !categoryCol || !valueCol) return;

    // For budget-vs-actual dataset, use Budget col for budget, Actual col for actual from same dataset
    const budgetValueCol = "Budget";
    const actualValueCol = "Actual";

    if (budgetData.headers.includes(budgetValueCol) && budgetData.headers.includes(actualValueCol) && budgetId === actualId) {
      // Same dataset with both Budget and Actual columns
      const summary = computeVariance(
        budgetData.rows,
        actualData.rows,
        categoryCol,
        budgetValueCol,
        isCost
      );
      // Recompute with actual column
      const actualSummary = computeVariance(
        budgetData.rows,
        actualData.rows,
        categoryCol,
        actualValueCol,
        isCost
      );
      // Merge: budget from first, actual from second
      const merged: VarianceSummary = {
        ...summary,
        items: summary.items.map((item, i) => ({
          ...item,
          actual: actualSummary.items[i]?.budget || 0, // "budget" field of the actual query = sum of Actual col
          variance: (actualSummary.items[i]?.budget || 0) - item.budget,
          variancePercent: item.budget !== 0
            ? Math.round(((actualSummary.items[i]?.budget || 0) - item.budget) / Math.abs(item.budget) * 1000) / 10
            : 0,
          status: isCost
            ? ((actualSummary.items[i]?.budget || 0) - item.budget <= 0 ? "Favorable" : "Unfavorable")
            : ((actualSummary.items[i]?.budget || 0) - item.budget >= 0 ? "Favorable" : "Unfavorable"),
        })),
      };
      merged.totalActual = merged.items.reduce((s, i) => s + i.actual, 0);
      merged.totalVariance = merged.totalActual - merged.totalBudget;
      merged.totalVariancePercent = merged.totalBudget !== 0
        ? Math.round((merged.totalVariance / Math.abs(merged.totalBudget)) * 1000) / 10
        : 0;
      merged.topDrivers = [...merged.items]
        .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
        .slice(0, 3)
        .map(i => ({ category: i.category, variance: i.variance, variancePercent: i.variancePercent }));

      setResult(merged);
    } else {
      // Different datasets
      const summary = computeVariance(budgetData.rows, actualData.rows, categoryCol, valueCol, isCost);
      setResult(summary);
    }
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}n      <div className="flex items-center gap-2 mb-4 text-sm">n        <a href="/planning" className="text-text-muted hover:text-text-primary transition-colors">← Planning Hub</a>n        <span className="text-text-muted">|</span>n        <a href="/planning/simulator" className="text-text-muted hover:text-accent transition-colors text-xs">Simulator</a>n        <a href="/planning/budget" className="text-text-muted hover:text-accent transition-colors text-xs">Budget</a>n        <a href="/planning/variance" className="text-text-muted hover:text-accent transition-colors text-xs">Variance</a>n        <a href="/planning/forecast" className="text-text-muted hover:text-accent transition-colors text-xs">Forecast</a>n        <a href="/planning/compare" className="text-text-muted hover:text-accent transition-colors text-xs">Compare</a>n        <a href="/planning/headcount" className="text-text-muted hover:text-accent transition-colors text-xs">Headcount</a>n        <a href="/planning/cashflow" className="text-text-muted hover:text-accent transition-colors text-xs">Cash Flow</a>n        <a href="/planning/goal-seek" className="text-text-muted hover:text-accent transition-colors text-xs">Goal Seek</a>n      </div>
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">Variance Analysis</h1>
        <p className="text-sm text-blue-200 mt-1">
          Compare budget vs. actual with waterfall visualization and variance drivers.
        </p>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Budget Dataset
          </label>
          <select
            value={budgetId}
            onChange={(e) => setBudgetId(e.target.value)}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">Select...</option>
            {datasets.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Actual Dataset
          </label>
          <select
            value={actualId}
            onChange={(e) => setActualId(e.target.value)}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">Select...</option>
            {datasets.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Category Column
          </label>
          <select
            value={categoryCol}
            onChange={(e) => setCategoryCol(e.target.value)}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">Select...</option>
            {availableHeaders.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Value Column
          </label>
          <select
            value={valueCol}
            onChange={(e) => setValueCol(e.target.value)}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">Select...</option>
            {availableHeaders.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4 flex flex-col justify-between">
          <label className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <input
              type="checkbox"
              checked={isCost}
              onChange={(e) => setIsCost(e.target.checked)}
              className="accent-accent"
            />
            Cost metric (over = unfavorable)
          </label>
          <button
            onClick={handleAnalyze}
            disabled={!budgetId || !actualId || !categoryCol || !valueCol}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            Analyze Variance
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Budget</div>
              <div className="text-xl font-bold font-mono text-text-primary">{formatNumber(result.totalBudget, "currency")}</div>
            </div>
            <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Actual</div>
              <div className="text-xl font-bold font-mono text-text-primary">{formatNumber(result.totalActual, "currency")}</div>
            </div>
            <div className={`bg-bg-card rounded-xl border p-4 ${
              result.totalVariance >= 0 && !isCost
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-red-500/20 bg-red-500/5"
            }`}>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Variance</div>
              <div className={`text-xl font-bold font-mono ${
                result.totalVariance >= 0 && !isCost ? "text-emerald-400" : "text-red-400"
              }`}>
                {result.totalVariance >= 0 ? "+" : ""}{formatNumber(result.totalVariance, "currency")} ({result.totalVariancePercent}%)
              </div>
            </div>
            <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Top Driver</div>
              {result.topDrivers[0] && (
                <div className="text-sm text-text-primary">
                  <span className="font-semibold">{result.topDrivers[0].category}</span>
                  <span className={`ml-2 font-mono ${result.topDrivers[0].variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {result.topDrivers[0].variance >= 0 ? "+" : ""}{formatNumber(result.topDrivers[0].variance, "currency")}
                    {" "}({result.topDrivers[0].variancePercent}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Waterfall Chart (CSS-based) */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Variance Waterfall</h3>
            <div className="flex items-end gap-2 h-48">
              {/* Budget bar */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-blue-500/60 rounded-t-sm min-h-[4px]"
                  style={{ height: `${Math.min(100, Math.abs(result.totalBudget) / Math.max(Math.abs(result.totalBudget), Math.abs(result.totalActual)) * 100)}%` }}
                />
                <span className="text-[10px] text-text-muted mt-1 truncate w-full text-center">Budget</span>
              </div>
              {/* Variance bars */}
              {result.items.map(item => {
                const maxVar = Math.max(...result.items.map(i => Math.abs(i.variance)), 1);
                const pct = Math.min(100, (Math.abs(item.variance) / maxVar) * 80);
                return (
                  <div key={item.category} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full rounded-t-sm min-h-[4px] ${
                        item.status === "Favorable" ? "bg-emerald-500/60" : "bg-red-500/60"
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                    <span className="text-[10px] text-text-muted mt-1 truncate w-full text-center">
                      {item.category.length > 8 ? item.category.substring(0, 8) + "..." : item.category}
                    </span>
                  </div>
                );
              })}
              {/* Actual bar */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-purple-500/60 rounded-t-sm min-h-[4px]"
                  style={{ height: `${Math.min(100, Math.abs(result.totalActual) / Math.max(Math.abs(result.totalBudget), Math.abs(result.totalActual)) * 100)}%` }}
                />
                <span className="text-[10px] text-text-muted mt-1 truncate w-full text-center">Actual</span>
              </div>
            </div>
          </div>

          {/* Variance Table */}
          <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Category</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium">Budget</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium">Actual</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium">Variance</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium">Variance %</th>
                    <th className="text-center px-4 py-3 text-text-muted font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map(item => (
                    <tr key={item.category} className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors">
                      <td className="px-4 py-2.5 text-text-primary font-medium">{item.category}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{formatNumber(item.budget, "currency")}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{formatNumber(item.actual, "currency")}</td>
                      <td className={`px-4 py-2.5 text-right font-mono ${
                        item.status === "Favorable" ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {item.variance >= 0 ? "+" : ""}{formatNumber(item.variance, "currency")}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono ${
                        item.status === "Favorable" ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {item.variancePercent >= 0 ? "+" : ""}{item.variancePercent}%
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          item.status === "Favorable"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Drivers */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Top 3 Variance Drivers</h3>
            <div className="space-y-2">
              {result.topDrivers.map((d, i) => (
                <div key={d.category} className="flex items-center gap-3 text-sm">
                  <span className="text-text-muted">{i + 1}.</span>
                  <span className="font-medium text-text-primary">{d.category}</span>
                  <span className={`font-mono ${d.variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {d.variance >= 0 ? "+" : ""}{formatNumber(d.variance, "currency")} ({d.variancePercent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
