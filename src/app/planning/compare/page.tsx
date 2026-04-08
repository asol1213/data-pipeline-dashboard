"use client";

import { useState, useMemo, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  computeScenarioKPIs,
  generateScenarioComparisonData,
  type ScenarioKPIs,
  type ScenarioAssumptions,
} from "@/lib/planning-engine";
import { formatNumber } from "@/lib/format";

const DEFAULT_BASE: ScenarioKPIs = {
  revenue: 10000000,
  cogs: 4000000,
  grossProfit: 6000000,
  grossMargin: 60,
  opEx: 3000000,
  marketing: 1000000,
  ebitda: 3000000,
  ebitdaMargin: 30,
  netIncome: 2000000,
  netMargin: 20,
};

const DEFAULT_BEST: ScenarioAssumptions = {
  revenueChange: 0.2,
  costReduction: 0.1,
  headcountChange: 0,
  marketingSpend: 0.1,
};

const DEFAULT_WORST: ScenarioAssumptions = {
  revenueChange: -0.15,
  costReduction: -0.05,
  headcountChange: 0.1,
  marketingSpend: -0.2,
};

const COMPARISON_KPIS: {
  key: keyof ScenarioKPIs;
  label: string;
  format: "currency" | "percent";
}[] = [
  { key: "revenue", label: "Revenue", format: "currency" },
  { key: "ebitda", label: "EBITDA", format: "currency" },
  { key: "netIncome", label: "Net Income", format: "currency" },
  { key: "grossMargin", label: "Gross Margin", format: "percent" },
  { key: "ebitdaMargin", label: "EBITDA Margin", format: "percent" },
  { key: "netMargin", label: "Net Margin", format: "percent" },
];

export default function ComparePage() {
  const [baseKPIs, setBaseKPIs] = useState<ScenarioKPIs>(DEFAULT_BASE);
  const [bestAssumptions, setBestAssumptions] =
    useState<ScenarioAssumptions>(DEFAULT_BEST);
  const [worstAssumptions, setWorstAssumptions] =
    useState<ScenarioAssumptions>(DEFAULT_WORST);
  const [chartMetric, setChartMetric] = useState<keyof ScenarioKPIs>("revenue");

  // Try to load saved scenarios from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("planning-scenarios");
      if (saved) {
        const scenarios = JSON.parse(saved);
        if (Array.isArray(scenarios) && scenarios.length > 0) {
          const first = scenarios[0];
          if (first.bestCase) setBestAssumptions(first.bestCase);
          if (first.worstCase) setWorstAssumptions(first.worstCase);
        }
      }
    } catch {
      /* ignore */
    }

    // Try to load base KPIs from API
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((datasets: { id: string }[]) => {
        const pnl = datasets.find((d) => d.id === "pnl-2025");
        if (pnl) {
          return fetch(`/api/datasets/${pnl.id}`).then((r) => r.json());
        }
        return null;
      })
      .then((data) => {
        if (data && data.rows) {
          const rows = data.rows as Record<string, string>[];
          const revenue = rows.reduce(
            (s, r) => s + Number(r.Revenue || 0),
            0
          );
          const cogs = rows.reduce((s, r) => s + Number(r.COGS || 0), 0);
          const opEx = rows.reduce((s, r) => s + Number(r.OpEx || 0), 0);
          const marketing = rows.reduce(
            (s, r) => s + Number(r.Marketing || 0),
            0
          );
          const ebitda = rows.reduce((s, r) => s + Number(r.EBITDA || 0), 0);
          const netIncome = rows.reduce(
            (s, r) => s + Number(r.Net_Income || 0),
            0
          );
          const grossProfit = revenue - cogs;
          setBaseKPIs({
            revenue: Math.round(revenue),
            cogs: Math.round(cogs),
            grossProfit: Math.round(grossProfit),
            grossMargin: revenue
              ? Math.round((grossProfit / revenue) * 1000) / 10
              : 0,
            opEx: Math.round(opEx),
            marketing: Math.round(marketing),
            ebitda: Math.round(ebitda),
            ebitdaMargin: revenue
              ? Math.round((ebitda / revenue) * 1000) / 10
              : 0,
            netIncome: Math.round(netIncome),
            netMargin: revenue
              ? Math.round((netIncome / revenue) * 1000) / 10
              : 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const bestKPIs = useMemo(
    () => computeScenarioKPIs(baseKPIs, bestAssumptions),
    [baseKPIs, bestAssumptions]
  );
  const worstKPIs = useMemo(
    () => computeScenarioKPIs(baseKPIs, worstAssumptions),
    [baseKPIs, worstAssumptions]
  );

  // Area chart data (monthly timeline)
  const areaData = useMemo(
    () =>
      generateScenarioComparisonData(
        baseKPIs,
        bestAssumptions,
        worstAssumptions,
        chartMetric
      ),
    [baseKPIs, bestAssumptions, worstAssumptions, chartMetric]
  );

  // Bar chart data (KPI comparison)
  const barData = useMemo(() => {
    return COMPARISON_KPIS.filter((k) => k.format === "currency").map((k) => ({
      name: k.label,
      "Best Case": bestKPIs[k.key],
      "Base Case": baseKPIs[k.key],
      "Worst Case": worstKPIs[k.key],
    }));
  }, [baseKPIs, bestKPIs, worstKPIs]);

  const formatAxis = (value: number) => {
    if (Math.abs(value) >= 1000000)
      return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return String(value);
  };

  const fmtKPI = (val: number, format: string) => {
    if (format === "percent") return `${val}%`;
    return formatNumber(val, "currency");
  };

  // Revenue range for risk indicator
  const revenueRange = bestKPIs.revenue - worstKPIs.revenue;
  const revenueRangePct =
    baseKPIs.revenue !== 0
      ? Math.round((revenueRange / baseKPIs.revenue) * 500) / 10
      : 0;

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}n      <div className="flex items-center gap-2 mb-4 text-sm">n        <a href="/planning" className="text-text-muted hover:text-text-primary transition-colors">← Planning Hub</a>n        <span className="text-text-muted">|</span>n        <a href="/planning/simulator" className="text-text-muted hover:text-accent transition-colors text-xs">Simulator</a>n        <a href="/planning/budget" className="text-text-muted hover:text-accent transition-colors text-xs">Budget</a>n        <a href="/planning/variance" className="text-text-muted hover:text-accent transition-colors text-xs">Variance</a>n        <a href="/planning/forecast" className="text-text-muted hover:text-accent transition-colors text-xs">Forecast</a>n        <a href="/planning/compare" className="text-text-muted hover:text-accent transition-colors text-xs">Compare</a>n        <a href="/planning/headcount" className="text-text-muted hover:text-accent transition-colors text-xs">Headcount</a>n        <a href="/planning/cashflow" className="text-text-muted hover:text-accent transition-colors text-xs">Cash Flow</a>n        <a href="/planning/goal-seek" className="text-text-muted hover:text-accent transition-colors text-xs">Goal Seek</a>n      </div>
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">
          Scenario Comparison
        </h1>
        <p className="text-sm text-blue-200 mt-1">
          Visual comparison of best, base, and worst case scenarios with
          confidence bands.
        </p>
      </div>

      {/* Delta & Risk Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-card rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Best vs Base
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            +{formatNumber(bestKPIs.revenue - baseKPIs.revenue, "currency")} (
            {baseKPIs.revenue !== 0
              ? Math.round(
                  ((bestKPIs.revenue - baseKPIs.revenue) / baseKPIs.revenue) *
                    1000
                ) / 10
              : 0}
            %)
          </div>
          <div className="text-xs text-text-muted mt-1">Revenue uplift</div>
        </div>
        <div className="bg-bg-card rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Worst vs Base
          </div>
          <div className="text-lg font-bold font-mono text-red-400">
            {formatNumber(worstKPIs.revenue - baseKPIs.revenue, "currency")} (
            {baseKPIs.revenue !== 0
              ? Math.round(
                  ((worstKPIs.revenue - baseKPIs.revenue) / baseKPIs.revenue) *
                    1000
                ) / 10
              : 0}
            %)
          </div>
          <div className="text-xs text-text-muted mt-1">Revenue downside</div>
        </div>
        <div className="bg-bg-card rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Risk Indicator
          </div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {formatNumber(worstKPIs.revenue, "currency")} -{" "}
            {formatNumber(bestKPIs.revenue, "currency")}
          </div>
          <div className="text-xs text-text-muted mt-1">
            Revenue range: +/-{revenueRangePct}%
          </div>
        </div>
      </div>

      {/* Chart Metric Selector */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Chart Metric
        </label>
        <select
          value={chartMetric}
          onChange={(e) =>
            setChartMetric(e.target.value as keyof ScenarioKPIs)
          }
          className="bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="revenue">Revenue</option>
          <option value="ebitda">EBITDA</option>
          <option value="netIncome">Net Income</option>
          <option value="grossProfit">Gross Profit</option>
        </select>
      </div>

      {/* Area Chart - Confidence Band */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Monthly Scenario Spread
        </h3>
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart
            data={areaData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="month"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 12 }}
              tickFormatter={formatAxis}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                formatNumber(Number(value), "currency"),
                String(name),
              ]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="bestCase"
              name="Best Case"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="baseCase"
              name="Base Case"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="worstCase"
              name="Worst Case"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart - KPI Comparison */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          KPI Comparison
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={barData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="name"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 12 }}
              tickFormatter={formatAxis}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                formatNumber(Number(value), "currency"),
                String(name),
              ]}
            />
            <Legend />
            <Bar dataKey="Best Case" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Base Case" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Worst Case" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed KPI Table */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 text-text-muted font-medium">
                  KPI
                </th>
                <th className="text-right px-4 py-3 text-emerald-400 font-medium">
                  Best Case
                </th>
                <th className="text-right px-4 py-3 text-blue-400 font-medium">
                  Base Case
                </th>
                <th className="text-right px-4 py-3 text-red-400 font-medium">
                  Worst Case
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Best vs Base
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Worst vs Base
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_KPIS.map((kpi) => {
                const base = baseKPIs[kpi.key] as number;
                const best = bestKPIs[kpi.key] as number;
                const worst = worstKPIs[kpi.key] as number;
                const bestDelta = best - base;
                const worstDelta = worst - base;

                return (
                  <tr
                    key={kpi.key}
                    className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                  >
                    <td className="px-4 py-2.5 text-text-primary font-medium">
                      {kpi.label}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                      {fmtKPI(best, kpi.format)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                      {fmtKPI(base, kpi.format)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-400">
                      {fmtKPI(worst, kpi.format)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                      {kpi.format === "percent"
                        ? `${bestDelta >= 0 ? "+" : ""}${Math.round(bestDelta * 10) / 10}pp`
                        : `${bestDelta >= 0 ? "+" : ""}${formatNumber(bestDelta, "currency")}`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-400">
                      {kpi.format === "percent"
                        ? `${worstDelta >= 0 ? "+" : ""}${Math.round(worstDelta * 10) / 10}pp`
                        : `${worstDelta >= 0 ? "+" : ""}${formatNumber(worstDelta, "currency")}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
