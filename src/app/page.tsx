import Link from "next/link";
import { getAllDatasets } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { getDataset } from "@/lib/store";
import { computeDatasetStats } from "@/lib/stats";
import KPICard from "@/components/KPICard";
import DashboardCharts from "./DashboardCharts";
import DashboardTable from "./DashboardTable";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  ensureSeedData();
  const datasets = getAllDatasets();

  if (datasets.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-accent-subtle mx-auto flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            No datasets yet
          </h2>
          <p className="text-text-muted mb-6">
            Upload your first CSV to get started with analytics.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
          >
            Upload CSV
          </Link>
        </div>
      </div>
    );
  }

  // Show the most recent dataset on the dashboard
  const latest = datasets[datasets.length - 1];
  const dataset = getDataset(latest.id);
  if (!dataset) return null;

  const stats = computeDatasetStats(
    dataset.rows,
    dataset.headers,
    dataset.columnTypes
  );

  const numericCols = dataset.headers.filter(
    (h) => dataset.columnTypes[h] === "number"
  );
  const labelCol =
    dataset.headers.find((h) => dataset.columnTypes[h] === "string") ??
    dataset.headers[0];

  // Build anomaly indices map
  const anomalyIndices: Record<string, number[]> = {};
  stats.columns.forEach((col) => {
    if (col.anomalyIndices && col.anomalyIndices.length > 0) {
      anomalyIndices[col.column] = col.anomalyIndices;
    }
  });

  const totalAnomalies = Object.values(anomalyIndices).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const chartData = dataset.rows.map((row) => {
    const item: Record<string, string | number> = { [labelCol]: row[labelCol] };
    numericCols.forEach((col) => {
      item[col] = Number(row[col]);
    });
    return item;
  });

  const chartColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ef4444",
    "#06b6d4",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            Showing: {latest.name} &middot; {datasets.length} dataset
            {datasets.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href={`/datasets/${latest.id}`}
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          View full dataset &rarr;
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="Total Rows"
          value={stats.totalRows.toLocaleString()}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          }
        />
        <KPICard
          label="Columns"
          value={stats.totalColumns}
          subtitle={`${numericCols.length} numeric`}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
              />
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
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
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
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
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
          headers={dataset.headers}
          rows={dataset.rows}
          columnTypes={dataset.columnTypes}
          anomalyIndices={anomalyIndices}
        />
      </div>
    </div>
  );
}
