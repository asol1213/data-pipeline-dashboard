"use client";

import { useState, useEffect, useCallback } from "react";
import KPICard from "@/components/KPICard";
import ChartCard from "@/components/ChartCard";
import type { SlotConfig } from "@/components/SlotConfigModal";

interface BuilderSlotProps {
  config: SlotConfig | null;
  onConfigure: () => void;
  onRemove: () => void;
}

interface DatasetData {
  headers: string[];
  rows: Record<string, string>[];
  columnTypes: Record<string, string>;
}

function computeAggregation(
  rows: Record<string, string>[],
  column: string,
  aggregation: string
): number {
  const values = rows
    .map((r) => Number(r[column]))
    .filter((v) => !isNaN(v));
  if (values.length === 0) return 0;
  switch (aggregation) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "latest":
      return values[values.length - 1];
    default:
      return 0;
  }
}

export default function BuilderSlot({
  config,
  onConfigure,
  onRemove,
}: BuilderSlotProps) {
  const [data, setData] = useState<DatasetData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (datasetId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/datasets/${datasetId}`);
      if (res.ok) {
        const d = await res.json();
        setData({
          headers: d.headers,
          rows: d.rows,
          columnTypes: d.columnTypes,
        });
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (config?.datasetId) {
      fetchData(config.datasetId);
    }
  }, [config?.datasetId, fetchData]);

  // Empty slot
  if (!config) {
    return (
      <button
        onClick={onConfigure}
        className="w-full h-full min-h-[200px] border-2 border-dashed border-border-color rounded-xl flex flex-col items-center justify-center gap-3 hover:border-accent/50 hover:bg-accent-subtle transition-all group"
      >
        <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center group-hover:bg-accent/10 transition-colors">
          <svg
            className="w-6 h-6 text-text-muted group-hover:text-accent transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <span className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">
          Add Widget
        </span>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full min-h-[200px] bg-bg-card rounded-xl border border-border-subtle flex items-center justify-center">
        <div className="text-sm text-text-muted animate-pulse">Loading...</div>
      </div>
    );
  }

  const slotHeader = (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
        {config.datasetName}
      </span>
      <div className="flex gap-1">
        <button
          onClick={onConfigure}
          className="p-1 text-text-muted hover:text-accent transition-colors"
          title="Configure"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-text-muted hover:text-danger transition-colors"
          title="Remove"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  // KPI slot
  if (config.type === "kpi" && data && config.column) {
    const value = computeAggregation(
      data.rows,
      config.column,
      config.aggregation ?? "sum"
    );
    return (
      <div className="h-full">
        {slotHeader}
        <KPICard
          label={`${(config.aggregation ?? "sum").toUpperCase()} of ${config.column}`}
          value={Math.round(value * 100) / 100 === Math.round(value)
            ? Math.round(value).toLocaleString()
            : (Math.round(value * 100) / 100).toLocaleString()
          }
          subtitle={`${data.rows.length} rows`}
        />
      </div>
    );
  }

  // Chart slot
  if (config.type === "chart" && data && config.column) {
    const labelCol =
      data.headers.find((h) => data.columnTypes[h] === "string") ??
      data.headers[0];
    const chartData = data.rows.map((row) => ({
      [labelCol]: row[labelCol],
      [config.column!]: Number(row[config.column!]),
    }));
    return (
      <div className="h-full">
        {slotHeader}
        <ChartCard
          title={config.column}
          data={chartData}
          xKey={labelCol}
          yKey={config.column}
          defaultType={config.chartType ?? "bar"}
          chartData={chartData.map((row) => ({
            label: String(row[labelCol]),
            value: Number(row[config.column!]) || 0,
          }))}
          columnName={config.column}
        />
      </div>
    );
  }

  // Table slot
  if (config.type === "table" && data) {
    const displayCols = config.columns ?? data.headers.slice(0, 4);
    const displayRows = data.rows.slice(0, config.rowLimit ?? 10);
    return (
      <div className="h-full">
        {slotHeader}
        <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  {displayCols.map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-text-muted font-medium text-xs"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                  >
                    {displayCols.map((h) => (
                      <td
                        key={h}
                        className="px-3 py-1.5 text-text-primary text-xs"
                      >
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-1.5 text-[10px] text-text-muted border-t border-border-subtle">
            Showing {displayRows.length} of {data.rows.length} rows
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[200px] bg-bg-card rounded-xl border border-border-subtle flex items-center justify-center">
      <span className="text-sm text-text-muted">No data available</span>
    </div>
  );
}
