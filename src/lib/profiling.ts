export interface ColumnProfile {
  column: string;
  type: "number" | "string";
  totalCount: number;
  nullCount: number;
  uniqueCount: number;
  // For numbers:
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  stddev?: number;
  q1?: number;
  q3?: number;
  histogram?: { bin: string; count: number }[];
  outlierCount?: number;
  top5?: { value: number; count: number }[];
  bottom5?: { value: number; count: number }[];
  // For strings:
  mostCommon?: { value: string; count: number };
  avgLength?: number;
  valueFrequency?: { value: string; count: number }[];
}

export interface CorrelationPair {
  col1: string;
  col2: string;
  correlation: number;
}

export interface ProfilingResult {
  columns: ColumnProfile[];
  correlations: CorrelationPair[];
  completeness: number;
  totalCells: number;
  missingCells: number;
}

function getNumericValues(rows: Record<string, string>[], column: string): number[] {
  const values: number[] = [];
  for (const row of rows) {
    const raw = row[column];
    if (raw === undefined || raw === null || raw === "") continue;
    const v = Number(raw);
    if (!isNaN(v)) values.push(v);
  }
  return values;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function buildHistogram(values: number[], bins: number = 10): { bin: string; count: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [{ bin: String(min), count: values.length }];
  }
  const binWidth = (max - min) / bins;
  const histogram: { bin: string; count: number }[] = [];
  for (let i = 0; i < bins; i++) {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    const label = `${Math.round(lo * 100) / 100}-${Math.round(hi * 100) / 100}`;
    const count = values.filter((v) => {
      if (i === bins - 1) return v >= lo && v <= hi;
      return v >= lo && v < hi;
    }).length;
    histogram.push({ bin: label, count });
  }
  return histogram;
}

function profileNumericColumn(
  rows: Record<string, string>[],
  column: string
): Partial<ColumnProfile> {
  const values = getNumericValues(rows, column);
  if (values.length === 0) return {};

  const sorted = [...values].sort((a, b) => a - b);
  const avg = mean(values);
  const sd = stddev(values);
  const outlierCount = sd === 0 ? 0 : values.filter((v) => Math.abs(v - avg) > 2 * sd).length;

  // Top 5 and Bottom 5 distinct values by frequency
  const freq = new Map<number, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) || 0) + 1);
  }
  const entries = Array.from(freq.entries()).map(([value, count]) => ({ value, count }));
  const top5 = [...entries].sort((a, b) => b.value - a.value).slice(0, 5);
  const bottom5 = [...entries].sort((a, b) => a.value - b.value).slice(0, 5);

  return {
    mean: Math.round(avg * 100) / 100,
    median: Math.round(median(values) * 100) / 100,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stddev: Math.round(sd * 100) / 100,
    q1: Math.round(quantile(sorted, 0.25) * 100) / 100,
    q3: Math.round(quantile(sorted, 0.75) * 100) / 100,
    histogram: buildHistogram(values, 10),
    outlierCount,
    top5,
    bottom5,
  };
}

function profileStringColumn(
  rows: Record<string, string>[],
  column: string
): Partial<ColumnProfile> {
  const values: string[] = [];
  let totalLength = 0;
  for (const row of rows) {
    const v = row[column];
    if (v !== undefined && v !== null && v !== "") {
      values.push(v);
      totalLength += v.length;
    }
  }

  if (values.length === 0) return { avgLength: 0 };

  const freq = new Map<string, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) || 0) + 1);
  }

  const entries = Array.from(freq.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  return {
    mostCommon: entries[0] || undefined,
    avgLength: Math.round((totalLength / values.length) * 100) / 100,
    valueFrequency: entries.slice(0, 10),
  };
}

export function pearsonCorrelation(xValues: number[], yValues: number[]): number {
  const n = Math.min(xValues.length, yValues.length);
  if (n < 2) return 0;

  const x = xValues.slice(0, n);
  const y = yValues.slice(0, n);

  const xMean = mean(x);
  const yMean = mean(y);
  const xStd = stddev(x);
  const yStd = stddev(y);

  if (xStd === 0 || yStd === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (x[i] - xMean) * (y[i] - yMean);
  }

  return Math.round((sum / (n * xStd * yStd)) * 10000) / 10000;
}

export function profileDataset(
  rows: Record<string, string>[],
  headers: string[],
  columnTypes: Record<string, string>
): ProfilingResult {
  if (rows.length === 0 || headers.length === 0) {
    return {
      columns: [],
      correlations: [],
      completeness: 100,
      totalCells: 0,
      missingCells: 0,
    };
  }

  const totalCells = rows.length * headers.length;
  let missingCells = 0;

  const columns: ColumnProfile[] = [];

  for (const header of headers) {
    const allValues = rows.map((r) => r[header] ?? "");
    const nullCount = allValues.filter(
      (v) => v === "" || v === null || v === undefined
    ).length;
    missingCells += nullCount;

    const uniqueValues = new Set(allValues.filter((v) => v !== "" && v !== null && v !== undefined));
    const isNumeric = columnTypes[header] === "number";
    const type: "number" | "string" = isNumeric ? "number" : "string";

    const base: ColumnProfile = {
      column: header,
      type,
      totalCount: rows.length,
      nullCount,
      uniqueCount: uniqueValues.size,
    };

    if (isNumeric) {
      Object.assign(base, profileNumericColumn(rows, header));
    } else {
      Object.assign(base, profileStringColumn(rows, header));
    }

    columns.push(base);
  }

  // Compute correlations for numeric columns
  const numericCols = columns.filter((c) => c.type === "number");
  const correlations: CorrelationPair[] = [];
  const numericValuesCache = new Map<string, number[]>();

  for (const col of numericCols) {
    numericValuesCache.set(col.column, getNumericValues(rows, col.column));
  }

  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const col1 = numericCols[i].column;
      const col2 = numericCols[j].column;
      // For correlation we need paired values (same row index, both non-null)
      const paired: { x: number; y: number }[] = [];
      for (const row of rows) {
        const x = Number(row[col1]);
        const y = Number(row[col2]);
        if (!isNaN(x) && row[col1] !== "" && !isNaN(y) && row[col2] !== "") {
          paired.push({ x, y });
        }
      }
      const xArr = paired.map((p) => p.x);
      const yArr = paired.map((p) => p.y);
      const r = pearsonCorrelation(xArr, yArr);
      correlations.push({ col1, col2, correlation: r });
    }
  }

  const completeness =
    totalCells === 0 ? 100 : Math.round(((totalCells - missingCells) / totalCells) * 1000) / 10;

  return {
    columns,
    correlations,
    completeness,
    totalCells,
    missingCells,
  };
}
