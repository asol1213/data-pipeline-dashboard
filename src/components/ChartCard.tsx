"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartCardProps {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  color?: string;
}

export default function ChartCard({
  title,
  data,
  xKey,
  yKey,
  color = "#3b82f6",
}: ChartCardProps) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setChartType("bar")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              chartType === "bar"
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-muted hover:text-text-secondary"
            }`}
          >
            Bar
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              chartType === "line"
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-muted hover:text-text-secondary"
            }`}
          >
            Line
          </button>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis
                dataKey={xKey}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "#1e3a5f" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "#1e3a5f" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a2332",
                  border: "1px solid #1e3a5f",
                  borderRadius: "8px",
                  color: "#f0f4f8",
                }}
              />
              <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis
                dataKey={xKey}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "#1e3a5f" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "#1e3a5f" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a2332",
                  border: "1px solid #1e3a5f",
                  borderRadius: "8px",
                  color: "#f0f4f8",
                }}
              />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
