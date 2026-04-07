import { describe, it, expect } from "vitest";
import { analyzeDataset } from "../lib/insights";
import { computeDatasetStats } from "../lib/stats";

function getInsights(
  data: Record<string, string>[],
  headers: string[],
  columnTypes: Record<string, "number" | "date" | "string">
) {
  const stats = computeDatasetStats(data, headers, columnTypes);
  return analyzeDataset(data, stats, headers, columnTypes);
}

describe("Insights - Trend detection", () => {
  it("detects upward trend for consistently increasing values", () => {
    const data = [
      { Month: "Jan", Value: "100" },
      { Month: "Feb", Value: "120" },
      { Month: "Mar", Value: "150" },
      { Month: "Apr", Value: "180" },
      { Month: "May", Value: "220" },
      { Month: "Jun", Value: "270" },
    ];
    const insights = getInsights(data, ["Month", "Value"], { Month: "string", Value: "number" });
    const trend = insights.find((i) => i.type === "trend" && i.text.toLowerCase().includes("upward"));
    expect(trend).toBeDefined();
    expect(trend!.text).toMatch(/upward trend/i);
  });

  it("detects downward trend for consistently decreasing values", () => {
    const data = [
      { Month: "Jan", Value: "300" },
      { Month: "Feb", Value: "250" },
      { Month: "Mar", Value: "200" },
      { Month: "Apr", Value: "160" },
      { Month: "May", Value: "120" },
      { Month: "Jun", Value: "80" },
    ];
    const insights = getInsights(data, ["Month", "Value"], { Month: "string", Value: "number" });
    const trend = insights.find((i) => i.type === "trend" && i.text.toLowerCase().includes("downward"));
    expect(trend).toBeDefined();
  });
});

describe("Insights - Peak detection", () => {
  it("finds the correct peak month", () => {
    const data = [
      { Month: "Jan", Value: "100" },
      { Month: "Feb", Value: "150" },
      { Month: "Mar", Value: "120" },
      { Month: "Apr", Value: "500" },
      { Month: "May", Value: "130" },
      { Month: "Jun", Value: "110" },
    ];
    const insights = getInsights(data, ["Month", "Value"], { Month: "string", Value: "number" });
    const peakInsight = insights.find((i) => i.text.includes("Apr") && i.text.includes("500"));
    expect(peakInsight).toBeDefined();
  });
});

describe("Insights - Anomaly mentions", () => {
  it("mentions anomalous values in insights", () => {
    const data = [
      { Month: "Jan", Value: "10" },
      { Month: "Feb", Value: "10" },
      { Month: "Mar", Value: "10" },
      { Month: "Apr", Value: "10" },
      { Month: "May", Value: "10" },
      { Month: "Jun", Value: "10" },
      { Month: "Jul", Value: "10" },
      { Month: "Aug", Value: "10" },
      { Month: "Sep", Value: "10" },
      { Month: "Oct", Value: "200" },
    ];
    const insights = getInsights(data, ["Month", "Value"], { Month: "string", Value: "number" });
    const anomalyInsight = insights.find((i) => i.type === "anomaly");
    expect(anomalyInsight).toBeDefined();
    expect(anomalyInsight!.text).toMatch(/anomal/i);
  });
});

describe("Insights - Correlation detection", () => {
  it("detects correlation between two correlated columns", () => {
    const data = [
      { Month: "Jan", Revenue: "100", Customers: "10" },
      { Month: "Feb", Revenue: "200", Customers: "20" },
      { Month: "Mar", Revenue: "300", Customers: "30" },
      { Month: "Apr", Revenue: "400", Customers: "40" },
      { Month: "May", Revenue: "500", Customers: "50" },
    ];
    const insights = getInsights(
      data,
      ["Month", "Revenue", "Customers"],
      { Month: "string", Revenue: "number", Customers: "number" }
    );
    const corrInsight = insights.find((i) => i.type === "correlation");
    expect(corrInsight).toBeDefined();
    expect(corrInsight!.text).toMatch(/tend to have/i);
  });
});

describe("Insights - Edge cases", () => {
  it("handles single row dataset without crashing", () => {
    const data = [{ Month: "Jan", Value: "100" }];
    const insights = getInsights(data, ["Month", "Value"], { Month: "string", Value: "number" });
    expect(Array.isArray(insights)).toBe(true);
    // Single row = not enough data for trends, should not crash
  });

  it("handles all same values with no significant trends", () => {
    const data = [
      { Month: "Jan", Value: "50" },
      { Month: "Feb", Value: "50" },
      { Month: "Mar", Value: "50" },
      { Month: "Apr", Value: "50" },
      { Month: "May", Value: "50" },
    ];
    const insights = getInsights(data, ["Month", "Value"], { Month: "string", Value: "number" });
    // No upward/downward trends should be detected for constant values
    const trendInsight = insights.find(
      (i) => i.type === "trend" && (i.text.includes("upward") || i.text.includes("downward"))
    );
    expect(trendInsight).toBeUndefined();
  });

  it("handles empty dataset", () => {
    const stats = computeDatasetStats([], [], {});
    const insights = analyzeDataset([], stats, [], {});
    expect(insights).toEqual([]);
  });
});
