import { SeededRandom, n, nf } from "./demo-datasets";
import type { DemoTable } from "./demo-datasets";

// ── Realistic industrial company/customer names ──
const INDUSTRIAL_COMPANIES = [
  "Volkswagen AG", "BMW Group", "Mercedes-Benz", "Stellantis NV", "Toyota Europe",
  "BASF SE", "Bayer AG", "Evonik Industries", "Covestro AG", "Lanxess AG",
  "E.ON SE", "RWE AG", "Enel SpA", "Iberdrola SA", "TotalEnergies",
  "Airbus SE", "Rolls-Royce Holdings", "Safran SA", "Leonardo SpA", "BAE Systems",
  "Deutsche Bahn", "SNCF Group", "Trenitalia", "Alstom SA", "CAF SA",
  "Roche Holding", "Novartis AG", "Fresenius SE", "Philips NV", "Medtronic Europe",
  "ThyssenKrupp AG", "ArcelorMittal", "Salzgitter AG", "voestalpine AG", "Tata Steel Europe",
  "ABB Ltd", "Schneider Electric", "Honeywell Europe", "Emerson Electric", "Rockwell Automation",
  "Bosch Group", "Continental AG", "ZF Friedrichshafen", "Schaeffler AG", "Magna International",
  "Shell plc", "BP plc", "Equinor ASA", "OMV AG", "Repsol SA",
  "SAP SE", "Dassault Systemes", "Hexagon AB", "PTC Inc Europe", "Aveva Group",
  "Heidelberg Materials", "Holcim Group", "CRH plc", "Buzzi SpA", "Vicat SA",
  "Vattenfall AB", "Statkraft AS", "Orsted A/S", "EDP Renewables", "Vestas Wind",
  "Nestle SA", "Danone SA", "Unilever NV", "Henkel AG", "Beiersdorf AG",
  "Deutsche Post DHL", "DB Schenker", "Kuehne+Nagel", "DSV A/S", "Maersk Group",
  "Munich Re", "Allianz SE", "Zurich Insurance", "AXA Group", "Generali SpA",
  "UniCredit SpA", "Deutsche Bank", "BNP Paribas", "ING Group", "Societe Generale",
  "Infineon Technologies", "STMicroelectronics", "NXP Semiconductors", "ASML Holding", "Nordic Semiconductor",
  "Sandvik AB", "Atlas Copco", "Metso Outotec", "Konecranes Oyj", "Wartsila Corp",
  "Peugeot Industries", "Faurecia SE", "Plastic Omnium", "Valeo SA", "Hella GmbH",
  "Salzburg AG", "Wien Energie", "MVV Energie", "EnBW AG", "Fortum Oyj",
  "Rheinmetall AG", "Diehl Group", "Hensoldt AG", "MBDA Systems", "Thales Group",
  "Knorr-Bremse AG", "Wabtec Europe", "Stadler Rail", "Vossloh AG", "Plasser & Theurer",
  "KUKA AG", "Fanuc Europe", "Comau SpA", "Staubli Group", "Universal Robots",
  "Bilfinger SE", "Hochtief AG", "Strabag SE", "Vinci SA", "Ferrovial SA",
  "Linde plc", "Air Liquide", "Messer Group", "Nippon Gases Europe", "SOL Group",
  "Wacker Chemie", "Clariant AG", "Solvay SA", "Arkema SA", "Kemira Oyj",
  "Daimler Truck", "MAN Energy Solutions", "Deutz AG", "Cummins Europe", "Volvo Group",
  "Fraport AG", "Aena SME", "ADP Group", "Zurich Airport", "Schiphol Group",
  "Siemens Healthineers", "GE Healthcare Europe", "Canon Medical", "Fujifilm Europe", "Olympus Europa",
] as const;

const INDUSTRIES = [
  "Automotive", "Energy", "Healthcare", "Manufacturing", "Infrastructure",
  "Aerospace", "Chemicals", "Transport",
] as const;

const COUNTRIES_SI = [
  "Germany", "USA", "China", "UK", "France", "Italy", "Spain",
  "Netherlands", "Switzerland", "Austria", "Sweden", "Norway",
  "Japan", "South Korea", "India", "Brazil", "Australia",
  "Poland", "Czech Republic", "Turkey", "UAE", "Saudi Arabia",
  "Canada", "Mexico", "Singapore", "Indonesia",
] as const;

const COUNTRY_REGION_SI: Record<string, string> = {
  Germany: "EMEA", USA: "Americas", China: "APAC", UK: "EMEA",
  France: "EMEA", Italy: "EMEA", Spain: "EMEA", Netherlands: "EMEA",
  Switzerland: "EMEA", Austria: "EMEA", Sweden: "EMEA", Norway: "EMEA",
  Japan: "APAC", "South Korea": "APAC", India: "APAC", Brazil: "Americas",
  Australia: "APAC", Poland: "EMEA", "Czech Republic": "EMEA", Turkey: "EMEA",
  UAE: "EMEA", "Saudi Arabia": "EMEA", Canada: "Americas", Mexico: "Americas",
  Singapore: "APAC", Indonesia: "APAC",
};

const PROJECT_NAMES_PREFIX = [
  "Smart Factory", "Digital Twin", "Grid Automation", "Rail Control",
  "MRI System", "Building Automation", "Wind Farm", "EV Charging",
  "Process Control", "Cybersecurity", "Asset Management", "Predictive Maintenance",
  "IoT Platform", "Edge Computing", "Cloud Migration", "SCADA Upgrade",
  "Substation", "Signaling System", "CT Scanner", "Power Distribution",
  "Energy Storage", "Water Treatment", "Mining Automation", "Steel Mill",
  "Pharma Line", "Airport Systems", "Data Center", "Oil & Gas Platform",
] as const;

const PROJECT_NAMES_SUFFIX = [
  "Rollout", "Modernization", "Implementation", "Upgrade", "Deployment",
  "Phase II", "Phase III", "Pilot", "Expansion", "Retrofit",
  "Integration", "Transformation", "Optimization", "Migration",
] as const;

const SALES_REPS = [
  "Michael Braun", "Sarah Weber", "Thomas Mueller", "Marie Laurent",
  "James Wilson", "Katarina Kovac", "Lars Pettersson", "Elena Ivanova",
  "Raj Patel", "Yuki Tanaka", "Carlos Fernandez", "Anna Schmidt",
  "David O'Brien", "Fatima Al-Rashid", "Pierre Dubois",
] as const;

const SUPPLIER_NAMES = [
  "Infineon Technologies", "Texas Instruments", "Murata Manufacturing", "TE Connectivity",
  "Bosch Rexroth", "Parker Hannifin", "SKF Group", "Schaeffler AG",
  "Microsoft Azure", "AWS Industrial", "PTC ThingWorx", "Siemens Xcelerator",
  "SSAB Steel", "Thyssenkrupp Materials", "Rio Tinto Minerals", "BASF Coatings",
  "DHL Supply Chain", "DB Schenker Logistics", "Kuehne+Nagel", "Maersk Logistics",
  "Nexperia BV", "STMicroelectronics", "Vishay Intertechnology", "ON Semiconductor",
  "Festo SE", "SMC Corporation", "Aventics GmbH", "Buhler Group",
  "Wind River Systems", "Red Hat Industrial", "VMware Edge", "Canonical IoT",
  "Amphenol Corp", "Molex LLC", "Phoenix Contact", "Weidmuller Interface",
  "Timken Company", "NSK Ltd", "NTN Corporation", "INA Schaeffler",
  "ArcelorMittal Steel", "Nucor Corporation", "Voestalpine High Performance", "Sandvik Materials",
  "Flir Systems", "Keyence Corporation", "Cognex Corporation", "Basler AG",
  "Eaton Corporation", "ABB Components", "Schneider Distribution", "Legrand SA",
  "SAP Manufacturing", "Dassault MES", "Rockwell Software", "Honeywell Process",
  "Air Liquide Gases", "Linde Industrial", "Praxair Europe", "Messer SE",
  "Henkel Adhesives", "3M Industrial", "Dow Chemical", "Sika AG",
  "Rittal GmbH", "nVent Electric", "Pentair Enclosures", "Hubbell Industrial",
  "Omron Electronics", "Mitsubishi Electric", "Yaskawa Electric", "Fanuc Corporation",
  "Fluke Networks", "Tektronix Inc", "Keysight Technologies", "Rohde & Schwarz",
  "Nord Drivesystems", "SEW-Eurodrive", "Bonfiglioli", "Sumitomo Drive",
  "Pilz GmbH", "Sick AG", "Pepperl+Fuchs", "Turck GmbH",
] as const;

// ──────────────────────────────────────────────────────────────────────────────
// SIEMENS DATA GENERATOR
// ──────────────────────────────────────────────────────────────────────────────

export function generateSiemensData(): DemoTable[] {
  const rng = new SeededRandom(73_001);

  const businessUnits = generateSiBUs();
  const customers = generateSiCustomers(rng);
  const orders = generateSiOrders(rng, customers);
  const financials = generateSiFinancials(rng);
  const employees = generateSiEmployees(rng);
  const projects = generateSiProjects(rng, customers);
  const supplyChain = generateSiSupplyChain(rng);

  return [
    {
      id: "si_orders",
      name: "Siemens — Orders",
      rows: orders,
      headers: [
        "Order_ID", "Date", "Business_Unit", "Customer_ID", "Country", "Region",
        "Order_Value_EUR", "Order_Type", "Delivery_Date", "Status", "Margin_%",
        "Sales_Rep", "Industry_Vertical",
      ],
      columnTypes: {
        Order_ID: "string", Date: "date", Business_Unit: "string",
        Customer_ID: "string", Country: "string", Region: "string",
        Order_Value_EUR: "number", Order_Type: "string", Delivery_Date: "date",
        Status: "string", "Margin_%": "number", Sales_Rep: "string",
        Industry_Vertical: "string",
      },
    },
    {
      id: "si_business_units",
      name: "Siemens — Business Units",
      rows: businessUnits,
      headers: [
        "BU_ID", "BU_Name", "CEO", "Headcount", "Revenue_FY2025",
        "EBITDA_Margin_%", "R_D_Budget", "Key_Market", "Growth_Target_%",
      ],
      columnTypes: {
        BU_ID: "string", BU_Name: "string", CEO: "string",
        Headcount: "number", Revenue_FY2025: "number",
        "EBITDA_Margin_%": "number", R_D_Budget: "number",
        Key_Market: "string", "Growth_Target_%": "number",
      },
    },
    {
      id: "si_customers",
      name: "Siemens — Customers",
      rows: customers,
      headers: [
        "Customer_ID", "Company_Name", "Industry", "Country", "Segment",
        "Account_Manager", "Contract_Value", "First_Order_Date", "NPS",
      ],
      columnTypes: {
        Customer_ID: "string", Company_Name: "string", Industry: "string",
        Country: "string", Segment: "string", Account_Manager: "string",
        Contract_Value: "number", First_Order_Date: "date", NPS: "number",
      },
    },
    {
      id: "si_financials_quarterly",
      name: "Siemens — Quarterly Financials",
      rows: financials,
      headers: [
        "Quarter", "Business_Unit", "Revenue", "COGS", "Gross_Profit", "R_D",
        "SGA", "EBITDA", "EBITDA_Margin_%", "Order_Intake", "Book_to_Bill",
        "Free_Cash_Flow", "ROIC_%",
      ],
      columnTypes: {
        Quarter: "string", Business_Unit: "string", Revenue: "number",
        COGS: "number", Gross_Profit: "number", R_D: "number", SGA: "number",
        EBITDA: "number", "EBITDA_Margin_%": "number", Order_Intake: "number",
        Book_to_Bill: "number", Free_Cash_Flow: "number", "ROIC_%": "number",
      },
    },
    {
      id: "si_employees",
      name: "Siemens — Workforce",
      rows: employees,
      headers: [
        "Business_Unit", "Function", "Headcount", "Avg_Salary",
        "Total_Cost", "Utilization_%", "Attrition_%", "Open_Positions",
      ],
      columnTypes: {
        Business_Unit: "string", Function: "string", Headcount: "number",
        Avg_Salary: "number", Total_Cost: "number", "Utilization_%": "number",
        "Attrition_%": "number", Open_Positions: "number",
      },
    },
    {
      id: "si_projects",
      name: "Siemens — Projects",
      rows: projects,
      headers: [
        "Project_ID", "Project_Name", "Business_Unit", "Customer_ID",
        "Start_Date", "End_Date", "Budget", "Actual_Cost", "Completion_%",
        "Status", "Project_Manager", "Country", "Risk_Score",
      ],
      columnTypes: {
        Project_ID: "string", Project_Name: "string", Business_Unit: "string",
        Customer_ID: "string", Start_Date: "date", End_Date: "date",
        Budget: "number", Actual_Cost: "number", "Completion_%": "number",
        Status: "string", Project_Manager: "string", Country: "string",
        Risk_Score: "number",
      },
    },
    {
      id: "si_supply_chain",
      name: "Siemens — Supply Chain",
      rows: supplyChain,
      headers: [
        "Supplier_ID", "Supplier_Name", "Country", "Category",
        "Annual_Spend", "Quality_Score", "Delivery_Reliability_%",
        "Lead_Time_Days", "Risk_Rating", "Alternative_Suppliers",
      ],
      columnTypes: {
        Supplier_ID: "string", Supplier_Name: "string", Country: "string",
        Category: "string", Annual_Spend: "number", Quality_Score: "number",
        "Delivery_Reliability_%": "number", Lead_Time_Days: "number",
        Risk_Rating: "string", Alternative_Suppliers: "number",
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// TABLE GENERATORS
// ──────────────────────────────────────────────────────────────────────────────

function generateSiBUs(): Record<string, string>[] {
  // Real Siemens BU structure (approximate FY2024/2025 data scaled for realism)
  return [
    {
      BU_ID: "SI-DI", BU_Name: "Digital_Industries", CEO: "Cedrik Neike",
      Headcount: n(72000), Revenue_FY2025: n(20_800_000_000),
      "EBITDA_Margin_%": nf(22.4), R_D_Budget: n(2_100_000_000),
      Key_Market: "Factory Automation & Industrial Software", "Growth_Target_%": nf(7.0),
    },
    {
      BU_ID: "SI-SI", BU_Name: "Smart_Infrastructure", CEO: "Matthias Rebellius",
      Headcount: n(74000), Revenue_FY2025: n(21_200_000_000),
      "EBITDA_Margin_%": nf(16.8), R_D_Budget: n(1_400_000_000),
      Key_Market: "Building Technologies & Grid Software", "Growth_Target_%": nf(8.0),
    },
    {
      BU_ID: "SI-MO", BU_Name: "Mobility", CEO: "Michael Peter",
      Headcount: n(42000), Revenue_FY2025: n(11_500_000_000),
      "EBITDA_Margin_%": nf(9.2), R_D_Budget: n(850_000_000),
      Key_Market: "Rail Infrastructure & Rolling Stock", "Growth_Target_%": nf(5.5),
    },
    {
      BU_ID: "SI-HE", BU_Name: "Healthineers", CEO: "Bernd Montag",
      Headcount: n(71000), Revenue_FY2025: n(22_500_000_000),
      "EBITDA_Margin_%": nf(19.6), R_D_Budget: n(2_300_000_000),
      Key_Market: "Medical Imaging & Diagnostics", "Growth_Target_%": nf(6.5),
    },
    {
      BU_ID: "SI-FS", BU_Name: "Financial_Services", CEO: "Veronika Bienert",
      Headcount: n(3200), Revenue_FY2025: n(1_800_000_000),
      "EBITDA_Margin_%": nf(28.5), R_D_Budget: n(45_000_000),
      Key_Market: "Equipment & Project Finance", "Growth_Target_%": nf(4.0),
    },
  ];
}

function generateSiCustomers(rng: SeededRandom): Record<string, string>[] {
  const segments = ["Strategic", "Enterprise", "Mid_Market"] as const;
  const segmentWeights = [15, 45, 40];

  const rows: Record<string, string>[] = [];
  for (let i = 0; i < 150; i++) {
    const cid = `SC-${String(i + 1).padStart(4, "0")}`;
    const company = INDUSTRIAL_COMPANIES[i % INDUSTRIAL_COMPANIES.length];
    const industry = rng.pick(INDUSTRIES);
    const country = rng.pick(COUNTRIES_SI);
    const segment = rng.pickWeighted(segments, segmentWeights);
    const am = rng.pick(SALES_REPS);
    const firstOrder = rng.dateInRange("2005-01-01", "2023-12-31");

    // Contract values based on segment (annual, EUR)
    const cvRanges: Record<string, [number, number]> = {
      Strategic: [50_000_000, 500_000_000],
      Enterprise: [5_000_000, 49_000_000],
      Mid_Market: [200_000, 4_900_000],
    };
    const [cvMin, cvMax] = cvRanges[segment];
    const contractValue = rng.nextInt(cvMin, cvMax);
    const nps = rng.nextInt(25, 92);

    rows.push({
      Customer_ID: cid,
      Company_Name: company,
      Industry: industry,
      Country: country,
      Segment: segment,
      Account_Manager: am,
      Contract_Value: n(contractValue),
      First_Order_Date: firstOrder,
      NPS: n(nps),
    });
  }
  return rows;
}

function generateSiOrders(rng: SeededRandom, customers: Record<string, string>[]): Record<string, string>[] {
  const bus = ["Digital_Industries", "Smart_Infrastructure", "Mobility", "Healthineers", "Financial_Services"] as const;
  const buWeights = [28, 27, 16, 25, 4];
  const orderTypes = ["New", "Service", "Upgrade", "Recurring"] as const;
  const orderTypeWeights = [30, 28, 18, 24];
  const statuses = ["Won", "In_Progress", "Delivered", "Cancelled"] as const;
  const statusWeights = [35, 30, 28, 7];

  const buIndustry: Record<string, string[]> = {
    Digital_Industries: ["Automotive", "Manufacturing", "Chemicals", "Aerospace"],
    Smart_Infrastructure: ["Energy", "Infrastructure", "Manufacturing"],
    Mobility: ["Transport", "Infrastructure"],
    Healthineers: ["Healthcare"],
    Financial_Services: ["Energy", "Manufacturing", "Infrastructure", "Transport"],
  };

  const rows: Record<string, string>[] = [];
  for (let i = 0; i < 400; i++) {
    const oid = `SO-${String(i + 1).padStart(5, "0")}`;
    const date = rng.dateInRange("2024-01-01", "2025-12-31");
    const bu = rng.pickWeighted(bus, buWeights);
    const customer = rng.pick(customers);
    const country = customer.Country;
    const region = COUNTRY_REGION_SI[country] || "EMEA";
    const orderType = rng.pickWeighted(orderTypes, orderTypeWeights);
    const status = rng.pickWeighted(statuses, statusWeights);
    const industry = rng.pick(buIndustry[bu]);

    // Order values vary by BU and type (EUR) - Siemens deals are large
    let valueMin: number, valueMax: number;
    switch (bu) {
      case "Digital_Industries":
        valueMin = 150_000; valueMax = 45_000_000; break;
      case "Smart_Infrastructure":
        valueMin = 200_000; valueMax = 85_000_000; break;
      case "Mobility":
        valueMin = 2_000_000; valueMax = 350_000_000; break;
      case "Healthineers":
        valueMin = 80_000; valueMax = 25_000_000; break;
      case "Financial_Services":
        valueMin = 500_000; valueMax = 120_000_000; break;
      default:
        valueMin = 100_000; valueMax = 10_000_000;
    }
    // Service/Recurring orders tend to be smaller than New
    if (orderType === "Service") { valueMax = Math.round(valueMax * 0.3); }
    if (orderType === "Recurring") { valueMax = Math.round(valueMax * 0.15); }
    if (orderType === "Upgrade") { valueMax = Math.round(valueMax * 0.5); }

    const orderValue = rng.nextInt(valueMin, valueMax);

    // Delivery is 2-18 months after order
    const orderDate = new Date(date);
    const deliveryMonths = rng.nextInt(2, 18);
    const deliveryDate = new Date(orderDate);
    deliveryDate.setMonth(deliveryDate.getMonth() + deliveryMonths);
    const deliveryStr = deliveryDate.toISOString().slice(0, 10);

    // Margins vary by BU
    const marginRanges: Record<string, [number, number]> = {
      Digital_Industries: [18, 32], Smart_Infrastructure: [12, 24],
      Mobility: [5, 15], Healthineers: [14, 28],
      Financial_Services: [22, 38],
    };
    const [mMin, mMax] = marginRanges[bu];
    const margin = rng.nextFloat(mMin, mMax, 1);

    rows.push({
      Order_ID: oid,
      Date: date,
      Business_Unit: bu,
      Customer_ID: customer.Customer_ID,
      Country: country,
      Region: region,
      Order_Value_EUR: n(orderValue),
      Order_Type: orderType,
      Delivery_Date: deliveryStr,
      Status: status,
      "Margin_%": nf(margin, 1),
      Sales_Rep: rng.pick(SALES_REPS),
      Industry_Vertical: industry,
    });
  }
  return rows;
}

function generateSiFinancials(rng: SeededRandom): Record<string, string>[] {
  const bus = ["Digital_Industries", "Smart_Infrastructure", "Mobility", "Healthineers", "Financial_Services"] as const;
  const quarters = ["Q1_2024", "Q2_2024", "Q3_2024", "Q4_2024", "Q1_2025", "Q2_2025", "Q3_2025", "Q4_2025"];

  // Base quarterly revenue per BU (EUR billions -> stored as EUR)
  const baseRevQ: Record<string, number> = {
    Digital_Industries: 4_900_000_000,
    Smart_Infrastructure: 5_000_000_000,
    Mobility: 2_700_000_000,
    Healthineers: 5_400_000_000,
    Financial_Services: 420_000_000,
  };
  // Quarterly growth factor
  const qGrowth: Record<string, number> = {
    Digital_Industries: 1.018, Smart_Infrastructure: 1.02,
    Mobility: 1.015, Healthineers: 1.016, Financial_Services: 1.01,
  };
  // Margin profiles
  const cogsRatio: Record<string, [number, number]> = {
    Digital_Industries: [0.55, 0.62], Smart_Infrastructure: [0.60, 0.68],
    Mobility: [0.72, 0.80], Healthineers: [0.52, 0.60],
    Financial_Services: [0.35, 0.45],
  };

  const rows: Record<string, string>[] = [];
  for (let qi = 0; qi < quarters.length; qi++) {
    const quarter = quarters[qi];
    for (const bu of bus) {
      // Revenue grows each quarter
      const rev = Math.round(baseRevQ[bu] * Math.pow(qGrowth[bu], qi) * rng.nextFloat(0.96, 1.05, 3));
      const [cMin, cMax] = cogsRatio[bu];
      const cogs = Math.round(rev * rng.nextFloat(cMin, cMax, 3));
      const grossProfit = rev - cogs;
      const rd = Math.round(rev * rng.nextFloat(0.07, 0.12, 3));
      const sga = Math.round(rev * rng.nextFloat(0.08, 0.14, 3));
      const ebitda = grossProfit - rd - sga;
      const ebitdaMargin = parseFloat(((ebitda / rev) * 100).toFixed(1));

      // Order intake: book-to-bill slightly above 1 for growth
      const btb = rng.nextFloat(0.92, 1.18, 2);
      const orderIntake = Math.round(rev * btb);
      const fcf = Math.round(ebitda * rng.nextFloat(0.55, 0.80, 3));
      const roic = rng.nextFloat(8.0, 22.0, 1);

      rows.push({
        Quarter: quarter,
        Business_Unit: bu,
        Revenue: n(rev),
        COGS: n(cogs),
        Gross_Profit: n(grossProfit),
        R_D: n(rd),
        SGA: n(sga),
        EBITDA: n(ebitda),
        "EBITDA_Margin_%": nf(ebitdaMargin, 1),
        Order_Intake: n(orderIntake),
        Book_to_Bill: nf(btb),
        Free_Cash_Flow: n(fcf),
        "ROIC_%": nf(roic, 1),
      });
    }
  }
  return rows;
}

function generateSiEmployees(rng: SeededRandom): Record<string, string>[] {
  const bus = ["Digital_Industries", "Smart_Infrastructure", "Mobility", "Healthineers", "Financial_Services"] as const;
  const functions = ["Engineering", "R_D", "Sales", "Manufacturing", "Service", "Corporate"] as const;

  // Headcount distribution per BU (sums to BU total roughly)
  const hcDist: Record<string, Record<string, number>> = {
    Digital_Industries: { Engineering: 18000, R_D: 14000, Sales: 10000, Manufacturing: 22000, Service: 5000, Corporate: 3000 },
    Smart_Infrastructure: { Engineering: 16000, R_D: 9000, Sales: 12000, Manufacturing: 26000, Service: 7000, Corporate: 4000 },
    Mobility: { Engineering: 10000, R_D: 6000, Sales: 5000, Manufacturing: 15000, Service: 4000, Corporate: 2000 },
    Healthineers: { Engineering: 14000, R_D: 16000, Sales: 12000, Manufacturing: 20000, Service: 6000, Corporate: 3000 },
    Financial_Services: { Engineering: 400, R_D: 100, Sales: 800, Manufacturing: 0, Service: 1200, Corporate: 700 },
  };

  // Avg salary ranges by function (EUR/year)
  const salaryRanges: Record<string, [number, number]> = {
    Engineering: [65000, 95000], R_D: [72000, 105000], Sales: [60000, 110000],
    Manufacturing: [38000, 58000], Service: [48000, 72000], Corporate: [55000, 88000],
  };

  const rows: Record<string, string>[] = [];
  for (const bu of bus) {
    for (const func of functions) {
      const baseHC = hcDist[bu][func];
      if (baseHC === 0) continue; // Skip Financial_Services manufacturing

      const headcount = Math.round(baseHC * rng.nextFloat(0.95, 1.05, 3));
      const [sMin, sMax] = salaryRanges[func];
      const avgSalary = rng.nextInt(sMin, sMax);
      // Total cost includes benefits, overhead (~1.35x salary)
      const totalCost = Math.round(headcount * avgSalary * rng.nextFloat(1.30, 1.42, 2));
      const utilization = func === "Manufacturing" ? rng.nextFloat(78, 95, 1)
        : func === "Service" ? rng.nextFloat(72, 92, 1)
        : func === "Sales" ? rng.nextFloat(65, 85, 1)
        : rng.nextFloat(80, 96, 1);
      const attrition = rng.nextFloat(4.0, 14.0, 1);
      const openPositions = Math.round(headcount * rng.nextFloat(0.02, 0.08, 3));

      rows.push({
        Business_Unit: bu,
        Function: func,
        Headcount: n(headcount),
        Avg_Salary: n(avgSalary),
        Total_Cost: n(totalCost),
        "Utilization_%": nf(utilization, 1),
        "Attrition_%": nf(attrition, 1),
        Open_Positions: n(openPositions),
      });
    }
  }
  return rows;
}

function generateSiProjects(rng: SeededRandom, customers: Record<string, string>[]): Record<string, string>[] {
  const bus = ["Digital_Industries", "Smart_Infrastructure", "Mobility", "Healthineers", "Financial_Services"] as const;
  const buWeights = [30, 28, 18, 20, 4];
  const statuses = ["Green", "Yellow", "Red"] as const;
  const statusWeights = [60, 28, 12];

  const pmNames = [
    "Dr. Klaus Fischer", "Ing. Maria Schneider", "Dipl.-Ing. Thomas Braun",
    "Sarah Mitchell, PMP", "Jean-Pierre Moreau", "Ing. Anna Kovacs",
    "Dr. Raj Mehta", "Kenji Watanabe", "Carlos Rodriguez, PMP",
    "Dr. Elena Petrova", "Lars Johansson", "Fatima Al-Sayed",
    "Dr. Wei Chen", "Patrick O'Sullivan", "Marco Bianchi, PMP",
  ] as const;

  const rows: Record<string, string>[] = [];
  for (let i = 0; i < 100; i++) {
    const pid = `SP-${String(i + 1).padStart(4, "0")}`;
    const bu = rng.pickWeighted(bus, buWeights);
    const prefix = rng.pick(PROJECT_NAMES_PREFIX);
    const suffix = rng.pick(PROJECT_NAMES_SUFFIX);
    const projectName = `${prefix} ${suffix}`;
    const customer = rng.pick(customers);
    const country = customer.Country;

    const startDate = rng.dateInRange("2023-01-01", "2025-06-30");
    const durationMonths = rng.nextInt(6, 36);
    const sd = new Date(startDate);
    const ed = new Date(sd);
    ed.setMonth(ed.getMonth() + durationMonths);
    const endDate = ed.toISOString().slice(0, 10);

    // Budget ranges by BU
    const budgetRanges: Record<string, [number, number]> = {
      Digital_Industries: [500_000, 35_000_000],
      Smart_Infrastructure: [800_000, 65_000_000],
      Mobility: [5_000_000, 250_000_000],
      Healthineers: [300_000, 18_000_000],
      Financial_Services: [1_000_000, 50_000_000],
    };
    const [bMin, bMax] = budgetRanges[bu];
    const budget = rng.nextInt(bMin, bMax);

    // Completion % based on current date relative to project timeline
    const now = new Date("2025-09-15").getTime();
    const s = sd.getTime();
    const e = ed.getTime();
    const rawCompletion = Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)));
    // Add some noise
    const completion = Math.min(100, Math.max(0, rawCompletion + rng.nextInt(-10, 5)));

    // Actual cost: can be over or under budget depending on status
    const status = rng.pickWeighted(statuses, statusWeights);
    let costMultiplier: number;
    switch (status) {
      case "Green": costMultiplier = rng.nextFloat(0.85, 1.05, 3); break;
      case "Yellow": costMultiplier = rng.nextFloat(1.02, 1.18, 3); break;
      case "Red": costMultiplier = rng.nextFloat(1.12, 1.45, 3); break;
    }
    const actualCost = Math.round(budget * (completion / 100) * costMultiplier);

    const riskScore = status === "Green" ? rng.nextInt(1, 35)
      : status === "Yellow" ? rng.nextInt(30, 65)
      : rng.nextInt(55, 95);

    rows.push({
      Project_ID: pid,
      Project_Name: projectName,
      Business_Unit: bu,
      Customer_ID: customer.Customer_ID,
      Start_Date: startDate,
      End_Date: endDate,
      Budget: n(budget),
      Actual_Cost: n(actualCost),
      "Completion_%": n(completion),
      Status: status,
      Project_Manager: rng.pick(pmNames),
      Country: country,
      Risk_Score: n(riskScore),
    });
  }
  return rows;
}

function generateSiSupplyChain(rng: SeededRandom): Record<string, string>[] {
  const categories = ["Electronics", "Mechanical", "Software", "Raw_Materials", "Logistics"] as const;
  const categoryWeights = [28, 22, 18, 18, 14];
  const riskRatings = ["Low", "Medium", "High", "Critical"] as const;
  const riskWeights = [35, 40, 18, 7];

  const supplierCountries = [
    "Germany", "USA", "Japan", "China", "South Korea", "Netherlands",
    "Switzerland", "Sweden", "France", "UK", "Italy", "Taiwan",
    "Finland", "Austria", "Denmark",
  ] as const;

  const rows: Record<string, string>[] = [];
  const usedSuppliers = new Set<string>();

  for (let i = 0; i < 80; i++) {
    const sid = `SUP-${String(i + 1).padStart(3, "0")}`;
    // Pick unique supplier
    let supplier: string;
    do {
      supplier = rng.pick(SUPPLIER_NAMES);
    } while (usedSuppliers.has(supplier) && usedSuppliers.size < SUPPLIER_NAMES.length);
    usedSuppliers.add(supplier);

    const country = rng.pick(supplierCountries);
    const category = rng.pickWeighted(categories, categoryWeights);
    const risk = rng.pickWeighted(riskRatings, riskWeights);

    // Annual spend varies by category
    const spendRanges: Record<string, [number, number]> = {
      Electronics: [2_000_000, 180_000_000],
      Mechanical: [1_500_000, 95_000_000],
      Software: [500_000, 45_000_000],
      Raw_Materials: [3_000_000, 250_000_000],
      Logistics: [1_000_000, 120_000_000],
    };
    const [spMin, spMax] = spendRanges[category];
    const annualSpend = rng.nextInt(spMin, spMax);
    const qualityScore = rng.nextFloat(72.0, 99.5, 1);
    const deliveryReliability = rng.nextFloat(82.0, 99.8, 1);

    // Lead time varies by category and country
    let baseLeadTime: number;
    switch (category) {
      case "Electronics":
        baseLeadTime = country === "China" || country === "Taiwan" ? rng.nextInt(35, 90) : rng.nextInt(14, 45);
        break;
      case "Raw_Materials":
        baseLeadTime = rng.nextInt(21, 75); break;
      case "Software":
        baseLeadTime = rng.nextInt(1, 14); break;
      case "Logistics":
        baseLeadTime = rng.nextInt(3, 21); break;
      default:
        baseLeadTime = rng.nextInt(14, 60);
    }

    const altSuppliers = rng.nextInt(0, 5);

    rows.push({
      Supplier_ID: sid,
      Supplier_Name: supplier,
      Country: country,
      Category: category,
      Annual_Spend: n(annualSpend),
      Quality_Score: nf(qualityScore, 1),
      "Delivery_Reliability_%": nf(deliveryReliability, 1),
      Lead_Time_Days: n(baseLeadTime),
      Risk_Rating: risk,
      Alternative_Suppliers: n(altSuppliers),
    });
  }
  return rows;
}
