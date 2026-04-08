"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PALETTE = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#22c55e"];

type MiniChartType = "bar" | "line" | "area" | "pie";

interface QuickChartProps {
  data: Record<string, string>[];
  headers: string[];
  columnTypes: Record<string, string>;
}

export default function QuickChart({
  data,
  headers,
  columnTypes,
}: QuickChartProps) {
  const [open, setOpen] = useState(false);
  const [selectedCol, setSelectedCol] = useState("");
  const [chartType, setChartType] = useState<MiniChartType>("bar");

  const numericHeaders = useMemo(
    () => headers.filter((h) => columnTypes[h] === "number"),
    [headers, columnTypes]
  );

  const labelCol = useMemo(
    () => headers.find((h) => columnTypes[h] === "string") ?? headers[0] ?? "",
    [headers, columnTypes]
  );

  const chartData = useMemo(() => {
    if (!selectedCol) return [];
    return data.slice(0, 50).map((row, i) => ({
      name: row[labelCol] ?? String(i + 1),
      value: Number(row[selectedCol]) || 0,
    }));
  }, [data, selectedCol, labelCol]);

  const pieData = useMemo(
    () =>
      chartData.map((item, i) => ({
        ...item,
        fill: PALETTE[i % PALETTE.length],
      })),
    [chartData]
  );

  const tooltipStyle = {
    backgroundColor: "#1a2332",
    border: "1px solid #1e3a5f",
    borderRadius: "8px",
    color: "#f0f4f8",
    fontSize: "12px",
  };

  const axisProps = {
    tick: { fill: "#94a3b8", fontSize: 11 },
    axisLine: { stroke: "#1e3a5f" },
  };

  if (!open) {
    return (
      <button
        onClick={() => {
          if (numericHeaders.length > 0) {
            setSelectedCol(numericHeaders[0]);
          }
          setOpen(true);
        }}
        disabled={numericHeaders.length === 0}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-color transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Quick Chart
      </button>
    );
  }

  const chartTypes: { key: MiniChartType; label: string }[] = [
    { key: "bar", label: "Bar" },
    { key: "line", label: "Line" },
    { key: "area", label: "Area" },
    { key: "pie", label: "Pie" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-card rounded-2xl border border-border-subtle shadow-2xl w-[700px] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">Quick Chart</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-text-muted hover:text-text-secondary text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-muted">Column:</span>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {numericHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-0.5 bg-bg-secondary rounded-lg p-0.5">
            {chartTypes.map((ct) => (
              <button
                key={ct.key}
                onClick={() => setChartType(ct.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  chartType === ct.key
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="px-6 py-6">
          {chartData.length === 0 ? (
            <div className="text-center text-text-muted py-12">
              Select a numeric column to visualize
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              {chartType === "bar" ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : chartType === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ fill: "#3b82f6", r: 4, strokeWidth: 2, stroke: "#1a2332" }}
                  />
                </LineChart>
              ) : chartType === "area" ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="quickchart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#quickchart-gradient)"
                  />
                </AreaChart>
              ) : (
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={120}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle flex justify-end">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
