import { describe, it, expect } from "vitest";
import {
  calculateHeadcountCosts,
  type PlannedHire,
} from "../lib/headcount-engine";

describe("Headcount Engine - comprehensive", () => {
  const defaultCurrent: Record<string, number> = {
    Engineering: 10,
    Sales: 5,
  };

  it("calculates cost for a single hire", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 120000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);
    expect(result.annual.totalCost).toBeGreaterThan(0);
    expect(result.annual.totalHires).toBe(1);
    // 12 months: salary=120K, benefits=30K, equipment=2K, office=12*500=6K => 158K
    expect(result.annual.totalCost).toBeCloseTo(158000, 0);
  });

  it("benefits equal 25% of salary cost", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 100000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires, 0.25);
    const totalBenefits = result.monthly.reduce((s, m) => s + m.benefitsCost, 0);
    const totalSalary = result.monthly.reduce((s, m) => s + m.salaryCost, 0);
    expect(totalBenefits).toBeCloseTo(totalSalary * 0.25, 0);
  });

  it("equipment is one-time cost in start month only", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 6, annualSalary: 100000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);
    expect(result.monthly[5].equipmentCost).toBe(2000); // June = index 5
    for (let i = 0; i < 12; i++) {
      if (i !== 5) {
        expect(result.monthly[i].equipmentCost).toBe(0);
      }
    }
  });

  it("multiple departments tracked separately", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 100000 },
      { id: "2", department: "Sales", role: "Sales Rep", startMonth: 1, annualSalary: 80000 },
      { id: "3", department: "Marketing", role: "Marketer", startMonth: 3, annualSalary: 90000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);
    expect(result.byDepartment.length).toBe(3); // Eng, Sales, Marketing
    const eng = result.byDepartment.find((d) => d.department === "Engineering");
    expect(eng!.plannedHires).toBe(1);
    expect(eng!.yearEndHC).toBe(11);
  });

  it("custom benefits rate works", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 100000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires, 0.30);
    const totalBenefits = result.monthly.reduce((s, m) => s + m.benefitsCost, 0);
    const totalSalary = result.monthly.reduce((s, m) => s + m.salaryCost, 0);
    expect(totalBenefits).toBeCloseTo(totalSalary * 0.30, 0);
  });

  it("avgCostPerEmployee calculated from total cost and year-end headcount", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 120000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);
    // year-end HC = 15 + 1 = 16
    expect(result.annual.avgCostPerEmployee).toBeCloseTo(result.annual.totalCost / 16, 0);
  });

  it("monthly headcount includes current employees plus active hires", () => {
    const hires: PlannedHire[] = [
      { id: "1", department: "Engineering", role: "Engineer", startMonth: 1, annualSalary: 100000 },
      { id: "2", department: "Engineering", role: "Engineer", startMonth: 7, annualSalary: 100000 },
    ];
    const result = calculateHeadcountCosts(defaultCurrent, hires);
    // Total current = 15
    expect(result.monthly[0].headcount).toBe(16); // Jan: +1
    expect(result.monthly[6].headcount).toBe(17); // Jul: +2
    expect(result.monthly[11].headcount).toBe(17); // Dec: +2
  });

  it("no hires results in zero costs", () => {
    const result = calculateHeadcountCosts(defaultCurrent, []);
    expect(result.annual.totalCost).toBe(0);
    expect(result.annual.totalHires).toBe(0);
  });
});
