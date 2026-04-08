"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BENCHMARKS, detectBenchmark, compareToBenchmark } from "@/lib/benchmarks";
import type { BenchmarkComparison } from "@/lib/benchmarks";

interface DatasetOption {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
}

function GaugeVisual({ value, benchmark }: { value: number; benchmark: number }) {
  // Position on a 0-200% scale relative to the benchmark
  const ratio = benchmark !== 0 ? value / benchmark : 0;
  const pct = Math.max(0, Math.min(200, ratio * 100));
  // Map to angle: 0% = -90deg (left), 100% = 0deg (top/center), 200% = 90deg (right)
  const angle = ((pct - 100) / 100) * 90;
  const color = value >= benchmark ? "#22c55e" : "#ef4444";

  return (
    <div className="relative w-24 h-14 mx-auto">
      {/* Semi-circle background */}
      <svg viewBox="0 0 100 55" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke="currentColor"
          className="text-border-subtle"
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Benchmark marker at center top */}
        <line x1="50" y1="5" x2="50" y2="12" stroke="#6b7280" strokeWidth={2} strokeLinecap="round" />
        {/* Needle */}
        <g transform={`rotate(${angle}, 50, 50)`}>
          <line x1="50" y1="50" x2="50" y2="10" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx="50" cy="50" r="3" fill={color} />
        </g>
      </svg>
    </div>
  );
}

function ComparisonCard({ comparison }: { comparison: BenchmarkComparison }) {
  const { metric, yourValue, benchmark, delta, above } = comparison;
  const displayMetric = metric.replace(/_/g, " ").replace(/%/g, "");
  const absDelta = Math.abs(delta);
  const isPercentMetric = metric.includes("%");
  const unit = isPercentMetric ? " pp" : "";

  // Bar widths (normalize to max of either value)
  const maxVal = Math.max(yourValue, benchmark, 1);
  const yourPct = (yourValue / maxVal) * 100;
  const benchPct = (benchmark / maxVal) * 100;

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle p-5 hover:border-accent/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-text-primary">{displayMetric}</h3>
          <p className={`text-xs font-medium mt-1 ${above ? "text-green-500" : "text-red-500"}`}>
            {above ? "+" : ""}{delta.toFixed(1)}{unit} {above ? "above" : "below"} benchmark
          </p>
        </div>
        <GaugeVisual value={yourValue} benchmark={benchmark} />
      </div>

      {/* Bar comparison */}
      <div className="space-y-2 mt-4">
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Your Value</span>
            <span className="font-medium text-text-primary">{yourValue.toLocaleString()}</span>
          </div>
          <div className="h-2.5 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(yourPct, 2)}%`,
                backgroundColor: above ? "#22c55e" : "#ef4444",
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Benchmark</span>
            <span className="font-medium text-text-primary">{benchmark.toLocaleString()}</span>
          </div>
          <div className="h-2.5 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6b7280] rounded-full transition-all"
              style={{ width: `${Math.max(benchPct, 2)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BenchmarksPage() {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedBenchmark, setSelectedBenchmark] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("");
  const [datasetRows, setDatasetRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch datasets on mount
  useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((data: DatasetOption[]) => {
        setDatasets(data);
        if (data.length > 0) {
          setSelectedDatasetId(data[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-detect benchmark when dataset changes
  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);
  useEffect(() => {
    if (selectedDataset) {
      const detected = detectBenchmark(selectedDataset.headers);
      if (detected) {
        setSelectedBenchmark(detected);
      } else {
        setSelectedBenchmark(Object.keys(BENCHMARKS)[0]);
      }
    }
  }, [selectedDataset]);

  // Fetch dataset rows when dataset changes
  useEffect(() => {
    if (!selectedDatasetId) return;
    fetch(`/api/datasets/${selectedDatasetId}`)
      .then((r) => r.json())
      .then((data: { rows: Record<string, string>[] }) => {
        setDatasetRows(data.rows ?? []);
      })
      .catch(() => setDatasetRows([]));
  }, [selectedDatasetId]);

  // Compute metric averages from the dataset
  const metricValues = useMemo(() => {
    const values: Record<string, number> = {};
    if (!selectedDataset || datasetRows.length === 0) return values;

    for (const header of selectedDataset.headers) {
      if (selectedDataset.columnTypes[header] === "number") {
        const nums = datasetRows
          .map((r) => Number(r[header]))
          .filter((n) => !isNaN(n));
        if (nums.length > 0) {
          values[header] = nums.reduce((a, b) => a + b, 0) / nums.length;
        }
      }
    }
    return values;
  }, [selectedDataset, datasetRows]);

  // Build comparisons
  const comparisons = useMemo(() => {
    if (!selectedBenchmark) return [];
    return compareToBenchmark(selectedBenchmark, metricValues);
  }, [selectedBenchmark, metricValues]);

  // Available numeric columns for metric selector
  const numericColumns = selectedDataset
    ? selectedDataset.headers.filter((h) => selectedDataset.columnTypes[h] === "number")
    : [];

  // Filter comparisons if a specific metric is selected
  const displayComparisons = selectedMetric
    ? comparisons.filter((c) => c.metric === selectedMetric)
    : comparisons;

  const benchmarkInfo = selectedBenchmark ? BENCHMARKS[selectedBenchmark] : null;

  // Summary stats
  const aboveCount = comparisons.filter((c) => c.above).length;
  const belowCount = comparisons.filter((c) => !c.above).length;

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Benchmarking</h1>
            <p className="text-sm text-blue-200 mt-1">
              Compare your metrics against industry averages
            </p>
          </div>
          <Link
            href="/"
            className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading datasets...</div>
      ) : datasets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted mb-4">No datasets available. Upload a CSV first.</p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
          >
            Upload CSV
          </Link>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dataset selector */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Dataset</label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Benchmark selector */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Industry Benchmark
                  {selectedDataset && detectBenchmark(selectedDataset.headers) && (
                    <span className="ml-1 text-xs text-accent">(auto-detected)</span>
                  )}
                </label>
                <select
                  value={selectedBenchmark}
                  onChange={(e) => setSelectedBenchmark(e.target.value)}
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                >
                  {Object.entries(BENCHMARKS).map(([key, b]) => (
                    <option key={key} value={key}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Metric filter */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Filter Metric</label>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">All matching metrics</option>
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>{col.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary bar */}
          {comparisons.length > 0 && (
            <div className="bg-bg-card rounded-xl border border-border-subtle p-4 mb-8">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">{aboveCount}</span> above benchmark
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">{belowCount}</span> below benchmark
                  </span>
                </div>
                <span className="text-xs text-text-muted">
                  Comparing against: {benchmarkInfo?.name}
                </span>
              </div>
            </div>
          )}

          {/* Comparison grid */}
          {displayComparisons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayComparisons.map((comp) => (
                <ComparisonCard key={comp.metric} comparison={comp} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-bg-card rounded-xl border border-border-subtle">
              <p className="text-text-muted text-sm">
                {comparisons.length === 0
                  ? "No matching metrics found between your dataset and the selected benchmark. Try a different benchmark or dataset."
                  : "No results for the selected metric filter."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
