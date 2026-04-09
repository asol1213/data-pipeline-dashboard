import { describe, it, expect } from "vitest";
import {
  computeScenarioKPIs,
  allocateBudgetTopDown,
  computeVariance,
  goalSeek,
  generateRollingForecastData,
  generateScenarioComparisonData,
  createDefaultPnLState,
  recalcPnL,
  adjustPnLItem,
  buildPnLItems,
  computeImpactTrail,
  computeForecastAccuracy,
  type ScenarioKPIs,
  type ScenarioAssumptions,
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

describe("computeScenarioKPIs - comprehensive", () => {
  it("revenue increase leads to higher EBITDA", () => {
    const result = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: 0.3,
      costReduction: 0,
      headcountChange: 0,
      marketingSpend: 0,
    });
    expect(result.revenue).toBe(13000000);
    expect(result.ebitda).toBeGreaterThan(BASE_KPIS.ebitda);
  });

  it("cost reduction improves gross margin", () => {
    const result = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: 0,
      costReduction: 0.2,
      headcountChange: 0,
      marketingSpend: 0,
    });
    expect(result.cogs).toBe(3200000);
    expect(result.grossMargin).toBeGreaterThan(BASE_KPIS.grossMargin);
  });

  it("marketing spend increase raises opEx", () => {
    const result = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: 0,
      costReduction: 0,
      headcountChange: 0,
      marketingSpend: 0.5,
    });
    expect(result.marketing).toBe(1500000);
    expect(result.opEx).toBeGreaterThan(BASE_KPIS.opEx);
  });

  it("headcount decrease reduces opEx (excluding marketing)", () => {
    const result = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: 0,
      costReduction: 0,
      headcountChange: -0.1,
      marketingSpend: 0,
    });
    expect(result.opEx).toBeLessThan(BASE_KPIS.opEx);
  });

  it("zero assumptions return base values", () => {
    const result = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: 0,
      costReduction: 0,
      headcountChange: 0,
      marketingSpend: 0,
    });
    expect(result.revenue).toBe(BASE_KPIS.revenue);
    expect(result.cogs).toBe(BASE_KPIS.cogs);
  });

  it("net income is affected by tax at 25%", () => {
    const result = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: 0,
      costReduction: 0,
      headcountChange: 0,
      marketingSpend: 0,
    });
    // Net income should be less than EBITDA due to depreciation, interest, and tax
    expect(result.netIncome).toBeLessThan(result.ebitda);
  });
});

describe("allocateBudgetTopDown - comprehensive", () => {
  const departments: Department[] = [
    { name: "Engineering", headcount: 50, revenue: 5000000, customPercent: 50 },
    { name: "Sales", headcount: 30, revenue: 3000000, customPercent: 30 },
    { name: "HR", headcount: 20, revenue: 2000000, customPercent: 20 },
  ];

  it("equal allocation sums to total", () => {
    const result = allocateBudgetTopDown(900000, departments, "equal");
    const total = result.reduce((s, a) => s + a.annual, 0);
    expect(total).toBe(900000);
  });

  it("by-headcount allocation sums to total", () => {
    const result = allocateBudgetTopDown(1000000, departments, "by-headcount");
    const total = result.reduce((s, a) => s + a.annual, 0);
    expect(Math.abs(total - 1000000)).toBeLessThanOrEqual(departments.length);
  });

  it("by-revenue allocation weights by revenue", () => {
    const result = allocateBudgetTopDown(1000000, departments, "by-revenue");
    // Engineering has 50% of revenue
    expect(result[0].annual).toBe(500000);
    // Sales has 30%
    expect(result[1].annual).toBe(300000);
    // HR has 20%
    expect(result[2].annual).toBe(200000);
  });

  it("custom allocation uses customPercent", () => {
    const result = allocateBudgetTopDown(1000000, departments, "custom");
    expect(result[0].annual).toBe(500000);
    expect(result[1].annual).toBe(300000);
    expect(result[2].annual).toBe(200000);
  });

  it("quarterly split applies correctly", () => {
    const result = allocateBudgetTopDown(1200000, departments, "equal", [40, 30, 20, 10]);
    // Engineering gets 400000 annual
    expect(result[0].q1).toBe(Math.round(400000 * 40 / 100));
    expect(result[0].q2).toBe(Math.round(400000 * 30 / 100));
    expect(result[0].q3).toBe(Math.round(400000 * 20 / 100));
    expect(result[0].q4).toBe(Math.round(400000 * 10 / 100));
  });

  it("percentOfTotal is calculated correctly", () => {
    const result = allocateBudgetTopDown(900000, departments, "equal");
    for (const alloc of result) {
      const expected = Math.round((alloc.annual / 900000) * 1000) / 10;
      expect(alloc.percentOfTotal).toBeCloseTo(expected, 0);
    }
  });
});

describe("computeVariance - comprehensive", () => {
  it("positive variance detected for revenue metrics", () => {
    const budget = [{ Category: "Sales", Amount: "100000" }];
    const actual = [{ Category: "Sales", Amount: "120000" }];
    const result = computeVariance(budget, actual, "Category", "Amount", false);
    expect(result.items[0].variance).toBe(20000);
    expect(result.items[0].status).toBe("Favorable");
  });

  it("negative variance detected for revenue metrics", () => {
    const budget = [{ Category: "Sales", Amount: "100000" }];
    const actual = [{ Category: "Sales", Amount: "80000" }];
    const result = computeVariance(budget, actual, "Category", "Amount", false);
    expect(result.items[0].variance).toBe(-20000);
    expect(result.items[0].status).toBe("Unfavorable");
  });

  it("cost metric: over budget is unfavorable", () => {
    const budget = [{ Dept: "IT", Cost: "50000" }];
    const actual = [{ Dept: "IT", Cost: "60000" }];
    const result = computeVariance(budget, actual, "Dept", "Cost", true);
    expect(result.items[0].variance).toBe(10000);
    expect(result.items[0].status).toBe("Unfavorable");
  });

  it("cost metric: under budget is favorable", () => {
    const budget = [{ Dept: "IT", Cost: "50000" }];
    const actual = [{ Dept: "IT", Cost: "40000" }];
    const result = computeVariance(budget, actual, "Dept", "Cost", true);
    expect(result.items[0].variance).toBe(-10000);
    expect(result.items[0].status).toBe("Favorable");
  });

  it("topDrivers sorted by absolute variance descending", () => {
    const budget = [
      { Cat: "A", Val: "100" },
      { Cat: "B", Val: "200" },
      { Cat: "C", Val: "300" },
    ];
    const actual = [
      { Cat: "A", Val: "110" },
      { Cat: "B", Val: "100" },
      { Cat: "C", Val: "310" },
    ];
    const result = computeVariance(budget, actual, "Cat", "Val", false);
    // B has variance -100, A has +10, C has +10
    expect(result.topDrivers[0].category).toBe("B");
    expect(Math.abs(result.topDrivers[0].variance)).toBeGreaterThanOrEqual(
      Math.abs(result.topDrivers[1].variance)
    );
  });

  it("total variance is sum of all items", () => {
    const budget = [
      { Cat: "A", Val: "100" },
      { Cat: "B", Val: "200" },
    ];
    const actual = [
      { Cat: "A", Val: "120" },
      { Cat: "B", Val: "180" },
    ];
    const result = computeVariance(budget, actual, "Cat", "Val", false);
    expect(result.totalVariance).toBe(0); // +20 - 20 = 0
  });
});

describe("goalSeek - comprehensive", () => {
  it("finds correct value for linear function", () => {
    const result = goalSeek(1000000, 300000, (x) => x * 0.2);
    expect(result.found).toBe(true);
    expect(Math.abs(result.requiredInput - 1500000)).toBeLessThan(20000);
  });

  it("reports change percentage", () => {
    const result = goalSeek(1000000, 400000, (x) => x * 0.2);
    expect(result.found).toBe(true);
    expect(result.changePercent).toBeGreaterThan(90);
  });

  it("converges for non-linear function", () => {
    const result = goalSeek(500000, 100000, (x) => x * 0.3 - 50000);
    expect(result.found).toBe(true);
    // Expected: (100000 + 50000) / 0.3 = 500000
    expect(Math.abs(result.requiredInput - 500000)).toBeLessThan(5000);
  });

  it("returns found=false when max iterations exceeded with bad range", () => {
    // Function that never equals target in search range
    const result = goalSeek(10, 999999999, (x) => Math.sin(x), 10, 0.0001);
    // Sin output is between -1 and 1, target is huge, won't converge
    expect(result.found).toBe(false);
  });

  it("tracks iteration count", () => {
    const result = goalSeek(1000000, 250000, (x) => x * 0.2);
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.iterations).toBeLessThanOrEqual(100);
  });
});

describe("generateRollingForecastData - comprehensive", () => {
  it("returns 12 months", () => {
    const data = generateRollingForecastData();
    expect(data).toHaveLength(12);
  });

  it("month names are correct", () => {
    const data = generateRollingForecastData();
    const expected = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    expect(data.map((d) => d.month)).toEqual(expected);
  });

  it("all budget values are positive", () => {
    const data = generateRollingForecastData("revenue");
    for (const m of data) {
      expect(m.budget).toBeGreaterThan(0);
    }
  });

  it("ebitda metric returns smaller values than revenue", () => {
    const rev = generateRollingForecastData("revenue");
    const ebitda = generateRollingForecastData("ebitda");
    expect(ebitda[0].budget).toBeLessThan(rev[0].budget);
  });

  it("netIncome metric returns smaller values than ebitda", () => {
    const ebitda = generateRollingForecastData("ebitda");
    const ni = generateRollingForecastData("netIncome");
    expect(ni[0].budget).toBeLessThan(ebitda[0].budget);
  });

  it("forecast accuracy is between 0 and 100", () => {
    const data = generateRollingForecastData("revenue");
    const acc = computeForecastAccuracy(data, "q1");
    expect(acc).toBeGreaterThan(0);
    expect(acc).toBeLessThanOrEqual(100);
  });
});

describe("generateScenarioComparisonData - comprehensive", () => {
  const best: ScenarioAssumptions = {
    revenueChange: 0.2, costReduction: 0.1, headcountChange: 0, marketingSpend: 0.1,
  };
  const worst: ScenarioAssumptions = {
    revenueChange: -0.15, costReduction: -0.05, headcountChange: 0.1, marketingSpend: -0.2,
  };

  it("returns 12 months", () => {
    const data = generateScenarioComparisonData(BASE_KPIS, best, worst);
    expect(data).toHaveLength(12);
  });

  it("best case >= base case for each month", () => {
    const data = generateScenarioComparisonData(BASE_KPIS, best, worst, "revenue");
    for (const month of data) {
      expect(month.bestCase).toBeGreaterThanOrEqual(month.baseCase);
    }
  });

  it("base case >= worst case for each month", () => {
    const data = generateScenarioComparisonData(BASE_KPIS, best, worst, "revenue");
    for (const month of data) {
      expect(month.baseCase).toBeGreaterThanOrEqual(month.worstCase);
    }
  });

  it("divergence grows over time", () => {
    const data = generateScenarioComparisonData(BASE_KPIS, best, worst, "revenue");
    const janSpread = data[0].bestCase - data[0].worstCase;
    const decSpread = data[11].bestCase - data[11].worstCase;
    expect(decSpread).toBeGreaterThan(janSpread);
  });
});

describe("createDefaultPnLState - comprehensive", () => {
  it("has all expected line items", () => {
    const state = createDefaultPnLState();
    const ids = state.items.map((i) => i.id);
    expect(ids).toContain("revenue");
    expect(ids).toContain("cogs");
    expect(ids).toContain("grossProfit");
    expect(ids).toContain("grossMargin");
    expect(ids).toContain("marketing");
    expect(ids).toContain("rnd");
    expect(ids).toContain("ga");
    expect(ids).toContain("salaries");
    expect(ids).toContain("ebitda");
    expect(ids).toContain("ebitdaMargin");
    expect(ids).toContain("depreciation");
    expect(ids).toContain("ebit");
    expect(ids).toContain("interest");
    expect(ids).toContain("tax");
    expect(ids).toContain("netIncome");
    expect(ids).toContain("netMargin");
  });

  it("revenue base value is 12M", () => {
    const state = createDefaultPnLState();
    const rev = state.items.find((i) => i.id === "revenue")!;
    expect(rev.baseValue).toBe(12000000);
  });

  it("grossProfit = revenue - cogs", () => {
    const state = createDefaultPnLState();
    const rev = state.items.find((i) => i.id === "revenue")!;
    const cogs = state.items.find((i) => i.id === "cogs")!;
    const gp = state.items.find((i) => i.id === "grossProfit")!;
    expect(gp.simulatedValue).toBe(rev.simulatedValue - cogs.simulatedValue);
  });
});

describe("recalcPnL - cascading calculation", () => {
  it("adjusting revenue cascades to all downstream items", () => {
    const state = createDefaultPnLState();
    const adjusted = adjustPnLItem(state, "revenue", 0.2);
    const rev = adjusted.items.find((i) => i.id === "revenue")!;
    const gp = adjusted.items.find((i) => i.id === "grossProfit")!;
    const ebitda = adjusted.items.find((i) => i.id === "ebitda")!;
    const ni = adjusted.items.find((i) => i.id === "netIncome")!;

    expect(rev.simulatedValue).toBeGreaterThan(rev.baseValue);
    expect(gp.simulatedValue).toBeGreaterThan(gp.baseValue);
    expect(ebitda.simulatedValue).toBeGreaterThan(ebitda.baseValue);
    expect(ni.simulatedValue).toBeGreaterThan(ni.baseValue);
  });

  it("tax is zero when pre-tax income is negative", () => {
    const state = createDefaultPnLState();
    // Increase all costs dramatically
    let adjusted = adjustPnLItem(state, "marketing", 5.0);
    adjusted = adjustPnLItem(adjusted, "rnd", 5.0);
    const tax = adjusted.items.find((i) => i.id === "tax")!;
    expect(tax.simulatedValue).toBe(0);
  });

  it("COGS ratio preserved when revenue changes", () => {
    const state = createDefaultPnLState();
    const adjusted = adjustPnLItem(state, "revenue", 0.5);
    const rev = adjusted.items.find((i) => i.id === "revenue")!;
    const cogs = adjusted.items.find((i) => i.id === "cogs")!;
    const baseRev = state.items.find((i) => i.id === "revenue")!;
    const baseCogs = state.items.find((i) => i.id === "cogs")!;
    const baseRatio = baseCogs.baseValue / baseRev.baseValue;
    const simRatio = cogs.simulatedValue / rev.simulatedValue;
    expect(Math.abs(baseRatio - simRatio)).toBeLessThan(0.01);
  });

  it("impact trail shows changed items", () => {
    const before = createDefaultPnLState();
    const after = adjustPnLItem(before, "revenue", 0.2);
    const trail = computeImpactTrail(before, after);
    expect(trail.length).toBeGreaterThan(0);
    const revTrail = trail.find((t) => t.label === "Revenue");
    expect(revTrail).toBeDefined();
    expect(revTrail!.delta).toBeGreaterThan(0);
  });

  it("buildPnLItems creates correct number of items", () => {
    const state = buildPnLItems({
      revenue: 1000000,
      cogs: 400000,
      marketing: 50000,
      rnd: 80000,
      ga: 40000,
      salaries: 150000,
      depreciation: 30000,
      interest: 10000,
    });
    expect(state.items).toHaveLength(16);
  });
});
