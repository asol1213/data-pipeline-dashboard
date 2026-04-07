import { describe, it, expect } from "vitest";
import { analyzeDataset } from "../lib/insights";
import { computeDatasetStats } from "../lib/stats";

const sampleHeaders = ["Month", "Revenue", "Customers", "Churn_Rate"];
const sampleColumnTypes: Record<string, "number" | "date" | "string"> = {
  Month: "string",
  Revenue: "number",
  Customers: "number",
  Churn_Rate: "number",
};

const sampleData = [
  { Month: "Jan", Revenue: "10000", Customers: "100", Churn_Rate: "3.2" },
  { Month: "Feb", Revenue: "12000", Customers: "120", Churn_Rate: "2.8" },
  { Month: "Mar", Revenue: "15000", Customers: "150", Churn_Rate: "2.5" },
  { Month: "Apr", Revenue: "18000", Customers: "180", Churn_Rate: "2.3" },
  { Month: "May", Revenue: "22000", Customers: "210", Churn_Rate: "2.0" },
  { Month: "Jun", Revenue: "26000", Customers: "250", Churn_Rate: "1.8" },
];

function getInsights(data: Record<string, string>[], headers: string[], columnTypes: Record<string, "number" | "date" | "string">) {
  const stats = computeDatasetStats(data, headers, columnTypes);
  return analyzeDataset(data, stats, headers, columnTypes);
}

describe("analyzeDataset", () => {
  it("returns an array of insights", () => {
    const insights = getInsights(sampleData, sampleHeaders, sampleColumnTypes);
    expect(Array.isArray(insights)).toBe(true);
    expect(insights.length).toBeGreaterThan(0);
  });

  it("detects upward trends in Revenue", () => {
    const insights = getInsights(sampleData, sampleHeaders, sampleColumnTypes);
    const trendInsight = insights.find(
      (i) => i.type === "trend" && i.text.toLowerCase().includes("revenue")
    );
    expect(trendInsight).toBeDefined();
    expect(trendInsight!.text).toMatch(/upward|increased/i);
  });

  it("detects percentage change between first and last period", () => {
    const insights = getInsights(sampleData, sampleHeaders, sampleColumnTypes);
    const changeInsight = insights.find(
      (i) => i.text.includes("Jan") && i.text.includes("Jun")
    );
    expect(changeInsight).toBeDefined();
  });

  it("generates insights with correct icon property", () => {
    const insights = getInsights(sampleData, sampleHeaders, sampleColumnTypes);
    for (const insight of insights) {
      expect(insight.icon).toBeDefined();
      expect(typeof insight.icon).toBe("string");
      expect(insight.icon.length).toBeGreaterThan(0);
    }
  });

  it("detects correlations between numeric columns", () => {
    // Revenue and Customers should be strongly correlated in our sample data
    const insights = getInsights(sampleData, sampleHeaders, sampleColumnTypes);
    const corrInsight = insights.find((i) => i.type === "correlation");
    expect(corrInsight).toBeDefined();
    expect(corrInsight!.text).toMatch(/tend to have/i);
  });

  it("insights are sorted by priority (highest first)", () => {
    const insights = getInsights(sampleData, sampleHeaders, sampleColumnTypes);
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i - 1].priority).toBeGreaterThanOrEqual(insights[i].priority);
    }
  });

  it("handles empty data gracefully", () => {
    const stats = computeDatasetStats([], [], {});
    const insights = analyzeDataset([], stats, [], {});
    expect(insights).toEqual([]);
  });

  it("detects anomalies when present", () => {
    const dataWithAnomaly = [
      { Month: "Jan", Value: "10" },
      { Month: "Feb", Value: "10" },
      { Month: "Mar", Value: "10" },
      { Month: "Apr", Value: "10" },
      { Month: "May", Value: "10" },
      { Month: "Jun", Value: "10" },
      { Month: "Jul", Value: "10" },
      { Month: "Aug", Value: "10" },
      { Month: "Sep", Value: "10" },
      { Month: "Oct", Value: "100" }, // Anomaly
    ];
    const stats = computeDatasetStats(
      dataWithAnomaly,
      ["Month", "Value"],
      { Month: "string", Value: "number" }
    );
    const insights = analyzeDataset(dataWithAnomaly, stats, ["Month", "Value"], { Month: "string", Value: "number" });
    const anomalyInsight = insights.find((i) => i.type === "anomaly");
    expect(anomalyInsight).toBeDefined();
    expect(anomalyInsight!.text).toMatch(/anomal/i);
  });
});
