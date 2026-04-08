import { describe, it, expect } from "vitest";
import {
  calculateHeadcountCosts,
  type PlannedHire,
} from "../lib/headcount-engine";

describe("Headcount Engine", () => {
  const defaultCurrent: Record<string, number> = {
    Engineering: 10,
    Sales: 5,
  };

  it("calculates cost for a single hire starting in January", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 120000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);

    // 12 months active: salary = 120000, benefits = 30000, equipment = 2000, office = 12*500 = 6000
    // Total = 120000 + 30000 + 2000 + 6000 = 158000
    expect(result.annual.totalCost).toBeCloseTo(158000, 0);
    expect(result.annual.totalHires).toBe(1);
  });

  it("benefits equal 25% of salary cost", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 100000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires, 0.25);

    const totalBenefits = result.monthly.reduce((s, m) => s + m.benefitsCost, 0);
    const totalSalary = result.monthly.reduce((s, m) => s + m.salaryCost, 0);
    // Benefits should be exactly 25% of salary
    expect(totalBenefits).toBeCloseTo(totalSalary * 0.25, 0);
  });

  it("equipment is a one-time cost in the start month only", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 3, annualSalary: 100000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);

    // Equipment should only appear in March (index 2)
    expect(result.monthly[2].equipmentCost).toBe(2000);
    // No equipment in other months
    for (let i = 0; i < 12; i++) {
      if (i !== 2) {
        expect(result.monthly[i].equipmentCost).toBe(0);
      }
    }
  });

  it("office cost accumulates with active employees", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 100000 },
      { id: "2", department: "Engineering", role: "Engineer", startMonth: 6, annualSalary: 100000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires, 0.25, 2000, 500);

    // January: 1 active hire -> office = 500
    expect(result.monthly[0].officeCost).toBe(500);
    // June: 2 active hires -> office = 1000
    expect(result.monthly[5].officeCost).toBe(1000);
    // December: 2 active hires -> office = 1000
    expect(result.monthly[11].officeCost).toBe(1000);
  });

  it("handles multiple departments correctly", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 100000 },
      { id: "2", department: "Sales", role: "Sales Rep", startMonth: 1, annualSalary: 80000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);

    expect(result.byDepartment.length).toBe(2);

    const eng = result.byDepartment.find((d) => d.department === "Engineering");
    const sales = result.byDepartment.find((d) => d.department === "Sales");
    expect(eng).toBeDefined();
    expect(sales).toBeDefined();
    expect(eng!.plannedHires).toBe(1);
    expect(sales!.plannedHires).toBe(1);
    expect(eng!.yearEndHC).toBe(11);
    expect(sales!.yearEndHC).toBe(6);
  });

  it("annual total sums monthly totals correctly", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 120000 },
      { id: "2", department: "Engineering", role: "Engineer", startMonth: 6, annualSalary: 100000 },
      { id: "3", department: "Sales", role: "Sales Rep", startMonth: 3, annualSalary: 80000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);

    const monthlySum = result.monthly.reduce((s, m) => s + m.totalCost, 0);
    expect(result.annual.totalCost).toBeCloseTo(monthlySum, 0);
  });

  it("hire starting in December only has 1 month of salary", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 12, annualSalary: 120000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);

    // Only December should have salary
    for (let i = 0; i < 11; i++) {
      expect(result.monthly[i].salaryCost).toBe(0);
    }
    // December salary: 120000 / 12 = 10000
    expect(result.monthly[11].salaryCost).toBeCloseTo(10000, 0);
  });

  it("headcount increases as hires start", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 100000 },
      { id: "2", department: "Engineering", role: "Engineer", startMonth: 6, annualSalary: 100000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);

    // Total current = 15
    // Jan-May: 15 + 1 = 16
    expect(result.monthly[0].headcount).toBe(16);
    expect(result.monthly[4].headcount).toBe(16);
    // Jun-Dec: 15 + 2 = 17
    expect(result.monthly[5].headcount).toBe(17);
    expect(result.monthly[11].headcount).toBe(17);
  });

  it("returns empty costs with no hires", () => {
    const result = calculateHeadcountCosts(defaultCurrent, []);

    expect(result.annual.totalCost).toBe(0);
    expect(result.annual.totalHires).toBe(0);
    // Headcount should stay at current
    expect(result.monthly[0].headcount).toBe(15);
    expect(result.monthly[11].headcount).toBe(15);
  });

  it("department summary totalCost matches sum of department monthly costs", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 100000 },
      { id: "2", department: "Sales", role: "Sales Rep", startMonth: 3, annualSalary: 80000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);

    const deptTotalSum = result.byDepartment.reduce((s, d) => s + d.totalCost, 0);
    expect(deptTotalSum).toBeCloseTo(result.annual.totalCost, 0);
  });
});
