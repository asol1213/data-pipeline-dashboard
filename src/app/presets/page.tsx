import Link from "next/link";
import { getAllDatasets, getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { computeDatasetStats } from "@/lib/stats";
import KPICard from "@/components/KPICard";
import PresetCharts from "./PresetCharts";

export const dynamic = "force-dynamic";

interface PresetConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  datasetMatch: (name: string) => boolean;
  columns: string[];
  kpis: (
    rows: Record<string, string>[],
    headers: string[]
  ) => { label: string; value: string | number; trend?: "up" | "down" | "neutral"; subtitle?: string }[];
  charts: (headers: string[]) => { label: string; xKey: string; yKeys: string[]; type: "bar" | "line" }[];
}

const presets: PresetConfig[] = [
  {
    id: "cfo",
    name: "CFO View",
    description:
      "Revenue, COGS, Margins, EBITDA, Net Income. Auto-selects the P&L dataset.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    datasetMatch: (name: string) =>
      name.toLowerCase().includes("p&l") || name.toLowerCase().includes("pnl") || name.toLowerCase().includes("income"),
    columns: ["Revenue", "COGS", "Gross_Profit", "EBITDA", "Net_Income", "Gross_Margin_%", "Net_Margin_%"],
    kpis: (rows, headers) => {
      const results: { label: string; value: string | number; trend?: "up" | "down" | "neutral"; subtitle?: string }[] = [];
      if (headers.includes("Revenue")) {
        const total = rows.reduce((s, r) => s + Number(r.Revenue || 0), 0);
        const first = Number(rows[0]?.Revenue || 0);
        const last = Number(rows[rows.length - 1]?.Revenue || 0);
        const growth = first > 0 ? ((last - first) / first * 100).toFixed(1) : "0";
        results.push({
          label: "Total Revenue",
          value: total.toLocaleString(),
          trend: last > first ? "up" : "down",
          subtitle: `${growth}% first to last period`,
        });
      }
      if (headers.includes("Gross_Margin_%")) {
        const vals = rows.map((r) => Number(r["Gross_Margin_%"] || 0)).filter((v) => !isNaN(v));
        const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "0";
        results.push({ label: "Avg Gross Margin", value: `${avg}%`, trend: "neutral" });
      } else if (headers.includes("Net_Margin_%")) {
        const vals = rows.map((r) => Number(r["Net_Margin_%"] || 0)).filter((v) => !isNaN(v));
        const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "0";
        results.push({ label: "Avg Net Margin", value: `${avg}%`, trend: "neutral" });
      }
      if (headers.includes("Net_Income")) {
        const first = Number(rows[0]?.Net_Income || 0);
        const last = Number(rows[rows.length - 1]?.Net_Income || 0);
        results.push({
          label: "Net Income Trend",
          value: last.toLocaleString(),
          trend: last > first ? "up" : last < first ? "down" : "neutral",
          subtitle: `Latest period`,
        });
      }
      return results;
    },
    charts: (headers) => {
      const charts: { label: string; xKey: string; yKeys: string[]; type: "bar" | "line" }[] = [];
      const labelCol = headers.find((h) => h === "Month" || h === "Quarter" || h === "Period") || headers[0];
      if (headers.includes("Revenue") && headers.includes("COGS")) {
        charts.push({ label: "Revenue vs COGS", xKey: labelCol, yKeys: ["Revenue", "COGS"], type: "bar" });
      }
      const marginCols = headers.filter((h) => h.includes("Margin"));
      if (marginCols.length > 0) {
        charts.push({ label: "Margins", xKey: labelCol, yKeys: marginCols.slice(0, 3), type: "line" });
      }
      return charts;
    },
  },
  {
    id: "sales",
    name: "Sales View",
    description:
      "Pipeline, Customers, Win Rate, Forecast accuracy. Auto-selects Revenue Forecast data.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    datasetMatch: (name: string) =>
      name.toLowerCase().includes("forecast") || name.toLowerCase().includes("sales") || name.toLowerCase().includes("revenue"),
    columns: ["Forecast", "Actual", "Variance", "Pipeline_Value", "Win_Rate_%", "YoY_Growth_%", "Customers"],
    kpis: (rows, headers) => {
      const results: { label: string; value: string | number; trend?: "up" | "down" | "neutral"; subtitle?: string }[] = [];
      if (headers.includes("Customers") || headers.includes("Total_Customers")) {
        const col = headers.includes("Total_Customers") ? "Total_Customers" : "Customers";
        const last = Number(rows[rows.length - 1]?.[col] || 0);
        const first = Number(rows[0]?.[col] || 0);
        results.push({
          label: "Total Customers",
          value: last.toLocaleString(),
          trend: last > first ? "up" : "down",
          subtitle: `from ${first.toLocaleString()}`,
        });
      }
      if (headers.includes("Win_Rate_%")) {
        const vals = rows.map((r) => Number(r["Win_Rate_%"] || 0)).filter((v) => !isNaN(v));
        const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "0";
        results.push({ label: "Avg Win Rate", value: `${avg}%`, trend: "neutral" });
      }
      if (headers.includes("YoY_Growth_%")) {
        const vals = rows.map((r) => Number(r["YoY_Growth_%"] || 0)).filter((v) => !isNaN(v));
        const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "0";
        results.push({
          label: "Avg YoY Growth",
          value: `${avg}%`,
          trend: Number(avg) > 0 ? "up" : "down",
        });
      }
      return results;
    },
    charts: (headers) => {
      const charts: { label: string; xKey: string; yKeys: string[]; type: "bar" | "line" }[] = [];
      const labelCol = headers.find((h) => h === "Month" || h === "Quarter") || headers[0];
      if (headers.includes("Forecast") && headers.includes("Actual")) {
        charts.push({ label: "Forecast vs Actual", xKey: labelCol, yKeys: ["Forecast", "Actual"], type: "bar" });
      }
      if (headers.includes("Customers") || headers.includes("Total_Customers")) {
        const col = headers.includes("Total_Customers") ? "Total_Customers" : "Customers";
        charts.push({ label: "Customer Growth", xKey: labelCol, yKeys: [col], type: "line" });
      }
      return charts;
    },
  },
  {
    id: "saas",
    name: "SaaS Metrics View",
    description:
      "MRR, ARR, Churn, LTV, CAC, NRR. Auto-selects the SaaS KPIs dataset.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    datasetMatch: (name: string) =>
      name.toLowerCase().includes("saas") || name.toLowerCase().includes("kpi") || name.toLowerCase().includes("mrr"),
    columns: ["MRR", "ARR", "Churn_Rate_%", "LTV", "CAC", "LTV_CAC_Ratio", "Net_Revenue_Retention_%"],
    kpis: (rows, headers) => {
      const results: { label: string; value: string | number; trend?: "up" | "down" | "neutral"; subtitle?: string }[] = [];
      if (headers.includes("MRR")) {
        const last = Number(rows[rows.length - 1]?.MRR || 0);
        const first = Number(rows[0]?.MRR || 0);
        const growth = first > 0 ? ((last - first) / first * 100).toFixed(1) : "0";
        results.push({
          label: "Current MRR",
          value: last.toLocaleString(),
          trend: last > first ? "up" : "down",
          subtitle: `${growth}% growth`,
        });
      }
      if (headers.includes("LTV_CAC_Ratio")) {
        const last = Number(rows[rows.length - 1]?.LTV_CAC_Ratio || 0);
        results.push({
          label: "LTV/CAC Ratio",
          value: last.toFixed(1),
          trend: last >= 3 ? "up" : last >= 2 ? "neutral" : "down",
          subtitle: last >= 3 ? "Healthy" : "Needs improvement",
        });
      }
      if (headers.includes("Churn_Rate_%")) {
        const last = Number(rows[rows.length - 1]?.["Churn_Rate_%"] || 0);
        results.push({
          label: "Churn Rate",
          value: `${last}%`,
          trend: last < 3 ? "up" : "down",
          subtitle: last < 3 ? "Below 3% target" : "Above 3% target",
        });
      }
      return results;
    },
    charts: (headers) => {
      const charts: { label: string; xKey: string; yKeys: string[]; type: "bar" | "line" }[] = [];
      const labelCol = headers.find((h) => h === "Month" || h === "Quarter") || headers[0];
      if (headers.includes("MRR")) {
        charts.push({ label: "MRR Trend", xKey: labelCol, yKeys: ["MRR"], type: "line" });
      }
      if (headers.includes("Churn_Rate_%")) {
        charts.push({ label: "Churn Trend", xKey: labelCol, yKeys: ["Churn_Rate_%"], type: "line" });
      }
      return charts;
    },
  },
];

export default function PresetsPage() {
  ensureSeedData();
  const datasets = getAllDatasets();

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Presets</h1>
            <p className="text-sm text-blue-200 mt-1">
              Pre-configured views that auto-select the best dataset for each perspective
            </p>
          </div>
          <Link
            href="/"
            className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Preset Sections */}
      {presets.map((preset) => {
        // Find matching dataset
        const matchingMeta = datasets.find((d) => preset.datasetMatch(d.name));
        const dataset = matchingMeta ? getDataset(matchingMeta.id) : null;

        if (!dataset) {
          return (
            <div key={preset.id} className="mb-10">
              <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-14 h-14 rounded-xl bg-accent-subtle flex items-center justify-center text-accent">
                    {preset.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-primary">{preset.name}</h2>
                    <p className="text-sm text-text-muted">{preset.description}</p>
                  </div>
                </div>
                <p className="text-sm text-text-muted mt-4">
                  No matching dataset found. Upload a dataset that matches this preset to see data here.
                </p>
              </div>
            </div>
          );
        }

        const stats = computeDatasetStats(dataset.rows, dataset.headers, dataset.columnTypes);
        const availableCols = preset.columns.filter((c) => dataset.headers.includes(c));
        const kpis = preset.kpis(dataset.rows, dataset.headers);
        const chartConfigs = preset.charts(dataset.headers);

        // Build chart data
        const labelCol = dataset.headers.find((h) => h === "Month" || h === "Quarter" || h === "Period") || dataset.headers[0];
        const chartData = dataset.rows.map((row) => {
          const item: Record<string, string | number> = { [labelCol]: row[labelCol] };
          for (const col of dataset.headers) {
            if (dataset.columnTypes[col] === "number") {
              item[col] = Number(row[col]);
            }
          }
          return item;
        });

        const presetColors: Record<string, string[]> = {
          cfo: ["#3b82f6", "#8b5cf6", "#06b6d4"],
          sales: ["#22c55e", "#f59e0b", "#3b82f6"],
          saas: ["#06b6d4", "#ef4444", "#8b5cf6"],
        };
        const colors = presetColors[preset.id] || ["#3b82f6", "#8b5cf6", "#06b6d4"];

        return (
          <div key={preset.id} className="mb-10">
            {/* Preset header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center text-accent">
                  {preset.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{preset.name}</h2>
                  <p className="text-sm text-text-muted">
                    {preset.description} Using: <span className="text-accent">{dataset.name}</span>
                  </p>
                </div>
              </div>
              <Link
                href={`/datasets/${dataset.id}`}
                className="text-sm bg-bg-card border border-border-subtle hover:border-accent/50 text-text-secondary hover:text-text-primary px-4 py-2 rounded-lg transition-colors"
              >
                View Full Dataset
              </Link>
            </div>

            {/* KPIs */}
            {kpis.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {kpis.map((kpi, i) => (
                  <KPICard
                    key={i}
                    label={kpi.label}
                    value={kpi.value}
                    trend={kpi.trend}
                    subtitle={kpi.subtitle}
                  />
                ))}
              </div>
            )}

            {/* Charts */}
            {chartConfigs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {chartConfigs.map((chart, i) => (
                  <PresetCharts
                    key={`${preset.id}-chart-${i}`}
                    title={chart.label}
                    data={chartData}
                    xKey={chart.xKey}
                    yKeys={chart.yKeys}
                    colors={colors}
                    chartType={chart.type}
                  />
                ))}
              </div>
            )}

            {/* Summary stats for available columns */}
            {availableCols.length > 0 && (
              <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-medium text-text-secondary">Key Column Stats</h3>
                  <span className="text-xs text-text-muted">({availableCols.length} columns matched)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {availableCols.map((col) => {
                    const colStat = stats.columns.find((c) => c.column === col);
                    return (
                      <div key={col} className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                          {col.replace(/_/g, " ").replace(/%/g, "")}
                        </p>
                        <p className="text-lg font-bold text-text-primary">
                          {colStat?.mean !== undefined ? colStat.mean.toLocaleString() : "-"}
                        </p>
                        <p className="text-[10px] text-text-muted">avg</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
