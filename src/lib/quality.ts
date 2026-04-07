import type { DatasetStats } from "./stats";

export interface QualityMetrics {
  completeness: number;     // 0-100 percentage of non-null/non-empty cells
  uniqueness: number;       // 0-100 average uniqueness ratio across columns
  anomalyCount: number;     // total anomalies across all numeric columns
  qualityScore: number;     // 0-100 weighted composite
}

export function calculateQuality(
  data: Record<string, string>[],
  stats: DatasetStats
): QualityMetrics {
  if (data.length === 0 || stats.columns.length === 0) {
    return { completeness: 100, uniqueness: 100, anomalyCount: 0, qualityScore: 100 };
  }

  // Completeness: % of non-null/non-empty cells
  let totalCells = 0;
  let nonEmptyCells = 0;
  for (const col of stats.columns) {
    totalCells += col.count;
    nonEmptyCells += col.count - col.nullCount;
  }
  const completeness = totalCells > 0
    ? Math.round((nonEmptyCells / totalCells) * 10000) / 100
    : 100;

  // Uniqueness: average uniqueness ratio across columns
  let totalUniqueness = 0;
  for (const col of stats.columns) {
    if (col.count > 0) {
      totalUniqueness += col.uniqueCount / col.count;
    } else {
      totalUniqueness += 1;
    }
  }
  const uniqueness = Math.round((totalUniqueness / stats.columns.length) * 10000) / 100;

  // Anomaly count
  const anomalyCount = stats.columns.reduce(
    (sum, col) => sum + (col.anomalies?.length ?? 0),
    0
  );

  // Quality Score: weighted composite
  // 50% completeness + 25% uniqueness + 25% anomaly penalty
  const anomalyPenalty = data.length > 0
    ? Math.max(0, 100 - (anomalyCount / data.length) * 500)
    : 100;

  const qualityScore = Math.round(
    completeness * 0.5 + uniqueness * 0.25 + anomalyPenalty * 0.25
  );

  return { completeness, uniqueness, anomalyCount, qualityScore };
}

export function getQualityColor(score: number): string {
  if (score > 80) return "text-success";
  if (score > 60) return "text-warning";
  return "text-danger";
}

export function getQualityBgColor(score: number): string {
  if (score > 80) return "bg-emerald-900/20 text-emerald-400 border-emerald-800/50";
  if (score > 60) return "bg-yellow-900/20 text-yellow-400 border-yellow-800/50";
  return "bg-red-900/20 text-red-400 border-red-800/50";
}

export function getQualityLabel(score: number): string {
  if (score > 90) return "Excellent";
  if (score > 80) return "Good";
  if (score > 60) return "Fair";
  if (score > 40) return "Poor";
  return "Critical";
}
