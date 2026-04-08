"use client";

import { useState, useEffect } from "react";
import {
  goalSeek,
  computeScenarioKPIs,
  type ScenarioKPIs,
  type GoalSeekResult,
} from "@/lib/planning-engine";
import { formatNumber } from "@/lib/format";

const TARGET_METRICS = [
  { key: "netIncome", label: "Net Income" },
  { key: "ebitda", label: "EBITDA" },
  { key: "grossProfit", label: "Gross Profit" },
  { key: "revenue", label: "Revenue" },
];

const INPUT_METRICS = [
  { key: "revenue", label: "Revenue" },
  { key: "cogs", label: "COGS" },
  { key: "opEx", label: "OpEx" },
  { key: "marketing", label: "Marketing" },
];

export default function GoalSeekPage() {
  const [baseKPIs, setBaseKPIs] = useState<ScenarioKPIs | null>(null);
  const [targetMetric, setTargetMetric] = useState("netIncome");
  const [targetValue, setTargetValue] = useState(100000);
  const [inputMetric, setInputMetric] = useState("revenue");
  const [result, setResult] = useState<GoalSeekResult | null>(null);

  // Load P&L data
  useEffect(() => {
    fetch("/api/datasets")
      .then(r => r.json())
      .then((datasets: { id: string }[]) => {
        const pnl = datasets.find(d => d.id === "pnl-2025");
        if (pnl) {
          return fetch(`/api/datasets/${pnl.id}`).then(r => r.json());
        }
        return null;
      })
      .then(data => {
        if (data && data.rows) {
          const rows = data.rows as Record<string, string>[];
          const revenue = rows.reduce((s, r) => s + Number(r.Revenue || 0), 0);
          const cogs = rows.reduce((s, r) => s + Number(r.COGS || 0), 0);
          const opEx = rows.reduce((s, r) => s + Number(r.OpEx || 0), 0);
          const marketing = rows.reduce((s, r) => s + Number(r.Marketing || 0), 0);
          const ebitda = rows.reduce((s, r) => s + Number(r.EBITDA || 0), 0);
          const netIncome = rows.reduce((s, r) => s + Number(r.Net_Income || 0), 0);
          const grossProfit = revenue - cogs;
          setBaseKPIs({
            revenue: Math.round(revenue),
            cogs: Math.round(cogs),
            grossProfit: Math.round(grossProfit),
            grossMargin: revenue ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
            opEx: Math.round(opEx),
            marketing: Math.round(marketing),
            ebitda: Math.round(ebitda),
            ebitdaMargin: revenue ? Math.round((ebitda / revenue) * 1000) / 10 : 0,
            netIncome: Math.round(netIncome),
            netMargin: revenue ? Math.round((netIncome / revenue) * 1000) / 10 : 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSeek = () => {
    if (!baseKPIs) return;

    const currentInput = baseKPIs[inputMetric as keyof ScenarioKPIs] as number;

    const computeOutput = (inputValue: number): number => {
      // Compute the change ratio for the input metric
      const changeRatio = currentInput !== 0 ? (inputValue - currentInput) / Math.abs(currentInput) : 0;

      // Map input changes to scenario assumptions
      const assumptions = {
        revenueChange: inputMetric === "revenue" ? changeRatio : 0,
        costReduction: inputMetric === "cogs" ? -changeRatio : 0,
        headcountChange: 0,
        marketingSpend: inputMetric === "marketing" ? changeRatio : (inputMetric === "opEx" ? changeRatio : 0),
      };

      const result = computeScenarioKPIs(baseKPIs, assumptions);
      return result[targetMetric as keyof ScenarioKPIs] as number;
    };

    const seekResult = goalSeek(currentInput, targetValue, computeOutput);
    setResult(seekResult);
  };

  if (!baseKPIs) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}n      <div className="flex items-center gap-2 mb-4 text-sm">n        <a href="/planning" className="text-text-muted hover:text-text-primary transition-colors">← Planning Hub</a>n        <span className="text-text-muted">|</span>n        <a href="/planning/simulator" className="text-text-muted hover:text-accent transition-colors text-xs">Simulator</a>n        <a href="/planning/budget" className="text-text-muted hover:text-accent transition-colors text-xs">Budget</a>n        <a href="/planning/variance" className="text-text-muted hover:text-accent transition-colors text-xs">Variance</a>n        <a href="/planning/forecast" className="text-text-muted hover:text-accent transition-colors text-xs">Forecast</a>n        <a href="/planning/compare" className="text-text-muted hover:text-accent transition-colors text-xs">Compare</a>n        <a href="/planning/headcount" className="text-text-muted hover:text-accent transition-colors text-xs">Headcount</a>n        <a href="/planning/cashflow" className="text-text-muted hover:text-accent transition-colors text-xs">Cash Flow</a>n        <a href="/planning/goal-seek" className="text-text-muted hover:text-accent transition-colors text-xs">Goal Seek</a>n      </div>
        <div className="dashboard-header rounded-2xl p-6 mb-8">
          <h1 className="text-2xl font-bold text-white">Goal Seek</h1>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-8 text-center text-text-muted">
          Loading P&L data...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}n      <div className="flex items-center gap-2 mb-4 text-sm">n        <a href="/planning" className="text-text-muted hover:text-text-primary transition-colors">← Planning Hub</a>n        <span className="text-text-muted">|</span>n        <a href="/planning/simulator" className="text-text-muted hover:text-accent transition-colors text-xs">Simulator</a>n        <a href="/planning/budget" className="text-text-muted hover:text-accent transition-colors text-xs">Budget</a>n        <a href="/planning/variance" className="text-text-muted hover:text-accent transition-colors text-xs">Variance</a>n        <a href="/planning/forecast" className="text-text-muted hover:text-accent transition-colors text-xs">Forecast</a>n        <a href="/planning/compare" className="text-text-muted hover:text-accent transition-colors text-xs">Compare</a>n        <a href="/planning/headcount" className="text-text-muted hover:text-accent transition-colors text-xs">Headcount</a>n        <a href="/planning/cashflow" className="text-text-muted hover:text-accent transition-colors text-xs">Cash Flow</a>n        <a href="/planning/goal-seek" className="text-text-muted hover:text-accent transition-colors text-xs">Goal Seek</a>n      </div>
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">Goal Seek</h1>
        <p className="text-sm text-blue-200 mt-1">
          Work backwards from a target KPI to find the required input changes.
        </p>
      </div>

      {/* Current Values */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {TARGET_METRICS.map(m => (
          <div key={m.key} className="bg-bg-card rounded-xl border border-border-subtle p-4">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-lg font-bold font-mono text-text-primary">
              {formatNumber(baseKPIs[m.key as keyof ScenarioKPIs] as number, "currency")}
            </div>
          </div>
        ))}
      </div>

      {/* Goal Seek Form */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Set Cell (Target Metric)
            </label>
            <select
              value={targetMetric}
              onChange={(e) => setTargetMetric(e.target.value)}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {TARGET_METRICS.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              To Value (Target)
            </label>
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              By Changing (Input)
            </label>
            <select
              value={inputMetric}
              onChange={(e) => setInputMetric(e.target.value)}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {INPUT_METRICS.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={handleSeek}
              className="w-full px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors font-medium"
            >
              Seek
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`bg-bg-card rounded-xl border p-6 ${
          result.found ? "border-emerald-500/20 bg-emerald-500/5" : "border-yellow-500/20 bg-yellow-500/5"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              result.found ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
            }`}>
              {result.found ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${result.found ? "text-emerald-400" : "text-yellow-400"}`}>
                {result.found ? "Solution Found" : "Approximate Solution"}
              </h3>
              <p className="text-sm text-text-primary mt-2">
                To achieve{" "}
                <span className="font-semibold">{TARGET_METRICS.find(m => m.key === targetMetric)?.label}</span>{" "}
                of{" "}
                <span className="font-mono font-semibold text-accent">{formatNumber(result.targetValue, "currency")}</span>,{" "}
                <span className="font-semibold">{INPUT_METRICS.find(m => m.key === inputMetric)?.label}</span>{" "}
                must be{" "}
                <span className="font-mono font-semibold text-accent">{formatNumber(result.requiredInput, "currency")}</span>.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-text-muted">Current</span>
                  <div className="font-mono text-text-primary">{formatNumber(result.currentInput, "currency")}</div>
                </div>
                <div>
                  <span className="text-xs text-text-muted">Required</span>
                  <div className="font-mono text-accent">{formatNumber(result.requiredInput, "currency")}</div>
                </div>
                <div>
                  <span className="text-xs text-text-muted">Change</span>
                  <div className={`font-mono ${result.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {result.changePercent >= 0 ? "+" : ""}{result.changePercent}%
                  </div>
                </div>
              </div>
              <p className="text-xs text-text-muted mt-2">
                Solved in {result.iterations} iteration{result.iterations !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
