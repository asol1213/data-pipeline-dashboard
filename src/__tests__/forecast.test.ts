import { describe, it, expect } from "vitest";
import { linearRegression, forecast } from "../lib/forecast";

describe("linearRegression", () => {
  it("computes slope and intercept for a perfect linear sequence", () => {
    const result = linearRegression([2, 4, 6, 8, 10]);
    expect(result.slope).toBe(2);
    expect(result.intercept).toBe(2);
    expect(result.r2).toBe(1);
  });

  it("returns R² of 1 for perfectly linear data", () => {
    const result = linearRegression([10, 20, 30, 40, 50]);
    expect(result.r2).toBe(1);
  });

  it("returns R² between 0 and 1 for noisy data", () => {
    const result = linearRegression([10, 12, 9, 14, 13, 16, 15, 18]);
    expect(result.r2).toBeGreaterThanOrEqual(0);
    expect(result.r2).toBeLessThanOrEqual(1);
  });

  it("handles a single value", () => {
    const result = linearRegression([42]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(42);
  });

  it("handles two values", () => {
    const result = linearRegression([10, 20]);
    expect(result.slope).toBe(10);
    expect(result.intercept).toBe(10);
    expect(result.r2).toBe(1);
  });

  it("handles constant values (zero variance)", () => {
    const result = linearRegression([5, 5, 5, 5]);
    expect(result.slope).toBe(0);
    expect(result.r2).toBe(0);
  });

  it("handles negative slope", () => {
    const result = linearRegression([50, 40, 30, 20, 10]);
    expect(result.slope).toBe(-10);
    expect(result.r2).toBe(1);
  });
});

describe("forecast", () => {
  it("produces the correct number of predictions", () => {
    const result = forecast([10, 20, 30, 40, 50], 3);
    expect(result.predicted).toHaveLength(3);
    expect(result.confidence.upper).toHaveLength(3);
    expect(result.confidence.lower).toHaveLength(3);
  });

  it("predictions extend the trend for perfect linear data", () => {
    const result = forecast([10, 20, 30, 40, 50], 3);
    // Next values should be 60, 70, 80
    expect(result.predicted[0]).toBe(60);
    expect(result.predicted[1]).toBe(70);
    expect(result.predicted[2]).toBe(80);
  });

  it("confidence intervals are symmetric around predictions", () => {
    const result = forecast([10, 12, 9, 14, 13, 16, 15, 18], 3);
    for (let i = 0; i < result.predicted.length; i++) {
      const upperDiff = result.confidence.upper[i] - result.predicted[i];
      const lowerDiff = result.predicted[i] - result.confidence.lower[i];
      expect(Math.abs(upperDiff - lowerDiff)).toBeLessThan(0.02);
    }
  });

  it("upper bound is always >= predicted", () => {
    const result = forecast([10, 12, 9, 14, 13, 16], 5);
    for (let i = 0; i < result.predicted.length; i++) {
      expect(result.confidence.upper[i]).toBeGreaterThanOrEqual(result.predicted[i]);
    }
  });

  it("lower bound is always <= predicted", () => {
    const result = forecast([10, 12, 9, 14, 13, 16], 5);
    for (let i = 0; i < result.predicted.length; i++) {
      expect(result.confidence.lower[i]).toBeLessThanOrEqual(result.predicted[i]);
    }
  });

  it("returns empty arrays for insufficient data", () => {
    const result = forecast([10], 3);
    expect(result.predicted).toHaveLength(0);
    expect(result.confidence.upper).toHaveLength(0);
    expect(result.confidence.lower).toHaveLength(0);
  });

  it("returns empty arrays for zero periodsAhead", () => {
    const result = forecast([10, 20, 30], 0);
    expect(result.predicted).toHaveLength(0);
  });

  it("confidence band is zero for perfect linear data", () => {
    // With perfect linear data, standard error is 0
    const result = forecast([10, 20, 30, 40, 50], 2);
    expect(result.confidence.upper[0]).toBe(result.predicted[0]);
    expect(result.confidence.lower[0]).toBe(result.predicted[0]);
  });
});
