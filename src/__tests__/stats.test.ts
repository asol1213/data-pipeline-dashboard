import { describe, it, expect } from "vitest";
import { computeColumnStats, computeDatasetStats } from "../lib/stats";

function makeRows(column: string, values: string[]): Record<string, string>[] {
  return values.map((v) => ({ [column]: v }));
}

describe("computeColumnStats - numeric", () => {
  it("computes mean correctly", () => {
    const rows = makeRows("val", ["10", "20", "30"]);
    const stats = computeColumnStats(rows, "val", "number");
    expect(stats.mean).toBe(20);
  });

  it("computes median for odd count", () => {
    const rows = makeRows("val", ["1", "3", "5"]);
    const stats = computeColumnStats(rows, "val", "number");
    expect(stats.median).toBe(3);
  });

  it("computes median for even count", () => {
    const rows = makeRows("val", ["1", "2", "3", "4"]);
    const stats = computeColumnStats(rows, "val", "number");
    expect(stats.median).toBe(2.5);
  });

  it("computes standard deviation", () => {
    const rows = makeRows("val", ["2", "4", "4", "4", "5", "5", "7", "9"]);
    const stats = computeColumnStats(rows, "val", "number");
    expect(stats.stddev).toBe(2);
  });

  it("computes min and max", () => {
    const rows = makeRows("val", ["5", "1", "9", "3"]);
    const stats = computeColumnStats(rows, "val", "number");
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(9);
  });

  it("detects anomalies (values > 2 stddev from mean)", () => {
    // Mean=10, all values are 10 except 100 which is clearly an anomaly
    const values = ["10", "10", "10", "10", "10", "10", "10", "10", "10", "100"];
    const rows = makeRows("val", values);
    const stats = computeColumnStats(rows, "val", "number");
    expect(stats.anomalies).toContain(100);
    expect(stats.anomalies!.length).toBeGreaterThan(0);
  });

  it("returns no anomalies when all values are the same", () => {
    const rows = makeRows("val", ["5", "5", "5", "5"]);
    const stats = computeColumnStats(rows, "val", "number");
    expect(stats.anomalies).toEqual([]);
  });

  it("handles single value", () => {
    const rows = makeRows("val", ["42"]);
    const stats = computeColumnStats(rows, "val", "number");
    expect(stats.mean).toBe(42);
    expect(stats.median).toBe(42);
    expect(stats.stddev).toBe(0);
  });

  it("handles empty numeric rows", () => {
    const rows = makeRows("val", ["", "", ""]);
    const stats = computeColumnStats(rows, "val", "number");
    expect(stats.mean).toBeUndefined();
    expect(stats.median).toBeUndefined();
  });

  it("counts nulls and unique values", () => {
    const rows = makeRows("val", ["1", "", "2", "", "1"]);
    const stats = computeColumnStats(rows, "val", "number");
    expect(stats.nullCount).toBe(2);
    expect(stats.count).toBe(5);
    expect(stats.uniqueCount).toBe(3); // "1", "", "2"
  });
});

describe("computeColumnStats - string", () => {
  it("computes count and uniqueCount for strings", () => {
    const rows = makeRows("name", ["Alice", "Bob", "Alice"]);
    const stats = computeColumnStats(rows, "name", "string");
    expect(stats.count).toBe(3);
    expect(stats.uniqueCount).toBe(2);
    expect(stats.mean).toBeUndefined();
  });
});

describe("computeDatasetStats", () => {
  it("computes full dataset statistics", () => {
    const headers = ["name", "score"];
    const rows = [
      { name: "Alice", score: "90" },
      { name: "Bob", score: "80" },
      { name: "Charlie", score: "70" },
    ];
    const columnTypes = { name: "string" as const, score: "number" as const };
    const stats = computeDatasetStats(rows, headers, columnTypes);

    expect(stats.totalRows).toBe(3);
    expect(stats.totalColumns).toBe(2);
    expect(stats.columns).toHaveLength(2);
    expect(stats.numericSummary).toHaveLength(1);
    expect(stats.numericSummary[0].column).toBe("score");
    expect(stats.numericSummary[0].mean).toBe(80);
  });

  it("handles empty dataset", () => {
    const stats = computeDatasetStats([], [], {});
    expect(stats.totalRows).toBe(0);
    expect(stats.totalColumns).toBe(0);
    expect(stats.columns).toEqual([]);
    expect(stats.numericSummary).toEqual([]);
  });
});
