"use client";

import Link from "next/link";

const planningTools = [
  {
    title: "What-If Scenarios",
    description: "Model revenue growth, cost reduction, and headcount changes across best/worst case scenarios.",
    href: "/planning",
    anchor: "scenarios",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.772.13c-1.687.282-3.399.418-5.113.418s-3.426-.136-5.113-.418l-.773-.13c-1.716-.293-2.298-2.379-1.066-3.611L5 14.5" />
      </svg>
    ),
  },
  {
    title: "P&L Simulator",
    description: "Interactive P&L where adjusting any line item cascades all dependent lines in real-time.",
    href: "/planning/simulator",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
      </svg>
    ),
  },
  {
    title: "Rolling Forecast",
    description: "Visual timeline showing how the forecast evolved over time vs. budget and actuals.",
    href: "/planning/forecast",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    title: "Scenario Compare",
    description: "Visual charts comparing best, base, and worst case scenarios with confidence bands.",
    href: "/planning/compare",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
  },
  {
    title: "Budget Builder",
    description: "Build top-down or bottom-up budgets with department-level allocation and quarterly breakdowns.",
    href: "/planning/budget",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    title: "Variance Analysis",
    description: "Compare budget vs. actual with waterfall charts, top drivers, and favorable/unfavorable tagging.",
    href: "/planning/variance",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "Goal Seek",
    description: "Work backwards from a target KPI to find what inputs need to change to achieve it.",
    href: "/planning/goal-seek",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
];

export default function PlanningPage() {
  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">Planning & Analysis</h1>
        <p className="text-sm text-blue-200 mt-1">
          Scenario modeling, budgeting, variance analysis, and goal seeking tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {planningTools.map((tool) => (
          <Link
            key={tool.title}
            href={tool.href}
            className="bg-bg-card rounded-xl border border-border-subtle p-6 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-accent-subtle flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
                {tool.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {tool.title}
                </h2>
                <p className="text-sm text-text-muted mt-1">{tool.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Inline Scenario Engine */}
      <div className="mt-8">
        <ScenarioEngine />
      </div>
    </div>
  );
}

// ── Inline Scenario Engine ───────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import {
  computeScenarioKPIs,
  type ScenarioAssumptions,
  type ScenarioKPIs,
} from "@/lib/planning-engine";
import { formatNumber } from "@/lib/format";

const DEFAULT_ASSUMPTIONS: ScenarioAssumptions = {
  revenueChange: 0,
  costReduction: 0,
  headcountChange: 0,
  marketingSpend: 0,
};

interface SavedScenario {
  name: string;
  bestCase: ScenarioAssumptions;
  worstCase: ScenarioAssumptions;
}

function ScenarioEngine() {
  const [baseKPIs, setBaseKPIs] = useState<ScenarioKPIs | null>(null);
  const [bestCase, setBestCase] = useState<ScenarioAssumptions>({
    revenueChange: 0.2,
    costReduction: 0.1,
    headcountChange: 0,
    marketingSpend: 0.1,
  });
  const [worstCase, setWorstCase] = useState<ScenarioAssumptions>({
    revenueChange: -0.15,
    costReduction: -0.05,
    headcountChange: 0.1,
    marketingSpend: -0.2,
  });
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");

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
          // Sum all months for base KPIs
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

    // Load saved scenarios
    try {
      const saved = localStorage.getItem("planning-scenarios");
      if (saved) setSavedScenarios(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveScenario = useCallback(() => {
    if (!scenarioName.trim()) return;
    const newScenario: SavedScenario = {
      name: scenarioName.trim(),
      bestCase,
      worstCase,
    };
    const updated = [...savedScenarios.filter(s => s.name !== newScenario.name), newScenario];
    setSavedScenarios(updated);
    localStorage.setItem("planning-scenarios", JSON.stringify(updated));
    setScenarioName("");
  }, [scenarioName, bestCase, worstCase, savedScenarios]);

  const loadScenario = useCallback((s: SavedScenario) => {
    setBestCase(s.bestCase);
    setWorstCase(s.worstCase);
  }, []);

  if (!baseKPIs) {
    return (
      <div className="bg-bg-card rounded-xl border border-border-subtle p-8 text-center text-text-muted">
        Loading P&L data for scenario modeling...
      </div>
    );
  }

  const bestKPIs = computeScenarioKPIs(baseKPIs, bestCase);
  const worstKPIs = computeScenarioKPIs(baseKPIs, worstCase);

  const kpiRows: { label: string; key: keyof ScenarioKPIs; format: "currency" | "percent" }[] = [
    { label: "Revenue", key: "revenue", format: "currency" },
    { label: "COGS", key: "cogs", format: "currency" },
    { label: "Gross Profit", key: "grossProfit", format: "currency" },
    { label: "Gross Margin", key: "grossMargin", format: "percent" },
    { label: "OpEx", key: "opEx", format: "currency" },
    { label: "Marketing", key: "marketing", format: "currency" },
    { label: "EBITDA", key: "ebitda", format: "currency" },
    { label: "EBITDA Margin", key: "ebitdaMargin", format: "percent" },
    { label: "Net Income", key: "netIncome", format: "currency" },
    { label: "Net Margin", key: "netMargin", format: "percent" },
  ];

  const fmtKPI = (val: number, format: string) => {
    if (format === "percent") return `${val}%`;
    return formatNumber(val, "currency");
  };

  const colorClass = (val: number, base: number) => {
    if (val > base) return "text-emerald-400";
    if (val < base) return "text-red-400";
    return "text-text-secondary";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-text-primary">What-If Scenario Engine</h2>

      {/* Assumption Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScenarioSliders label="Best Case" assumptions={bestCase} onChange={setBestCase} />
        <ScenarioSliders label="Worst Case" assumptions={worstCase} onChange={setWorstCase} />
      </div>

      {/* Save / Load */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          placeholder="Scenario name..."
          className="bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent w-48"
        />
        <button
          onClick={saveScenario}
          disabled={!scenarioName.trim()}
          className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          Save Scenario
        </button>
        {savedScenarios.map(s => (
          <button
            key={s.name}
            onClick={() => loadScenario(s)}
            className="px-3 py-2 text-xs rounded-lg border border-border-subtle text-text-secondary hover:text-accent hover:border-accent transition-colors"
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* KPI Comparison Table */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 text-text-muted font-medium">KPI</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Base Case</th>
                <th className="text-right px-4 py-3 text-emerald-400 font-medium">Best Case</th>
                <th className="text-right px-4 py-3 text-red-400 font-medium">Worst Case</th>
              </tr>
            </thead>
            <tbody>
              {kpiRows.map((row) => (
                <tr key={row.key} className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors">
                  <td className="px-4 py-2.5 text-text-primary font-medium">{row.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {fmtKPI(baseKPIs[row.key], row.format)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${colorClass(bestKPIs[row.key], baseKPIs[row.key])}`}>
                    {fmtKPI(bestKPIs[row.key], row.format)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${colorClass(worstKPIs[row.key], baseKPIs[row.key])}`}>
                    {fmtKPI(worstKPIs[row.key], row.format)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScenarioSliders({
  label,
  assumptions,
  onChange,
}: {
  label: string;
  assumptions: ScenarioAssumptions;
  onChange: (a: ScenarioAssumptions) => void;
}) {
  const sliders: { key: keyof ScenarioAssumptions; label: string; min: number; max: number }[] = [
    { key: "revenueChange", label: "Revenue Change", min: -50, max: 50 },
    { key: "costReduction", label: "Cost Reduction", min: -30, max: 30 },
    { key: "headcountChange", label: "Headcount Change", min: -20, max: 20 },
    { key: "marketingSpend", label: "Marketing Spend", min: -50, max: 50 },
  ];

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">{label}</h3>
      <div className="space-y-3">
        {sliders.map((s) => (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-muted">{s.label}</span>
              <span className="text-xs font-mono text-accent">
                {assumptions[s.key] >= 0 ? "+" : ""}
                {Math.round(assumptions[s.key] * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              value={Math.round(assumptions[s.key] * 100)}
              onChange={(e) =>
                onChange({ ...assumptions, [s.key]: Number(e.target.value) / 100 })
              }
              className="w-full h-1.5 rounded-full appearance-none bg-bg-input accent-accent cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
