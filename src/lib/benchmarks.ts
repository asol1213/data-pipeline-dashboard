export const BENCHMARKS: Record<string, { name: string; metrics: Record<string, number> }> = {
  saas: {
    name: "SaaS Industry (Median)",
    metrics: {
      "Gross_Margin_%": 75,
      "Churn_Rate_%": 5.0,
      "Net_Revenue_Retention_%": 110,
      "LTV_CAC_Ratio": 3.0,
      "EBITDA_Margin_%": 15,
      "CAC": 1200,
    },
  },
  manufacturing: {
    name: "Manufacturing (Median)",
    metrics: {
      "Gross_Margin_%": 35,
      "EBIT_Margin_%": 10,
      "Revenue_Growth_%": 5,
      "R&D_%_of_Revenue": 4,
    },
  },
  consulting: {
    name: "Professional Services (Median)",
    metrics: {
      "Utilization_%": 75,
      "Operating_Margin_%": 20,
      "Revenue_per_FTE": 250000,
      "Realization_Rate_%": 85,
    },
  },
};

/**
 * Auto-detect the best benchmark for a given set of column names.
 * Returns the benchmark key or null if none match.
 */
export function detectBenchmark(columns: string[]): string | null {
  const colSet = new Set(columns);

  let bestKey: string | null = null;
  let bestCount = 0;

  for (const [key, bench] of Object.entries(BENCHMARKS)) {
    const matchCount = Object.keys(bench.metrics).filter((m) => colSet.has(m)).length;
    if (matchCount > bestCount) {
      bestCount = matchCount;
      bestKey = key;
    }
  }

  return bestCount > 0 ? bestKey : null;
}

export interface BenchmarkComparison {
  metric: string;
  yourValue: number;
  benchmark: number;
  delta: number;
  above: boolean;
}

/**
 * Compare actual metric values against a benchmark.
 */
export function compareToBenchmark(
  benchmarkKey: string,
  metricValues: Record<string, number>
): BenchmarkComparison[] {
  const bench = BENCHMARKS[benchmarkKey];
  if (!bench) return [];

  const results: BenchmarkComparison[] = [];
  for (const [metric, benchValue] of Object.entries(bench.metrics)) {
    if (metricValues[metric] !== undefined) {
      const yourValue = metricValues[metric];
      const delta = yourValue - benchValue;
      results.push({
        metric,
        yourValue,
        benchmark: benchValue,
        delta,
        above: delta >= 0,
      });
    }
  }
  return results;
}
