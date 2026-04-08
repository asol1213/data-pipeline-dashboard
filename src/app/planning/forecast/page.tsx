"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  generateRollingForecastData,
  computeForecastAccuracy,
} from "@/lib/planning-engine";
import { formatNumber } from "@/lib/format";

const METRICS = [
  { key: "revenue" as const, label: "Revenue" },
  { key: "ebitda" as const, label: "EBITDA" },
  { key: "netIncome" as const, label: "Net Income" },
];

export default function ForecastPage() {
  const [metric, setMetric] = useState<"revenue" | "ebitda" | "netIncome">(
    "revenue"
  );

  const data = useMemo(() => generateRollingForecastData(metric), [metric]);

  const accuracyQ1 = useMemo(
    () => computeForecastAccuracy(data, "q1"),
    [data]
  );
  const accuracyQ2 = useMemo(
    () => computeForecastAccuracy(data, "q2"),
    [data]
  );
  const accuracyQ3 = useMemo(
    () => computeForecastAccuracy(data, "q3"),
    [data]
  );

  const formatAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return String(value);
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">
          Rolling Forecast Timeline
        </h1>
        <p className="text-sm text-blue-200 mt-1">
          See how forecasts evolved over time compared to the original budget
          and actuals.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4 flex items-center gap-3">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Metric
          </label>
          <select
            value={metric}
            onChange={(e) =>
              setMetric(e.target.value as "revenue" | "ebitda" | "netIncome")
            }
            className="bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Accuracy Badges */}
        <div className="flex gap-2">
          <span className="px-3 py-1.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Q1 Forecast: {accuracyQ1}% accurate
          </span>
          <span className="px-3 py-1.5 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Q2 Forecast: {accuracyQ2}% accurate
          </span>
          <span className="px-3 py-1.5 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Q3 Forecast: {accuracyQ3}% accurate
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-6">
        <ResponsiveContainer width="100%" height={420}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
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
            <Line
              type="monotone"
              dataKey="budget"
              name="Original Budget"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="forecast_q1"
              name="Forecast Q1"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="forecast_q2"
              name="Forecast Q2"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="forecast_q3"
              name="Forecast Q3"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Table */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 text-text-muted font-medium">
                  Month
                </th>
                <th className="text-right px-4 py-3 text-blue-400 font-medium">
                  Budget
                </th>
                <th className="text-right px-4 py-3 text-purple-400 font-medium">
                  Forecast Q1
                </th>
                <th className="text-right px-4 py-3 text-amber-400 font-medium">
                  Forecast Q2
                </th>
                <th className="text-right px-4 py-3 text-red-400 font-medium">
                  Forecast Q3
                </th>
                <th className="text-right px-4 py-3 text-emerald-400 font-medium">
                  Actual
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Budget vs Actual
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const variance = row.actual - row.budget;
                const variancePct =
                  row.budget !== 0
                    ? Math.round((variance / row.budget) * 1000) / 10
                    : 0;
                return (
                  <tr
                    key={row.month}
                    className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                  >
                    <td className="px-4 py-2.5 text-text-primary font-medium">
                      {row.month}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                      {formatNumber(row.budget, "currency")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                      {formatNumber(row.forecast_q1, "currency")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                      {formatNumber(row.forecast_q2, "currency")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                      {formatNumber(row.forecast_q3, "currency")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                      {formatNumber(row.actual, "currency")}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono ${
                        variance >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {variance >= 0 ? "+" : ""}
                      {formatNumber(variance, "currency")} ({variancePct}%)
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
