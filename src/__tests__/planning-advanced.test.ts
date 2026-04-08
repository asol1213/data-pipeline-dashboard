import { describe, it, expect } from "vitest";
import {
  createDefaultPnLState,
  adjustPnLItem,
  recalcPnL,
  computeImpactTrail,
  generateRollingForecastData,
  computeForecastAccuracy,
  generateScenarioComparisonData,
  computeScenarioKPIs,
  goalSeek,
  type ScenarioKPIs,
  type PnLSimulatorState,
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

// ── P&L Simulator Tests ─────────────────────────────────────────

describe("P&L Simulator", () => {
  it("revenue change cascades to gross profit", () => {
    const state = createDefaultPnLState();
    const adjusted = adjustPnLItem(state, "revenue", 0.2); // +20%

    const revenue = adjusted.items.find((i) => i.id === "revenue")!;
    const gp = adjusted.items.find((i) => i.id === "grossProfit")!;

    expect(revenue.simulatedValue).toBeGreaterThan(revenue.baseValue);
    expect(gp.simulatedValue).toBeGreaterThan(gp.baseValue);
  });

  it("COGS scales with revenue", () => {
    const state = createDefaultPnLState();
    const adjusted = adjustPnLItem(state, "revenue", 0.5); // +50%

    const revenue = adjusted.items.find((i) => i.id === "revenue")!;
    const cogs = adjusted.items.find((i) => i.id === "cogs")!;

    // COGS ratio should be approximately preserved
    const baseRatio = cogs.baseValue / revenue.baseValue;
    const simRatio = cogs.simulatedValue / revenue.simulatedValue;
    expect(Math.abs(baseRatio - simRatio)).toBeLessThan(0.01);
  });

  it("tax is 25% of pre-tax income", () => {
    const state = createDefaultPnLState();
    const recalced = recalcPnL(state);

    const ebit = recalced.items.find((i) => i.id === "ebit")!;
    const interest = recalced.items.find((i) => i.id === "interest")!;
    const tax = recalced.items.find((i) => i.id === "tax")!;

    const preTax = ebit.simulatedValue - interest.simulatedValue;
    const expectedTax = Math.round(Math.max(0, preTax) * 0.25);
    expect(tax.simulatedValue).toBe(expectedTax);
  });

  it("net margin recalculates correctly", () => {
    const state = createDefaultPnLState();
    const adjusted = adjustPnLItem(state, "revenue", 0.3); // +30%

    const revenue = adjusted.items.find((i) => i.id === "revenue")!;
    const ni = adjusted.items.find((i) => i.id === "netIncome")!;
    const nm = adjusted.items.find((i) => i.id === "netMargin")!;

    const expectedMargin =
      revenue.simulatedValue !== 0
        ? Math.round((ni.simulatedValue / revenue.simulatedValue) * 1000) / 10
        : 0;
    expect(nm.simulatedValue).toBe(expectedMargin);
  });

  it("EBITDA = Gross Profit - all OpEx", () => {
    const state = createDefaultPnLState();
    const adjusted = adjustPnLItem(state, "marketing", 0.5); // +50% marketing

    const gp = adjusted.items.find((i) => i.id === "grossProfit")!;
    const marketing = adjusted.items.find((i) => i.id === "marketing")!;
    const rnd = adjusted.items.find((i) => i.id === "rnd")!;
    const ga = adjusted.items.find((i) => i.id === "ga")!;
    const salaries = adjusted.items.find((i) => i.id === "salaries")!;
    const ebitda = adjusted.items.find((i) => i.id === "ebitda")!;

    const expectedEbitda =
      gp.simulatedValue -
      marketing.simulatedValue -
      rnd.simulatedValue -
      ga.simulatedValue -
      salaries.simulatedValue;
    expect(ebitda.simulatedValue).toBe(expectedEbitda);
  });

  it("impact trail tracks cascading changes", () => {
    const before = createDefaultPnLState();
    const after = adjustPnLItem(before, "revenue", 0.2);
    const trail = computeImpactTrail(before, after);

    expect(trail.length).toBeGreaterThan(0);
    // Revenue should be in the trail
    const revTrail = trail.find((t) => t.label === "Revenue");
    expect(revTrail).toBeDefined();
    expect(revTrail!.delta).toBeGreaterThan(0);
  });
});

// ── Rolling Forecast Tests ──────────────────────────────────────

describe("Rolling Forecast", () => {
  it("generates 12 months of data", () => {
    const data = generateRollingForecastData("revenue");
    expect(data).toHaveLength(12);
  });

  it("each month has all required fields", () => {
    const data = generateRollingForecastData("revenue");
    for (const month of data) {
      expect(month).toHaveProperty("month");
      expect(month).toHaveProperty("budget");
      expect(month).toHaveProperty("forecast_q1");
      expect(month).toHaveProperty("forecast_q2");
      expect(month).toHaveProperty("forecast_q3");
      expect(month).toHaveProperty("actual");
    }
  });

  it("actual values are within reasonable range", () => {
    const data = generateRollingForecastData("revenue");
    for (const month of data) {
      // Actual should be positive and within 2x of budget
      expect(month.actual).toBeGreaterThan(0);
      expect(month.actual).toBeLessThan(month.budget * 3);
    }
  });

  it("forecast accuracy is between 0 and 100", () => {
    const data = generateRollingForecastData("revenue");
    const accuracy = computeForecastAccuracy(data, "q1");
    expect(accuracy).toBeGreaterThan(0);
    expect(accuracy).toBeLessThanOrEqual(100);
  });

  it("works for different metrics", () => {
    const revenueData = generateRollingForecastData("revenue");
    const ebitdaData = generateRollingForecastData("ebitda");
    // EBITDA should have smaller values than revenue
    expect(ebitdaData[0].budget).toBeLessThan(revenueData[0].budget);
  });
});

// ── Scenario Comparison Tests ───────────────────────────────────

describe("Scenario Comparison", () => {
  it("best case > base case > worst case for revenue", () => {
    const best = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: 0.2,
      costReduction: 0.1,
      headcountChange: 0,
      marketingSpend: 0.1,
    });
    const worst = computeScenarioKPIs(BASE_KPIS, {
      revenueChange: -0.15,
      costReduction: -0.05,
      headcountChange: 0.1,
      marketingSpend: -0.2,
    });

    expect(best.revenue).toBeGreaterThan(BASE_KPIS.revenue);
    expect(worst.revenue).toBeLessThan(BASE_KPIS.revenue);
    expect(best.revenue).toBeGreaterThan(worst.revenue);
  });

  it("generates monthly comparison data with 12 months", () => {
    const data = generateScenarioComparisonData(
      BASE_KPIS,
      { revenueChange: 0.2, costReduction: 0.1, headcountChange: 0, marketingSpend: 0.1 },
      { revenueChange: -0.15, costReduction: -0.05, headcountChange: 0.1, marketingSpend: -0.2 },
      "revenue"
    );
    expect(data).toHaveLength(12);
    // Best > Base > Worst for each month
    for (const month of data) {
      expect(month.bestCase).toBeGreaterThan(month.worstCase);
    }
  });

  it("comparison data best > base for positive revenue change", () => {
    const data = generateScenarioComparisonData(
      BASE_KPIS,
      { revenueChange: 0.2, costReduction: 0, headcountChange: 0, marketingSpend: 0 },
      { revenueChange: -0.1, costReduction: 0, headcountChange: 0, marketingSpend: 0 },
      "revenue"
    );
    for (const month of data) {
      expect(month.bestCase).toBeGreaterThan(month.baseCase);
      expect(month.baseCase).toBeGreaterThan(month.worstCase);
    }
  });
});

// ── Goal Seek Convergence ───────────────────────────────────────

describe("Goal Seek Convergence", () => {
  it("converges for linear revenue-to-profit model", () => {
    const result = goalSeek(
      1000000,
      500000,
      (revenue) => revenue * 0.3 - 50000
    );
    expect(result.found).toBe(true);
    // Expected: (500000 + 50000) / 0.3 ≈ 1833333
    expect(Math.abs(result.requiredInput - 1833333)).toBeLessThan(20000);
  });

  it("converges within reasonable iterations", () => {
    const result = goalSeek(
      1000000,
      250000,
      (revenue) => revenue * 0.2
    );
    expect(result.found).toBe(true);
    expect(result.iterations).toBeLessThan(50);
  });
});
