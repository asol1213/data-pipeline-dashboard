import Link from "next/link";
import { getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { computeDatasetStats } from "@/lib/stats";
import { analyzeDataset } from "@/lib/insights";
import { calculateQuality, getQualityBgColor, getQualityLabel } from "@/lib/quality";
import KPICard from "@/components/KPICard";
import DatasetDetailCharts from "./DatasetDetailCharts";
import DatasetDetailTable from "./DatasetDetailTable";
import CsvDownloadButton from "./CsvDownloadButton";
import PdfReportButton from "./PdfReportButton";
import CalculatedColumns from "./CalculatedColumns";

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
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
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

  const insights = analyzeDataset(dataset.rows, stats, dataset.headers, dataset.columnTypes);
  const quality = calculateQuality(dataset.rows, stats);

  const chartData = dataset.rows.map((row) => {
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

  // Key metrics: find the most important numbers from numeric columns
  const keyMetrics = stats.numericSummary.slice(0, 3).map((ns) => ({
    column: ns.column,
    mean: ns.mean,
    max: ns.max,
    min: ns.min,
  }));

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/datasets"
          className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-4 inline-block"
        >
          &larr; Back to datasets
        </Link>
        <div className="flex items-center justify-between">
          <div>
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
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getQualityBgColor(quality.qualityScore)}`}>
              Quality: {quality.qualityScore}/100 ({getQualityLabel(quality.qualityScore)})
            </span>
            <PdfReportButton
              datasetName={dataset.name}
              stats={stats}
              insights={insights}
              quality={quality}
            />
            <CsvDownloadButton
              headers={dataset.headers}
              rows={dataset.rows}
              fileName={dataset.fileName}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics - Big Numbers */}
      {keyMetrics.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 rounded-full bg-[#8b5cf6]"></div>
            <h2 className="text-lg font-semibold text-text-primary">Key Metrics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {keyMetrics.map((km) => (
              <div key={km.column} className="bg-bg-card rounded-xl border border-border-subtle p-6 hover:border-accent/30 transition-all">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">{km.column.replace(/_/g, " ")}</p>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-bold text-text-primary tracking-tight">{km.mean.toLocaleString()}</p>
                  <p className="text-xs text-text-muted pb-1.5">avg</p>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-subtle/50">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Min</span>
                    <p className="text-sm font-semibold text-[#06b6d4]">{km.min.toLocaleString()}</p>
                  </div>
                  <div className="w-px h-6 bg-border-subtle"></div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Max</span>
                    <p className="text-sm font-semibold text-[#f59e0b]">{km.max.toLocaleString()}</p>
                  </div>
                  <div className="w-px h-6 bg-border-subtle"></div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Range</span>
                    <p className="text-sm font-semibold text-text-secondary">{(km.max - km.min).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 rounded-full bg-accent"></div>
            <h2 className="text-lg font-semibold text-text-primary">Auto-Generated Insights</h2>
            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
              {insights.length} found
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="bg-bg-card rounded-xl border border-border-subtle p-4 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{insight.icon}</span>
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

      {/* Data Quality */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <p className="text-xs text-text-muted mb-1">Quality Score</p>
          <p className={`text-2xl font-bold ${quality.qualityScore > 80 ? "text-success" : quality.qualityScore > 60 ? "text-warning" : "text-danger"}`}>
            {quality.qualityScore}
          </p>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <p className="text-xs text-text-muted mb-1">Completeness</p>
          <p className="text-2xl font-bold text-text-primary">{quality.completeness}%</p>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <p className="text-xs text-text-muted mb-1">Uniqueness</p>
          <p className="text-2xl font-bold text-text-primary">{quality.uniqueness}%</p>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <p className="text-xs text-text-muted mb-1">Anomalies</p>
          <p className={`text-2xl font-bold ${quality.anomalyCount > 0 ? "text-danger" : "text-success"}`}>
            {quality.anomalyCount}
          </p>
        </div>
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
                const anomalyCount = col.anomalies?.length ?? 0;
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
                      {anomalyCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-danger font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block"></span>
                          {anomalyCount}
                        </span>
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
        datasetId={id}
        allRows={dataset.rows}
        allHeaders={dataset.headers}
        columnTypes={dataset.columnTypes}
      />

      {/* Calculated Columns & Data Table */}
      <div className="mt-8">
        <CalculatedColumns
          headers={dataset.headers}
          rows={dataset.rows}
          columnTypes={dataset.columnTypes}
          anomalyIndices={anomalyIndices}
          columnStats={columnStatsMap}
        />
      </div>
    </div>
  );
}
