import { SeededRandom, n, nf } from "./demo-datasets";
import type { DemoTable } from "./demo-datasets";

// ── Name pools ──
const FIRST_NAMES = [
  "Alexander", "Maria", "James", "Sophie", "Oliver", "Emma", "Liam", "Elena",
  "Noah", "Mia", "Elias", "Anna", "Ben", "Clara", "Felix", "Laura",
  "Max", "Lena", "Paul", "Hanna", "Leon", "Julia", "Finn", "Sarah",
  "David", "Lisa", "Daniel", "Katharina", "Lukas", "Eva", "Niklas", "Jana",
  "Jonas", "Marie", "Tim", "Sophia", "Moritz", "Leonie", "Simon", "Nora",
  "Tom", "Amelie", "Jan", "Emilia", "Philipp", "Charlotte", "Erik", "Johanna",
  "Sebastian", "Alina", "Julian", "Miriam", "Tobias", "Theresa", "Markus", "Claudia",
  "Stefan", "Andrea", "Christian", "Sabine", "Andreas", "Petra", "Thomas", "Monika",
  "Michael", "Gabriele", "Martin", "Nicole", "Peter", "Sandra", "Frank", "Kerstin",
  "Matthias", "Stefanie", "Robert", "Melanie", "Patrick", "Diana", "Marco", "Rebecca",
  "Ahmed", "Fatima", "Omar", "Aisha", "Yusuf", "Leila", "Hassan", "Nadia",
  "Raj", "Priya", "Amit", "Sita", "Vikram", "Deepika", "Arjun", "Meera",
  "Wei", "Mei", "Chen", "Ling", "Zhang", "Xia", "Li", "Yue",
  "Jean", "Isabelle", "Pierre", "Camille", "Antoine", "Chloe", "Hugo", "Manon",
  "Luca", "Giulia", "Alessandro", "Francesca", "Valentina",
  "Carlos", "Isabella", "Diego", "Carmen", "Pablo", "Lucia", "Javier",
  "John", "Emily", "William", "Jessica", "Richard", "Ashley", "Joseph", "Samantha",
  "Charles", "Jennifer", "George", "Megan", "Edward", "Rachel", "Henry", "Lauren",
  "Kenji", "Yuki", "Takashi", "Sakura", "Hiroshi", "Akiko", "Ryo", "Haruka",
  "Piotr", "Agnieszka", "Krzysztof", "Katarzyna", "Tomasz", "Magdalena", "Marek", "Ewa",
] as const;

const LAST_NAMES = [
  "Mueller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
  "Schulz", "Hoffmann", "Koch", "Richter", "Wolf", "Klein", "Schroeder", "Neumann",
  "Schwarz", "Braun", "Krueger", "Werner", "Lange", "Hartmann", "Fuchs", "Lehmann",
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris",
  "Martin", "Thompson", "Robinson", "Clark", "Lewis", "Lee", "Walker", "Hall",
  "O'Brien", "Murphy", "Kelly", "Walsh", "Ryan", "Byrne", "Doyle", "Gallagher",
  "Dubois", "Laurent", "Bernard", "Moreau", "Petit", "Robert", "Richard", "Durand",
  "Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci",
  "Gonzalez", "Rodriguez", "Martinez", "Lopez", "Hernandez", "Perez", "Sanchez", "Ramirez",
  "Tanaka", "Suzuki", "Watanabe", "Takahashi", "Ito", "Yamamoto", "Nakamura", "Kobayashi",
  "Nowak", "Kowalski", "Wozniak", "Lewandowski", "Kaminski", "Zielinski", "Jankowski", "Mazur",
  "Al-Rashid", "Al-Farsi", "Hassan", "Ibrahim", "Khalil", "Mansour", "Nasser", "Saleh",
  "Patel", "Sharma", "Singh", "Kumar", "Gupta", "Agarwal", "Mehta", "Joshi",
  "Wang", "Zhang", "Liu", "Chen", "Yang", "Huang", "Zhou", "Wu",
] as const;

// ── Industrial company names for customers ──
const SI_COMPANIES: { name: string; industry: string }[] = [
  { name: "BMW AG", industry: "Automotive" },
  { name: "Deutsche Bahn AG", industry: "Transport" },
  { name: "Volkswagen Group", industry: "Automotive" },
  { name: "BASF SE", industry: "Manufacturing" },
  { name: "Bosch GmbH", industry: "Manufacturing" },
  { name: "E.ON SE", industry: "Energy" },
  { name: "ThyssenKrupp AG", industry: "Manufacturing" },
  { name: "Continental AG", industry: "Automotive" },
  { name: "Daimler Truck AG", industry: "Automotive" },
  { name: "HeidelbergCement AG", industry: "Manufacturing" },
  { name: "SAP SE", industry: "Manufacturing" },
  { name: "Infineon Technologies", industry: "Manufacturing" },
  { name: "Fresenius SE", industry: "Healthcare" },
  { name: "Henkel AG", industry: "Manufacturing" },
  { name: "Merck KGaA", industry: "Healthcare" },
  { name: "Deutsche Post DHL", industry: "Transport" },
  { name: "RWE AG", industry: "Energy" },
  { name: "EnBW Energie", industry: "Energy" },
  { name: "Salzgitter AG", industry: "Manufacturing" },
  { name: "MAN Energy Solutions", industry: "Energy" },
  { name: "Airbus SE", industry: "Manufacturing" },
  { name: "Fraport AG", industry: "Transport" },
  { name: "Hamburger Hafen", industry: "Transport" },
  { name: "Porsche AG", industry: "Automotive" },
  { name: "Audi AG", industry: "Automotive" },
  { name: "ABB Ltd", industry: "Manufacturing" },
  { name: "Schneider Electric", industry: "Energy" },
  { name: "Shell Deutschland", industry: "Energy" },
  { name: "TotalEnergies DE", industry: "Energy" },
  { name: "Vattenfall Europe", industry: "Energy" },
  { name: "Bayer AG", industry: "Healthcare" },
  { name: "Charite Hospital", industry: "Healthcare" },
  { name: "Universitaetsklinikum Heidelberg", industry: "Healthcare" },
  { name: "Koenig & Bauer AG", industry: "Manufacturing" },
  { name: "Trumpf GmbH", industry: "Manufacturing" },
  { name: "Liebherr Group", industry: "Manufacturing" },
  { name: "Voith GmbH", industry: "Manufacturing" },
  { name: "ZF Friedrichshafen", industry: "Automotive" },
  { name: "Schaeffler AG", industry: "Automotive" },
  { name: "Wacker Chemie AG", industry: "Manufacturing" },
  { name: "Metro AG", industry: "Buildings" },
  { name: "Union Investment", industry: "Buildings" },
  { name: "Commerz Real AG", industry: "Buildings" },
  { name: "ECE Projektmanagement", industry: "Buildings" },
  { name: "Goldbeck GmbH", industry: "Buildings" },
  { name: "Hochtief AG", industry: "Buildings" },
  { name: "Strabag SE", industry: "Buildings" },
  { name: "Bilfinger SE", industry: "Buildings" },
  { name: "Drees & Sommer", industry: "Buildings" },
  { name: "Implenia AG", industry: "Buildings" },
  { name: "Network Rail UK", industry: "Transport" },
  { name: "SNCF France", industry: "Transport" },
  { name: "Trenitalia SpA", industry: "Transport" },
  { name: "FS Italiane", industry: "Transport" },
  { name: "NS Dutch Railways", industry: "Transport" },
  { name: "SBB Switzerland", industry: "Transport" },
  { name: "OBB Austria", industry: "Transport" },
  { name: "PKP Poland", industry: "Transport" },
  { name: "Renfe Spain", industry: "Transport" },
  { name: "CP Portugal", industry: "Transport" },
  { name: "General Motors", industry: "Automotive" },
  { name: "Ford Motor Company", industry: "Automotive" },
  { name: "Toyota Motor Corp", industry: "Automotive" },
  { name: "Hyundai Motor Group", industry: "Automotive" },
  { name: "Tata Motors", industry: "Automotive" },
  { name: "BHP Group", industry: "Manufacturing" },
  { name: "Rio Tinto", industry: "Manufacturing" },
  { name: "ArcelorMittal", industry: "Manufacturing" },
  { name: "Nippon Steel", industry: "Manufacturing" },
  { name: "POSCO Holdings", industry: "Manufacturing" },
  { name: "Duke Energy", industry: "Energy" },
  { name: "NextEra Energy", industry: "Energy" },
  { name: "Enel SpA", industry: "Energy" },
  { name: "Iberdrola SA", industry: "Energy" },
  { name: "EDF France", industry: "Energy" },
  { name: "Skanska AB", industry: "Buildings" },
  { name: "Vinci SA", industry: "Buildings" },
  { name: "Bouygues SA", industry: "Buildings" },
  { name: "Balfour Beatty", industry: "Buildings" },
  { name: "Fluor Corporation", industry: "Buildings" },
  { name: "Siemens Healthineers", industry: "Healthcare" },
  { name: "Philips Healthcare", industry: "Healthcare" },
  { name: "GE Healthcare", industry: "Healthcare" },
  { name: "Medtronic plc", industry: "Healthcare" },
  { name: "Johnson & Johnson Med", industry: "Healthcare" },
  { name: "Caterpillar Inc", industry: "Manufacturing" },
  { name: "John Deere", industry: "Manufacturing" },
  { name: "Honeywell Intl", industry: "Manufacturing" },
  { name: "Emerson Electric", industry: "Manufacturing" },
  { name: "Rockwell Automation", industry: "Manufacturing" },
  { name: "Mitsubishi Electric", industry: "Manufacturing" },
  { name: "Fanuc Corporation", industry: "Manufacturing" },
  { name: "Yaskawa Electric", industry: "Manufacturing" },
  { name: "Kuka AG", industry: "Manufacturing" },
  { name: "Festo SE", industry: "Manufacturing" },
  { name: "Beckhoff Automation", industry: "Manufacturing" },
  { name: "Endress+Hauser", industry: "Manufacturing" },
  { name: "Sick AG", industry: "Manufacturing" },
  { name: "Pepperl+Fuchs", industry: "Manufacturing" },
  { name: "Turck GmbH", industry: "Manufacturing" },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Project names (80) ──
const PROJECT_NAMES = [
  "Munich Metro Line 5 Signaling", "BMW Factory Automation Phase 3", "BASF Process Control Upgrade",
  "Deutsche Bahn ICE Fleet Monitoring", "VW Wolfsburg Smart Factory", "E.ON Grid Modernization",
  "ThyssenKrupp Steel Mill Digitalization", "Continental Tire Plant IoT", "Daimler Truck Telematics",
  "Heidelberg Cement Kiln Optimization", "Airbus Wing Assembly Robotics", "Porsche Paint Shop Automation",
  "ABB Switchgear Integration", "Shell Refinery Control System", "Network Rail ETCS Rollout",
  "SNCF TGV Next-Gen Signaling", "Trenitalia High-Speed Monitoring", "SBB Gotthard Tunnel Systems",
  "Bosch Smart Campus Energy", "Infineon Fab Clean Room Controls", "Fresenius Dialysis Plant Automation",
  "Henkel Packaging Line Upgrade", "Merck Lab Automation Suite", "DHL Sorting Center Robotics",
  "RWE Wind Farm SCADA", "EnBW Solar Park Management", "Salzgitter Rolling Mill Drives",
  "MAN Marine Engine Controls", "Fraport Terminal Automation", "Hamburg Port Crane Systems",
  "Audi e-tron Assembly Line", "BHP Mining Automation", "Rio Tinto Autonomous Haul",
  "ArcelorMittal Blast Furnace Controls", "Nippon Steel Quality System", "Duke Energy Substation Upgrade",
  "NextEra Solar Inverter Network", "Enel Smart Grid Italy", "Iberdrola Wind Management",
  "EDF Nuclear Safety Systems", "Skanska Building Management", "Vinci Highway Tolling",
  "Bouygues Tower Automation", "Balfour Beatty Rail Electrification", "Caterpillar Fleet Management",
  "John Deere Precision Farming", "Honeywell Plant Integration", "Emerson Valve Automation",
  "Rockwell MES Implementation", "Mitsubishi EV Charging Infra", "Fanuc Robot Cell Design",
  "Yaskawa Welding Robot Line", "Kuka Automotive Body Shop", "Festo Pneumatic Line Upgrade",
  "Beckhoff EtherCAT Rollout", "Endress Hauser Flow Measurement", "Sick Vision System Integration",
  "GE Healthcare MRI Facility", "Philips CT Scanner Network", "Medtronic Clean Room Controls",
  "Toyota Paint Shop Upgrade", "Hyundai EV Battery Factory", "Tata Steel DCS Migration",
  "POSCO Smart Steel Works", "Fluor Petrochemical Control", "Charite Hospital BMS",
  "Ford Assembly Plant MES", "GM EV Platform Controls", "PKP Station Modernization",
  "Renfe AVE Signaling Extension", "CP Lisbon Metro Upgrade", "OBB Brenner Base Tunnel",
  "NS Rotterdam Station BMS", "Goldbeck Modular Factory", "Hochtief Tunnel Ventilation",
  "Strabag Highway Systems", "Bilfinger Maintenance Platform", "Implenia Bridge Monitoring",
  "Wacker Chemie Reactor Control", "ZF Transmission Line Automation",
];

// ─── Main generator ─────────────────────────────────────────────────────────

export function generateSiemensData(): DemoTable[] {
  const rng = new SeededRandom(888_001);

  // ── Customers (100 rows) ──
  const siCountries = ["Germany", "UK", "France", "USA", "China", "Japan", "India", "Brazil", "Italy", "Spain", "Netherlands", "Switzerland", "Austria", "Poland", "Australia"] as const;
  const segments = ["Key Account", "Enterprise", "Mid-Market"] as const;
  const creditRatings = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "B"] as const;
  const accountManagers = [
    "Klaus Berger", "Sarah Thompson", "Pierre Lefevre", "Chen Wei", "Priya Nair",
    "Marco Rossi", "Kenji Ito", "Anna Kowalska", "Hans Friedrich", "Emma Collins",
    "Rafael Santos", "Yuki Tanaka", "Thomas Meier", "Lisa Andersen", "David Kim",
  ] as const;

  const siCustomers: Record<string, string>[] = [];
  for (let i = 0; i < 100; i++) {
    const cid = `SC-${String(i + 1).padStart(3, "0")}`;
    const comp = SI_COMPANIES[i];
    const seg = rng.pickWeighted(segments, [25, 40, 35]);
    const acvMin = seg === "Key Account" ? 2_000_000 : seg === "Enterprise" ? 500_000 : 100_000;
    const acvMax = seg === "Key Account" ? 15_000_000 : seg === "Enterprise" ? 4_000_000 : 999_000;
    const acv = rng.nextInt(acvMin, acvMax);
    const relSince = rng.nextInt(1995, 2023);
    const payRel = rng.nextFloat(75, 100, 1);

    siCustomers.push({
      Customer_ID: cid,
      Company_Name: comp.name,
      Industry: comp.industry,
      Country: rng.pick(siCountries),
      Segment: seg,
      Account_Manager: rng.pick(accountManagers),
      Annual_Contract_Value: n(acv),
      Relationship_Since: n(relSince),
      Credit_Rating: rng.pickWeighted(creditRatings, [5, 8, 12, 10, 15, 15, 10, 8, 7, 4, 3, 2, 1]),
      Payment_Reliability_Pct: nf(payRel, 1),
    });
  }

  // ── Orders (400 rows) ──
  const businessUnits = ["Digital Industries", "Smart Infrastructure", "Mobility"] as const;
  const productLines: Record<string, readonly string[]> = {
    "Digital Industries": ["Automation", "Drives", "Industrial Software", "Process Automation"],
    "Smart Infrastructure": ["Building Tech", "Grid Solutions", "Electrification", "Energy Storage"],
    "Mobility": ["Rail Systems", "Signaling", "Rolling Stock", "Service & Maintenance"],
  };
  const orderStatuses = ["Booked", "In Production", "Shipped", "Delivered", "Invoiced"] as const;
  const paymentTerms = ["Net 30", "Net 60", "Net 90", "Letter of Credit"] as const;
  const orderCurrencies = ["EUR", "USD", "CNY", "GBP"] as const;
  const regions = ["EMEA", "Americas", "APAC"] as const;

  const orders: Record<string, string>[] = [];
  for (let i = 1; i <= 400; i++) {
    const oid = `SO-${String(i).padStart(5, "0")}`;
    const date = rng.dateInRange("2024-06-01", "2025-12-31");
    const custIdx = rng.nextInt(0, 99);
    const cid = siCustomers[custIdx].Customer_ID;
    const bu = rng.pickWeighted(businessUnits, [45, 30, 25]);
    const pl = rng.pick(productLines[bu]);
    const orderValue = rng.nextInt(10_000, 5_000_000);
    const currency = rng.pick(orderCurrencies);
    const region = rng.pick(regions);
    const status = rng.pickWeighted(orderStatuses, [15, 20, 15, 25, 25]);
    const marginPct = rng.nextFloat(15, 45, 1);

    const orderDate = new Date(date);
    const deliveryOffset = rng.nextInt(30, 365);
    const deliveryDate = new Date(orderDate.getTime() + deliveryOffset * 24 * 3600 * 1000);
    const delivStr = deliveryDate.toISOString().slice(0, 10);

    orders.push({
      Order_ID: oid,
      Date: date,
      Customer_ID: cid,
      Business_Unit: bu,
      Product_Line: pl,
      Order_Value: n(orderValue),
      Currency: currency,
      Region: region,
      Country: siCustomers[custIdx].Country,
      Status: status,
      Delivery_Date: delivStr,
      Payment_Terms: rng.pickWeighted(paymentTerms, [30, 35, 25, 10]),
      Margin_Pct: nf(marginPct, 1),
    });
  }

  // ── P&L (12 rows, FY2025 monthly) ──
  const siPnl: Record<string, string>[] = [];
  const pnlRng = new SeededRandom(888_002);
  for (let m = 1; m <= 12; m++) {
    const monthLabel = `${MONTH_NAMES[m - 1]} 2025`;
    const revenue = pnlRng.nextInt(38_000_000, 48_000_000);
    const materialCosts = Math.round(revenue * pnlRng.nextFloat(0.38, 0.45));
    const grossProfit = revenue - materialCosts;
    const grossMargin = parseFloat(((grossProfit / revenue) * 100).toFixed(1));
    const rdExpenses = Math.round(revenue * pnlRng.nextFloat(0.06, 0.09));
    const sgaExpenses = Math.round(revenue * pnlRng.nextFloat(0.10, 0.15));
    const restructuring = pnlRng.nextInt(0, 500_000);
    const ebit = grossProfit - rdExpenses - sgaExpenses - restructuring;
    const ebitMargin = parseFloat(((ebit / revenue) * 100).toFixed(1));
    const finIncomeExpense = pnlRng.nextInt(-200_000, 100_000);
    const tax = Math.max(0, Math.round((ebit + finIncomeExpense) * 0.28));
    const netIncome = ebit + finIncomeExpense - tax;
    const fcf = Math.round(netIncome + pnlRng.nextInt(-2_000_000, 3_000_000));
    const orderIntake = pnlRng.nextInt(35_000_000, 55_000_000);
    const bookToBill = parseFloat((orderIntake / revenue).toFixed(2));

    siPnl.push({
      Month: monthLabel,
      Revenue: n(revenue),
      Material_Costs: n(materialCosts),
      Gross_Profit: n(grossProfit),
      Gross_Margin_Pct: nf(grossMargin, 1),
      RnD_Expenses: n(rdExpenses),
      SGA_Expenses: n(sgaExpenses),
      Restructuring_Charges: n(restructuring),
      EBIT: n(ebit),
      EBIT_Margin_Pct: nf(ebitMargin, 1),
      Financial_Income_Expense: n(finIncomeExpense),
      Tax: n(tax),
      Net_Income: n(netIncome),
      Free_Cash_Flow: n(fcf),
      Order_Intake: n(orderIntake),
      Book_to_Bill_Ratio: nf(bookToBill),
    });
  }

  // ── Employees (200 rows) ──
  const departments = ["Engineering", "Sales", "Manufacturing", "R&D", "Finance", "HR", "IT", "Quality"] as const;
  const levels = ["Junior", "Senior", "Lead", "Manager", "Director", "VP"] as const;
  const empCountries = ["Germany", "UK", "USA", "China", "India", "France", "Austria", "Switzerland", "Poland", "Spain"] as const;

  const employees: Record<string, string>[] = [];
  const empRng = new SeededRandom(888_003);
  for (let i = 1; i <= 200; i++) {
    const eid = `SE-${String(i).padStart(4, "0")}`;
    const dept = empRng.pick(departments);
    const level = empRng.pickWeighted(levels, [25, 30, 20, 15, 7, 3]);
    const salaryBase: Record<string, number> = { Junior: 45000, Senior: 65000, Lead: 80000, Manager: 95000, Director: 120000, VP: 160000 };
    const salary = Math.round(salaryBase[level] * empRng.nextFloat(0.85, 1.25));
    const perfRating = empRng.pickWeighted([1, 2, 3, 4, 5], [3, 10, 35, 35, 17]);
    const utilization = dept === "Engineering" || dept === "R&D" || dept === "Manufacturing"
      ? empRng.nextFloat(65, 98, 0)
      : empRng.nextFloat(50, 85, 0);
    const trainingHrs = empRng.nextInt(4, 80);

    employees.push({
      Employee_ID: eid,
      Name: `${empRng.pick(FIRST_NAMES)} ${empRng.pick(LAST_NAMES)}`,
      Department: dept,
      Level: level,
      Business_Unit: empRng.pick(businessUnits),
      Country: empRng.pick(empCountries),
      Salary: n(salary),
      Start_Date: empRng.dateInRange("2005-01-01", "2025-06-30"),
      Performance_Rating: n(perfRating),
      Utilization_Pct: nf(utilization, 0),
      Training_Hours_YTD: n(trainingHrs),
    });
  }

  // ── Projects (80 rows) ──
  const projRng = new SeededRandom(888_004);
  const projects: Record<string, string>[] = [];
  for (let i = 0; i < 80; i++) {
    const pid = `SP-${String(i + 1).padStart(3, "0")}`;
    const custIdx = projRng.nextInt(0, 99);
    const cid = siCustomers[custIdx].Customer_ID;
    const bu = projRng.pick(businessUnits);
    const startDate = projRng.dateInRange("2023-01-01", "2025-06-30");
    const durationDays = projRng.nextInt(90, 730);
    const endDate = new Date(new Date(startDate).getTime() + durationDays * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const budget = projRng.nextInt(200_000, 8_000_000);
    const completionPct = projRng.nextInt(0, 100);
    const actualCost = Math.round(budget * (completionPct / 100) * projRng.nextFloat(0.85, 1.20));
    const revenueRecognized = Math.round(budget * (completionPct / 100) * projRng.nextFloat(1.05, 1.30));
    const statusOpts = ["Planning", "Active", "On Hold", "Completed", "Cancelled"] as const;
    const status = completionPct === 100
      ? "Completed"
      : completionPct === 0
        ? "Planning"
        : projRng.pickWeighted(statusOpts, [5, 60, 10, 15, 10]);
    const riskLevel = actualCost > budget * (completionPct / 100) * 1.1
      ? "Red"
      : actualCost > budget * (completionPct / 100) * 1.0
        ? "Yellow"
        : "Green";
    const pm = `${projRng.pick(FIRST_NAMES)} ${projRng.pick(LAST_NAMES)}`;

    projects.push({
      Project_ID: pid,
      Project_Name: PROJECT_NAMES[i],
      Customer_ID: cid,
      Business_Unit: bu,
      Start_Date: startDate,
      End_Date: endDate,
      Budget: n(budget),
      Actual_Cost: n(actualCost),
      Revenue_Recognized: n(revenueRecognized),
      Completion_Pct: n(completionPct),
      Status: status,
      Risk_Level: riskLevel,
      Project_Manager: pm,
    });
  }

  // ── Supply Chain (150 rows) ──
  const supplierNames = [
    "Foxconn Electronics", "Texas Instruments", "STMicroelectronics", "NXP Semiconductors",
    "Murata Manufacturing", "TDK Corporation", "Panasonic Industrial", "Samsung SDI",
    "LG Chem", "CATL Battery", "Schaeffler Bearings", "SKF Group", "NSK Ltd",
    "Timken Company", "Bosch Rexroth", "Parker Hannifin", "Eaton Corporation",
    "Danfoss A/S", "Schneider Components", "Rittal GmbH", "Phoenix Contact",
    "Weidmuller GmbH", "Harting Technology", "TE Connectivity", "Amphenol Corp",
    "Lapp Group", "Nexans SA", "Prysmian Group", "BASF Materials", "Covestro AG",
    "Evonik Industries", "Lanxess AG", "Henkel Adhesives", "3M Industrial",
    "Microsoft Embedded", "Wind River Systems", "Red Hat Enterprise", "VMware Industrial",
  ] as const;
  const componentCategories = ["Electronics", "Mechanical", "Software", "Raw Materials"] as const;
  const scCountries = ["Germany", "China", "Japan", "South Korea", "USA", "Taiwan", "Netherlands", "France", "Italy", "UK"] as const;

  const scRng = new SeededRandom(888_005);
  const supplyChain: Record<string, string>[] = [];
  for (let i = 1; i <= 150; i++) {
    const poId = `PO-${String(i).padStart(5, "0")}`;
    const supplier = scRng.pick(supplierNames);
    const cat = scRng.pick(componentCategories);
    const orderDate = scRng.dateInRange("2024-01-01", "2025-10-31");
    const leadTime = scRng.nextInt(7, 120);
    const delivDate = new Date(new Date(orderDate).getTime() + leadTime * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const qty = scRng.nextInt(10, 5000);
    const unitCost = scRng.nextFloat(0.50, 2500, 2);
    const totalCost = parseFloat((qty * unitCost).toFixed(2));
    const qualityScore = scRng.nextInt(60, 100);
    const onTime = scRng.next() > 0.15 ? "Yes" : "No";

    supplyChain.push({
      PO_ID: poId,
      Supplier_Name: supplier,
      Component_Category: cat,
      Order_Date: orderDate,
      Delivery_Date: delivDate,
      Quantity: n(qty),
      Unit_Cost: nf(unitCost),
      Total_Cost: nf(totalCost),
      Quality_Score: n(qualityScore),
      Lead_Time_Days: n(leadTime),
      Country_of_Origin: scRng.pick(scCountries),
      On_Time_Delivery: onTime,
    });
  }

  // ── Budget vs Actual (48 rows: 4 BUs x 12 months) ──
  const bvaRng = new SeededRandom(888_006);
  const budgetVsActual: Record<string, string>[] = [];
  const bvaUnits = ["Digital Industries", "Smart Infrastructure", "Mobility", "Corporate/Other"] as const;
  const bvaRevBudgets: Record<string, number> = {
    "Digital Industries": 20_000_000,
    "Smart Infrastructure": 12_000_000,
    "Mobility": 8_000_000,
    "Corporate/Other": 2_000_000,
  };
  const bvaCostBudgets: Record<string, number> = {
    "Digital Industries": 14_000_000,
    "Smart Infrastructure": 9_000_000,
    "Mobility": 6_200_000,
    "Corporate/Other": 1_800_000,
  };
  const bvaHcBudgets: Record<string, number> = {
    "Digital Industries": 450,
    "Smart Infrastructure": 280,
    "Mobility": 220,
    "Corporate/Other": 80,
  };

  for (const bu of bvaUnits) {
    for (let m = 1; m <= 12; m++) {
      const monthLabel = `${MONTH_NAMES[m - 1]} 2025`;
      const revBudget = Math.round(bvaRevBudgets[bu] / 12);
      const revActual = Math.round(revBudget * bvaRng.nextFloat(0.88, 1.15));
      const costBudget = Math.round(bvaCostBudgets[bu] / 12);
      const costActual = Math.round(costBudget * bvaRng.nextFloat(0.90, 1.12));
      const hcBudget = bvaHcBudgets[bu];
      const hcActual = hcBudget + bvaRng.nextInt(-10, 10);

      budgetVsActual.push({
        Business_Unit: bu,
        Month: monthLabel,
        Revenue_Budget: n(revBudget),
        Revenue_Actual: n(revActual),
        Revenue_Variance: n(revActual - revBudget),
        Cost_Budget: n(costBudget),
        Cost_Actual: n(costActual),
        Cost_Variance: n(costActual - costBudget),
        Headcount_Budget: n(hcBudget),
        Headcount_Actual: n(hcActual),
      });
    }
  }

  // ── Assemble all tables ──
  return [
    {
      id: "si_orders",
      name: "Siemens Orders",
      rows: orders,
      headers: ["Order_ID", "Date", "Customer_ID", "Business_Unit", "Product_Line", "Order_Value", "Currency", "Region", "Country", "Status", "Delivery_Date", "Payment_Terms", "Margin_Pct"],
      columnTypes: {
        Order_ID: "string", Date: "date", Customer_ID: "string", Business_Unit: "string",
        Product_Line: "string", Order_Value: "number", Currency: "string", Region: "string",
        Country: "string", Status: "string", Delivery_Date: "date", Payment_Terms: "string",
        Margin_Pct: "number",
      },
    },
    {
      id: "si_customers",
      name: "Siemens Customers",
      rows: siCustomers,
      headers: ["Customer_ID", "Company_Name", "Industry", "Country", "Segment", "Account_Manager", "Annual_Contract_Value", "Relationship_Since", "Credit_Rating", "Payment_Reliability_Pct"],
      columnTypes: {
        Customer_ID: "string", Company_Name: "string", Industry: "string", Country: "string",
        Segment: "string", Account_Manager: "string", Annual_Contract_Value: "number",
        Relationship_Since: "number", Credit_Rating: "string", Payment_Reliability_Pct: "number",
      },
    },
    {
      id: "si_pnl",
      name: "Siemens P&L (Monthly FY2025)",
      rows: siPnl,
      headers: ["Month", "Revenue", "Material_Costs", "Gross_Profit", "Gross_Margin_Pct", "RnD_Expenses", "SGA_Expenses", "Restructuring_Charges", "EBIT", "EBIT_Margin_Pct", "Financial_Income_Expense", "Tax", "Net_Income", "Free_Cash_Flow", "Order_Intake", "Book_to_Bill_Ratio"],
      columnTypes: {
        Month: "string", Revenue: "number", Material_Costs: "number", Gross_Profit: "number",
        Gross_Margin_Pct: "number", RnD_Expenses: "number", SGA_Expenses: "number",
        Restructuring_Charges: "number", EBIT: "number", EBIT_Margin_Pct: "number",
        Financial_Income_Expense: "number", Tax: "number", Net_Income: "number",
        Free_Cash_Flow: "number", Order_Intake: "number", Book_to_Bill_Ratio: "number",
      },
    },
    {
      id: "si_employees",
      name: "Siemens Employees",
      rows: employees,
      headers: ["Employee_ID", "Name", "Department", "Level", "Business_Unit", "Country", "Salary", "Start_Date", "Performance_Rating", "Utilization_Pct", "Training_Hours_YTD"],
      columnTypes: {
        Employee_ID: "string", Name: "string", Department: "string", Level: "string",
        Business_Unit: "string", Country: "string", Salary: "number", Start_Date: "date",
        Performance_Rating: "number", Utilization_Pct: "number", Training_Hours_YTD: "number",
      },
    },
    {
      id: "si_projects",
      name: "Siemens Projects",
      rows: projects,
      headers: ["Project_ID", "Project_Name", "Customer_ID", "Business_Unit", "Start_Date", "End_Date", "Budget", "Actual_Cost", "Revenue_Recognized", "Completion_Pct", "Status", "Risk_Level", "Project_Manager"],
      columnTypes: {
        Project_ID: "string", Project_Name: "string", Customer_ID: "string",
        Business_Unit: "string", Start_Date: "date", End_Date: "date", Budget: "number",
        Actual_Cost: "number", Revenue_Recognized: "number", Completion_Pct: "number",
        Status: "string", Risk_Level: "string", Project_Manager: "string",
      },
    },
    {
      id: "si_supply_chain",
      name: "Siemens Supply Chain",
      rows: supplyChain,
      headers: ["PO_ID", "Supplier_Name", "Component_Category", "Order_Date", "Delivery_Date", "Quantity", "Unit_Cost", "Total_Cost", "Quality_Score", "Lead_Time_Days", "Country_of_Origin", "On_Time_Delivery"],
      columnTypes: {
        PO_ID: "string", Supplier_Name: "string", Component_Category: "string",
        Order_Date: "date", Delivery_Date: "date", Quantity: "number", Unit_Cost: "number",
        Total_Cost: "number", Quality_Score: "number", Lead_Time_Days: "number",
        Country_of_Origin: "string", On_Time_Delivery: "string",
      },
    },
    {
      id: "si_budget_vs_actual",
      name: "Siemens Budget vs Actual",
      rows: budgetVsActual,
      headers: ["Business_Unit", "Month", "Revenue_Budget", "Revenue_Actual", "Revenue_Variance", "Cost_Budget", "Cost_Actual", "Cost_Variance", "Headcount_Budget", "Headcount_Actual"],
      columnTypes: {
        Business_Unit: "string", Month: "string", Revenue_Budget: "number",
        Revenue_Actual: "number", Revenue_Variance: "number", Cost_Budget: "number",
        Cost_Actual: "number", Cost_Variance: "number", Headcount_Budget: "number",
        Headcount_Actual: "number",
      },
    },
  ];
}
