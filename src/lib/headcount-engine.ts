/**
 * Headcount planning engine.
 * Calculates monthly and annual costs for planned hires across departments.
 */

export interface PlannedHire {
  id: string;
  department: string;
  role: string;
  startMonth: number; // 1-12
  annualSalary: number;
}

export interface MonthlyHeadcountCost {
  month: string;
  headcount: number;
  salaryCost: number;
  benefitsCost: number;
  equipmentCost: number;
  officeCost: number;
  totalCost: number;
}

export interface AnnualHeadcountSummary {
  totalCost: number;
  avgCostPerEmployee: number;
  totalHires: number;
}

export interface DepartmentSummary {
  department: string;
  currentHC: number;
  plannedHires: number;
  yearEndHC: number;
  totalCost: number;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Calculate monthly headcount costs for all planned hires.
 *
 * Rules:
 * - Salary: annualSalary / 12 for each month the employee is active (startMonth..12)
 * - Benefits: 25% of salary cost (same months)
 * - Equipment: one-time cost in the start month
 * - Office: per-person per-month cost for each active employee
 */
export function calculateHeadcountCosts(
  currentHeadcount: Record<string, number>,
  plannedHires: PlannedHire[],
  benefitsRate: number = 0.25,
  equipmentCostPerHire: number = 2000,
  officeCostPerPerson: number = 500
): {
  monthly: MonthlyHeadcountCost[];
  annual: AnnualHeadcountSummary;
  byDepartment: DepartmentSummary[];
} {
  const totalCurrentHC = Object.values(currentHeadcount).reduce((s, v) => s + v, 0);

  const monthly: MonthlyHeadcountCost[] = [];

  for (let m = 1; m <= 12; m++) {
    // Active new hires this month: those whose startMonth <= m
    const activeHires = plannedHires.filter((h) => h.startMonth <= m);
    // New hires starting exactly this month
    const newHiresThisMonth = plannedHires.filter((h) => h.startMonth === m);

    const headcount = totalCurrentHC + activeHires.length;

    // Salary: sum of (annualSalary / 12) for each active hire
    const salaryCost = activeHires.reduce((s, h) => s + h.annualSalary / 12, 0);

    // Benefits: benefitsRate * salary
    const benefitsCost = salaryCost * benefitsRate;

    // Equipment: one-time for new hires this month
    const equipmentCost = newHiresThisMonth.length * equipmentCostPerHire;

    // Office: per-person for all active new hires
    const officeCost = activeHires.length * officeCostPerPerson;

    const totalCost = salaryCost + benefitsCost + equipmentCost + officeCost;

    monthly.push({
      month: MONTH_NAMES[m - 1],
      headcount,
      salaryCost: Math.round(salaryCost * 100) / 100,
      benefitsCost: Math.round(benefitsCost * 100) / 100,
      equipmentCost: Math.round(equipmentCost * 100) / 100,
      officeCost: Math.round(officeCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    });
  }

  const totalCost = monthly.reduce((s, m) => s + m.totalCost, 0);
  const yearEndHC = monthly[11]?.headcount ?? totalCurrentHC;
  const avgCostPerEmployee =
    yearEndHC > 0 ? totalCost / yearEndHC : 0;

  // By department
  const departments = new Set([
    ...Object.keys(currentHeadcount),
    ...plannedHires.map((h) => h.department),
  ]);

  const byDepartment: DepartmentSummary[] = [...departments].map((dept) => {
    const currentHC = currentHeadcount[dept] || 0;
    const deptHires = plannedHires.filter((h) => h.department === dept);
    const deptPlannedCount = deptHires.length;

    // Cost for this department's new hires
    let deptCost = 0;
    for (let m = 1; m <= 12; m++) {
      const activeHires = deptHires.filter((h) => h.startMonth <= m);
      const newThisMonth = deptHires.filter((h) => h.startMonth === m);
      const salary = activeHires.reduce((s, h) => s + h.annualSalary / 12, 0);
      const benefits = salary * benefitsRate;
      const equipment = newThisMonth.length * equipmentCostPerHire;
      const office = activeHires.length * officeCostPerPerson;
      deptCost += salary + benefits + equipment + office;
    }

    return {
      department: dept,
      currentHC,
      plannedHires: deptPlannedCount,
      yearEndHC: currentHC + deptPlannedCount,
      totalCost: Math.round(deptCost * 100) / 100,
    };
  });

  return {
    monthly,
    annual: {
      totalCost: Math.round(totalCost * 100) / 100,
      avgCostPerEmployee: Math.round(avgCostPerEmployee * 100) / 100,
      totalHires: plannedHires.length,
    },
    byDepartment,
  };
}
