import { describe, it, expect } from "vitest";
import { BENCHMARKS, detectBenchmark, compareToBenchmark } from "../lib/benchmarks";

describe("Benchmarks", () => {
  it("returns benchmark for SaaS", () => {
    const saas = BENCHMARKS.saas;
    expect(saas).toBeDefined();
    expect(saas.name).toBe("SaaS Industry (Median)");
    expect(saas.metrics["Gross_Margin_%"]).toBe(75);
    expect(saas.metrics["Churn_Rate_%"]).toBe(5.0);
    expect(saas.metrics["LTV_CAC_Ratio"]).toBe(3.0);
  });

  it("auto-detects SaaS from column names", () => {
    const columns = [
      "Month",
      "MRR",
      "Churn_Rate_%",
      "Gross_Margin_%",
      "LTV_CAC_Ratio",
      "Net_Revenue_Retention_%",
    ];
    const detected = detectBenchmark(columns);
    expect(detected).toBe("saas");
  });

  it("comparison: above benchmark = positive delta", () => {
    const result = compareToBenchmark("saas", { "Gross_Margin_%": 80 });
    expect(result).toHaveLength(1);
    expect(result[0].delta).toBe(5);
    expect(result[0].above).toBe(true);
  });

  it("comparison: below benchmark = negative delta", () => {
    const result = compareToBenchmark("saas", { "Gross_Margin_%": 70 });
    expect(result).toHaveLength(1);
    expect(result[0].delta).toBe(-5);
    expect(result[0].above).toBe(false);
  });

  it("unknown industry returns empty", () => {
    const result = compareToBenchmark("nonexistent", { "Gross_Margin_%": 80 });
    expect(result).toEqual([]);
  });
});
