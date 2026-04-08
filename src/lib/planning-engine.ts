/**
 * Planning engine utilities for scenario modeling, budget building,
 * variance analysis, and goal seeking.
 */

// ── Scenario Engine ──────────────────────────────────────────────

export interface ScenarioAssumptions {
  revenueChange: number;   // -0.5 to 0.5
  costReduction: number;   // -0.3 to 0.3
  headcountChange: number; // -0.2 to 0.2
  marketingSpend: number;  // -0.5 to 0.5
}

export interface ScenarioKPIs {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  opEx: number;
  marketing: number;
  ebitda: number;
  ebitdaMargin: number;
  netIncome: number;
  netMargin: number;
}

export function computeScenarioKPIs(
  base: ScenarioKPIs,
  assumptions: ScenarioAssumptions
): ScenarioKPIs {
  const revenue = base.revenue * (1 + assumptions.revenueChange);
  const cogs = base.cogs * (1 - assumptions.costReduction);
  const grossProfit = revenue - cogs;
  const grossMargin = revenue !== 0 ? (grossProfit / revenue) * 100 : 0;

  const marketing = base.marketing * (1 + assumptions.marketingSpend);
  const otherOpEx = (base.opEx - base.marketing) * (1 + assumptions.headcountChange);
  const opEx = marketing + otherOpEx;
  const ebitda = grossProfit - opEx;
  const ebitdaMargin = revenue !== 0 ? (ebitda / revenue) * 100 : 0;

  // Simplified: Net Income = EBITDA minus a fixed percentage for D&A, interest, tax
  const daInterestTax = base.revenue !== 0
    ? (base.revenue - base.netIncome - (base.revenue - base.cogs - base.opEx - (base.revenue - base.cogs - base.opEx - base.ebitda))) * (revenue / base.revenue)
    : 0;
  // Simpler approximation:
  const overhead = base.ebitda - base.netIncome; // D&A + interest + tax from base
  const netIncome = ebitda - overhead;
  const netMargin = revenue !== 0 ? (netIncome / revenue) * 100 : 0;

  return {
    revenue: Math.round(revenue),
    cogs: Math.round(cogs),
    grossProfit: Math.round(grossProfit),
    grossMargin: Math.round(grossMargin * 10) / 10,
    opEx: Math.round(opEx),
    marketing: Math.round(marketing),
    ebitda: Math.round(ebitda),
    ebitdaMargin: Math.round(ebitdaMargin * 10) / 10,
    netIncome: Math.round(netIncome),
    netMargin: Math.round(netMargin * 10) / 10,
  };
}

// ── Budget Builder ───────────────────────────────────────────────

export type AllocationBasis = "equal" | "by-headcount" | "by-revenue" | "custom";

export interface Department {
  name: string;
  headcount: number;
  revenue: number;
  customPercent: number;
}

export interface BudgetAllocation {
  department: string;
  annual: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  percentOfTotal: number;
}

export function allocateBudgetTopDown(
  totalBudget: number,
  departments: Department[],
  basis: AllocationBasis,
  quarterlySplit?: [number, number, number, number]
): BudgetAllocation[] {
  const split = quarterlySplit || [25, 25, 25, 25];

  return departments.map((dept) => {
    let share: number;
    switch (basis) {
      case "equal":
        share = totalBudget / departments.length;
        break;
      case "by-headcount": {
        const totalHC = departments.reduce((s, d) => s + d.headcount, 0);
        share = totalHC > 0 ? (dept.headcount / totalHC) * totalBudget : 0;
        break;
      }
      case "by-revenue": {
        const totalRev = departments.reduce((s, d) => s + d.revenue, 0);
        share = totalRev > 0 ? (dept.revenue / totalRev) * totalBudget : 0;
        break;
      }
      case "custom":
        share = (dept.customPercent / 100) * totalBudget;
        break;
      default:
        share = totalBudget / departments.length;
    }

    const annual = Math.round(share);
    return {
      department: dept.name,
      annual,
      q1: Math.round(annual * split[0] / 100),
      q2: Math.round(annual * split[1] / 100),
      q3: Math.round(annual * split[2] / 100),
      q4: Math.round(annual * split[3] / 100),
      percentOfTotal: totalBudget > 0 ? Math.round((annual / totalBudget) * 1000) / 10 : 0,
    };
  });
}

// ── Variance Analysis ────────────────────────────────────────────

export interface VarianceItem {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: "Favorable" | "Unfavorable";
}

export interface VarianceSummary {
  items: VarianceItem[];
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercent: number;
  topDrivers: { category: string; variance: number; variancePercent: number }[];
}

export function computeVariance(
  budgetData: Record<string, string>[],
  actualData: Record<string, string>[],
  categoryCol: string,
  valueCol: string,
  isCostMetric: boolean = false
): VarianceSummary {
  // Aggregate by category
  const budgetMap = new Map<string, number>();
  const actualMap = new Map<string, number>();

  for (const row of budgetData) {
    const cat = row[categoryCol] ?? "";
    const val = Number(row[valueCol] || 0);
    budgetMap.set(cat, (budgetMap.get(cat) || 0) + val);
  }

  for (const row of actualData) {
    const cat = row[categoryCol] ?? "";
    const val = Number(row[valueCol] || 0);
    actualMap.set(cat, (actualMap.get(cat) || 0) + val);
  }

  const allCategories = new Set([...budgetMap.keys(), ...actualMap.keys()]);
  const items: VarianceItem[] = [];

  for (const cat of allCategories) {
    const budget = budgetMap.get(cat) || 0;
    const actual = actualMap.get(cat) || 0;
    const variance = actual - budget;
    const variancePercent = budget !== 0 ? (variance / Math.abs(budget)) * 100 : 0;

    // For cost metrics: over budget is unfavorable
    // For revenue metrics: under budget is unfavorable
    const isFavorable = isCostMetric ? variance <= 0 : variance >= 0;

    items.push({
      category: cat,
      budget: Math.round(budget),
      actual: Math.round(actual),
      variance: Math.round(variance),
      variancePercent: Math.round(variancePercent * 10) / 10,
      status: isFavorable ? "Favorable" : "Unfavorable",
    });
  }

  const totalBudget = items.reduce((s, i) => s + i.budget, 0);
  const totalActual = items.reduce((s, i) => s + i.actual, 0);
  const totalVariance = totalActual - totalBudget;
  const totalVariancePercent = totalBudget !== 0 ? Math.round((totalVariance / Math.abs(totalBudget)) * 1000) / 10 : 0;

  // Top drivers sorted by absolute variance
  const topDrivers = [...items]
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .slice(0, 3)
    .map(i => ({
      category: i.category,
      variance: i.variance,
      variancePercent: i.variancePercent,
    }));

  return {
    items,
    totalBudget,
    totalActual,
    totalVariance,
    totalVariancePercent,
    topDrivers,
  };
}

// ── Goal Seek ────────────────────────────────────────────────────

export interface GoalSeekResult {
  found: boolean;
  targetValue: number;
  requiredInput: number;
  currentInput: number;
  changePercent: number;
  iterations: number;
}

/**
 * Simple binary search goal seek.
 * Given a function f(input) => output, find the input that makes output = target.
 */
export function goalSeek(
  currentInput: number,
  targetOutput: number,
  computeOutput: (input: number) => number,
  maxIterations: number = 100,
  tolerance: number = 0.001
): GoalSeekResult {
  // Determine search bounds: try a wide range
  let low = currentInput * -2;
  let high = currentInput * 3;

  // Ensure bounds are meaningful
  if (low === high) {
    low = -1000000;
    high = 1000000;
  }
  if (low > high) {
    const tmp = low;
    low = high;
    high = tmp;
  }

  // Determine direction: does increasing input increase output?
  const outputAtLow = computeOutput(low);
  const outputAtHigh = computeOutput(high);
  const increasing = outputAtHigh > outputAtLow;

  let iterations = 0;
  let mid = currentInput;

  for (let i = 0; i < maxIterations; i++) {
    iterations++;
    mid = (low + high) / 2;
    const output = computeOutput(mid);
    const error = Math.abs(output - targetOutput);
    const relError = targetOutput !== 0 ? error / Math.abs(targetOutput) : error;

    if (relError < tolerance) {
      return {
        found: true,
        targetValue: targetOutput,
        requiredInput: Math.round(mid),
        currentInput: Math.round(currentInput),
        changePercent: currentInput !== 0
          ? Math.round(((mid - currentInput) / Math.abs(currentInput)) * 1000) / 10
          : 0,
        iterations,
      };
    }

    if ((increasing && output < targetOutput) || (!increasing && output > targetOutput)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return {
    found: false,
    targetValue: targetOutput,
    requiredInput: Math.round(mid),
    currentInput: Math.round(currentInput),
    changePercent: currentInput !== 0
      ? Math.round(((mid - currentInput) / Math.abs(currentInput)) * 1000) / 10
      : 0,
    iterations,
  };
}
