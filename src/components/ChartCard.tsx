"use client";

import { useState } from "react";
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
  Legend,
} from "recharts";

const PRO_PALETTE = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#22c55e"];

type ChartType = "bar" | "line" | "area" | "pie";

interface ChartCardProps {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  color?: string;
  defaultType?: ChartType;
}

export default function ChartCard({
  title,
  data,
  xKey,
  yKey,
  color = "#3b82f6",
  defaultType = "bar",
}: ChartCardProps) {
  const [chartType, setChartType] = useState<ChartType>(defaultType);

  const chartTypes: { key: ChartType; label: string }[] = [
    { key: "bar", label: "Bar" },
    { key: "line", label: "Line" },
    { key: "area", label: "Area" },
    { key: "pie", label: "Pie" },
  ];

  const tooltipStyle = {
    backgroundColor: "#1a2332",
    border: "1px solid #1e3a5f",
    borderRadius: "8px",
    color: "#f0f4f8",
    fontSize: "12px",
  };

  const axisProps = {
    tick: { fill: "#94a3b8", fontSize: 12 },
    axisLine: { stroke: "#1e3a5f" },
  };

  const pieData = data.map((item, i) => ({
    name: String(item[xKey]),
    value: Number(item[yKey]) || 0,
    fill: PRO_PALETTE[i % PRO_PALETTE.length],
  }));

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-lg shadow-black/5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Column: {yKey}</p>
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
      <div style={{ width: "100%", minHeight: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke={color}
                strokeWidth={2.5}
                dot={{ fill: color, r: 4, strokeWidth: 2, stroke: "#1a2332" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${yKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#gradient-${yKey})`}
                dot={{ fill: color, r: 3, strokeWidth: 2, stroke: "#1a2332" }}
              />
            </AreaChart>
          ) : (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
              />
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={100}
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
      </div>
    </div>
  );
}
