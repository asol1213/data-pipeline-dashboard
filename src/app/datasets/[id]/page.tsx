import Link from "next/link";
import { getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { computeDatasetStats } from "@/lib/stats";
import KPICard from "@/components/KPICard";
import DatasetDetailCharts from "./DatasetDetailCharts";
import DatasetDetailTable from "./DatasetDetailTable";

export const dynamic = "force-dynamic";

export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  ensureSeedData();
  const dataset = getDataset(id);

  if (!dataset) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-xl font-semibold text-text-primary mb-2">
          Dataset Not Found
        </h1>
        <p className="text-text-muted mb-6">
          The dataset you are looking for does not exist.
        </p>
        <Link href="/datasets" className="text-accent hover:text-accent-hover">
          Back to datasets
        </Link>
      </div>
    );
  }

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
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/datasets"
          className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-4 inline-block"
        >
          &larr; Back to datasets
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">{dataset.name}</h1>
        <p className="text-sm text-text-muted mt-1">
          {dataset.fileName} &middot; Uploaded{" "}
          {new Date(dataset.uploadedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

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
            subtitle={`Min: ${stats.numericSummary[0].min.toLocaleString()} / Max: ${stats.numericSummary[0].max.toLocaleString()}`}
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

      {/* Column Statistics */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-8">
        <h2 className="text-sm font-medium text-text-secondary mb-4">
          Column Statistics
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-2 text-text-muted font-medium">Column</th>
                <th className="text-left px-4 py-2 text-text-muted font-medium">Type</th>
                <th className="text-right px-4 py-2 text-text-muted font-medium">Unique</th>
                <th className="text-right px-4 py-2 text-text-muted font-medium">Mean</th>
                <th className="text-right px-4 py-2 text-text-muted font-medium">Std Dev</th>
                <th className="text-right px-4 py-2 text-text-muted font-medium">Min</th>
                <th className="text-right px-4 py-2 text-text-muted font-medium">Max</th>
                <th className="text-right px-4 py-2 text-text-muted font-medium">Anomalies</th>
              </tr>
            </thead>
            <tbody>
              {stats.columns.map((col) => {
                const typeColors: Record<string, string> = {
                  number: "text-blue-400",
                  date: "text-purple-400",
                  string: "text-emerald-400",
                };
                return (
                  <tr key={col.column} className="border-b border-border-subtle/50 hover:bg-bg-card-hover">
                    <td className="px-4 py-2.5 text-text-primary font-medium">{col.column}</td>
                    <td className={`px-4 py-2.5 ${typeColors[col.type]}`}>{col.type}</td>
                    <td className="px-4 py-2.5 text-right text-text-secondary">{col.uniqueCount}</td>
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {col.mean !== undefined ? col.mean.toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {col.stddev !== undefined ? col.stddev.toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {col.min !== undefined ? col.min.toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {col.max !== undefined ? col.max.toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {col.anomalies && col.anomalies.length > 0 ? (
                        <span className="text-danger font-medium">{col.anomalies.length}</span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <DatasetDetailCharts
        chartData={chartData}
        labelCol={labelCol}
        numericCols={numericCols}
        chartColors={chartColors}
      />

      {/* Data Table */}
      <div className="mt-8">
        <DatasetDetailTable
          headers={dataset.headers}
          rows={dataset.rows}
          columnTypes={dataset.columnTypes}
          anomalyIndices={anomalyIndices}
        />
      </div>
    </div>
  );
}
