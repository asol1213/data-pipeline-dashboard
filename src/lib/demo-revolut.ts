import { SeededRandom, n, nf } from "./demo-datasets";
import type { DemoTable } from "./demo-datasets";

// ── Realistic name generators ──
const FIRST_NAMES = [
  "James", "Emma", "Oliver", "Sophia", "Liam", "Isabella", "Noah", "Mia",
  "Alexander", "Charlotte", "Lucas", "Amelia", "Mason", "Harper", "Ethan",
  "Evelyn", "Sebastian", "Aria", "William", "Luna", "Benjamin", "Chloe",
  "Henry", "Penelope", "Daniel", "Layla", "Michael", "Riley", "Jack",
  "Zoey", "Owen", "Nora", "Samuel", "Lily", "Ryan", "Eleanor", "Nathan",
  "Hannah", "Caleb", "Lillian", "Leo", "Addison", "Isaac", "Aubrey",
  "Thomas", "Ellie", "David", "Stella", "John", "Natalie", "Matteo",
  "Zoe", "Viktor", "Katarina", "Dmitri", "Anastasia", "Pierre", "Marie",
  "Hans", "Greta", "Sven", "Freya", "Carlos", "Sofia", "Ahmed", "Fatima",
  "Kenji", "Yuki", "Wei", "Mei", "Raj", "Priya", "Marco", "Giulia",
  "Patrick", "Aoife", "Nikolai", "Elena", "Lars", "Ingrid", "Andrei", "Ioana",
  "Felix", "Clara", "Tobias", "Katharina", "Moritz", "Leonie", "Jan", "Emilia",
  "Philipp", "Johanna", "Julian", "Miriam", "Stefan", "Andrea", "Markus", "Sabine",
  "Andreas", "Petra", "Frank", "Kerstin", "Matthias", "Stefanie", "Robert", "Melanie",
  "Omar", "Aisha", "Yusuf", "Leila", "Hassan", "Nadia", "Arjun", "Meera",
  "Chen", "Ling", "Zhang", "Xia", "Antoine", "Camille", "Hugo", "Manon",
  "Luca", "Francesca", "Alessandro", "Valentina", "Diego", "Carmen", "Pablo", "Lucia",
  "Richard", "Ashley", "Joseph", "Samantha", "George", "Megan", "Edward", "Lauren",
  "Takashi", "Sakura", "Hiroshi", "Akiko", "Piotr", "Agnieszka", "Tomasz", "Magdalena",
  "Marek", "Ewa", "Krzysztof", "Katarzyna", "Simon", "Amelie", "Max", "Lena",
] as const;

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas", "Moore",
  "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark",
  "Lewis", "Robinson", "Walker", "Young", "King", "Wright", "Scott",
  "Mueller", "Schmidt", "Fischer", "Weber", "Schneider", "Becker", "Hoffmann",
  "Dubois", "Moreau", "Laurent", "Rossi", "Colombo", "Ferrari",
  "Nakamura", "Tanaka", "Chen", "Wang", "Kumar", "Singh", "Petrov",
  "Ivanov", "Johansson", "Lindberg", "Nielsen", "Christensen",
  "O'Brien", "Murphy", "McCarthy", "Fernandez", "Torres", "Al-Rashid",
  "El-Amin", "Kovacs", "Novak", "Popov", "Sato", "Kim", "Park",
  "Schulz", "Koch", "Richter", "Wolf", "Klein", "Schroeder", "Neumann",
  "Schwarz", "Braun", "Krueger", "Werner", "Lange", "Hartmann", "Fuchs",
  "Kelly", "Walsh", "Ryan", "Byrne", "Doyle", "Gallagher",
  "Bernard", "Petit", "Richard", "Durand", "Bianchi", "Romano", "Ricci",
  "Gonzalez", "Lopez", "Hernandez", "Perez", "Sanchez", "Ramirez",
  "Suzuki", "Watanabe", "Takahashi", "Ito", "Yamamoto", "Kobayashi",
  "Nowak", "Kowalski", "Wozniak", "Lewandowski", "Kaminski", "Zielinski",
  "Al-Farsi", "Hassan", "Ibrahim", "Khalil", "Mansour", "Nasser", "Saleh",
  "Patel", "Sharma", "Gupta", "Agarwal", "Mehta", "Joshi",
  "Zhang", "Liu", "Yang", "Huang", "Zhou", "Wu",
] as const;

// ── Product definitions ──

interface ProductDef {
  id: string;
  name: string;
  category: string;
  monthlyFee: number;
  txnFeePct: number;
  launchDate: string;
  activeUsers: number;
  revenueContrib: number;
}

const PRODUCT_DEFS: ProductDef[] = [
  { id: "RP-01", name: "Standard Card", category: "Payments", monthlyFee: 0, txnFeePct: 0.005, launchDate: "2015-07-01", activeUsers: 520000, revenueContrib: 15 },
  { id: "RP-02", name: "Premium Card", category: "Payments", monthlyFee: 7.99, txnFeePct: 0.008, launchDate: "2017-03-15", activeUsers: 180000, revenueContrib: 22 },
  { id: "RP-03", name: "Metal Card", category: "Payments", monthlyFee: 13.99, txnFeePct: 0.01, launchDate: "2018-06-01", activeUsers: 85000, revenueContrib: 18 },
  { id: "RP-04", name: "Crypto Trade", category: "Trading", monthlyFee: 0, txnFeePct: 0.025, launchDate: "2018-01-10", activeUsers: 140000, revenueContrib: 12 },
  { id: "RP-05", name: "Stock Trade", category: "Trading", monthlyFee: 0, txnFeePct: 0.015, launchDate: "2019-08-20", activeUsers: 95000, revenueContrib: 8 },
  { id: "RP-06", name: "Insurance", category: "Insurance", monthlyFee: 0, txnFeePct: 0.03, launchDate: "2020-02-01", activeUsers: 60000, revenueContrib: 10 },
  { id: "RP-07", name: "Vault", category: "Banking", monthlyFee: 0, txnFeePct: 0.005, launchDate: "2017-09-01", activeUsers: 300000, revenueContrib: 5 },
  { id: "RP-08", name: "Send Money", category: "Payments", monthlyFee: 0, txnFeePct: 0.008, launchDate: "2015-07-01", activeUsers: 680000, revenueContrib: 10 },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Main generator ─────────────────────────────────────────────────────────

export function generateRevolutData(): DemoTable[] {
  const rng = new SeededRandom(777_001);

  // ── Products (8 rows) ──
  const products: Record<string, string>[] = PRODUCT_DEFS.map((p) => ({
    Product_ID: p.id,
    Product_Name: p.name,
    Category: p.category,
    Monthly_Fee: nf(p.monthlyFee),
    Transaction_Fee_Pct: nf(p.txnFeePct, 3),
    Launch_Date: p.launchDate,
    Active_Users: n(p.activeUsers),
    Revenue_Contribution_Pct: n(p.revenueContrib),
  }));

  // ── Customers (200 rows) ──
  const countries = ["Germany", "UK", "France", "Ireland", "UAE", "Poland", "Spain", "Italy", "Netherlands", "Austria"] as const;
  const plans = ["Standard", "Plus", "Premium", "Metal", "Business"] as const;
  const planFees: Record<string, number> = { Standard: 0, Plus: 2.99, Premium: 7.99, Metal: 13.99, Business: 25 };
  const ageGroups = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;
  const kycStatuses = ["Verified", "Pending", "Enhanced Due Diligence"] as const;

  const customers: Record<string, string>[] = [];
  for (let i = 1; i <= 200; i++) {
    const cid = `RC-${String(i).padStart(3, "0")}`;
    const plan = rng.pickWeighted(plans, [35, 25, 20, 12, 8]);
    const country = rng.pick(countries);
    const signupDate = rng.dateInRange("2020-01-01", "2025-06-30");
    const nps = rng.nextInt(1, 10);
    const churn = nps <= 3 ? "High" : nps <= 6 ? "Medium" : "Low";
    customers.push({
      Customer_ID: cid,
      Name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
      Signup_Date: signupDate,
      Plan: plan,
      Monthly_Fee: nf(planFees[plan]),
      Country: country,
      Age_Group: rng.pick(ageGroups),
      KYC_Status: rng.pickWeighted(kycStatuses, [80, 12, 8]),
      Lifetime_Value: "0", // filled after transactions
      Churn_Risk: churn,
      NPS_Score: n(nps),
    });
  }

  // ── Transactions (500 rows) ──
  const currencies = ["EUR", "USD", "GBP", "CHF", "AED"] as const;
  const channels = ["App", "Web", "API", "POS"] as const;
  const statuses = ["Completed", "Pending", "Failed", "Refunded"] as const;

  const transactions: Record<string, string>[] = [];
  const customerRevenue: Record<string, number> = {};

  for (let i = 1; i <= 500; i++) {
    const tid = `TXN-${String(i).padStart(5, "0")}`;
    const date = rng.dateInRange("2024-01-01", "2025-12-31");
    const custIdx = rng.nextInt(0, 199);
    const cid = customers[custIdx].Customer_ID;
    const prod = rng.pick(PRODUCT_DEFS);
    const amount = rng.nextFloat(0.50, 15000, 2);
    const currency = rng.pick(currencies);
    const feeRevenue = parseFloat((amount * prod.txnFeePct).toFixed(2));
    const costFactor = 0.3 + rng.next() * 0.3;
    const cost = parseFloat((feeRevenue * costFactor).toFixed(2));
    const country = customers[custIdx].Country;
    const channel = rng.pickWeighted(channels, [55, 20, 15, 10]);
    const status = rng.pickWeighted(statuses, [85, 7, 5, 3]);
    const riskScore = rng.nextInt(1, 100);

    if (status === "Completed") {
      customerRevenue[cid] = (customerRevenue[cid] || 0) + feeRevenue;
    }

    transactions.push({
      Transaction_ID: tid,
      Date: date,
      Customer_ID: cid,
      Product: prod.name,
      Amount: nf(amount),
      Currency: currency,
      Fee_Revenue: nf(feeRevenue),
      Cost: nf(cost),
      Country: country,
      Channel: channel,
      Status: status,
      Risk_Score: n(riskScore),
    });
  }

  // Back-fill Lifetime_Value on customers
  for (const c of customers) {
    const txnRev = customerRevenue[c.Customer_ID] || 0;
    const monthsSinceSignup = Math.max(
      1,
      Math.round(
        (new Date("2025-12-31").getTime() - new Date(c.Signup_Date).getTime()) /
          (30.44 * 24 * 3600 * 1000),
      ),
    );
    const subRev = parseFloat(c.Monthly_Fee) * monthsSinceSignup;
    c.Lifetime_Value = nf(txnRev + subRev);
  }

  // ── Monthly KPIs (24 rows: Jan 2024 - Dec 2025) ──
  const monthlyKpis: Record<string, string>[] = [];
  const kpiRng = new SeededRandom(777_002);
  let mau = 800_000;
  for (let yr = 2024; yr <= 2025; yr++) {
    for (let m = 1; m <= 12; m++) {
      const monthLabel = `${MONTH_NAMES[m - 1]} ${yr}`;
      mau = Math.round(mau * (1 + kpiRng.nextFloat(0.005, 0.025)));
      const dau = Math.round(mau * kpiRng.nextFloat(0.35, 0.45));
      const newSignups = kpiRng.nextInt(15000, 35000);
      const churned = kpiRng.nextInt(2000, 8000);
      const mrr = Math.round(mau * 0.35 * 6.5);
      const txnRevenue = kpiRng.nextInt(1_200_000, 2_800_000);
      const totalRevenue = mrr + txnRevenue;
      const cogs = Math.round(totalRevenue * kpiRng.nextFloat(0.25, 0.35));
      const grossMargin = parseFloat(
        (((totalRevenue - cogs) / totalRevenue) * 100).toFixed(1),
      );
      const opex = Math.round(totalRevenue * kpiRng.nextFloat(0.45, 0.60));
      const ebitda = totalRevenue - cogs - opex;
      const netIncome = Math.round(ebitda * kpiRng.nextFloat(0.60, 0.80));
      const cac = kpiRng.nextFloat(15, 35);
      const ltv = kpiRng.nextFloat(150, 400);
      const ltvCacRatio = parseFloat((ltv / cac).toFixed(1));

      monthlyKpis.push({
        Month: monthLabel,
        MAU: n(mau),
        DAU: n(dau),
        New_Signups: n(newSignups),
        Churned_Users: n(churned),
        MRR: n(mrr),
        Transaction_Revenue: n(txnRevenue),
        Total_Revenue: n(totalRevenue),
        COGS: n(cogs),
        Gross_Margin_Pct: nf(grossMargin, 1),
        Operating_Expenses: n(opex),
        EBITDA: n(ebitda),
        Net_Income: n(netIncome),
        CAC: nf(cac),
        LTV: nf(ltv),
        LTV_CAC_Ratio: nf(ltvCacRatio, 1),
      });
    }
  }

  // ── P&L (24 rows) ──
  const pnl: Record<string, string>[] = [];
  const pnlRng = new SeededRandom(777_003);
  for (let yr = 2024; yr <= 2025; yr++) {
    for (let m = 1; m <= 12; m++) {
      const monthLabel = `${MONTH_NAMES[m - 1]} ${yr}`;
      const interchangeRev = pnlRng.nextInt(900_000, 1_500_000);
      const subscriptionRev = pnlRng.nextInt(1_200_000, 2_200_000);
      const tradingRev = pnlRng.nextInt(400_000, 900_000);
      const insuranceRev = pnlRng.nextInt(150_000, 400_000);
      const otherRev = pnlRng.nextInt(50_000, 200_000);
      const totalRev = interchangeRev + subscriptionRev + tradingRev + insuranceRev + otherRev;

      const paymentProcessing = Math.round(totalRev * pnlRng.nextFloat(0.08, 0.12));
      const cardIssuance = pnlRng.nextInt(80_000, 200_000);
      const compliance = pnlRng.nextInt(150_000, 350_000);
      const techInfra = pnlRng.nextInt(300_000, 600_000);
      const salaries = pnlRng.nextInt(800_000, 1_400_000);
      const marketing = pnlRng.nextInt(250_000, 600_000);
      const totalCosts = paymentProcessing + cardIssuance + compliance + techInfra + salaries + marketing;

      const ebitda = totalRev - totalCosts;
      const ebitdaMargin = parseFloat(((ebitda / totalRev) * 100).toFixed(1));
      const depreciation = pnlRng.nextInt(50_000, 120_000);
      const tax = Math.max(0, Math.round((ebitda - depreciation) * 0.25));
      const netIncome = ebitda - depreciation - tax;

      pnl.push({
        Month: monthLabel,
        Interchange_Revenue: n(interchangeRev),
        Subscription_Revenue: n(subscriptionRev),
        Trading_Revenue: n(tradingRev),
        Insurance_Revenue: n(insuranceRev),
        Other_Revenue: n(otherRev),
        Total_Revenue: n(totalRev),
        Payment_Processing_Costs: n(paymentProcessing),
        Card_Issuance_Costs: n(cardIssuance),
        Compliance_Costs: n(compliance),
        Technology_Infrastructure: n(techInfra),
        Salaries: n(salaries),
        Marketing: n(marketing),
        Total_Costs: n(totalCosts),
        EBITDA: n(ebitda),
        EBITDA_Margin_Pct: nf(ebitdaMargin, 1),
        Depreciation: n(depreciation),
        Tax: n(tax),
        Net_Income: n(netIncome),
      });
    }
  }

  // ── Compliance events (200 rows) ──
  const complianceEvents: Record<string, string>[] = [];
  const compRng = new SeededRandom(777_004);
  const eventTypes = ["KYC Check", "AML Alert", "SAR Filed", "Account Frozen", "Enhanced Review"] as const;
  const riskLevels = ["Low", "Medium", "High", "Critical"] as const;
  const compStatuses = ["Open", "Resolved", "Escalated"] as const;
  const regulatoryBodies = ["BaFin", "FCA", "CBI"] as const;

  for (let i = 1; i <= 200; i++) {
    const eid = `CE-${String(i).padStart(4, "0")}`;
    const custIdx = compRng.nextInt(0, 199);
    const cid = customers[custIdx].Customer_ID;
    const evtType = compRng.pickWeighted(eventTypes, [40, 25, 10, 8, 17]);
    const risk =
      evtType === "SAR Filed" || evtType === "Account Frozen"
        ? compRng.pickWeighted(riskLevels, [5, 15, 40, 40])
        : compRng.pickWeighted(riskLevels, [40, 30, 20, 10]);
    const status = compRng.pickWeighted(compStatuses, [20, 65, 15]);
    const resDays =
      status === "Resolved"
        ? compRng.nextInt(1, 30)
        : status === "Escalated"
          ? compRng.nextInt(15, 90)
          : compRng.nextInt(0, 5);

    complianceEvents.push({
      Event_ID: eid,
      Customer_ID: cid,
      Date: compRng.dateInRange("2024-01-01", "2025-12-31"),
      Event_Type: evtType,
      Risk_Level: risk,
      Status: status,
      Resolution_Days: n(resDays),
      Regulatory_Body: compRng.pick(regulatoryBodies),
    });
  }

  // ── Cost Centers (10 rows) ──
  const costCenterDefs = [
    { dept: "Engineering", hc: 120, budget: 18_000_000 },
    { dept: "Product", hc: 35, budget: 5_200_000 },
    { dept: "Compliance", hc: 45, budget: 7_800_000 },
    { dept: "Marketing", hc: 40, budget: 8_500_000 },
    { dept: "Operations", hc: 60, budget: 6_000_000 },
    { dept: "Customer Support", hc: 85, budget: 5_100_000 },
    { dept: "Finance", hc: 25, budget: 3_800_000 },
    { dept: "Legal", hc: 18, budget: 3_200_000 },
    { dept: "HR", hc: 15, budget: 2_400_000 },
    { dept: "Data Science", hc: 30, budget: 5_500_000 },
  ];
  const ccRng = new SeededRandom(777_005);
  const costCenters: Record<string, string>[] = costCenterDefs.map((cc) => {
    const q1 = Math.round(cc.budget * 0.25 * ccRng.nextFloat(0.9, 1.1));
    const q2 = Math.round(cc.budget * 0.25 * ccRng.nextFloat(0.9, 1.1));
    const q3 = Math.round(cc.budget * 0.25 * ccRng.nextFloat(0.9, 1.1));
    const q4 = Math.round(cc.budget * 0.25 * ccRng.nextFloat(0.9, 1.1));
    const annualActual = q1 + q2 + q3 + q4;
    const variance = annualActual - cc.budget;
    const costPerHead = Math.round(annualActual / cc.hc);
    return {
      Department: cc.dept,
      Headcount: n(cc.hc),
      Annual_Budget: n(cc.budget),
      Q1_Actual: n(q1),
      Q2_Actual: n(q2),
      Q3_Actual: n(q3),
      Q4_Actual: n(q4),
      Annual_Actual: n(annualActual),
      Variance: n(variance),
      Cost_per_Head: n(costPerHead),
    };
  });

  // ── Assemble all tables ──
  return [
    {
      id: "rev_transactions",
      name: "Revolut Transactions",
      rows: transactions,
      headers: ["Transaction_ID", "Date", "Customer_ID", "Product", "Amount", "Currency", "Fee_Revenue", "Cost", "Country", "Channel", "Status", "Risk_Score"],
      columnTypes: {
        Transaction_ID: "string", Date: "date", Customer_ID: "string", Product: "string",
        Amount: "number", Currency: "string", Fee_Revenue: "number", Cost: "number",
        Country: "string", Channel: "string", Status: "string", Risk_Score: "number",
      },
    },
    {
      id: "rev_customers",
      name: "Revolut Customers",
      rows: customers,
      headers: ["Customer_ID", "Name", "Signup_Date", "Plan", "Monthly_Fee", "Country", "Age_Group", "KYC_Status", "Lifetime_Value", "Churn_Risk", "NPS_Score"],
      columnTypes: {
        Customer_ID: "string", Name: "string", Signup_Date: "date", Plan: "string",
        Monthly_Fee: "number", Country: "string", Age_Group: "string", KYC_Status: "string",
        Lifetime_Value: "number", Churn_Risk: "string", NPS_Score: "number",
      },
    },
    {
      id: "rev_monthly_kpis",
      name: "Revolut Monthly KPIs",
      rows: monthlyKpis,
      headers: ["Month", "MAU", "DAU", "New_Signups", "Churned_Users", "MRR", "Transaction_Revenue", "Total_Revenue", "COGS", "Gross_Margin_Pct", "Operating_Expenses", "EBITDA", "Net_Income", "CAC", "LTV", "LTV_CAC_Ratio"],
      columnTypes: {
        Month: "string", MAU: "number", DAU: "number", New_Signups: "number",
        Churned_Users: "number", MRR: "number", Transaction_Revenue: "number",
        Total_Revenue: "number", COGS: "number", Gross_Margin_Pct: "number",
        Operating_Expenses: "number", EBITDA: "number", Net_Income: "number",
        CAC: "number", LTV: "number", LTV_CAC_Ratio: "number",
      },
    },
    {
      id: "rev_pnl",
      name: "Revolut P&L (Monthly)",
      rows: pnl,
      headers: ["Month", "Interchange_Revenue", "Subscription_Revenue", "Trading_Revenue", "Insurance_Revenue", "Other_Revenue", "Total_Revenue", "Payment_Processing_Costs", "Card_Issuance_Costs", "Compliance_Costs", "Technology_Infrastructure", "Salaries", "Marketing", "Total_Costs", "EBITDA", "EBITDA_Margin_Pct", "Depreciation", "Tax", "Net_Income"],
      columnTypes: {
        Month: "string", Interchange_Revenue: "number", Subscription_Revenue: "number",
        Trading_Revenue: "number", Insurance_Revenue: "number", Other_Revenue: "number",
        Total_Revenue: "number", Payment_Processing_Costs: "number", Card_Issuance_Costs: "number",
        Compliance_Costs: "number", Technology_Infrastructure: "number", Salaries: "number",
        Marketing: "number", Total_Costs: "number", EBITDA: "number",
        EBITDA_Margin_Pct: "number", Depreciation: "number", Tax: "number", Net_Income: "number",
      },
    },
    {
      id: "rev_products",
      name: "Revolut Products",
      rows: products,
      headers: ["Product_ID", "Product_Name", "Category", "Monthly_Fee", "Transaction_Fee_Pct", "Launch_Date", "Active_Users", "Revenue_Contribution_Pct"],
      columnTypes: {
        Product_ID: "string", Product_Name: "string", Category: "string",
        Monthly_Fee: "number", Transaction_Fee_Pct: "number", Launch_Date: "date",
        Active_Users: "number", Revenue_Contribution_Pct: "number",
      },
    },
    {
      id: "rev_compliance",
      name: "Revolut Compliance (KYC/AML)",
      rows: complianceEvents,
      headers: ["Event_ID", "Customer_ID", "Date", "Event_Type", "Risk_Level", "Status", "Resolution_Days", "Regulatory_Body"],
      columnTypes: {
        Event_ID: "string", Customer_ID: "string", Date: "date", Event_Type: "string",
        Risk_Level: "string", Status: "string", Resolution_Days: "number", Regulatory_Body: "string",
      },
    },
    {
      id: "rev_cost_centers",
      name: "Revolut Cost Centers",
      rows: costCenters,
      headers: ["Department", "Headcount", "Annual_Budget", "Q1_Actual", "Q2_Actual", "Q3_Actual", "Q4_Actual", "Annual_Actual", "Variance", "Cost_per_Head"],
      columnTypes: {
        Department: "string", Headcount: "number", Annual_Budget: "number",
        Q1_Actual: "number", Q2_Actual: "number", Q3_Actual: "number", Q4_Actual: "number",
        Annual_Actual: "number", Variance: "number", Cost_per_Head: "number",
      },
    },
  ];
}
