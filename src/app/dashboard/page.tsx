import Link from "next/link";
import { getAllDatasets } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { getDataset } from "@/lib/store";
import { computeDatasetStats } from "@/lib/stats";
import { analyzeDataset } from "@/lib/insights";
import { calculateQuality } from "@/lib/quality";
import DashboardClient from "../DashboardClient";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  ensureSeedData();
  const datasets = getAllDatasets();

  if (datasets.length === 0) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
            >
              Upload CSV
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-color transition-colors"
            >
              Try Demo Data
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show the most recent dataset on the dashboard by default
  const latest = datasets[datasets.length - 1];
  const dataset = getDataset(latest.id);
  if (!dataset) return null;

  const stats = computeDatasetStats(
    dataset.rows,
    dataset.headers,
    dataset.columnTypes
  );

  const insights = analyzeDataset(dataset.rows, stats, dataset.headers, dataset.columnTypes);
  const quality = calculateQuality(dataset.rows, stats);

  const initialData = {
    stats,
    insights,
    quality,
    rows: dataset.rows,
    headers: dataset.headers,
    columnTypes: dataset.columnTypes,
  };

  return (
    <DashboardClient
      datasets={datasets}
      initialDatasetId={latest.id}
      initialData={initialData}
    />
  );
}
