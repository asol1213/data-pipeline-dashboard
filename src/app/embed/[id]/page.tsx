"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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

interface EmbedConfig {
  datasetName: string;
  col: string;
  labelCol: string;
  chartData: Record<string, string | number>[];
}

export default function EmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const col = searchParams.get("col") || "";
  const type = (searchParams.get("type") || "bar") as ChartType;

  const [config, setConfig] = useState<EmbedConfig | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !col) return;
    fetch(`/api/embed?id=${encodeURIComponent(id)}&col=${encodeURIComponent(col)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data: EmbedConfig) => setConfig(data))
      .catch(() => setError("Failed to load chart data"));
  }, [id, col]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1117] text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

  const pieData = config.chartData.map((item, i) => ({
    name: String(item[config.labelCol]),
    value: Number(item[col]) || 0,
    fill: PRO_PALETTE[i % PRO_PALETTE.length],
  }));

  const color = "#3b82f6";

  return (
    <div className="w-full h-screen bg-[#0d1117] flex flex-col">
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <div className="flex-1 p-4">
        <ResponsiveContainer width="100%" height="100%">
          {type === "bar" ? (
            <BarChart data={config.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
              <XAxis dataKey={config.labelCol} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey={col} fill={color} radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : type === "line" ? (
            <LineChart data={config.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
              <XAxis dataKey={config.labelCol} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey={col}
                stroke={color}
                strokeWidth={2.5}
                dot={{ fill: color, r: 4, strokeWidth: 2, stroke: "#0d1117" }}
              />
            </LineChart>
          ) : type === "area" ? (
            <AreaChart data={config.chartData}>
              <defs>
                <linearGradient id="embedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
              <XAxis dataKey={config.labelCol} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey={col}
                stroke={color}
                strokeWidth={2.5}
                fill="url(#embedGradient)"
              />
            </AreaChart>
          ) : (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
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
      <div className="text-center py-2 text-[10px] text-gray-500">
        Powered by DataPipe
      </div>
    </div>
  );
}
