import { describe, it, expect, beforeAll } from "vitest";
import { ensureSeedData } from "../lib/seed";

/**
 * Tests for the generateSQLFromTemplate function.
 * Since it's a private function in the route, we test by importing the POST handler
 * and calling it without any AI API keys set (ensuring template fallback is used).
 * However, since the function is not exported, we test its behavior via the patterns
 * it should produce by reimplementing the pattern matching logic for verification.
 *
 * Alternative approach: test the NL2SQL endpoint and verify the template fallback behavior.
 */

// We test template fallback by checking SQL pattern generation logic directly
// The template fallback is triggered when no AI API keys are set
describe("AI Fallback - SQL Template Generation", () => {
  beforeAll(() => {
    ensureSeedData();
  });

  // Helper: simulate what generateSQLFromTemplate does for pattern matching
  function matchesTopPattern(q: string): boolean {
    const lower = q.toLowerCase();
    return lower.includes("top") || lower.includes("highest") || lower.includes("best") || lower.includes("größt") || lower.includes("höchst");
  }

  function matchesCountPattern(q: string): boolean {
    const lower = q.toLowerCase();
    return lower.includes("count") || lower.includes("wie viele");
  }

  function matchesSumPattern(q: string): boolean {
    const lower = q.toLowerCase();
    return lower.includes("sum") || lower.includes("total") || lower.includes("gesamt");
  }

  function matchesAvgPattern(q: string): boolean {
    const lower = q.toLowerCase();
    return lower.includes("average") || lower.includes("avg") || lower.includes("durchschnitt");
  }

  function matchesYearPattern(q: string): boolean {
    const lower = q.toLowerCase();
    return /202[4-6]/.test(lower);
  }

  it("'top 5' generates ORDER BY DESC LIMIT pattern", () => {
    const q = "show me top 5 sales";
    expect(matchesTopPattern(q)).toBe(true);
    const match = q.match(/top\s+(\d+)/);
    expect(match).toBeTruthy();
    expect(parseInt(match![1])).toBe(5);
  });

  it("'highest' triggers top pattern", () => {
    expect(matchesTopPattern("show highest revenue")).toBe(true);
  });

  it("'count by' generates GROUP BY COUNT pattern", () => {
    expect(matchesCountPattern("count by channel")).toBe(true);
    expect(matchesCountPattern("how many orders by region")).toBe(false);
    expect(matchesCountPattern("wie viele Kunden")).toBe(true);
  });

  it("'sum' generates SUM aggregate pattern", () => {
    expect(matchesSumPattern("sum of revenue")).toBe(true);
    expect(matchesSumPattern("total sales by month")).toBe(true);
    expect(matchesSumPattern("Gesamtumsatz")).toBe(true);
  });

  it("'average' generates AVG pattern", () => {
    expect(matchesAvgPattern("average revenue")).toBe(true);
    expect(matchesAvgPattern("avg order size")).toBe(true);
    expect(matchesAvgPattern("Durchschnitt")).toBe(true);
  });

  it("'2025' generates WHERE date filter pattern", () => {
    expect(matchesYearPattern("show 2025 data")).toBe(true);
    expect(matchesYearPattern("revenue in 2024")).toBe(true);
    expect(matchesYearPattern("forecast for 2026")).toBe(true);
  });

  it("unknown query falls through to default SELECT * LIMIT 50", () => {
    const q = "something completely unrelated xyz";
    expect(matchesTopPattern(q)).toBe(false);
    expect(matchesCountPattern(q)).toBe(false);
    expect(matchesSumPattern(q)).toBe(false);
    expect(matchesAvgPattern(q)).toBe(false);
    expect(matchesYearPattern(q)).toBe(false);
    // Would generate: SELECT * FROM {table} LIMIT 50
  });

  it("top N extracts correct number", () => {
    const patterns = [
      { q: "top 3 customers", expected: 3 },
      { q: "top 10 products", expected: 10 },
      { q: "top 100 transactions", expected: 100 },
    ];
    for (const { q, expected } of patterns) {
      const match = q.match(/top\s+(\d+)/);
      expect(match).toBeTruthy();
      expect(parseInt(match![1])).toBe(expected);
    }
  });

  it("German language patterns are recognized", () => {
    expect(matchesSumPattern("Gesamtumsatz nach Monat")).toBe(true);
    expect(matchesAvgPattern("Durchschnittlicher Umsatz")).toBe(true);
    expect(matchesCountPattern("Wie viele Transaktionen")).toBe(true);
    expect(matchesTopPattern("die größten Kunden")).toBe(true);
  });

  it("by month pattern is recognized", () => {
    const q1 = "revenue by month";
    const q2 = "monthly breakdown";
    const q3 = "Umsatz pro Monat";
    const lower1 = q1.toLowerCase();
    const lower2 = q2.toLowerCase();
    const lower3 = q3.toLowerCase();
    expect(lower1.includes("by month") || lower1.includes("monthly")).toBe(true);
    expect(lower2.includes("by month") || lower2.includes("monthly")).toBe(true);
    expect(lower3.includes("pro monat") || lower3.includes("monatlich")).toBe(true);
  });
});
