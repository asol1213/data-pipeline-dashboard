"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import KPICard from "@/components/KPICard";
import DashboardCharts from "./DashboardCharts";
import DashboardTable from "./DashboardTable";
import { DashboardSkeleton } from "./DashboardSkeleton";

interface DatasetMeta {
  id: string;
  name: string;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  columnTypes: Record<string, string>;
}

interface ColumnStat {
  column: string;
  type: string;
  count: number;
  uniqueCount: number;
  nullCount: number;
  mean?: number;
  median?: number;
  stddev?: number;
  min?: number;
  max?: number;
  anomalies?: number[];
  anomalyIndices?: number[];
}

interface DatasetStats {
  totalRows: number;
  totalColumns: number;
  columns: ColumnStat[];
  numericSummary: { column: string; mean: number; min: number; max: number }[];
}

interface Insight {
  type: string;
  icon: string;
  text: string;
  priority: number;
}

interface DashboardData {
  stats: DatasetStats;
  insights: Insight[];
  quality: { completeness: number; uniqueness: number; anomalyCount: number; qualityScore: number };
  rows: Record<string, string>[];
  headers: string[];
  columnTypes: Record<string, string>;
}

interface DashboardClientProps {
  datasets: DatasetMeta[];
  initialDatasetId: string;
  initialData: DashboardData;
}

export default function DashboardClient({
  datasets,
  initialDatasetId,
  initialData,
}: DashboardClientProps) {
  const [selectedId, setSelectedId] = useState(initialDatasetId);
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);

  const loadDataset = useCallback(async (id: string) => {
    if (id === initialDatasetId) {
      setData(initialData);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/datasets/${id}/dashboard`);
      if (res.ok) {
        const dashData = await res.json();
        setData(dashData);
      }
    } catch {
      // Keep current data on error
    } finally {
      setLoading(false);
    }
  }, [initialDatasetId, initialData]);

  useEffect(() => {
    if (selectedId !== initialDatasetId) {
      loadDataset(selectedId);
    } else {
      setData(initialData);
    }
  }, [selectedId, initialDatasetId, initialData, loadDataset]);

  const selectedDataset = datasets.find((d) => d.id === selectedId);
  const { stats, insights, quality, rows, headers, columnTypes } = data;

  const numericCols = headers.filter((h) => columnTypes[h] === "number");
  const labelCol =
    headers.find((h) => columnTypes[h] === "string") ?? headers[0];

  const anomalyIndices: Record<string, number[]> = {};
  const columnStatsMap: Record<string, { mean: number; stddev: number }> = {};
  stats.columns.forEach((col) => {
    if (col.anomalyIndices && col.anomalyIndices.length > 0) {
      anomalyIndices[col.column] = col.anomalyIndices;
    }
    if (col.mean !== undefined && col.stddev !== undefined) {
      columnStatsMap[col.column] = { mean: col.mean, stddev: col.stddev };
    }
  });

  const totalAnomalies = Object.values(anomalyIndices).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const topInsights = insights.slice(0, 6);

  const chartData = rows.map((row) => {
    const item: Record<string, string | number> = { [labelCol]: row[labelCol] };
    numericCols.forEach((col) => {
      item[col] = Number(row[col]);
    });
    return item;
  });

  const chartColors = [
    "#3b82f6",
    "#8b5cf6",
    "#06b6d4",
    "#f59e0b",
    "#ef4444",
    "#22c55e",
  ];

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-blue-200 mt-1">
              {datasets.length} dataset{datasets.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="dataset-selector" className="text-sm text-blue-200">
              Select Dataset:
            </label>
            <select
              id="dataset-selector"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer appearance-none pr-8"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1.25rem",
              }}
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id} className="bg-[#1a2332] text-white">
                  {ds.name}
                </option>
              ))}
            </select>
            <Link
              href="/presets"
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
            >
              Presets
            </Link>
            <Link
              href={`/datasets/${selectedId}`}
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
            >
              View full dataset &rarr;
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Quick Stats Summary Bar */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  <span className="text-sm text-text-secondary font-medium">{stats.totalRows} rows</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#8b5cf6]"></div>
                  <span className="text-sm text-text-secondary font-medium">{stats.totalColumns} columns</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
                  <span className="text-sm text-text-secondary font-medium">{totalAnomalies} anomalies</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${quality.qualityScore > 80 ? "bg-[#22c55e]" : quality.qualityScore > 60 ? "bg-[#f59e0b]" : "bg-[#ef4444]"}`}></div>
                  <span className="text-sm text-text-secondary font-medium">Quality: {quality.qualityScore}%</span>
                </div>
              </div>
              <span className="text-xs text-text-muted">
                Showing: {selectedDataset?.name ?? selectedId}
              </span>
            </div>
          </div>

          {/* Top Insights */}
          {topInsights.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full bg-accent"></div>
                  <h2 className="text-lg font-semibold text-text-primary">Key Insights</h2>
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                    {insights.length} found
                  </span>
                </div>
                <Link
                  href={`/datasets/${selectedId}`}
                  className="text-xs text-accent hover:text-accent-hover"
                >
                  View all insights &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {topInsights.map((insight, i) => (
                  <div
                    key={i}
                    className="bg-bg-card rounded-xl border border-border-subtle p-4 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{insight.icon}</span>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-medium text-text-muted block mb-1">
                          {insight.type}
                        </span>
                        <p className="text-sm text-text-primary leading-relaxed">{insight.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KPICard
              label="Total Rows"
              value={stats.totalRows.toLocaleString()}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              }
            />
            <KPICard
              label="Columns"
              value={stats.totalColumns}
              subtitle={`${numericCols.length} numeric`}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
              }
            />
            {stats.numericSummary[0] && (
              <KPICard
                label={`Avg ${stats.numericSummary[0].column}`}
                value={stats.numericSummary[0].mean.toLocaleString()}
                subtitle={`Range: ${stats.numericSummary[0].min.toLocaleString()} - ${stats.numericSummary[0].max.toLocaleString()}`}
                trend="up"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
              />
            )}
            <KPICard
              label="Anomalies"
              value={totalAnomalies}
              subtitle={totalAnomalies > 0 ? "Values >2 std dev" : "None detected"}
              trend={totalAnomalies > 0 ? "down" : "neutral"}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              }
            />
          </div>

          {/* Charts */}
          <DashboardCharts
            chartData={chartData}
            labelCol={labelCol}
            numericCols={numericCols}
            chartColors={chartColors}
          />

          {/* Data Table */}
          <div className="mt-8">
            <DashboardTable
              headers={headers}
              rows={rows}
              columnTypes={columnTypes}
              anomalyIndices={anomalyIndices}
              columnStats={columnStatsMap}
            />
          </div>
        </>
      )}
    </div>
  );
}
