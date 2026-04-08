import { saveDataset, getAllDatasets } from "./store";
import type { DatasetFull } from "./store";

const SEED_ID = "sales-q1-2026";

const seedRows = [
  { Month: "Jan 2026", Revenue: "142500", Customers: "1205", Churn_Rate: "3.2", MRR: "118750", Support_Tickets: "89" },
  { Month: "Feb 2026", Revenue: "156800", Customers: "1287", Churn_Rate: "2.8", MRR: "130667", Support_Tickets: "76" },
  { Month: "Mar 2026", Revenue: "163200", Customers: "1342", Churn_Rate: "2.5", MRR: "136000", Support_Tickets: "82" },
  { Month: "Apr 2026", Revenue: "171900", Customers: "1398", Churn_Rate: "2.9", MRR: "143250", Support_Tickets: "91" },
  { Month: "May 2026", Revenue: "185400", Customers: "1456", Churn_Rate: "2.3", MRR: "154500", Support_Tickets: "68" },
  { Month: "Jun 2026", Revenue: "192700", Customers: "1523", Churn_Rate: "2.1", MRR: "160583", Support_Tickets: "72" },
  { Month: "Jul 2026", Revenue: "198300", Customers: "1589", Churn_Rate: "2.4", MRR: "165250", Support_Tickets: "85" },
  { Month: "Aug 2026", Revenue: "210500", Customers: "1645", Churn_Rate: "1.9", MRR: "175417", Support_Tickets: "63" },
  { Month: "Sep 2026", Revenue: "205800", Customers: "1612", Churn_Rate: "3.1", MRR: "171500", Support_Tickets: "97" },
  { Month: "Oct 2026", Revenue: "224100", Customers: "1701", Churn_Rate: "2.0", MRR: "186750", Support_Tickets: "71" },
  { Month: "Nov 2026", Revenue: "231600", Customers: "1768", Churn_Rate: "1.8", MRR: "193000", Support_Tickets: "65" },
  { Month: "Dec 2026", Revenue: "248900", Customers: "1834", Churn_Rate: "1.6", MRR: "207417", Support_Tickets: "58" },
];

// ── Seeded random number generator (LCG) ──
class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    // LCG parameters (Numerical Recipes)
    this.state = (this.state * 1664525 + 1013904223) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

// ── Dimension: regions (5 rows) ──
export function generateRegions(): Record<string, string>[] {
  return [
    { Region_ID: "R-01", Region_Name: "DACH", Head_of_Region: "Klaus Weber", Target_Revenue: "2500000", Currency: "EUR" },
    { Region_ID: "R-02", Region_Name: "North America", Head_of_Region: "Sarah Mitchell", Target_Revenue: "4000000", Currency: "USD" },
    { Region_ID: "R-03", Region_Name: "UK/Ireland", Head_of_Region: "James O'Brien", Target_Revenue: "1800000", Currency: "GBP" },
    { Region_ID: "R-04", Region_Name: "MENA", Head_of_Region: "Ahmed Al-Rashid", Target_Revenue: "1200000", Currency: "AED" },
    { Region_ID: "R-05", Region_Name: "APAC", Head_of_Region: "Yuki Tanaka", Target_Revenue: "2000000", Currency: "JPY" },
  ];
}

// ── Dimension: products (20 rows) ──
export function generateProducts(): Record<string, string>[] {
  const products = [
    { Product_ID: "P-001", Product_Name: "Enterprise License", Category: "Software", Sub_Category: "Core Platform", Launch_Date: "2023-01-15", Price_Tier: "Enterprise" },
    { Product_ID: "P-002", Product_Name: "Cloud Storage Pro", Category: "Software", Sub_Category: "Storage", Launch_Date: "2023-03-01", Price_Tier: "Premium" },
    { Product_ID: "P-003", Product_Name: "Analytics Suite", Category: "Software", Sub_Category: "Business Intelligence", Launch_Date: "2023-06-10", Price_Tier: "Premium" },
    { Product_ID: "P-004", Product_Name: "DevOps Toolkit", Category: "Software", Sub_Category: "Developer Tools", Launch_Date: "2023-09-20", Price_Tier: "Standard" },
    { Product_ID: "P-005", Product_Name: "Security Gateway", Category: "Software", Sub_Category: "Security", Launch_Date: "2024-01-05", Price_Tier: "Enterprise" },
    { Product_ID: "P-006", Product_Name: "Server Rack Pro", Category: "Hardware", Sub_Category: "Servers", Launch_Date: "2023-02-28", Price_Tier: "Enterprise" },
    { Product_ID: "P-007", Product_Name: "Network Switch 48", Category: "Hardware", Sub_Category: "Networking", Launch_Date: "2023-05-15", Price_Tier: "Standard" },
    { Product_ID: "P-008", Product_Name: "Firewall Appliance", Category: "Hardware", Sub_Category: "Security", Launch_Date: "2023-08-01", Price_Tier: "Premium" },
    { Product_ID: "P-009", Product_Name: "Edge Compute Node", Category: "Hardware", Sub_Category: "Edge Computing", Launch_Date: "2024-03-10", Price_Tier: "Premium" },
    { Product_ID: "P-010", Product_Name: "Storage Array 100T", Category: "Hardware", Sub_Category: "Storage", Launch_Date: "2024-06-01", Price_Tier: "Enterprise" },
    { Product_ID: "P-011", Product_Name: "Implementation Package", Category: "Services", Sub_Category: "Professional Services", Launch_Date: "2023-01-01", Price_Tier: "Enterprise" },
    { Product_ID: "P-012", Product_Name: "Data Migration Service", Category: "Services", Sub_Category: "Migration", Launch_Date: "2023-04-15", Price_Tier: "Premium" },
    { Product_ID: "P-013", Product_Name: "Custom Integration", Category: "Services", Sub_Category: "Integration", Launch_Date: "2023-07-20", Price_Tier: "Enterprise" },
    { Product_ID: "P-014", Product_Name: "Training Workshop", Category: "Services", Sub_Category: "Education", Launch_Date: "2023-10-01", Price_Tier: "Standard" },
    { Product_ID: "P-015", Product_Name: "Architecture Review", Category: "Services", Sub_Category: "Consulting", Launch_Date: "2024-02-01", Price_Tier: "Premium" },
    { Product_ID: "P-016", Product_Name: "Basic Support Plan", Category: "Support", Sub_Category: "Tier 1", Launch_Date: "2023-01-01", Price_Tier: "Basic" },
    { Product_ID: "P-017", Product_Name: "Premium Support 24/7", Category: "Support", Sub_Category: "Tier 2", Launch_Date: "2023-01-01", Price_Tier: "Premium" },
    { Product_ID: "P-018", Product_Name: "Dedicated TAM", Category: "Support", Sub_Category: "Tier 3", Launch_Date: "2023-06-01", Price_Tier: "Enterprise" },
    { Product_ID: "P-019", Product_Name: "Managed Services", Category: "Support", Sub_Category: "Managed", Launch_Date: "2024-01-15", Price_Tier: "Enterprise" },
    { Product_ID: "P-020", Product_Name: "SLA Upgrade Pack", Category: "Support", Sub_Category: "SLA", Launch_Date: "2024-05-01", Price_Tier: "Standard" },
  ];
  return products;
}

// ── Dimension: customers (50 rows) ──
export function generateCustomers(): Record<string, string>[] {
  const rng = new SeededRandom(54321);
  const companies = [
    "Acme Corp", "TechVision GmbH", "GlobalFin Solutions", "MedTech Innovations", "RetailMax AG",
    "Quantum Systems", "CloudNine Technologies", "DataStream Analytics", "CyberShield Security", "GreenEnergy Partners",
    "SmartFactory AI", "NexGen Pharma", "UrbanTech Mobility", "FinScope Capital", "BluePeak Software",
    "OceanView Logistics", "SkyBridge Networks", "AlphaWave Robotics", "PrimeCare Health", "Stellar Commerce",
    "NovaTech Industries", "Apex Manufacturing", "Pinnacle Consulting", "Horizon Media Group", "SwiftPay Financial",
    "IronForge Steel", "Vertex Dynamics", "Luminary Labs", "EcoSphere Solutions", "Titan Automotive",
    "FrostByte Gaming", "Redwood Analytics", "Atlas Infrastructure", "Sapphire Insurance", "CrystalClear Optics",
    "DynaCorp Engineering", "PureWater Technologies", "SilkRoute Trading", "Falcon Aerospace", "Mosaic Digital",
    "Keystone Partners", "Northwind Traders", "Eastgate Ventures", "SouthStar Energy", "Westfield Retail",
    "CentricPoint Solutions", "Endeavor Systems", "Bridgewater Tech", "Catalyst Innovations", "Summit Healthcare",
  ];
  const industries = ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail"];
  const countries = ["Germany", "USA", "UK", "UAE", "France", "Japan", "Canada", "Australia", "Switzerland", "Singapore"];
  const segments = ["SMB", "Mid-Market", "Enterprise"];
  const managers = ["Lisa Mueller", "Tom Johnson", "Priya Sharma", "David Chen", "Maria Santos",
    "Hans Fischer", "Emma Wilson", "Raj Patel", "Sophie Laurent", "Kenji Yamamoto"];

  const customers: Record<string, string>[] = [];
  for (let i = 0; i < 50; i++) {
    const cid = `C-${String(i + 1).padStart(3, "0")}`;
    const segment = rng.pick(segments);
    const acvMin = segment === "SMB" ? 10000 : segment === "Mid-Market" ? 50000 : 150000;
    const acvMax = segment === "SMB" ? 49999 : segment === "Mid-Market" ? 149999 : 500000;
    const acv = rng.nextInt(acvMin, acvMax);
    const yearStart = rng.nextInt(2023, 2025);
    const monthStart = rng.nextInt(1, 12);
    const dayStart = rng.nextInt(1, 28);
    customers.push({
      Customer_ID: cid,
      Company_Name: companies[i],
      Industry: rng.pick(industries),
      Country: rng.pick(countries),
      Segment: segment,
      Account_Manager: rng.pick(managers),
      Contract_Start: `${yearStart}-${String(monthStart).padStart(2, "0")}-${String(dayStart).padStart(2, "0")}`,
      Annual_Contract_Value: String(acv),
    });
  }
  return customers;
}

// ── Fact: sales_transactions (200 rows) ──
export function generateSalesTransactions(): Record<string, string>[] {
  const rng = new SeededRandom(12345);
  const salesReps = [
    "Michael Torres", "Anna Schneider", "James Lee", "Sophie Martin",
    "Robert Kim", "Elena Volkov", "Daniel Braun", "Fatima Hassan",
    "Chris Anderson", "Julia Becker",
  ];
  const channels = ["Online", "Retail", "Partner", "Direct"];

  const transactions: Record<string, string>[] = [];
  for (let i = 0; i < 200; i++) {
    const tid = `T-${String(i + 1).padStart(4, "0")}`;
    const month = rng.nextInt(1, 12);
    const day = rng.nextInt(1, 28);
    const date = `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const productId = `P-${String(rng.nextInt(1, 20)).padStart(3, "0")}`;
    const customerId = `C-${String(rng.nextInt(1, 50)).padStart(3, "0")}`;
    const regionId = `R-${String(rng.nextInt(1, 5)).padStart(2, "0")}`;
    const quantity = rng.nextInt(1, 50);
    const unitPrice = rng.nextInt(10, 500);
    const revenue = quantity * unitPrice;
    const discountPct = rng.nextInt(0, 25);
    const netRevenue = Math.round(revenue * (1 - discountPct / 100) * 100) / 100;
    const costFactor = 0.4 + rng.next() * 0.3; // 0.4-0.7
    const cost = Math.round(revenue * costFactor * 100) / 100;
    const profit = Math.round((netRevenue - cost) * 100) / 100;

    transactions.push({
      Transaction_ID: tid,
      Date: date,
      Product_ID: productId,
      Customer_ID: customerId,
      Region_ID: regionId,
      Quantity: String(quantity),
      Unit_Price: String(unitPrice),
      Revenue: String(revenue),
      "Discount_%": String(discountPct),
      Net_Revenue: String(netRevenue),
      Cost: String(cost),
      Profit: String(profit),
      Sales_Rep: rng.pick(salesReps),
      Channel: rng.pick(channels),
    });
  }
  return transactions;
}

function ensureStarSchemaData() {
  const datasets = getAllDatasets();

  // Regions
  if (!datasets.some((d) => d.id === "regions")) {
    const rows = generateRegions();
    const ds: DatasetFull = {
      id: "regions",
      name: "Regions (Dimension)",
      fileName: "regions.csv",
      uploadedAt: "2025-01-01T00:00:00.000Z",
      rowCount: rows.length,
      columnCount: 5,
      headers: ["Region_ID", "Region_Name", "Head_of_Region", "Target_Revenue", "Currency"],
      columnTypes: {
        Region_ID: "string",
        Region_Name: "string",
        Head_of_Region: "string",
        Target_Revenue: "number",
        Currency: "string",
      },
      rows,
    };
    saveDataset(ds);
  }

  // Products
  if (!datasets.some((d) => d.id === "products")) {
    const rows = generateProducts();
    const ds: DatasetFull = {
      id: "products",
      name: "Products (Dimension)",
      fileName: "products.csv",
      uploadedAt: "2025-01-01T00:00:00.000Z",
      rowCount: rows.length,
      columnCount: 6,
      headers: ["Product_ID", "Product_Name", "Category", "Sub_Category", "Launch_Date", "Price_Tier"],
      columnTypes: {
        Product_ID: "string",
        Product_Name: "string",
        Category: "string",
        Sub_Category: "string",
        Launch_Date: "string",
        Price_Tier: "string",
      },
      rows,
    };
    saveDataset(ds);
  }

  // Customers
  if (!datasets.some((d) => d.id === "customers")) {
    const rows = generateCustomers();
    const ds: DatasetFull = {
      id: "customers",
      name: "Customers (Dimension)",
      fileName: "customers.csv",
      uploadedAt: "2025-01-01T00:00:00.000Z",
      rowCount: rows.length,
      columnCount: 8,
      headers: ["Customer_ID", "Company_Name", "Industry", "Country", "Segment", "Account_Manager", "Contract_Start", "Annual_Contract_Value"],
      columnTypes: {
        Customer_ID: "string",
        Company_Name: "string",
        Industry: "string",
        Country: "string",
        Segment: "string",
        Account_Manager: "string",
        Contract_Start: "string",
        Annual_Contract_Value: "number",
      },
      rows,
    };
    saveDataset(ds);
  }

  // Sales Transactions
  if (!datasets.some((d) => d.id === "sales_transactions")) {
    const rows = generateSalesTransactions();
    const ds: DatasetFull = {
      id: "sales_transactions",
      name: "Sales Transactions (Fact)",
      fileName: "sales_transactions.csv",
      uploadedAt: "2025-01-01T00:00:00.000Z",
      rowCount: rows.length,
      columnCount: 14,
      headers: [
        "Transaction_ID", "Date", "Product_ID", "Customer_ID", "Region_ID",
        "Quantity", "Unit_Price", "Revenue", "Discount_%", "Net_Revenue",
        "Cost", "Profit", "Sales_Rep", "Channel",
      ],
      columnTypes: {
        Transaction_ID: "string",
        Date: "string",
        Product_ID: "string",
        Customer_ID: "string",
        Region_ID: "string",
        Quantity: "number",
        Unit_Price: "number",
        Revenue: "number",
        "Discount_%": "number",
        Net_Revenue: "number",
        Cost: "number",
        Profit: "number",
        Sales_Rep: "string",
        Channel: "string",
      },
      rows,
    };
    saveDataset(ds);
  }
}

export function ensureSeedData() {
  const datasets = getAllDatasets();
  if (!datasets.some((d) => d.id === SEED_ID)) {
    const dataset: DatasetFull = {
      id: SEED_ID,
      name: "Sales Performance 2026",
      fileName: "sales_performance_2026.csv",
      uploadedAt: "2026-04-01T00:00:00.000Z",
      rowCount: seedRows.length,
      columnCount: 6,
      headers: ["Month", "Revenue", "Customers", "Churn_Rate", "MRR", "Support_Tickets"],
      columnTypes: {
        Month: "string",
        Revenue: "number",
        Customers: "number",
        Churn_Rate: "number",
        MRR: "number",
        Support_Tickets: "number",
      },
      rows: seedRows,
    };
    saveDataset(dataset);
  }

  // Also ensure star schema datasets
  ensureStarSchemaData();
}
