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
] as const;

const COUNTRIES_REV = [
  "UK", "Germany", "France", "Spain", "Italy", "Netherlands", "Belgium",
  "Ireland", "Poland", "Romania", "Czech Republic", "Sweden", "Denmark",
  "Norway", "Finland", "Portugal", "Austria", "Switzerland", "Greece",
  "Lithuania", "Latvia", "Estonia", "Bulgaria", "Hungary", "Croatia",
  "US", "Singapore", "Japan", "Australia", "UAE",
] as const;

const COUNTRY_REGION: Record<string, string> = {
  "UK": "UK", "Ireland": "UK",
  "Germany": "EU_West", "France": "EU_West", "Spain": "EU_West",
  "Italy": "EU_West", "Netherlands": "EU_West", "Belgium": "EU_West",
  "Austria": "EU_West", "Switzerland": "EU_West", "Portugal": "EU_West", "Greece": "EU_West",
  "Poland": "EU_East", "Romania": "EU_East", "Czech Republic": "EU_East",
  "Lithuania": "EU_East", "Latvia": "EU_East", "Estonia": "EU_East",
  "Bulgaria": "EU_East", "Hungary": "EU_East", "Croatia": "EU_East",
  "Sweden": "Nordics", "Denmark": "Nordics", "Norway": "Nordics", "Finland": "Nordics",
  "US": "US",
  "Singapore": "APAC", "Japan": "APAC", "Australia": "APAC",
  "UAE": "MENA",
};

const MERCHANT_CATEGORIES = [
  "Groceries", "Restaurants", "Transport", "Online Shopping", "Entertainment",
  "Travel", "Utilities", "Healthcare", "Education", "Subscriptions",
  "Electronics", "Fashion", "Home & Garden", "Sports", "Financial Services",
] as const;

const ACCOUNT_MANAGERS = [
  "Sarah Mitchell", "Thomas Weber", "Marie Dubois", "James O'Connor",
  "Katarina Novak", "Lars Johansson", "Elena Petrov", "Marco Rossi",
  "Priya Kumar", "David Chen",
] as const;

// ──────────────────────────────────────────────────────────────────────────────
// REVOLUT DATA GENERATOR
// ──────────────────────────────────────────────────────────────────────────────

export function generateRevolutData(): DemoTable[] {
  const rng = new SeededRandom(42_001);

  // ── 1. rev_products (15 rows) ──
  const products = generateRevProducts();

  // ── 2. rev_customers (200 rows) ──
  const customers = generateRevCustomers(rng);

  // ── 3. rev_transactions (500 rows) ──
  const transactions = generateRevTransactions(rng, customers, products);

  // ── 4. rev_monthly_kpis (24 rows) ──
  const monthlyKpis = generateRevMonthlyKpis(rng);

  // ── 5. rev_pl_monthly (24 rows) ──
  const plMonthly = generateRevPLMonthly(rng);

  // ── 6. rev_regional (~192 rows = 8 regions x 24 months) ──
  const regional = generateRevRegional(rng);

  // ── 7. rev_cost_centers (120 rows = 10 depts x 12 months) ──
  const costCenters = generateRevCostCenters(rng);

  return [
    {
      id: "rev_transactions",
      name: "Revolut — Transactions",
      rows: transactions,
      headers: [
        "Transaction_ID", "Date", "Customer_ID", "Product_Type", "Transaction_Type",
        "Amount", "Currency", "FX_Rate", "Amount_EUR", "Fee_Amount", "Status",
        "Country", "Merchant_Category", "Channel",
      ],
      columnTypes: {
        Transaction_ID: "string", Date: "date", Customer_ID: "string",
        Product_Type: "string", Transaction_Type: "string", Amount: "number",
        Currency: "string", FX_Rate: "number", Amount_EUR: "number",
        Fee_Amount: "number", Status: "string", Country: "string",
        Merchant_Category: "string", Channel: "string",
      },
    },
    {
      id: "rev_customers",
      name: "Revolut — Customers",
      rows: customers,
      headers: [
        "Customer_ID", "Name", "Segment", "Country", "Registration_Date",
        "KYC_Status", "Last_Active", "Lifetime_Value", "Monthly_Volume",
        "Risk_Score", "Account_Manager",
      ],
      columnTypes: {
        Customer_ID: "string", Name: "string", Segment: "string",
        Country: "string", Registration_Date: "date", KYC_Status: "string",
        Last_Active: "date", Lifetime_Value: "number", Monthly_Volume: "number",
        Risk_Score: "number", Account_Manager: "string",
      },
    },
    {
      id: "rev_products",
      name: "Revolut — Products",
      rows: products,
      headers: [
        "Product_ID", "Product_Name", "Category", "Monthly_Fee",
        "Revenue_Per_User", "Margin_%", "Launch_Date", "Status",
      ],
      columnTypes: {
        Product_ID: "string", Product_Name: "string", Category: "string",
        Monthly_Fee: "number", Revenue_Per_User: "number", "Margin_%": "number",
        Launch_Date: "date", Status: "string",
      },
    },
    {
      id: "rev_monthly_kpis",
      name: "Revolut — Monthly KPIs",
      rows: monthlyKpis,
      headers: [
        "Month", "MAU", "DAU", "New_Signups", "Churn_Rate_%", "MRR", "ARR",
        "ARPU", "CAC", "LTV", "LTV_CAC_Ratio", "NPS_Score", "App_Rating",
        "Transaction_Volume", "Gross_Margin_%", "OpEx", "Net_Income",
        "Headcount", "Revenue_Per_Employee",
      ],
      columnTypes: {
        Month: "date", MAU: "number", DAU: "number", New_Signups: "number",
        "Churn_Rate_%": "number", MRR: "number", ARR: "number", ARPU: "number",
        CAC: "number", LTV: "number", LTV_CAC_Ratio: "number", NPS_Score: "number",
        App_Rating: "number", Transaction_Volume: "number", "Gross_Margin_%": "number",
        OpEx: "number", Net_Income: "number", Headcount: "number",
        Revenue_Per_Employee: "number",
      },
    },
    {
      id: "rev_pl_monthly",
      name: "Revolut — P&L Monthly",
      rows: plMonthly,
      headers: [
        "Month", "Revenue", "Interchange_Revenue", "Subscription_Revenue",
        "Trading_Revenue", "FX_Revenue", "Other_Revenue", "COGS", "Gross_Profit",
        "Gross_Margin_%", "Sales_Marketing", "Technology", "Operations", "G_A",
        "Total_OpEx", "EBITDA", "EBITDA_Margin_%", "D_A", "EBIT", "Interest",
        "Tax", "Net_Income", "Net_Margin_%",
      ],
      columnTypes: {
        Month: "date", Revenue: "number", Interchange_Revenue: "number",
        Subscription_Revenue: "number", Trading_Revenue: "number",
        FX_Revenue: "number", Other_Revenue: "number", COGS: "number",
        Gross_Profit: "number", "Gross_Margin_%": "number",
        Sales_Marketing: "number", Technology: "number", Operations: "number",
        G_A: "number", Total_OpEx: "number", EBITDA: "number",
        "EBITDA_Margin_%": "number", D_A: "number", EBIT: "number",
        Interest: "number", Tax: "number", Net_Income: "number",
        "Net_Margin_%": "number",
      },
    },
    {
      id: "rev_regional",
      name: "Revolut — Regional Breakdown",
      rows: regional,
      headers: [
        "Month", "Region", "Revenue", "Customers", "Growth_YoY_%",
        "Market_Share_%", "Regulatory_Status",
      ],
      columnTypes: {
        Month: "date", Region: "string", Revenue: "number",
        Customers: "number", "Growth_YoY_%": "number",
        "Market_Share_%": "number", Regulatory_Status: "string",
      },
    },
    {
      id: "rev_cost_centers",
      name: "Revolut — Cost Centers",
      rows: costCenters,
      headers: [
        "Month", "Department", "Budget", "Actual", "Variance",
        "Variance_%", "Headcount", "Cost_Per_Head", "Key_Initiative",
      ],
      columnTypes: {
        Month: "date", Department: "string", Budget: "number",
        Actual: "number", Variance: "number", "Variance_%": "number",
        Headcount: "number", Cost_Per_Head: "number", Key_Initiative: "string",
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// TABLE GENERATORS
// ──────────────────────────────────────────────────────────────────────────────

function generateRevProducts(): Record<string, string>[] {
  return [
    { Product_ID: "RP-01", Product_Name: "Standard Account", Category: "Cards", Monthly_Fee: "0", Revenue_Per_User: nf(1.20), "Margin_%": nf(42.0), Launch_Date: "2015-07-01", Status: "Active" },
    { Product_ID: "RP-02", Product_Name: "Plus Plan", Category: "Cards", Monthly_Fee: nf(3.99), Revenue_Per_User: nf(5.80), "Margin_%": nf(68.0), Launch_Date: "2019-03-15", Status: "Active" },
    { Product_ID: "RP-03", Product_Name: "Premium Plan", Category: "Cards", Monthly_Fee: nf(7.99), Revenue_Per_User: nf(12.40), "Margin_%": nf(72.0), Launch_Date: "2017-08-01", Status: "Active" },
    { Product_ID: "RP-04", Product_Name: "Metal Plan", Category: "Cards", Monthly_Fee: nf(15.99), Revenue_Per_User: nf(24.60), "Margin_%": nf(76.0), Launch_Date: "2018-06-15", Status: "Active" },
    { Product_ID: "RP-05", Product_Name: "Revolut Business", Category: "Business", Monthly_Fee: nf(25.00), Revenue_Per_User: nf(42.30), "Margin_%": nf(64.0), Launch_Date: "2017-04-01", Status: "Active" },
    { Product_ID: "RP-06", Product_Name: "Crypto Trading", Category: "Crypto", Monthly_Fee: "0", Revenue_Per_User: nf(8.90), "Margin_%": nf(82.0), Launch_Date: "2017-12-01", Status: "Active" },
    { Product_ID: "RP-07", Product_Name: "Stock Trading", Category: "Trading", Monthly_Fee: "0", Revenue_Per_User: nf(6.20), "Margin_%": nf(78.0), Launch_Date: "2019-08-01", Status: "Active" },
    { Product_ID: "RP-08", Product_Name: "Commodities Trading", Category: "Trading", Monthly_Fee: "0", Revenue_Per_User: nf(4.50), "Margin_%": nf(75.0), Launch_Date: "2020-03-15", Status: "Active" },
    { Product_ID: "RP-09", Product_Name: "Travel Insurance", Category: "Insurance", Monthly_Fee: "0", Revenue_Per_User: nf(3.10), "Margin_%": nf(35.0), Launch_Date: "2019-06-01", Status: "Active" },
    { Product_ID: "RP-10", Product_Name: "Device Insurance", Category: "Insurance", Monthly_Fee: nf(6.99), Revenue_Per_User: nf(7.80), "Margin_%": nf(28.0), Launch_Date: "2020-11-01", Status: "Active" },
    { Product_ID: "RP-11", Product_Name: "Savings Vaults", Category: "Savings", Monthly_Fee: "0", Revenue_Per_User: nf(2.40), "Margin_%": nf(45.0), Launch_Date: "2018-02-01", Status: "Active" },
    { Product_ID: "RP-12", Product_Name: "Revolut Pay", Category: "Payments", Monthly_Fee: "0", Revenue_Per_User: nf(1.80), "Margin_%": nf(52.0), Launch_Date: "2022-09-01", Status: "Active" },
    { Product_ID: "RP-13", Product_Name: "Revolut Ultra", Category: "Cards", Monthly_Fee: nf(45.00), Revenue_Per_User: nf(58.20), "Margin_%": nf(71.0), Launch_Date: "2023-06-01", Status: "Active" },
    { Product_ID: "RP-14", Product_Name: "Junior Account", Category: "Cards", Monthly_Fee: "0", Revenue_Per_User: nf(0.80), "Margin_%": nf(18.0), Launch_Date: "2020-03-01", Status: "Active" },
    { Product_ID: "RP-15", Product_Name: "Revolut X (Exchange)", Category: "Crypto", Monthly_Fee: "0", Revenue_Per_User: nf(14.60), "Margin_%": nf(85.0), Launch_Date: "2024-05-01", Status: "Beta" },
  ];
}

function generateRevCustomers(rng: SeededRandom): Record<string, string>[] {
  const segments = ["Free", "Plus", "Premium", "Metal", "Business"] as const;
  const segmentWeights = [45, 20, 18, 10, 7];
  const kycStatuses = ["Verified", "Pending", "Rejected"] as const;
  const kycWeights = [88, 9, 3];

  const rows: Record<string, string>[] = [];
  for (let i = 0; i < 200; i++) {
    const cid = `RC-${String(i + 1).padStart(4, "0")}`;
    const firstName = rng.pick(FIRST_NAMES);
    const lastName = rng.pick(LAST_NAMES);
    const segment = rng.pickWeighted(segments, segmentWeights);
    const country = rng.pick(COUNTRIES_REV);
    const regDate = rng.dateInRange("2019-01-01", "2025-06-30");
    const kycStatus = rng.pickWeighted(kycStatuses, kycWeights);
    const lastActive = rng.dateInRange("2024-10-01", "2025-12-31");

    // LTV varies dramatically by segment
    const ltvBase: Record<string, [number, number]> = {
      Free: [5, 120], Plus: [80, 450], Premium: [200, 1200],
      Metal: [500, 3500], Business: [800, 8000],
    };
    const [ltvMin, ltvMax] = ltvBase[segment];
    const ltv = rng.nextFloat(ltvMin, ltvMax, 2);

    // Monthly volume
    const volBase: Record<string, [number, number]> = {
      Free: [50, 2000], Plus: [500, 8000], Premium: [1000, 25000],
      Metal: [3000, 80000], Business: [5000, 500000],
    };
    const [volMin, volMax] = volBase[segment];
    const monthlyVol = rng.nextInt(volMin, volMax);

    const riskScore = rng.nextInt(1, 100);

    rows.push({
      Customer_ID: cid,
      Name: `${firstName} ${lastName}`,
      Segment: segment,
      Country: country,
      Registration_Date: regDate,
      KYC_Status: kycStatus,
      Last_Active: lastActive,
      Lifetime_Value: nf(ltv),
      Monthly_Volume: n(monthlyVol),
      Risk_Score: n(riskScore),
      Account_Manager: rng.pick(ACCOUNT_MANAGERS),
    });
  }
  return rows;
}

function generateRevTransactions(
  rng: SeededRandom,
  customers: Record<string, string>[],
  products: Record<string, string>[],
): Record<string, string>[] {
  const productTypes = ["Cards", "Crypto", "Trading", "Insurance", "Premium"] as const;
  const productTypeWeights = [40, 18, 15, 8, 19];
  const txTypes = ["Payment", "Transfer", "Exchange", "Fee"] as const;
  const txTypeWeights = [45, 25, 22, 8];
  const currencies = ["EUR", "USD", "GBP", "CHF"] as const;
  const currencyWeights = [40, 30, 20, 10];
  const statuses = ["Completed", "Pending", "Failed", "Reversed"] as const;
  const statusWeights = [85, 8, 5, 2];
  const channels = ["App", "API", "Web"] as const;
  const channelWeights = [65, 20, 15];

  const fxRates: Record<string, number> = {
    EUR: 1.0, USD: 0.92, GBP: 1.17, CHF: 1.05,
  };

  const rows: Record<string, string>[] = [];
  for (let i = 0; i < 500; i++) {
    const tid = `RT-${String(i + 1).padStart(5, "0")}`;
    const date = rng.dateInRange("2024-01-01", "2025-12-31");
    const customer = rng.pick(customers);
    const productType = rng.pickWeighted(productTypes, productTypeWeights);
    const txType = rng.pickWeighted(txTypes, txTypeWeights);
    const currency = rng.pickWeighted(currencies, currencyWeights);
    const status = rng.pickWeighted(statuses, statusWeights);
    const channel = rng.pickWeighted(channels, channelWeights);
    const country = customer.Country;
    const merchant = rng.pick(MERCHANT_CATEGORIES);

    // Amount varies by transaction type
    let amount: number;
    switch (txType) {
      case "Payment": amount = rng.nextFloat(2.50, 850.00, 2); break;
      case "Transfer": amount = rng.nextFloat(10.00, 15000.00, 2); break;
      case "Exchange": amount = rng.nextFloat(50.00, 25000.00, 2); break;
      case "Fee": amount = rng.nextFloat(0.50, 29.99, 2); break;
    }

    const fxRate = fxRates[currency] + rng.nextFloat(-0.02, 0.02, 4);
    const amountEur = parseFloat((amount * fxRate).toFixed(2));
    const feeAmount = txType === "Fee" ? amount : parseFloat((amount * rng.nextFloat(0.001, 0.015, 4)).toFixed(2));

    // Find a matching product for the type
    const matchingProducts = products.filter(p => p.Category === productType || (productType === "Premium" && ["Cards"].includes(p.Category)));
    const product = matchingProducts.length > 0 ? rng.pick(matchingProducts) : rng.pick(products);

    rows.push({
      Transaction_ID: tid,
      Date: date,
      Customer_ID: customer.Customer_ID,
      Product_Type: product.Category,
      Transaction_Type: txType,
      Amount: nf(amount),
      Currency: currency,
      FX_Rate: nf(fxRate, 4),
      Amount_EUR: nf(amountEur),
      Fee_Amount: nf(feeAmount),
      Status: status,
      Country: country,
      Merchant_Category: merchant,
      Channel: channel,
    });
  }
  return rows;
}

function generateRevMonthlyKpis(rng: SeededRandom): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  // Base values for Jan 2024, growing monthly
  let mau = 30_200_000;
  let headcount = 7800;

  for (let y = 2024; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      const month = `${y}-${String(m).padStart(2, "0")}`;

      // MAU growth: ~2-4% monthly with seasonality
      const seasonFactor = m >= 6 && m <= 8 ? 0.98 : m === 12 ? 1.03 : 1.0;
      mau = Math.round(mau * (1 + rng.nextFloat(0.018, 0.038, 4)) * seasonFactor);
      const dau = Math.round(mau * rng.nextFloat(0.38, 0.45, 3));
      const newSignups = Math.round(mau * rng.nextFloat(0.04, 0.07, 3));
      const churnRate = rng.nextFloat(1.2, 2.8, 2);

      // MRR growing from ~100M to ~150M+ over 24 months
      const monthIndex = (y - 2024) * 12 + m - 1;
      const baseMrr = 98_000_000 + monthIndex * 2_400_000 + rng.nextInt(-1_500_000, 2_000_000);
      const mrr = Math.round(baseMrr * seasonFactor);
      const arr = mrr * 12;
      const arpu = parseFloat((mrr / mau).toFixed(2));

      const cac = rng.nextFloat(22.0, 45.0, 2);
      const ltv = rng.nextFloat(180.0, 320.0, 2);
      const ltvCacRatio = parseFloat((ltv / cac).toFixed(2));
      const nps = rng.nextInt(52, 72);
      const appRating = rng.nextFloat(4.5, 4.8, 1);

      const txVolume = Math.round(mau * rng.nextFloat(3.8, 6.2, 1));
      const grossMargin = rng.nextFloat(48.0, 58.0, 1);

      // OpEx and Net Income
      const opex = Math.round(mrr * rng.nextFloat(0.65, 0.82, 3));
      const netIncome = Math.round(mrr * rng.nextFloat(0.02, 0.18, 3));

      headcount = Math.round(headcount * (1 + rng.nextFloat(0.002, 0.012, 4)));
      const revPerEmployee = Math.round((mrr * 12) / headcount);

      rows.push({
        Month: month,
        MAU: n(mau),
        DAU: n(dau),
        New_Signups: n(newSignups),
        "Churn_Rate_%": nf(churnRate),
        MRR: n(mrr),
        ARR: n(arr),
        ARPU: nf(arpu),
        CAC: nf(cac),
        LTV: nf(ltv),
        LTV_CAC_Ratio: nf(ltvCacRatio),
        NPS_Score: n(nps),
        App_Rating: nf(appRating, 1),
        Transaction_Volume: n(txVolume),
        "Gross_Margin_%": nf(grossMargin, 1),
        OpEx: n(opex),
        Net_Income: n(netIncome),
        Headcount: n(headcount),
        Revenue_Per_Employee: n(revPerEmployee),
      });
    }
  }
  return rows;
}

function generateRevPLMonthly(rng: SeededRandom): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  for (let y = 2024; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      const month = `${y}-${String(m).padStart(2, "0")}`;
      const monthIndex = (y - 2024) * 12 + m - 1;

      // Revenue components growing over time (in EUR millions, stored as raw numbers)
      const baseRev = 105_000_000 + monthIndex * 2_200_000;
      const seasonMult = m === 12 ? 1.08 : m >= 6 && m <= 8 ? 0.96 : 1.0;
      const noise = rng.nextFloat(0.97, 1.04, 3);

      const interchangeRev = Math.round(baseRev * 0.32 * seasonMult * noise);
      const subscriptionRev = Math.round(baseRev * 0.28 * seasonMult * rng.nextFloat(0.98, 1.03, 3));
      const tradingRev = Math.round(baseRev * 0.18 * rng.nextFloat(0.80, 1.25, 3)); // More volatile
      const fxRev = Math.round(baseRev * 0.15 * seasonMult * rng.nextFloat(0.95, 1.06, 3));
      const otherRev = Math.round(baseRev * 0.07 * rng.nextFloat(0.90, 1.10, 3));

      const revenue = interchangeRev + subscriptionRev + tradingRev + fxRev + otherRev;
      const cogs = Math.round(revenue * rng.nextFloat(0.42, 0.50, 3));
      const grossProfit = revenue - cogs;
      const grossMargin = parseFloat(((grossProfit / revenue) * 100).toFixed(1));

      // Operating expenses
      const salesMarketing = Math.round(revenue * rng.nextFloat(0.14, 0.20, 3));
      const technology = Math.round(revenue * rng.nextFloat(0.12, 0.18, 3));
      const operations = Math.round(revenue * rng.nextFloat(0.06, 0.10, 3));
      const ga = Math.round(revenue * rng.nextFloat(0.04, 0.07, 3));
      const totalOpex = salesMarketing + technology + operations + ga;

      const ebitda = grossProfit - totalOpex;
      const ebitdaMargin = parseFloat(((ebitda / revenue) * 100).toFixed(1));
      const da = Math.round(revenue * rng.nextFloat(0.02, 0.04, 3));
      const ebit = ebitda - da;
      const interest = Math.round(rng.nextFloat(500_000, 2_000_000, 0));
      const preTax = ebit - interest;
      const tax = preTax > 0 ? Math.round(preTax * rng.nextFloat(0.18, 0.25, 3)) : 0;
      const netIncome = preTax - tax;
      const netMargin = parseFloat(((netIncome / revenue) * 100).toFixed(1));

      rows.push({
        Month: month,
        Revenue: n(revenue),
        Interchange_Revenue: n(interchangeRev),
        Subscription_Revenue: n(subscriptionRev),
        Trading_Revenue: n(tradingRev),
        FX_Revenue: n(fxRev),
        Other_Revenue: n(otherRev),
        COGS: n(cogs),
        Gross_Profit: n(grossProfit),
        "Gross_Margin_%": nf(grossMargin, 1),
        Sales_Marketing: n(salesMarketing),
        Technology: n(technology),
        Operations: n(operations),
        G_A: n(ga),
        Total_OpEx: n(totalOpex),
        EBITDA: n(ebitda),
        "EBITDA_Margin_%": nf(ebitdaMargin, 1),
        D_A: n(da),
        EBIT: n(ebit),
        Interest: n(interest),
        Tax: n(tax),
        Net_Income: n(netIncome),
        "Net_Margin_%": nf(netMargin, 1),
      });
    }
  }
  return rows;
}

function generateRevRegional(rng: SeededRandom): Record<string, string>[] {
  const regions = ["UK", "EU_West", "EU_East", "Nordics", "US", "APAC", "MENA", "LatAm"] as const;
  // Revenue share (sums to 100)
  const revShares: Record<string, number> = {
    UK: 0.32, EU_West: 0.28, EU_East: 0.12, Nordics: 0.08,
    US: 0.10, APAC: 0.05, MENA: 0.03, LatAm: 0.02,
  };
  // Customer share
  const custShares: Record<string, number> = {
    UK: 0.28, EU_West: 0.26, EU_East: 0.18, Nordics: 0.09,
    US: 0.08, APAC: 0.05, MENA: 0.03, LatAm: 0.03,
  };
  // Growth by region (faster in newer markets)
  const growthBase: Record<string, [number, number]> = {
    UK: [15, 28], EU_West: [18, 32], EU_East: [25, 55],
    Nordics: [20, 38], US: [40, 85], APAC: [35, 75],
    MENA: [45, 95], LatAm: [50, 120],
  };
  const marketShares: Record<string, [number, number]> = {
    UK: [6.0, 9.5], EU_West: [3.5, 6.0], EU_East: [8.0, 14.0],
    Nordics: [4.0, 7.5], US: [0.3, 1.2], APAC: [0.1, 0.5],
    MENA: [0.5, 2.0], LatAm: [0.2, 1.0],
  };
  const regStatus: Record<string, string[]> = {
    UK: ["Full_Banking_License"], EU_West: ["Full_Banking_License"],
    EU_East: ["EU_Passported"], Nordics: ["EU_Passported"],
    US: ["State_Licenses", "Pending_Federal"], APAC: ["SG_License", "Applying"],
    MENA: ["DIFC_Licensed"], LatAm: ["Applying", "Partnership"],
  };

  const rows: Record<string, string>[] = [];
  for (let y = 2024; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      const month = `${y}-${String(m).padStart(2, "0")}`;
      const monthIndex = (y - 2024) * 12 + m - 1;
      // Total monthly revenue grows over time
      const totalRev = 105_000_000 + monthIndex * 2_200_000;
      const totalCust = 30_200_000 + monthIndex * 900_000;

      for (const region of regions) {
        const rev = Math.round(totalRev * revShares[region] * rng.nextFloat(0.93, 1.08, 3));
        const cust = Math.round(totalCust * custShares[region] * rng.nextFloat(0.95, 1.05, 3));
        const [gMin, gMax] = growthBase[region];
        const growth = rng.nextFloat(gMin, gMax, 1);
        const [msMin, msMax] = marketShares[region];
        const ms = rng.nextFloat(msMin, msMax, 1);
        const regStat = rng.pick(regStatus[region]);

        rows.push({
          Month: month,
          Region: region,
          Revenue: n(rev),
          Customers: n(cust),
          "Growth_YoY_%": nf(growth, 1),
          "Market_Share_%": nf(ms, 1),
          Regulatory_Status: regStat,
        });
      }
    }
  }
  return rows;
}

function generateRevCostCenters(rng: SeededRandom): Record<string, string>[] {
  const departments = [
    "Engineering", "Product", "Marketing", "Operations", "Compliance",
    "Finance", "HR", "Legal", "Data", "Customer_Support",
  ] as const;

  // Base monthly budgets (EUR) and headcount
  const deptConfig: Record<string, { budget: number; headcount: number; initiative: string[] }> = {
    Engineering: { budget: 18_500_000, headcount: 2800, initiative: ["Core Banking Platform", "API v3 Migration", "Microservices Refactor", "ML Fraud Detection"] },
    Product: { budget: 5_200_000, headcount: 420, initiative: ["Revolut X Launch", "Business Hub v2", "Junior Accounts", "Pay Integration"] },
    Marketing: { budget: 22_000_000, headcount: 650, initiative: ["US Market Entry", "Brand Campaign EU", "Referral Program 2.0", "Creator Partnerships"] },
    Operations: { budget: 8_800_000, headcount: 1200, initiative: ["KYC Automation", "Support AI Agent", "Process Optimization", "Vendor Consolidation"] },
    Compliance: { budget: 6_500_000, headcount: 580, initiative: ["MiCA Compliance", "US Licensing", "AML Model Upgrade", "Sanctions Screening v2"] },
    Finance: { budget: 3_200_000, headcount: 310, initiative: ["ERP Migration", "Treasury Optimization", "IPO Readiness", "Transfer Pricing"] },
    HR: { budget: 2_800_000, headcount: 240, initiative: ["Engineering Hiring Wave", "DEIB Program", "L&D Platform", "Comp Benchmark"] },
    Legal: { budget: 4_100_000, headcount: 280, initiative: ["Banking License App", "IP Portfolio", "Regulatory Filings", "M&A Support"] },
    Data: { budget: 7_200_000, headcount: 520, initiative: ["Data Mesh Migration", "Real-time Analytics", "ML Ops Platform", "GDPR Automation"] },
    Customer_Support: { budget: 9_500_000, headcount: 1800, initiative: ["AI Chatbot v3", "24/7 Premium Support", "Multilingual Expansion", "Self-Service Portal"] },
  };

  const rows: Record<string, string>[] = [];
  for (let m = 1; m <= 12; m++) {
    const month = `2025-${String(m).padStart(2, "0")}`;
    for (const dept of departments) {
      const cfg = deptConfig[dept];
      // Budget increases slightly through the year
      const budget = Math.round(cfg.budget * (1 + (m - 1) * 0.008) * rng.nextFloat(0.97, 1.03, 3));
      // Actual can be over or under budget
      const variance_pct = rng.nextFloat(-12, 15, 1);
      const actual = Math.round(budget * (1 + variance_pct / 100));
      const variance = budget - actual;
      const headcount = Math.round(cfg.headcount * (1 + (m - 1) * 0.005 + rng.nextFloat(-0.02, 0.03, 3)));
      const costPerHead = Math.round(actual / headcount);
      const initiative = rng.pick(cfg.initiative);

      rows.push({
        Month: month,
        Department: dept,
        Budget: n(budget),
        Actual: n(actual),
        Variance: n(variance),
        "Variance_%": nf(variance_pct, 1),
        Headcount: n(headcount),
        Cost_Per_Head: n(costPerHead),
        Key_Initiative: initiative,
      });
    }
  }
  return rows;
}
