import { describe, it, expect } from "vitest";
import { calculateQuality, getQualityColor, getQualityBgColor, getQualityLabel } from "../lib/quality";
import { computeDatasetStats } from "../lib/stats";

function getQuality(data: Record<string, string>[], headers: string[], columnTypes: Record<string, "number" | "date" | "string">) {
  const stats = computeDatasetStats(data, headers, columnTypes);
  return calculateQuality(data, stats);
}

describe("Data Quality - Perfect data", () => {
  it("returns high completeness for data with no missing values", () => {
    const data = [
      { Name: "Alice", Score: "90" },
      { Name: "Bob", Score: "80" },
      { Name: "Charlie", Score: "70" },
    ];
    const quality = getQuality(data, ["Name", "Score"], { Name: "string", Score: "number" });
    expect(quality.completeness).toBe(100);
  });

  it("returns high quality score for perfect data", () => {
    const data = [
      { Name: "Alice", Score: "90" },
      { Name: "Bob", Score: "80" },
      { Name: "Charlie", Score: "70" },
    ];
    const quality = getQuality(data, ["Name", "Score"], { Name: "string", Score: "number" });
    expect(quality.qualityScore).toBeGreaterThanOrEqual(75);
  });
});

describe("Data Quality - Missing values", () => {
  it("returns lower completeness for data with missing values", () => {
    const data = [
      { Name: "Alice", Score: "90" },
      { Name: "", Score: "80" },
      { Name: "Charlie", Score: "" },
      { Name: "", Score: "" },
    ];
    const quality = getQuality(data, ["Name", "Score"], { Name: "string", Score: "number" });
    expect(quality.completeness).toBeLessThan(100);
  });
});

describe("Data Quality - Anomalies", () => {
  it("counts anomalies and they lower quality score", () => {
    // Create data with a clear anomaly
    const data = [
      { Val: "10" }, { Val: "10" }, { Val: "10" }, { Val: "10" },
      { Val: "10" }, { Val: "10" }, { Val: "10" }, { Val: "10" },
      { Val: "10" }, { Val: "500" }, // anomaly
    ];
    const quality = getQuality(data, ["Val"], { Val: "number" });
    expect(quality.anomalyCount).toBeGreaterThan(0);
  });

  it("no anomalies for uniform data", () => {
    const data = [
      { Val: "10" }, { Val: "10" }, { Val: "10" }, { Val: "10" },
    ];
    const quality = getQuality(data, ["Val"], { Val: "number" });
    expect(quality.anomalyCount).toBe(0);
  });
});

describe("Data Quality - Uniqueness", () => {
  it("returns high uniqueness when all values are unique", () => {
    const data = [
      { Name: "Alice" },
      { Name: "Bob" },
      { Name: "Charlie" },
      { Name: "Diana" },
    ];
    const quality = getQuality(data, ["Name"], { Name: "string" });
    expect(quality.uniqueness).toBe(100);
  });

  it("returns lower uniqueness when all values are the same", () => {
    const data = [
      { Name: "Alice" },
      { Name: "Alice" },
      { Name: "Alice" },
      { Name: "Alice" },
    ];
    const quality = getQuality(data, ["Name"], { Name: "string" });
    expect(quality.uniqueness).toBe(25);
  });
});

describe("Data Quality - Empty dataset", () => {
  it("handles empty dataset gracefully", () => {
    const stats = computeDatasetStats([], [], {});
    const quality = calculateQuality([], stats);
    expect(quality.completeness).toBe(100);
    expect(quality.uniqueness).toBe(100);
    expect(quality.anomalyCount).toBe(0);
    expect(quality.qualityScore).toBe(100);
  });
});

describe("Data Quality - Score bounds", () => {
  it("quality score is between 0 and 100", () => {
    const data = [
      { Name: "Alice", Score: "90" },
      { Name: "", Score: "" },
      { Name: "Charlie", Score: "70" },
    ];
    const quality = getQuality(data, ["Name", "Score"], { Name: "string", Score: "number" });
    expect(quality.qualityScore).toBeGreaterThanOrEqual(0);
    expect(quality.qualityScore).toBeLessThanOrEqual(100);
  });

  it("quality score is between 0 and 100 for perfect data", () => {
    const data = [
      { A: "1", B: "2" },
      { A: "3", B: "4" },
    ];
    const quality = getQuality(data, ["A", "B"], { A: "number", B: "number" });
    expect(quality.qualityScore).toBeGreaterThanOrEqual(0);
    expect(quality.qualityScore).toBeLessThanOrEqual(100);
  });
});

describe("Data Quality - Helper functions", () => {
  it("getQualityColor returns correct CSS classes", () => {
    expect(getQualityColor(90)).toBe("text-success");
    expect(getQualityColor(70)).toBe("text-warning");
    expect(getQualityColor(40)).toBe("text-danger");
  });

  it("getQualityBgColor returns correct CSS classes", () => {
    expect(getQualityBgColor(90)).toMatch(/emerald/);
    expect(getQualityBgColor(70)).toMatch(/yellow/);
    expect(getQualityBgColor(40)).toMatch(/red/);
  });

  it("getQualityLabel returns correct labels", () => {
    expect(getQualityLabel(95)).toBe("Excellent");
    expect(getQualityLabel(85)).toBe("Good");
    expect(getQualityLabel(65)).toBe("Fair");
    expect(getQualityLabel(45)).toBe("Poor");
    expect(getQualityLabel(30)).toBe("Critical");
  });
});
