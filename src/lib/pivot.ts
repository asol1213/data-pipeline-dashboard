export type AggregationType = "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";

export interface PivotResult {
  rowHeaders: string[];
  colHeaders: string[];
  cells: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

export function createPivotTable(
  data: Record<string, string>[],
  rowField: string,
  colField: string,
  valueField: string,
  aggregation: AggregationType
): PivotResult {
  if (data.length === 0) {
    return {
      rowHeaders: [],
      colHeaders: [],
      cells: [],
      rowTotals: [],
      colTotals: [],
      grandTotal: 0,
    };
  }

  // Get unique row and column headers, preserving insertion order
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  for (const row of data) {
    rowSet.add(row[rowField] ?? "");
    colSet.add(row[colField] ?? "");
  }
  const rowHeaders = Array.from(rowSet);
  const colHeaders = Array.from(colSet);

  // Group values by (row, col)
  const grouped = new Map<string, number[]>();
  for (const row of data) {
    const rKey = row[rowField] ?? "";
    const cKey = row[colField] ?? "";
    const key = `${rKey}|||${cKey}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    const val = Number(row[valueField]);
    if (!isNaN(val)) {
      grouped.get(key)!.push(val);
    }
  }

  // Build cells matrix
  const cells: number[][] = [];
  for (let ri = 0; ri < rowHeaders.length; ri++) {
    const rowCells: number[] = [];
    for (let ci = 0; ci < colHeaders.length; ci++) {
      const key = `${rowHeaders[ri]}|||${colHeaders[ci]}`;
      const values = grouped.get(key) ?? [];
      rowCells.push(aggregate(values, aggregation));
    }
    cells.push(rowCells);
  }

  // Compute row totals
  const rowTotals: number[] = [];
  for (let ri = 0; ri < rowHeaders.length; ri++) {
    // Collect all values for this row header
    const allValues: number[] = [];
    for (let ci = 0; ci < colHeaders.length; ci++) {
      const key = `${rowHeaders[ri]}|||${colHeaders[ci]}`;
      const values = grouped.get(key) ?? [];
      allValues.push(...values);
    }
    rowTotals.push(aggregate(allValues, aggregation));
  }

  // Compute column totals
  const colTotals: number[] = [];
  for (let ci = 0; ci < colHeaders.length; ci++) {
    const allValues: number[] = [];
    for (let ri = 0; ri < rowHeaders.length; ri++) {
      const key = `${rowHeaders[ri]}|||${colHeaders[ci]}`;
      const values = grouped.get(key) ?? [];
      allValues.push(...values);
    }
    colTotals.push(aggregate(allValues, aggregation));
  }

  // Grand total
  const allValues: number[] = [];
  for (const row of data) {
    const val = Number(row[valueField]);
    if (!isNaN(val)) {
      allValues.push(val);
    }
  }
  const grandTotal = aggregate(allValues, aggregation);

  return { rowHeaders, colHeaders, cells, rowTotals, colTotals, grandTotal };
}

function aggregate(values: number[], type: AggregationType): number {
  if (values.length === 0) return 0;

  switch (type) {
    case "SUM":
      return Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
    case "AVG":
      return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
    case "COUNT":
      return values.length;
    case "MIN":
      return Math.min(...values);
    case "MAX":
      return Math.max(...values);
    default:
      return 0;
  }
}
