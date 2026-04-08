"use client";

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
  Legend,
} from "recharts";

interface PresetChartsProps {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKeys: string[];
  colors: string[];
  chartType: "bar" | "line";
}

export default function PresetCharts({
  title,
  data,
  xKey,
  yKeys,
  colors,
  chartType,
}: PresetChartsProps) {
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

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-lg shadow-black/5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <div style={{ width: "100%", minHeight: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
              {yKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[i % colors.length]}
                  radius={[4, 4, 0, 0]}
                  name={key.replace(/_/g, " ")}
                />
              ))}
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
              {yKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2.5}
                  dot={{ fill: colors[i % colors.length], r: 4, strokeWidth: 2, stroke: "#1a2332" }}
                  name={key.replace(/_/g, " ")}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
