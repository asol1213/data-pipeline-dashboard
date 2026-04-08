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

// ── P&L Simulator ───────────────────────────────────────────────

export interface PnLLineItem {
  id: string;
  label: string;
  baseValue: number;
  adjustmentPct: number; // -0.5 to 1.0
  simulatedValue: number;
  editable: boolean;
  isPercent: boolean;
  formula?: string;
  indent?: number;
}

export interface PnLSimulatorState {
  items: PnLLineItem[];
}

const DEFAULT_BASE_VALUES = {
  revenue: 12000000,
  cogs: 5100000,      // ~42.5% of revenue
  marketing: 600000,
  rnd: 900000,
  ga: 450000,
  salaries: 1800000,
  depreciation: 300000,
  interest: 120000,
};

export function createDefaultPnLState(): PnLSimulatorState {
  return recalcPnL(buildPnLItems(DEFAULT_BASE_VALUES));
}

export function buildPnLItems(base: typeof DEFAULT_BASE_VALUES): PnLSimulatorState {
  const items: PnLLineItem[] = [
    { id: "revenue", label: "Revenue", baseValue: base.revenue, adjustmentPct: 0, simulatedValue: base.revenue, editable: true, isPercent: false, formula: "Root driver" },
    { id: "cogs", label: "COGS", baseValue: base.cogs, adjustmentPct: 0, simulatedValue: base.cogs, editable: false, isPercent: false, formula: "~42.5% of Revenue", indent: 1 },
    { id: "grossProfit", label: "Gross Profit", baseValue: 0, adjustmentPct: 0, simulatedValue: 0, editable: false, isPercent: false, formula: "Revenue - COGS" },
    { id: "grossMargin", label: "Gross Margin %", baseValue: 0, adjustmentPct: 0, simulatedValue: 0, editable: false, isPercent: true, formula: "Gross Profit / Revenue" },
    { id: "marketing", label: "Marketing", baseValue: base.marketing, adjustmentPct: 0, simulatedValue: base.marketing, editable: true, isPercent: false, indent: 1 },
    { id: "rnd", label: "R&D", baseValue: base.rnd, adjustmentPct: 0, simulatedValue: base.rnd, editable: true, isPercent: false, indent: 1 },
    { id: "ga", label: "G&A", baseValue: base.ga, adjustmentPct: 0, simulatedValue: base.ga, editable: true, isPercent: false, indent: 1 },
    { id: "salaries", label: "Salaries", baseValue: base.salaries, adjustmentPct: 0, simulatedValue: base.salaries, editable: true, isPercent: false, formula: "Scales with Headcount", indent: 1 },
    { id: "ebitda", label: "EBITDA", baseValue: 0, adjustmentPct: 0, simulatedValue: 0, editable: false, isPercent: false, formula: "Gross Profit - all OpEx" },
    { id: "ebitdaMargin", label: "EBITDA Margin %", baseValue: 0, adjustmentPct: 0, simulatedValue: 0, editable: false, isPercent: true, formula: "EBITDA / Revenue" },
    { id: "depreciation", label: "Depreciation", baseValue: base.depreciation, adjustmentPct: 0, simulatedValue: base.depreciation, editable: false, isPercent: false, formula: "Fixed", indent: 1 },
    { id: "ebit", label: "EBIT", baseValue: 0, adjustmentPct: 0, simulatedValue: 0, editable: false, isPercent: false, formula: "EBITDA - Depreciation" },
    { id: "interest", label: "Interest", baseValue: base.interest, adjustmentPct: 0, simulatedValue: base.interest, editable: false, isPercent: false, formula: "Fixed", indent: 1 },
    { id: "tax", label: "Tax (25%)", baseValue: 0, adjustmentPct: 0, simulatedValue: 0, editable: false, isPercent: false, formula: "25% of pre-tax income" },
    { id: "netIncome", label: "Net Income", baseValue: 0, adjustmentPct: 0, simulatedValue: 0, editable: false, isPercent: false, formula: "EBIT - Interest - Tax" },
    { id: "netMargin", label: "Net Margin %", baseValue: 0, adjustmentPct: 0, simulatedValue: 0, editable: false, isPercent: true, formula: "Net Income / Revenue" },
  ];
  return { items };
}

export function recalcPnL(state: PnLSimulatorState): PnLSimulatorState {
  const map = new Map<string, PnLLineItem>();
  for (const item of state.items) {
    map.set(item.id, { ...item });
  }

  const get = (id: string) => map.get(id)!;

  // Apply adjustments to editable items
  const revenue = get("revenue");
  revenue.simulatedValue = Math.round(revenue.baseValue * (1 + revenue.adjustmentPct));

  // COGS scales with revenue (~42.5%)
  const cogs = get("cogs");
  const cogsRatio = cogs.baseValue / get("revenue").baseValue; // preserve original ratio
  cogs.simulatedValue = Math.round(revenue.simulatedValue * cogsRatio);

  // Gross Profit
  const gp = get("grossProfit");
  gp.baseValue = get("revenue").baseValue - get("cogs").baseValue;
  gp.simulatedValue = revenue.simulatedValue - cogs.simulatedValue;

  // Gross Margin %
  const gm = get("grossMargin");
  gm.baseValue = get("revenue").baseValue !== 0 ? Math.round((gp.baseValue / get("revenue").baseValue) * 1000) / 10 : 0;
  gm.simulatedValue = revenue.simulatedValue !== 0 ? Math.round((gp.simulatedValue / revenue.simulatedValue) * 1000) / 10 : 0;

  // Editable OpEx items
  for (const id of ["marketing", "rnd", "ga", "salaries"]) {
    const item = get(id);
    item.simulatedValue = Math.round(item.baseValue * (1 + item.adjustmentPct));
  }

  // EBITDA
  const totalOpEx = get("marketing").simulatedValue + get("rnd").simulatedValue + get("ga").simulatedValue + get("salaries").simulatedValue;
  const baseOpEx = get("marketing").baseValue + get("rnd").baseValue + get("ga").baseValue + get("salaries").baseValue;
  const ebitda = get("ebitda");
  ebitda.baseValue = gp.baseValue - baseOpEx;
  ebitda.simulatedValue = gp.simulatedValue - totalOpEx;

  // EBITDA Margin %
  const em = get("ebitdaMargin");
  em.baseValue = get("revenue").baseValue !== 0 ? Math.round((ebitda.baseValue / get("revenue").baseValue) * 1000) / 10 : 0;
  em.simulatedValue = revenue.simulatedValue !== 0 ? Math.round((ebitda.simulatedValue / revenue.simulatedValue) * 1000) / 10 : 0;

  // Depreciation (fixed)
  const dep = get("depreciation");
  dep.simulatedValue = dep.baseValue;

  // EBIT
  const ebit = get("ebit");
  ebit.baseValue = ebitda.baseValue - dep.baseValue;
  ebit.simulatedValue = ebitda.simulatedValue - dep.simulatedValue;

  // Interest (fixed)
  const interest = get("interest");
  interest.simulatedValue = interest.baseValue;

  // Tax (25% of pre-tax income)
  const preTax = ebit.simulatedValue - interest.simulatedValue;
  const basePretax = ebit.baseValue - interest.baseValue;
  const tax = get("tax");
  tax.baseValue = Math.round(Math.max(0, basePretax) * 0.25);
  tax.simulatedValue = Math.round(Math.max(0, preTax) * 0.25);

  // Net Income
  const ni = get("netIncome");
  ni.baseValue = basePretax - tax.baseValue;
  ni.simulatedValue = preTax - tax.simulatedValue;

  // Net Margin %
  const nm = get("netMargin");
  nm.baseValue = get("revenue").baseValue !== 0 ? Math.round((ni.baseValue / get("revenue").baseValue) * 1000) / 10 : 0;
  nm.simulatedValue = revenue.simulatedValue !== 0 ? Math.round((ni.simulatedValue / revenue.simulatedValue) * 1000) / 10 : 0;

  return {
    items: state.items.map(item => map.get(item.id)!),
  };
}

export function adjustPnLItem(state: PnLSimulatorState, itemId: string, adjustmentPct: number): PnLSimulatorState {
  const newState = {
    items: state.items.map(item =>
      item.id === itemId ? { ...item, adjustmentPct } : item
    ),
  };
  return recalcPnL(newState);
}

export interface ImpactTrailEntry {
  label: string;
  delta: number;
}

export function computeImpactTrail(before: PnLSimulatorState, after: PnLSimulatorState): ImpactTrailEntry[] {
  const trail: ImpactTrailEntry[] = [];
  const keyItems = ["revenue", "grossProfit", "ebitda", "netIncome"];
  for (const id of keyItems) {
    const prev = before.items.find(i => i.id === id);
    const next = after.items.find(i => i.id === id);
    if (prev && next && Math.abs(next.simulatedValue - prev.simulatedValue) > 0.5) {
      trail.push({
        label: next.label,
        delta: Math.round(next.simulatedValue - prev.simulatedValue),
      });
    }
  }
  return trail;
}

// ── Rolling Forecast ────────────────────────────────────────────

export interface RollingForecastMonth {
  month: string;
  budget: number;
  forecast_q1: number;
  forecast_q2: number;
  forecast_q3: number;
  actual: number;
}

export function generateRollingForecastData(
  metric: "revenue" | "ebitda" | "netIncome" = "revenue"
): RollingForecastMonth[] {
  // Base values per metric (monthly)
  const bases: Record<string, number> = {
    revenue: 1000000,
    ebitda: 300000,
    netIncome: 200000,
  };
  const base = bases[metric] || 1000000;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Seasonal pattern multipliers
  const seasonal = [0.85, 0.88, 0.95, 1.0, 1.05, 1.08, 1.02, 0.98, 1.1, 1.15, 1.2, 1.3];

  // Budget: set in January with slight growth trajectory
  const budgetGrowth = 0.02; // 2% month-over-month

  // Actual: real performance with some volatility
  const actualVariance = [0.03, -0.02, 0.05, -0.01, 0.04, 0.02, -0.03, 0.01, 0.06, 0.03, 0.05, 0.08];

  return months.map((month, i) => {
    const seasonalBase = base * seasonal[i];
    const budget = Math.round(base * (1 + budgetGrowth * i));

    // Actual: seasonal + variance
    const actual = Math.round(seasonalBase * (1 + actualVariance[i]));

    // Q1 Forecast (set in April): adjusts based on Q1 actuals, +/- 5%
    const q1Adj = i < 3 ? 0 : (actual > budget ? 0.03 : -0.02);
    const forecast_q1 = i < 3 ? actual : Math.round(budget * (1 + q1Adj) * seasonal[i] / (seasonal[i] || 1));

    // Q2 Forecast (set in July): +/- 10% adjustment
    const q2Adj = i < 6 ? 0 : (actual > budget ? 0.06 : -0.04);
    const forecast_q2 = i < 6 ? actual : Math.round(budget * (1 + q2Adj) * seasonal[i] / (seasonal[i] || 1));

    // Q3 Forecast (set in October): close to actual +/- 3%
    const q3Adj = i < 9 ? 0 : (actual > budget ? 0.02 : -0.01);
    const forecast_q3 = i < 9 ? actual : Math.round(budget * (1 + q3Adj) * seasonal[i] / (seasonal[i] || 1));

    return {
      month,
      budget,
      forecast_q1,
      forecast_q2,
      forecast_q3,
      actual,
    };
  });
}

export function computeForecastAccuracy(data: RollingForecastMonth[], quarter: "q1" | "q2" | "q3"): number {
  // Compare forecast vs actual for the months AFTER the forecast was made
  const forecastKey = `forecast_${quarter}` as keyof RollingForecastMonth;
  const startMonth = quarter === "q1" ? 3 : quarter === "q2" ? 6 : 9;
  const relevantMonths = data.slice(startMonth);

  if (relevantMonths.length === 0) return 0;

  let totalError = 0;
  let totalActual = 0;
  for (const m of relevantMonths) {
    const forecast = m[forecastKey] as number;
    const actual = m.actual;
    totalError += Math.abs(forecast - actual);
    totalActual += Math.abs(actual);
  }

  return totalActual > 0 ? Math.round((1 - totalError / totalActual) * 1000) / 10 : 0;
}

// ── Scenario Comparison ─────────────────────────────────────────

export interface ScenarioComparisonData {
  month: string;
  bestCase: number;
  baseCase: number;
  worstCase: number;
}

export function generateScenarioComparisonData(
  baseKPIs: ScenarioKPIs,
  bestAssumptions: ScenarioAssumptions,
  worstAssumptions: ScenarioAssumptions,
  metric: keyof ScenarioKPIs = "revenue"
): ScenarioComparisonData[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const seasonal = [0.85, 0.88, 0.95, 1.0, 1.05, 1.08, 1.02, 0.98, 1.1, 1.15, 1.2, 1.3];

  const baseVal = baseKPIs[metric] as number;
  const bestKPIs = computeScenarioKPIs(baseKPIs, bestAssumptions);
  const worstKPIs = computeScenarioKPIs(baseKPIs, worstAssumptions);
  const bestVal = bestKPIs[metric] as number;
  const worstVal = worstKPIs[metric] as number;

  // Monthly spread (annual / 12 * seasonal)
  return months.map((month, i) => ({
    month,
    bestCase: Math.round((bestVal / 12) * seasonal[i]),
    baseCase: Math.round((baseVal / 12) * seasonal[i]),
    worstCase: Math.round((worstVal / 12) * seasonal[i]),
  }));
}
