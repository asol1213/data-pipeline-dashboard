"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  ReferenceLine,
} from "recharts";
import ReactMarkdown from "react-markdown";
import { forecast } from "@/lib/forecast";

const PRO_PALETTE = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#22c55e"];
const PIE_MAX_SLICES = 15;
const MAX_DATA_POINTS = 50;

type ChartType = "bar" | "line" | "area" | "pie" | "waterfall";

interface ChartCardProps {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  color?: string;
  defaultType?: ChartType;
  onDrillDown?: (label: string, column: string) => void;
  chartData?: { label: string; value: number }[];
  columnName?: string;
}

export default function ChartCard({
  title,
  data,
  xKey,
  yKey,
  color = "#3b82f6",
  defaultType = "bar",
  onDrillDown,
  chartData: chartDataProp,
  columnName,
}: ChartCardProps) {
  const [chartType, setChartType] = useState<ChartType>(defaultType);
  const [showForecast, setShowForecast] = useState(false);

  // AI insight state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiStreaming, setAiStreaming] = useState("");
  const aiEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiStreaming]);

  // Count unique values for pie chart check
  const uniqueLabelCount = useMemo(() => {
    const unique = new Set(data.map((d) => String(d[xKey])));
    return unique.size;
  }, [data, xKey]);

  // Sampled data for bar/line/area charts with many data points
  const sampledData = useMemo(() => {
    if (data.length <= MAX_DATA_POINTS) return { data, isSampled: false };

    // Sort by yKey descending and take top N
    const sorted = [...data].sort(
      (a, b) => (Number(b[yKey]) || 0) - (Number(a[yKey]) || 0)
    );
    return { data: sorted.slice(0, MAX_DATA_POINTS), isSampled: true };
  }, [data, yKey]);

  const displayData = chartType === "bar" || chartType === "line" || chartType === "area"
    ? sampledData.data
    : data;

  const forecastData = useMemo(() => {
    if (!showForecast || chartType !== "line") return null;
    const values = displayData.map((d) => Number(d[yKey])).filter((v) => !isNaN(v));
    if (values.length < 3) return null;
    const fc = forecast(values, 3);
    if (fc.predicted.length === 0) return null;

    return fc.predicted.map((pred, i) => ({
      [xKey]: `+${i + 1}`,
      [yKey]: null as number | null,
      [`${yKey}_forecast`]: pred,
      [`${yKey}_upper`]: fc.confidence.upper[i],
      [`${yKey}_lower`]: fc.confidence.lower[i],
    }));
  }, [displayData, xKey, yKey, showForecast, chartType]);

  const chartDataWithForecast = useMemo(() => {
    if (!forecastData) return displayData;
    const existing = displayData.map((d) => ({
      ...d,
      [`${yKey}_forecast`]: null as number | null,
      [`${yKey}_upper`]: null as number | null,
      [`${yKey}_lower`]: null as number | null,
    }));
    if (existing.length > 0) {
      const lastVal = Number(existing[existing.length - 1][yKey]);
      existing[existing.length - 1][`${yKey}_forecast`] = lastVal;
    }
    return [...existing, ...forecastData];
  }, [displayData, forecastData, yKey]);

  const handleBarClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (barData: any) => {
      if (onDrillDown && barData?.activePayload?.[0]?.payload) {
        const label = String(barData.activePayload[0].payload[xKey]);
        onDrillDown(label, xKey);
      }
    },
    [onDrillDown, xKey]
  );

  const handlePieClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (entry: any) => {
      if (onDrillDown && entry?.name) {
        onDrillDown(String(entry.name), xKey);
      }
    },
    [onDrillDown, xKey]
  );

  // Derive chart data points for AI context
  const aiChartPoints = useMemo(() => {
    if (chartDataProp) return chartDataProp;
    return displayData.map((d) => ({
      label: String(d[xKey]),
      value: Number(d[yKey]) || 0,
    }));
  }, [chartDataProp, displayData, xKey, yKey]);

  const aiColumnName = columnName || yKey;
  const hasAiData = aiChartPoints.length > 0;

  const sendAiQuestion = useCallback(async (question: string) => {
    if (aiLoading || !question.trim()) return;

    const values = aiChartPoints.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;

    const chartContext = `This chart shows "${aiColumnName}" data with ${aiChartPoints.length} data points.
Values: ${aiChartPoints.map((d) => `${d.label}: ${d.value}`).join(", ")}
Min: ${min}, Max: ${max}, Average: ${avg}
Chart type: ${chartType}
The user is looking at this specific chart and asking:`;

    setAiMessages((prev) => [...prev, { role: "user", content: question }]);
    setAiInput("");
    setAiLoading(true);
    setAiStreaming("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `${chartContext}\n\n${question}` }),
      });

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAiStreaming(full);
      }

      setAiMessages((prev) => [...prev, { role: "assistant", content: full }]);
      setAiStreaming("");
    } catch {
      setAiMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, aiChartPoints, aiColumnName, chartType]);

  const handleAiSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendAiQuestion(aiInput);
  }, [aiInput, sendAiQuestion]);

  const chartTypes: { key: ChartType; label: string }[] = [
    { key: "bar", label: "Bar" },
    { key: "line", label: "Line" },
    { key: "area", label: "Area" },
    { key: "pie", label: "Pie" },
    { key: "waterfall", label: "Waterfall" },
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

  // Waterfall chart data
  const waterfallData = useMemo(() => {
    let runningTotal = 0;
    const result: {
      name: string;
      base: number;
      value: number;
      total: number;
      isPositive: boolean;
      isTotal: boolean;
    }[] = [];

    for (let i = 0; i < data.length; i++) {
      const val = Number(data[i][yKey]) || 0;
      const isLast = i === data.length - 1;

      if (i === 0) {
        result.push({
          name: String(data[i][xKey]),
          base: 0,
          value: val,
          total: val,
          isPositive: val >= 0,
          isTotal: false,
        });
        runningTotal = val;
      } else if (isLast) {
        result.push({
          name: String(data[i][xKey]),
          base: 0,
          value: val,
          total: val,
          isPositive: val >= 0,
          isTotal: true,
        });
      } else {
        const change = val;
        const base = change >= 0 ? runningTotal : runningTotal + change;
        result.push({
          name: String(data[i][xKey]),
          base: Math.max(0, base),
          value: Math.abs(change),
          total: runningTotal + change,
          isPositive: change >= 0,
          isTotal: false,
        });
        runningTotal += change;
      }
    }
    return result;
  }, [data, xKey, yKey]);

  const cursorStyle = onDrillDown ? { cursor: "pointer" } : {};

  // Check if pie chart should show the "too many values" message
  const pieTooManyValues = chartType === "pie" && uniqueLabelCount > PIE_MAX_SLICES;

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-lg shadow-black/5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Column: {yKey}
            {onDrillDown && (
              <span className="ml-2 text-accent">Click to drill down</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {chartType === "line" && (
            <button
              onClick={() => setShowForecast(!showForecast)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all border ${
                showForecast
                  ? "bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/30"
                  : "text-text-muted hover:text-text-secondary border-border-subtle"
              }`}
            >
              Forecast
            </button>
          )}
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
          {hasAiData && (
            <button
              onClick={() => setAiOpen(!aiOpen)}
              className={`ml-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all border ${
                aiOpen
                  ? "bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/30"
                  : "text-text-muted hover:text-text-secondary border-border-subtle hover:border-[#8b5cf6]/30"
              }`}
              title="Ask AI about this chart"
            >
              <span className="text-sm">&#10024;</span>
            </button>
          )}
        </div>
      </div>

      {/* Sampling note for bar/line/area */}
      {sampledData.isSampled && (chartType === "bar" || chartType === "line" || chartType === "area") && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20 text-xs text-accent">
          Showing top {MAX_DATA_POINTS} of {data.length} values
        </div>
      )}

      <div style={{ width: "100%", minHeight: 300, ...cursorStyle }}>
        {pieTooManyValues ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="max-w-sm mx-auto px-6 py-5 rounded-xl bg-bg-secondary/50 border border-border-subtle text-center">
              <div className="text-2xl mb-3">i</div>
              <p className="text-sm text-text-secondary leading-relaxed">
                Too many unique values for pie chart ({uniqueLabelCount}).
                Try <span className="font-medium text-text-primary">Bar</span> or{" "}
                <span className="font-medium text-text-primary">Line</span> chart instead,
                or use a categorical column like Channel, Region, or Status.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {chartType === "bar" ? (
              <BarChart data={displayData} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
                <XAxis dataKey={xKey} {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : chartType === "line" ? (
              <LineChart data={showForecast ? chartDataWithForecast : displayData} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
                <XAxis dataKey={xKey} {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} />
                {showForecast && forecastData && (
                  <>
                    <defs>
                      <linearGradient id={`forecast-band-${yKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey={`${yKey}_upper`}
                      stroke="none"
                      fill={`url(#forecast-band-${yKey})`}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey={`${yKey}_lower`}
                      stroke="none"
                      fill="transparent"
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={`${yKey}_forecast`}
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={{ fill: "#8b5cf6", r: 3, strokeWidth: 0 }}
                      connectNulls
                    />
                    <ReferenceLine
                      x={String(displayData[displayData.length - 1]?.[xKey] ?? "")}
                      stroke="#8b5cf6"
                      strokeDasharray="3 3"
                      opacity={0.4}
                    />
                  </>
                )}
                <Line
                  type="monotone"
                  dataKey={yKey}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ fill: color, r: 4, strokeWidth: 2, stroke: "#1a2332" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  connectNulls={false}
                />
              </LineChart>
            ) : chartType === "area" ? (
              <AreaChart data={displayData} onClick={handleBarClick}>
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
            ) : chartType === "waterfall" ? (
              <BarChart data={waterfallData} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.5} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any, props: any) => {
                    if (name === "base") return [null, null];
                    const item = props?.payload;
                    if (!item) return [String(value), "Value"];
                    return [
                      item.isTotal ? `Total: ${item.total}` : `${item.isPositive ? "+" : "-"}${value} (Total: ${item.total})`,
                      "Value",
                    ];
                  }}
                />
                <Bar dataKey="base" stackId="waterfall" fill="transparent" radius={0} />
                <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((entry, index) => (
                    <Cell
                      key={`wf-${index}`}
                      fill={entry.isTotal ? "#3b82f6" : entry.isPositive ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
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
                  onClick={handlePieClick}
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

      {/* AI Insight Panel */}
      {aiOpen && hasAiData && (
        <div className="mt-4 border-t border-border-subtle pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">&#10024;</span>
            <span className="text-xs font-semibold text-text-primary">Ask AI about this chart</span>
          </div>

          {/* Quick questions */}
          {aiMessages.length === 0 && !aiStreaming && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {["What's the trend?", "What are the outliers?", "Summarize this data"].map((q) => (
                <button
                  key={q}
                  onClick={() => sendAiQuestion(q)}
                  className="px-2.5 py-1 text-[11px] rounded-full border border-border-subtle text-text-muted hover:text-text-primary hover:border-[#8b5cf6]/40 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {(aiMessages.length > 0 || aiStreaming) && (
            <div className="max-h-[200px] overflow-y-auto mb-3 space-y-2 pr-1">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] rounded-lg px-3 py-1.5 text-xs ${
                    msg.role === "user"
                      ? "bg-[#8b5cf6] text-white"
                      : "bg-bg-secondary border border-border-subtle text-text-primary"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="chat-markdown text-xs leading-relaxed">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {aiStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-lg px-3 py-1.5 text-xs bg-bg-secondary border border-border-subtle text-text-primary">
                    <div className="chat-markdown text-xs leading-relaxed">
                      <ReactMarkdown>{aiStreaming}</ReactMarkdown>
                      <span className="inline-block w-1 h-3 bg-[#8b5cf6] ml-0.5 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {aiLoading && !aiStreaming && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-3 py-1.5 bg-bg-secondary border border-border-subtle">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={aiEndRef} />
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleAiSubmit} className="flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask anything about this chart..."
              className="flex-1 px-3 py-1.5 rounded-lg text-xs border border-border-subtle bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/50 placeholder:text-text-muted"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiInput.trim()}
              className="px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 text-white rounded-lg text-xs transition-colors"
            >
              Ask
            </button>
          </form>

          {/* Close button */}
          <div className="flex justify-end mt-2">
            <button
              onClick={() => { setAiOpen(false); setAiMessages([]); setAiStreaming(""); }}
              className="text-[10px] text-text-muted hover:text-text-primary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
