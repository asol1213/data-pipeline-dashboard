/**
 * Cash flow projection engine.
 * Projects 12 months of cash flow based on revenue, costs, and payment terms.
 */

export interface CashFlowInput {
  startingCash: number;
  monthlyRevenue: number[]; // 12 months
  monthlyCOGS: number[]; // 12 months
  monthlySalaries: number[]; // 12 months
  monthlyFixedCosts: number;
  collectionDays: number; // 30, 45, 60, 90
  paymentDays: number; // 30, 45, 60
}

export interface MonthlyCashFlow {
  month: string;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  cashBalance: number;
  status: "positive" | "warning" | "negative";
}

export interface CashFlowProjection {
  monthly: MonthlyCashFlow[];
  burnRate: number;
  runwayMonths: number;
  lowestBalance: number;
  lowestMonth: string;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Project 12 months of cash flow.
 *
 * Cash In: Revenue from month M is collected in month M + ceil(collectionDays / 30).
 *   Revenue from months before the 12-month window (negative index) is assumed as
 *   pre-period receivables that arrive in the window.
 *
 * Cash Out:
 *   - COGS/Supplier costs from month M are paid in month M + ceil(paymentDays / 30).
 *   - Salaries are paid in the same month.
 *   - Fixed costs are paid in the same month.
 */
export function projectCashFlow(input: CashFlowInput): CashFlowProjection {
  const {
    startingCash,
    monthlyRevenue,
    monthlyCOGS,
    monthlySalaries,
    monthlyFixedCosts,
    collectionDays,
    paymentDays,
  } = input;

  // Delay in months (rounded up)
  const collectionDelay = Math.ceil(collectionDays / 30);
  const paymentDelay = Math.ceil(paymentDays / 30);

  const monthly: MonthlyCashFlow[] = [];
  let balance = startingCash;

  for (let m = 0; m < 12; m++) {
    // Cash In: revenue from month (m - collectionDelay) collected now
    const revenueSourceMonth = m - collectionDelay;
    let cashIn = 0;
    if (revenueSourceMonth >= 0 && revenueSourceMonth < 12) {
      cashIn = monthlyRevenue[revenueSourceMonth];
    }
    // If collectionDelay is 0, we collect the current month's revenue immediately
    if (collectionDelay === 0) {
      cashIn = monthlyRevenue[m] ?? 0;
    }

    // Cash Out:
    // 1. COGS from month (m - paymentDelay) paid now
    const cogsSourceMonth = m - paymentDelay;
    let cogsPaid = 0;
    if (paymentDelay === 0) {
      cogsPaid = monthlyCOGS[m] ?? 0;
    } else if (cogsSourceMonth >= 0 && cogsSourceMonth < 12) {
      cogsPaid = monthlyCOGS[cogsSourceMonth];
    }

    // 2. Salaries paid same month
    const salaries = monthlySalaries[m] ?? 0;

    // 3. Fixed costs paid same month
    const fixedCosts = monthlyFixedCosts;

    const cashOut = cogsPaid + salaries + fixedCosts;
    const netCashFlow = cashIn - cashOut;
    balance += netCashFlow;

    let status: "positive" | "warning" | "negative";
    if (balance < 0) {
      status = "negative";
    } else if (balance < startingCash * 0.1) {
      status = "warning";
    } else {
      status = "positive";
    }

    monthly.push({
      month: MONTH_NAMES[m],
      cashIn: Math.round(cashIn),
      cashOut: Math.round(cashOut),
      netCashFlow: Math.round(netCashFlow),
      cashBalance: Math.round(balance),
      status,
    });
  }

  // Burn rate: average monthly net cash flow (negative = burning cash)
  const totalNet = monthly.reduce((s, m) => s + m.netCashFlow, 0);
  const burnRate = Math.round(totalNet / 12);

  // Runway: if burning cash, how many months until cash runs out
  // Use ending balance / monthly burn
  const endingBalance = monthly[11]?.cashBalance ?? startingCash;
  const runwayMonths =
    burnRate < 0 ? Math.max(0, Math.round(endingBalance / Math.abs(burnRate))) : 999;

  // Find lowest balance month
  let lowestBalance = Infinity;
  let lowestMonth = MONTH_NAMES[0];
  for (const m of monthly) {
    if (m.cashBalance < lowestBalance) {
      lowestBalance = m.cashBalance;
      lowestMonth = m.month;
    }
  }

  return {
    monthly,
    burnRate,
    runwayMonths,
    lowestBalance,
    lowestMonth,
  };
}
