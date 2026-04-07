export interface ColumnStats {
  column: string;
  type: "number" | "date" | "string";
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

export interface DatasetStats {
  totalRows: number;
  totalColumns: number;
  columns: ColumnStats[];
  numericSummary: {
    column: string;
    mean: number;
    min: number;
    max: number;
  }[];
}

function getNumericValues(
  rows: Record<string, string>[],
  column: string
): { values: number[]; indices: number[] } {
  const values: number[] = [];
  const indices: number[] = [];
  rows.forEach((row, i) => {
    const v = Number(row[column]);
    if (!isNaN(v) && row[column] !== "") {
      values.push(v);
      indices.push(i);
    }
  });
  return { values, indices };
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

function detectAnomalies(
  values: number[],
  indices: number[]
): { anomalies: number[]; anomalyIndices: number[] } {
  const avg = mean(values);
  const sd = stddev(values);
  if (sd === 0) return { anomalies: [], anomalyIndices: [] };

  const anomalies: number[] = [];
  const anomalyIndices: number[] = [];

  values.forEach((v, i) => {
    if (Math.abs(v - avg) > 2 * sd) {
      anomalies.push(v);
      anomalyIndices.push(indices[i]);
    }
  });

  return { anomalies, anomalyIndices };
}

export function computeColumnStats(
  rows: Record<string, string>[],
  column: string,
  type: "number" | "date" | "string"
): ColumnStats {
  const allValues = rows.map((r) => r[column] ?? "");
  const uniqueValues = new Set(allValues);
  const nullCount = allValues.filter((v) => v === "" || v === null || v === undefined).length;

  const base: ColumnStats = {
    column,
    type,
    count: allValues.length,
    uniqueCount: uniqueValues.size,
    nullCount,
  };

  if (type === "number") {
    const { values, indices } = getNumericValues(rows, column);
    if (values.length > 0) {
      const { anomalies, anomalyIndices } = detectAnomalies(values, indices);
      base.mean = Math.round(mean(values) * 100) / 100;
      base.median = Math.round(median(values) * 100) / 100;
      base.stddev = Math.round(stddev(values) * 100) / 100;
      base.min = Math.min(...values);
      base.max = Math.max(...values);
      base.anomalies = anomalies;
      base.anomalyIndices = anomalyIndices;
    }
  }

  return base;
}

export function computeDatasetStats(
  rows: Record<string, string>[],
  headers: string[],
  columnTypes: Record<string, "number" | "date" | "string">
): DatasetStats {
  const columns = headers.map((h) =>
    computeColumnStats(rows, h, columnTypes[h])
  );

  const numericSummary = columns
    .filter((c) => c.type === "number" && c.mean !== undefined)
    .map((c) => ({
      column: c.column,
      mean: c.mean!,
      min: c.min!,
      max: c.max!,
    }));

  return {
    totalRows: rows.length,
    totalColumns: headers.length,
    columns,
    numericSummary,
  };
}
