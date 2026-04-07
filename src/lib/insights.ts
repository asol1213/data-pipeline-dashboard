import type { DatasetStats, ColumnStats } from "./stats";

export interface Insight {
  type: "trend" | "anomaly" | "general" | "correlation";
  icon: string;
  text: string;
  priority: number; // higher = more important
}

export function analyzeDataset(
  data: Record<string, string>[],
  stats: DatasetStats,
  headers: string[],
  columnTypes: Record<string, string>
): Insight[] {
  const insights: Insight[] = [];

  const numericColumns = stats.columns.filter((c) => c.type === "number");
  const labelCol = headers.find((h) => columnTypes[h] === "string") ?? headers[0];

  // Trend detection for each numeric column
  for (const col of numericColumns) {
    const values = data.map((r) => Number(r[col.column])).filter((v) => !isNaN(v));
    if (values.length >= 3) {
      const trendInsight = detectTrend(col.column, values, data, labelCol);
      if (trendInsight) insights.push(trendInsight);
    }

    // Peak detection
    if (values.length >= 3) {
      const peakInsight = detectPeak(col, values, data, labelCol);
      if (peakInsight) insights.push(peakInsight);
    }

    // Range comparison (first vs last)
    if (values.length >= 2) {
      const changeInsight = detectChange(col.column, values, data, labelCol);
      if (changeInsight) insights.push(changeInsight);
    }
  }

  // Anomaly summary
  const totalAnomalies = numericColumns.reduce(
    (sum, col) => sum + (col.anomalies?.length ?? 0),
    0
  );
  if (totalAnomalies > 0) {
    insights.push({
      type: "anomaly",
      icon: "\u26a0\ufe0f",
      text: `${totalAnomalies} anomal${totalAnomalies === 1 ? "y" : "ies"} detected across all columns`,
      priority: 8,
    });

    // Specific anomaly details
    for (const col of numericColumns) {
      if (col.anomalies && col.anomalies.length > 0 && col.anomalyIndices && col.stddev && col.mean !== undefined) {
        const maxAnomaly = Math.max(...col.anomalies);
        const sigma = ((maxAnomaly - col.mean) / col.stddev).toFixed(1);
        const label = col.anomalyIndices.length > 0 ? data[col.anomalyIndices[col.anomalies.indexOf(maxAnomaly)]]?.[labelCol] : null;
        const labelStr = label ? ` in ${label}` : "";
        insights.push({
          type: "anomaly",
          icon: "\u26a0\ufe0f",
          text: `${col.column.replace(/_/g, " ")} peaked${labelStr} at ${formatNum(maxAnomaly)} (anomaly: ${sigma}\u03c3 above average)`,
          priority: 7,
        });
      }
    }
  }

  // Correlation hints
  if (numericColumns.length >= 2) {
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const corrInsight = detectCorrelation(
          numericColumns[i],
          numericColumns[j],
          data
        );
        if (corrInsight) insights.push(corrInsight);
      }
    }
  }

  // Strongest/weakest entry
  for (const col of numericColumns.slice(0, 2)) {
    const values = data.map((r) => Number(r[col.column])).filter((v) => !isNaN(v));
    if (values.length >= 2 && col.max !== undefined) {
      const maxIdx = values.indexOf(col.max);
      if (maxIdx >= 0) {
        const label = data[maxIdx]?.[labelCol];
        if (label) {
          insights.push({
            type: "general",
            icon: "\ud83d\udca1",
            text: `Strongest ${col.column.replace(/_/g, " ").toLowerCase()}: ${label} with ${formatNum(col.max)}`,
            priority: 4,
          });
        }
      }
    }
  }

  // Sort by priority descending
  insights.sort((a, b) => b.priority - a.priority);

  return insights;
}

function detectTrend(
  column: string,
  values: number[],
  data: Record<string, string>[],
  _labelCol: string
): Insight | null {
  if (values.length < 3) return null;

  // Calculate average month-over-month change
  let totalChange = 0;
  let positiveChanges = 0;
  for (let i = 1; i < values.length; i++) {
    const pct = values[i - 1] !== 0 ? ((values[i] - values[i - 1]) / Math.abs(values[i - 1])) * 100 : 0;
    totalChange += pct;
    if (values[i] > values[i - 1]) positiveChanges++;
  }
  const avgChange = totalChange / (values.length - 1);
  const consistency = positiveChanges / (values.length - 1);

  if (consistency > 0.7 && avgChange > 2) {
    return {
      type: "trend",
      icon: "\ud83d\udcc8",
      text: `${column.replace(/_/g, " ")} shows upward trend (+${avgChange.toFixed(1)}% period over period)`,
      priority: 9,
    };
  } else if (consistency < 0.3 && avgChange < -2) {
    return {
      type: "trend",
      icon: "\ud83d\udcc8",
      text: `${column.replace(/_/g, " ")} shows downward trend (${avgChange.toFixed(1)}% period over period)`,
      priority: 9,
    };
  }
  return null;
}

function detectPeak(
  col: ColumnStats,
  values: number[],
  data: Record<string, string>[],
  labelCol: string
): Insight | null {
  if (col.max === undefined || col.min === undefined) return null;
  const range = col.max - col.min;
  if (range === 0) return null;

  // Find if max is a clear peak (significantly above mean)
  if (col.mean !== undefined && col.stddev !== undefined && col.stddev > 0) {
    const maxDeviation = (col.max - col.mean) / col.stddev;
    if (maxDeviation > 1.5) {
      const maxIdx = values.indexOf(col.max);
      const label = maxIdx >= 0 ? data[maxIdx]?.[labelCol] : null;
      if (label) {
        return {
          type: "general",
          icon: "\ud83d\udca1",
          text: `${col.column.replace(/_/g, " ")} peaked in ${label} at ${formatNum(col.max)}`,
          priority: 5,
        };
      }
    }
  }
  return null;
}

function detectChange(
  column: string,
  values: number[],
  data: Record<string, string>[],
  labelCol: string
): Insight | null {
  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return null;

  const change = ((last - first) / Math.abs(first)) * 100;
  if (Math.abs(change) < 5) return null;

  const firstLabel = data[0]?.[labelCol] ?? "start";
  const lastLabel = data[data.length - 1]?.[labelCol] ?? "end";
  const direction = change > 0 ? "increased" : "decreased";

  return {
    type: "trend",
    icon: "\ud83d\udcc8",
    text: `${column.replace(/_/g, " ")} ${direction} ${Math.abs(change).toFixed(0)}% from ${firstLabel} to ${lastLabel}`,
    priority: 6,
  };
}

function detectCorrelation(
  colA: ColumnStats,
  colB: ColumnStats,
  data: Record<string, string>[]
): Insight | null {
  const valuesA = data.map((r) => Number(r[colA.column]));
  const valuesB = data.map((r) => Number(r[colB.column]));

  if (valuesA.some(isNaN) || valuesB.some(isNaN)) return null;
  if (valuesA.length < 3) return null;

  // Simple Pearson correlation
  const n = valuesA.length;
  const meanA = valuesA.reduce((a, b) => a + b, 0) / n;
  const meanB = valuesB.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = valuesA[i] - meanA;
    const db = valuesB[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }

  if (denA === 0 || denB === 0) return null;
  const r = num / Math.sqrt(denA * denB);

  if (Math.abs(r) > 0.7) {
    const direction = r > 0 ? "high" : "low";
    const relation = r > 0 ? "higher" : "lower";
    return {
      type: "correlation",
      icon: "\ud83d\udca1",
      text: `Periods with ${direction} ${colA.column.replace(/_/g, " ")} tend to have ${relation} ${colB.column.replace(/_/g, " ")}`,
      priority: 5,
    };
  }
  return null;
}

function formatNum(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString("en-US");
  }
  return String(n);
}
