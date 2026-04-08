import { describe, it, expect } from "vitest";
import { profileDataset, pearsonCorrelation } from "../lib/profiling";

function makeRows(data: Record<string, string>[]): Record<string, string>[] {
  return data;
}

describe("profileDataset - numeric columns", () => {
  const headers = ["value"];
  const types = { value: "number" };

  it("computes mean correctly", () => {
    const rows = makeRows([{ value: "10" }, { value: "20" }, { value: "30" }]);
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.mean).toBe(20);
  });

  it("computes median correctly for odd count", () => {
    const rows = makeRows([{ value: "1" }, { value: "3" }, { value: "5" }]);
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.median).toBe(3);
  });

  it("computes median correctly for even count", () => {
    const rows = makeRows([
      { value: "1" },
      { value: "2" },
      { value: "3" },
      { value: "4" },
    ]);
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.median).toBe(2.5);
  });

  it("computes min and max correctly", () => {
    const rows = makeRows([
      { value: "5" },
      { value: "1" },
      { value: "9" },
      { value: "3" },
    ]);
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.min).toBe(1);
    expect(col.max).toBe(9);
  });

  it("computes standard deviation", () => {
    const rows = makeRows([
      { value: "2" },
      { value: "4" },
      { value: "4" },
      { value: "4" },
      { value: "5" },
      { value: "5" },
      { value: "7" },
      { value: "9" },
    ]);
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.stddev).toBe(2);
  });

  it("generates histogram with 10 bins", () => {
    const rows: Record<string, string>[] = [];
    for (let i = 0; i < 100; i++) {
      rows.push({ value: String(i) });
    }
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.histogram).toBeDefined();
    expect(col.histogram!.length).toBe(10);
    // Total count across all bins should equal 100
    const totalCount = col.histogram!.reduce((sum, h) => sum + h.count, 0);
    expect(totalCount).toBe(100);
  });

  it("detects outliers (values > 2 stddev from mean)", () => {
    // Mean~10, all values are 10 except 100 which is clearly an outlier
    const rows = makeRows([
      { value: "10" },
      { value: "10" },
      { value: "10" },
      { value: "10" },
      { value: "10" },
      { value: "10" },
      { value: "10" },
      { value: "10" },
      { value: "10" },
      { value: "100" },
    ]);
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.outlierCount).toBeGreaterThan(0);
  });

  it("computes Q1 and Q3", () => {
    const rows = makeRows([
      { value: "1" },
      { value: "2" },
      { value: "3" },
      { value: "4" },
      { value: "5" },
    ]);
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.q1).toBeDefined();
    expect(col.q3).toBeDefined();
    expect(col.q1!).toBeLessThan(col.median!);
    expect(col.q3!).toBeGreaterThan(col.median!);
  });
});

describe("profileDataset - string columns", () => {
  const headers = ["name"];
  const types = { name: "string" };

  it("computes unique count correctly", () => {
    const rows = makeRows([
      { name: "Alice" },
      { name: "Bob" },
      { name: "Alice" },
    ]);
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.uniqueCount).toBe(2);
  });

  it("identifies most common value", () => {
    const rows = makeRows([
      { name: "Alice" },
      { name: "Bob" },
      { name: "Alice" },
      { name: "Alice" },
      { name: "Charlie" },
    ]);
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.mostCommon).toBeDefined();
    expect(col.mostCommon!.value).toBe("Alice");
    expect(col.mostCommon!.count).toBe(3);
  });

  it("computes average string length", () => {
    const rows = makeRows([
      { name: "Hi" },
      { name: "Hey" },
      { name: "Hello" },
    ]);
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    // (2 + 3 + 5) / 3 = 3.33
    expect(col.avgLength).toBeCloseTo(3.33, 1);
  });

  it("generates value frequency (top 10)", () => {
    const rows: Record<string, string>[] = [];
    for (let i = 0; i < 15; i++) {
      rows.push({ name: `Value_${i % 12}` });
    }
    const result = profileDataset(rows, headers, types);
    const col = result.columns[0];
    expect(col.valueFrequency).toBeDefined();
    expect(col.valueFrequency!.length).toBeLessThanOrEqual(10);
  });
});

describe("Pearson correlation", () => {
  it("returns ~1.0 for perfectly correlated columns", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10]; // y = 2x
    const r = pearsonCorrelation(x, y);
    expect(r).toBeCloseTo(1.0, 2);
  });

  it("returns ~-1.0 for perfectly negatively correlated columns", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2]; // y = 12 - 2x
    const r = pearsonCorrelation(x, y);
    expect(r).toBeCloseTo(-1.0, 2);
  });

  it("returns ~0 for uncorrelated columns", () => {
    // Use values that are demonstrably uncorrelated
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [5, 1, 8, 2, 9, 3, 7, 4, 6, 10]; // scrambled
    const r = pearsonCorrelation(x, y);
    expect(Math.abs(r)).toBeLessThan(0.5);
  });

  it("returns 0 for constant values", () => {
    const x = [5, 5, 5, 5];
    const y = [1, 2, 3, 4];
    const r = pearsonCorrelation(x, y);
    expect(r).toBe(0);
  });
});

describe("profileDataset - completeness", () => {
  it("returns 100% completeness when no nulls", () => {
    const rows = makeRows([
      { a: "1", b: "hello" },
      { a: "2", b: "world" },
    ]);
    const result = profileDataset(rows, ["a", "b"], { a: "number", b: "string" });
    expect(result.completeness).toBe(100);
    expect(result.missingCells).toBe(0);
  });

  it("returns correct completeness percentage with nulls", () => {
    const rows = makeRows([
      { a: "1", b: "" },
      { a: "", b: "world" },
    ]);
    const result = profileDataset(rows, ["a", "b"], { a: "number", b: "string" });
    // 4 total cells, 2 missing = 50%
    expect(result.totalCells).toBe(4);
    expect(result.missingCells).toBe(2);
    expect(result.completeness).toBe(50);
  });

  it("handles empty dataset", () => {
    const result = profileDataset([], [], {});
    expect(result.columns).toEqual([]);
    expect(result.correlations).toEqual([]);
    expect(result.completeness).toBe(100);
    expect(result.totalCells).toBe(0);
    expect(result.missingCells).toBe(0);
  });

  it("handles dataset with only headers and no rows", () => {
    const result = profileDataset([], ["a", "b"], { a: "number", b: "string" });
    expect(result.columns).toEqual([]);
    expect(result.totalCells).toBe(0);
  });
});

describe("profileDataset - correlations", () => {
  it("computes correlation between columns in a dataset", () => {
    const rows = makeRows([
      { x: "1", y: "2" },
      { x: "2", y: "4" },
      { x: "3", y: "6" },
      { x: "4", y: "8" },
      { x: "5", y: "10" },
    ]);
    const result = profileDataset(rows, ["x", "y"], { x: "number", y: "number" });
    expect(result.correlations.length).toBe(1);
    expect(result.correlations[0].col1).toBe("x");
    expect(result.correlations[0].col2).toBe("y");
    expect(result.correlations[0].correlation).toBeCloseTo(1.0, 2);
  });

  it("does not produce correlations for string columns", () => {
    const rows = makeRows([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
    const result = profileDataset(
      rows,
      ["name", "age"],
      { name: "string", age: "number" }
    );
    // Only 1 numeric column, so no correlation pairs
    expect(result.correlations.length).toBe(0);
  });
});
