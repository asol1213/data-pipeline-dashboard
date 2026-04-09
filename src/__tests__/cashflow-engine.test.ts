import { describe, it, expect } from "vitest";
import { projectCashFlow, type CashFlowInput } from "../lib/cashflow-engine";

const makeInput = (overrides?: Partial<CashFlowInput>): CashFlowInput => ({
  startingCash: 1000000,
  monthlyRevenue: Array(12).fill(100000),
  monthlyCOGS: Array(12).fill(40000),
  monthlySalaries: Array(12).fill(50000),
  monthlyFixedCosts: 10000,
  collectionDays: 0,
  paymentDays: 0,
  ...overrides,
});

describe("Cash Flow Engine - projectCashFlow comprehensive", () => {
  it("generates exactly 12 months", () => {
    const result = projectCashFlow(makeInput());
    expect(result.monthly).toHaveLength(12);
  });

  it("month names are correct", () => {
    const result = projectCashFlow(makeInput());
    const names = result.monthly.map((m) => m.month);
    expect(names).toEqual([
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]);
  });

  it("collection delay shifts revenue to later months", () => {
    const result = projectCashFlow(
      makeInput({ collectionDays: 60 })
    );
    // 60 days = 2 month delay, so Jan and Feb have no revenue
    expect(result.monthly[0].cashIn).toBe(0);
    expect(result.monthly[1].cashIn).toBe(0);
    // March gets January's revenue
    expect(result.monthly[2].cashIn).toBe(100000);
  });

  it("negative balance detection works", () => {
    const result = projectCashFlow(
      makeInput({
        startingCash: 50000,
        monthlyRevenue: Array(12).fill(0),
      })
    );
    const negativeMonths = result.monthly.filter((m) => m.status === "negative");
    expect(negativeMonths.length).toBeGreaterThan(0);
    expect(result.lowestBalance).toBeLessThan(0);
  });

  it("burn rate is calculated as average monthly net cash flow", () => {
    const result = projectCashFlow(
      makeInput({
        monthlyRevenue: Array(12).fill(80000),
      })
    );
    // Net each month = 80K - 100K = -20K
    expect(result.burnRate).toBe(-20000);
  });

  it("runway calculation when burning cash", () => {
    const result = projectCashFlow(
      makeInput({
        monthlyRevenue: Array(12).fill(80000),
      })
    );
    expect(result.burnRate).toBeLessThan(0);
    expect(result.runwayMonths).toBeGreaterThan(0);
    expect(result.runwayMonths).toBeLessThan(999);
  });

  it("infinite runway when not burning cash", () => {
    const result = projectCashFlow(
      makeInput({
        monthlyRevenue: Array(12).fill(200000),
      })
    );
    expect(result.runwayMonths).toBe(999);
  });

  it("lowest balance and month are tracked", () => {
    const result = projectCashFlow(
      makeInput({
        monthlyRevenue: [
          100000, 90000, 80000, 70000, 60000, 50000,
          50000, 60000, 70000, 80000, 90000, 100000,
        ],
      })
    );
    expect(result.lowestMonth).toBeTruthy();
    expect(typeof result.lowestBalance).toBe("number");
  });

  it("all values are rounded to integers", () => {
    const result = projectCashFlow(makeInput());
    for (const m of result.monthly) {
      expect(Number.isInteger(m.cashIn)).toBe(true);
      expect(Number.isInteger(m.cashOut)).toBe(true);
      expect(Number.isInteger(m.netCashFlow)).toBe(true);
      expect(Number.isInteger(m.cashBalance)).toBe(true);
    }
  });
});
