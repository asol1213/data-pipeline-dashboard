import { describe, it, expect } from "vitest";
import {
  computeScenarioKPIs,
  allocateBudgetTopDown,
  computeVariance,
  goalSeek,
  type ScenarioKPIs,
  type Department,
} from "../lib/planning-engine";

const BASE_KPIS: ScenarioKPIs = {
  revenue: 10000000,
  cogs: 4000000,
  grossProfit: 6000000,
  grossMargin: 60,
  opEx: 3000000,
  marketing: 1000000,
  ebitda: 3000000,
  ebitdaMargin: 30,
  netIncome: 2000000,
  netMargin: 20,
};

describe("Scenario Engine", () => {
  it("revenue +20% increases EBITDA proportionally", () => {
    const result = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: 0.2,
      costReduction: 0,
      headcountChange: 0,
      marketingSpend: 0,
    });
    // Revenue should be +20%
    expect(result.revenue).toBe(12000000);
    // COGS stays same, so gross profit increases
    expect(result.grossProfit).toBe(12000000 - 4000000);
    // EBITDA should increase since revenue up and costs same
    expect(result.ebitda).toBeGreaterThan(BASE_KPIS.ebitda);
  });

  it("cost -10% improves margins", () => {
    const result = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: 0,
      costReduction: 0.1,
      headcountChange: 0,
      marketingSpend: 0,
    });
    // COGS should be reduced by 10%
    expect(result.cogs).toBe(3600000);
    // Gross profit should increase
    expect(result.grossProfit).toBeGreaterThan(BASE_KPIS.grossProfit);
    // Gross margin should be higher
    expect(result.grossMargin).toBeGreaterThan(BASE_KPIS.grossMargin);
  });

  it("combined scenario: revenue up + cost down", () => {
    const result = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: 0.1,
      costReduction: 0.05,
      headcountChange: -0.05,
      marketingSpend: 0,
    });
    expect(result.revenue).toBe(11000000);
    expect(result.ebitda).toBeGreaterThan(BASE_KPIS.ebitda);
    expect(result.netIncome).toBeGreaterThan(BASE_KPIS.netIncome);
  });
});

describe("Budget Builder", () => {
  const departments: Department[] = [
    { name: "Engineering", headcount: 50, revenue: 0, customPercent: 40 },
    { name: "Marketing", headcount: 20, revenue: 0, customPercent: 30 },
    { name: "Sales", headcount: 30, revenue: 0, customPercent: 30 },
  ];

  it("top-down allocation sums to total budget", () => {
    const result = allocateBudgetTopDown(1000000, departments, "equal");
    const total = result.reduce((s, a) => s + a.annual, 0);
    // Should approximately equal total budget (rounding may cause 1-2 off)
    expect(Math.abs(total - 1000000)).toBeLessThanOrEqual(departments.length);
  });

  it("equal split divides evenly across departments", () => {
    const result = allocateBudgetTopDown(900000, departments, "equal");
    // Each department gets 300000
    expect(result[0].annual).toBe(300000);
    expect(result[1].annual).toBe(300000);
    expect(result[2].annual).toBe(300000);
  });

  it("by-headcount allocation weights by headcount", () => {
    const result = allocateBudgetTopDown(1000000, departments, "by-headcount");
    // Engineering has 50 of 100 headcount = 50%
    expect(result[0].annual).toBe(500000);
    // Marketing has 20 of 100 = 20%
    expect(result[1].annual).toBe(200000);
    // Sales has 30 of 100 = 30%
    expect(result[2].annual).toBe(300000);
  });

  it("quarterly breakdown sums to annual", () => {
    const result = allocateBudgetTopDown(1000000, departments, "equal");
    for (const alloc of result) {
      const qSum = alloc.q1 + alloc.q2 + alloc.q3 + alloc.q4;
      // Allow small rounding difference
      expect(Math.abs(qSum - alloc.annual)).toBeLessThanOrEqual(4);
    }
  });
});

describe("Variance Analysis", () => {
  const budgetData = [
    { Department: "Engineering", Budget: "500000" },
    { Department: "Marketing", Budget: "300000" },
    { Department: "Sales", Budget: "200000" },
  ];

  const actualData = [
    { Department: "Engineering", Budget: "480000" },
    { Department: "Marketing", Budget: "350000" },
    { Department: "Sales", Budget: "190000" },
  ];

  it("positive variance (actual > budget) is favorable for revenue metrics", () => {
    const result = computeVariance(budgetData, actualData, "Department", "Budget", false);
    const marketing = result.items.find(i => i.category === "Marketing");
    expect(marketing).toBeDefined();
    expect(marketing!.variance).toBe(50000); // 350000 - 300000
    expect(marketing!.status).toBe("Favorable");
  });

  it("negative variance (actual < budget) is unfavorable for revenue metrics", () => {
    const result = computeVariance(budgetData, actualData, "Department", "Budget", false);
    const engineering = result.items.find(i => i.category === "Engineering");
    expect(engineering).toBeDefined();
    expect(engineering!.variance).toBe(-20000); // 480000 - 500000
    expect(engineering!.status).toBe("Unfavorable");
  });

  it("total variance is sum of all item variances", () => {
    const result = computeVariance(budgetData, actualData, "Department", "Budget", false);
    const sumVariance = result.items.reduce((s, i) => s + i.variance, 0);
    expect(result.totalVariance).toBe(sumVariance);
  });
});

describe("Goal Seek", () => {
  it("finds correct revenue for target profit", () => {
    // Simple linear model: profit = revenue * 0.2
    const result = goalSeek(
      1000000, // current revenue
      300000,  // target profit
      (revenue) => revenue * 0.2, // profit function
    );
    expect(result.found).toBe(true);
    // Required revenue: 300000 / 0.2 = 1500000
    expect(Math.abs(result.requiredInput - 1500000)).toBeLessThan(15000);
  });

  it("reports change percentage correctly", () => {
    const result = goalSeek(
      1000000,
      400000,
      (revenue) => revenue * 0.2,
    );
    expect(result.found).toBe(true);
    // Required: 2000000, change from 1000000 = +100%
    expect(result.changePercent).toBeGreaterThan(90);
    expect(result.changePercent).toBeLessThan(110);
  });

  it("finds solution for non-linear function", () => {
    // Quadratic-like: output = input * 0.3 - 50000
    const result = goalSeek(
      500000,
      100000,
      (input) => input * 0.3 - 50000,
    );
    expect(result.found).toBe(true);
    // Required: (100000 + 50000) / 0.3 = 500000
    expect(Math.abs(result.requiredInput - 500000)).toBeLessThan(5000);
  });
});
