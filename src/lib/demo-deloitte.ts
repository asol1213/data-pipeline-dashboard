import { SeededRandom, DemoTable, n, nf } from "./demo-datasets";

// ── DemoCompany interface (will be shared with demo-data.ts) ──
export interface DemoCompany {
  id: string;
  name: string;
  industry: string;
  description: string;
  datasets: DemoTable[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Deloitte DACH — Professional Services (~€500M regional practice)
// 8 tables: engagements, employees, clients, monthly_pnl, pipeline,
//           utilization_monthly, training, expenses
// ═══════════════════════════════════════════════════════════════════════════════

// ── Reference data ──

const SERVICE_LINES = [
  "Audit & Assurance",
  "Tax",
  "Consulting",
  "Risk Advisory",
  "Financial Advisory",
] as const;

const OFFERINGS = [
  "SAP S/4HANA",
  "IT Audit",
  "M&A Due Diligence",
  "Tax Compliance",
  "Cyber Risk",
  "Data Analytics",
  "Cloud Migration",
  "ESG Reporting",
] as const;

const OFFERING_TO_SL: Record<string, string> = {
  "SAP S/4HANA": "Consulting",
  "IT Audit": "Audit & Assurance",
  "M&A Due Diligence": "Financial Advisory",
  "Tax Compliance": "Tax",
  "Cyber Risk": "Risk Advisory",
  "Data Analytics": "Consulting",
  "Cloud Migration": "Consulting",
  "ESG Reporting": "Audit & Assurance",
};

const OFFICES = [
  "Munich",
  "Frankfurt",
  "Berlin",
  "Hamburg",
  "Düsseldorf",
  "Stuttgart",
  "Vienna",
  "Zurich",
] as const;

const LEVELS = [
  "Analyst",
  "Consultant",
  "Senior Consultant",
  "Manager",
  "Senior Manager",
  "Director",
  "Partner",
] as const;

const UTIL_LEVELS = [
  "Analyst",
  "Consultant",
  "Senior Consultant",
  "Manager",
  "Senior Manager",
  "Partner",
] as const;

const INDUSTRIES = [
  "Financial Services",
  "Technology",
  "Manufacturing",
  "Healthcare",
  "Energy",
  "Public Sector",
  "Consumer",
] as const;

const COUNTRIES = ["Germany", "Austria", "Switzerland", "Netherlands"] as const;

const SEGMENTS = ["DAX 40", "MDAX", "Mid-Market", "Public Sector"] as const;

const COMPETITORS = [
  "EY",
  "PwC",
  "KPMG",
  "McKinsey",
  "Accenture",
  "BDO",
] as const;

const CERTIFICATIONS = [
  "CPA",
  "CISA",
  "PMP",
  "SAP Certified",
  "AWS Certified",
  "CISSP",
  "CFA",
  "ACCA",
  "CIA",
  "CRISC",
] as const;

const TRAINING_COURSES = [
  "SAP S/4HANA Certification",
  "IFRS Update 2025",
  "Cyber Risk Assessment",
  "Data Analytics with Python",
  "Leadership Development",
  "ESG Reporting Standards",
  "AI/ML Foundations",
  "Cloud Architecture (AWS)",
  "Agile Project Management",
  "Deloitte Audit Methodology",
  "Transfer Pricing Advanced",
  "Power BI for Consultants",
  "Risk Management Framework",
  "Client Relationship Excellence",
  "Presentation Skills Masterclass",
] as const;

const TRAINING_CATEGORIES: Record<string, string> = {
  "SAP S/4HANA Certification": "Technical",
  "IFRS Update 2025": "Regulatory",
  "Cyber Risk Assessment": "Technical",
  "Data Analytics with Python": "Technical",
  "Leadership Development": "Leadership",
  "ESG Reporting Standards": "Regulatory",
  "AI/ML Foundations": "Technical",
  "Cloud Architecture (AWS)": "Technical",
  "Agile Project Management": "Leadership",
  "Deloitte Audit Methodology": "Industry",
  "Transfer Pricing Advanced": "Regulatory",
  "Power BI for Consultants": "Technical",
  "Risk Management Framework": "Industry",
  "Client Relationship Excellence": "Leadership",
  "Presentation Skills Masterclass": "Leadership",
};

const EXPENSE_CATEGORIES = [
  "Travel",
  "Accommodation",
  "Meals",
  "Technology",
  "Client Entertainment",
  "Training",
] as const;

const BILLING_STATUSES = [
  "Current",
  "30 Days",
  "60 Days",
  "90+ Days",
] as const;

const ENGAGEMENT_STATUSES = [
  "Active",
  "Completed",
  "On Hold",
  "Proposal",
] as const;

const PIPELINE_STAGES = [
  "Identified",
  "Qualified",
  "Proposal Submitted",
  "Shortlisted",
  "Won",
  "Lost",
] as const;

// ── German / European first & last names ──
const FIRST_NAMES = [
  "Thomas", "Stefan", "Michael", "Andreas", "Markus", "Christian", "Martin", "Daniel",
  "Alexander", "Matthias", "Sandra", "Julia", "Kathrin", "Anna", "Lisa", "Claudia",
  "Sabine", "Nicole", "Petra", "Maria", "Jan", "Felix", "Lukas", "Tobias", "Simon",
  "Laura", "Sophie", "Lena", "Eva", "Karoline", "Hans", "Peter", "Friedrich", "Klaus",
  "Wolfgang", "Heinrich", "Ulrich", "Jürgen", "Frank", "Ralf",
];

const LAST_NAMES = [
  "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
  "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf",
  "Schröder", "Neumann", "Schwarz", "Braun", "Zimmermann", "Krüger", "Hartmann",
  "Lange", "Werner", "Lehmann", "Köhler", "Maier", "Huber", "Kaiser",
  "Berger", "Steiner", "Hofer", "Gruber", "Brunner", "Eder", "Moser", "Reiter",
  "Pichler", "Koller",
];

// ── Real German/European company names for clients ──
const CLIENT_NAMES = [
  "Allianz SE", "Deutsche Bank AG", "SAP SE", "Bayer AG", "Siemens Healthineers AG",
  "BASF SE", "BMW AG", "Daimler Truck AG", "Deutsche Telekom AG", "E.ON SE",
  "Henkel AG", "Infineon Technologies AG", "Merck KGaA", "Münchener Rück AG",
  "RWE AG", "Volkswagen AG", "Continental AG", "Fresenius SE", "HeidelbergCement AG",
  "Vonovia SE", "Adidas AG", "Deutsche Post DHL Group", "Covestro AG", "Zalando SE",
  "HelloFresh SE", "Knorr-Bremse AG", "Puma SE", "Symrise AG", "Brenntag SE",
  "Sartorius AG", "Commerzbank AG", "Deutsche Börse AG", "Evonik Industries AG",
  "Hannover Rück SE", "LEG Immobilien SE", "Nemetschek SE", "Scout24 SE",
  "Siltronic AG", "TeamViewer AG", "Wacker Chemie AG",
  "Erste Group Bank AG", "OMV AG", "Wienerberger AG", "Verbund AG",
  "voestalpine AG", "Raiffeisen Bank International AG", "Andritz AG",
  "Novartis AG", "Roche Holding AG", "ABB Ltd", "Nestlé SA", "UBS Group AG",
  "Zurich Insurance Group AG", "Swiss Re AG", "Credit Suisse Group AG",
  "Geberit AG", "Sika AG", "Holcim Group AG", "Lonza Group AG",
  "Koninklijke Philips NV", "ASML Holding NV", "ING Group NV", "Heineken NV",
  "Unilever NV", "Wolters Kluwer NV", "Adyen NV", "RELX NV",
  "ThyssenKrupp AG", "Rheinmetall AG", "Aurubis AG", "Kion Group AG",
  "MTU Aero Engines AG", "Carl Zeiss Meditec AG", "Rational AG",
  "Bayerische Motoren Werke AG", "Porsche AG", "MAN Energy Solutions SE",
  "Bosch GmbH", "Linde plc", "Fresenius Medical Care AG",
  "Münchener Hypothekenbank eG", "Talanx AG", "Wüstenrot & Württembergische AG",
  "DekaBank Deutsche Girozentrale", "KfW Bankengruppe", "Bertelsmann SE",
  "ProSiebenSat.1 Media SE", "Axel Springer SE", "Beiersdorf AG",
  "Ströer SE", "CTS Eventim AG", "Delivery Hero SE", "Auto1 Group SE",
  "Flixbus (FlixMobility GmbH)", "N26 GmbH", "Celonis SE", "BioNTech SE",
  "CureVac NV", "Deutsche Wohnen SE", "Encavis AG", "SMA Solar Technology AG",
];

// ── Salary & rate bands by level (Germany market) ──
const SALARY_BANDS: Record<string, [number, number]> = {
  Analyst: [45000, 58000],
  Consultant: [55000, 75000],
  "Senior Consultant": [70000, 95000],
  Manager: [90000, 130000],
  "Senior Manager": [120000, 180000],
  Director: [160000, 280000],
  Partner: [300000, 550000],
};

const CHARGE_RATES: Record<string, [number, number]> = {
  Analyst: [80, 130],
  Consultant: [120, 180],
  "Senior Consultant": [160, 250],
  Manager: [230, 350],
  "Senior Manager": [300, 450],
  Director: [400, 550],
  Partner: [450, 650],
};

const UTIL_TARGETS: Record<string, number> = {
  Analyst: 85,
  Consultant: 82,
  "Senior Consultant": 80,
  Manager: 72,
  "Senior Manager": 65,
  Director: 55,
  Partner: 50,
};

// Helper to generate a name
function genName(rng: SeededRandom): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Table generators
// ═══════════════════════════════════════════════════════════════════════════════

function generateClients(rng: SeededRandom): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  // pre-generate partner names for relationship partners
  const partnerNames: string[] = [];
  for (let i = 0; i < 15; i++) {
    partnerNames.push(genName(rng));
  }

  for (let i = 0; i < 100; i++) {
    const clientId = `DC-${String(i + 1).padStart(3, "0")}`;
    const industry = rng.pick(INDUSTRIES);
    const country = rng.pick(COUNTRIES);
    const segment = rng.pick(SEGMENTS);
    const clientSince = rng.nextInt(2008, 2024);
    const annualFees = rng.nextInt(50000, 8000000);
    const crossSell = rng.nextInt(1, 10);
    const nps = rng.nextInt(3, 10);
    const riskLevel = rng.pickWeighted(
      ["Low", "Medium", "High"] as const,
      [60, 30, 10]
    );

    rows.push({
      Client_ID: clientId,
      Company_Name: CLIENT_NAMES[i],
      Industry: industry,
      Country: country,
      Segment: segment,
      Relationship_Partner: rng.pick(partnerNames),
      Client_Since: n(clientSince),
      Annual_Fees: n(annualFees),
      Cross_Sell_Score: n(crossSell),
      NPS_Score: n(nps),
      Risk_Level: riskLevel,
    });
  }
  return rows;
}

function generateEmployees(rng: SeededRandom): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  // Distribution of levels — pyramid structure
  const levelWeights = [40, 50, 45, 35, 30, 20, 15]; // roughly sums to 235, we'll assign 250

  for (let i = 0; i < 250; i++) {
    const empId = `DE-${String(i + 1).padStart(3, "0")}`;
    const level = rng.pickWeighted(LEVELS, levelWeights);
    const serviceLine = rng.pick(SERVICE_LINES);
    const office = rng.pick(OFFICES);
    const [salMin, salMax] = SALARY_BANDS[level];
    const salary = rng.nextInt(salMin, salMax);
    const [rateMin, rateMax] = CHARGE_RATES[level];
    const chargeRate = rng.nextInt(rateMin, rateMax);
    const utilTarget = UTIL_TARGETS[level];
    // Actual utilization: centered around target with some variance
    const utilActual = Math.max(
      20,
      Math.min(100, utilTarget + rng.nextInt(-15, 12))
    );
    const availableHours = rng.nextInt(1500, 1800); // annual available
    const billableHours = Math.round((availableHours * utilActual) / 100);
    const nonBillableHours = availableHours - billableHours;
    const trainingHours = rng.nextInt(20, 120);
    const performance = rng.pickWeighted(
      [1, 2, 3, 4, 5] as const,
      [3, 10, 40, 35, 12]
    );
    const numCerts = rng.nextInt(0, 3);
    const certs: string[] = [];
    for (let c = 0; c < numCerts; c++) {
      const cert = rng.pick(CERTIFICATIONS);
      if (!certs.includes(cert)) certs.push(cert);
    }
    const activeEngagements = rng.nextInt(1, 5);
    const startYear = rng.nextInt(2012, 2025);
    const startMonth = rng.nextInt(1, 12);

    rows.push({
      Employee_ID: empId,
      Name: genName(rng),
      Level: level,
      Service_Line: serviceLine,
      Office: office,
      Start_Date: `${startYear}-${String(startMonth).padStart(2, "0")}-01`,
      Annual_Salary: n(salary),
      Charge_Rate_per_Hour: n(chargeRate),
      "Utilization_Target_%": n(utilTarget),
      "Utilization_Actual_%": n(utilActual),
      Billable_Hours_YTD: n(billableHours),
      Non_Billable_Hours_YTD: n(nonBillableHours),
      Training_Hours_YTD: n(trainingHours),
      Performance_Rating: n(performance),
      Certifications: certs.length > 0 ? certs.join(", ") : "None",
      Active_Engagements: n(activeEngagements),
    });
  }
  return rows;
}

function generateEngagements(
  rng: SeededRandom,
  employees: Record<string, string>[]
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  // Get partner and manager names from employee list for referential integrity
  const partners = employees
    .filter((e) => e.Level === "Partner")
    .map((e) => e.Name);
  const managers = employees
    .filter(
      (e) => e.Level === "Manager" || e.Level === "Senior Manager" || e.Level === "Director"
    )
    .map((e) => e.Name);

  // Fallback if not enough
  while (partners.length < 15) partners.push(genName(rng));
  while (managers.length < 20) managers.push(genName(rng));

  for (let i = 0; i < 300; i++) {
    const engId = `ENG-${String(i + 1).padStart(5, "0")}`;
    const clientId = `DC-${String(rng.nextInt(1, 100)).padStart(3, "0")}`;
    const offering = rng.pick(OFFERINGS);
    const serviceLine = OFFERING_TO_SL[offering] || rng.pick(SERVICE_LINES);
    const partner = rng.pick(partners);
    const manager = rng.pick(managers);

    const startYear = rng.pick([2024, 2025]);
    const startMonth = rng.nextInt(1, 12);
    const startDay = rng.nextInt(1, 28);
    const startDate = `${startYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;

    // Duration: 1-18 months
    const durationMonths = rng.nextInt(1, 18);
    const endDate = new Date(startYear, startMonth - 1 + durationMonths, startDay);
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(Math.min(endDate.getDate(), 28)).padStart(2, "0")}`;

    const status = rng.pickWeighted(ENGAGEMENT_STATUSES, [45, 30, 10, 15]);

    // Fee budget based on offering complexity
    const isLarge =
      offering === "SAP S/4HANA" ||
      offering === "M&A Due Diligence" ||
      offering === "Cloud Migration";
    const feeBudgetMin = isLarge ? 500000 : 50000;
    const feeBudgetMax = isLarge ? 5000000 : 1500000;
    const feeBudget = rng.nextInt(feeBudgetMin, feeBudgetMax);

    // Fee actual: variance around budget
    const realizationFactor =
      status === "Completed"
        ? rng.nextFloat(0.85, 1.15)
        : status === "Active"
          ? rng.nextFloat(0.3, 0.8)
          : status === "On Hold"
            ? rng.nextFloat(0.1, 0.4)
            : 0;
    const feeActual = Math.round(feeBudget * realizationFactor);
    const feeVariance = feeActual - feeBudget;

    // Hours
    const avgRate = rng.nextInt(180, 350);
    const hoursBudget = Math.round(feeBudget / avgRate);
    const hoursActual =
      status === "Proposal" ? 0 : Math.round(feeActual / avgRate);

    // Realization rate
    const realizationRate =
      hoursActual > 0 ? (feeActual / (hoursActual * avgRate)) * 100 : 0;

    // WIP (unbilled)
    const wip =
      status === "Active"
        ? rng.nextInt(10000, Math.max(10001, Math.round(feeActual * 0.3)))
        : 0;

    const billingStatus = rng.pickWeighted(BILLING_STATUSES, [50, 25, 15, 10]);

    const riskRating = rng.pickWeighted(
      ["Green", "Yellow", "Red"] as const,
      [55, 30, 15]
    );

    const industry = rng.pick(INDUSTRIES);

    rows.push({
      Engagement_ID: engId,
      Client_ID: clientId,
      Service_Line: serviceLine,
      Offering: offering,
      Partner: partner,
      Manager: manager,
      Start_Date: startDate,
      End_Date: endStr,
      Status: status,
      Fee_Budget: n(feeBudget),
      Fee_Actual: n(feeActual),
      Fee_Variance: n(feeVariance),
      Hours_Budget: n(hoursBudget),
      Hours_Actual: n(hoursActual),
      "Realization_Rate_%": nf(realizationRate, 1),
      WIP: n(wip),
      Billing_Status: billingStatus,
      Risk_Rating: riskRating,
      Industry: industry,
    });
  }
  return rows;
}

function generateMonthlyPnl(rng: SeededRandom): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const months = [
    "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06",
    "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12",
    "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
    "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  ];

  // Base revenue ~€42M/month for €500M/year practice
  let baseRevenue = 38000000;

  for (const month of months) {
    // Slight growth over time + seasonal variation
    const monthNum = parseInt(month.split("-")[1]);
    const yearIdx = month.startsWith("2025") ? 1 : 0;
    baseRevenue = 38000000 + yearIdx * 3000000;

    // Seasonality: Q1 strong (year-end audits), summer dip, Q4 strong
    const seasonFactor =
      monthNum <= 3
        ? 1.1 + rng.nextFloat(-0.03, 0.03)
        : monthNum <= 6
          ? 0.95 + rng.nextFloat(-0.03, 0.03)
          : monthNum <= 9
            ? 0.88 + rng.nextFloat(-0.03, 0.03)
            : 1.05 + rng.nextFloat(-0.03, 0.03);

    const totalRevenue = Math.round(baseRevenue * seasonFactor);

    // Revenue split by service line
    const auditPct = rng.nextFloat(0.3, 0.38);
    const taxPct = rng.nextFloat(0.15, 0.2);
    const consultingPct = rng.nextFloat(0.22, 0.3);
    const advisoryRemainder = 1 - auditPct - taxPct - consultingPct;

    const auditRevenue = Math.round(totalRevenue * auditPct);
    const taxRevenue = Math.round(totalRevenue * taxPct);
    const consultingRevenue = Math.round(totalRevenue * consultingPct);
    const advisoryRevenue = Math.round(totalRevenue * advisoryRemainder);
    const actualTotal =
      auditRevenue + taxRevenue + consultingRevenue + advisoryRevenue;

    // Costs
    const staffCosts = Math.round(actualTotal * rng.nextFloat(0.52, 0.58));
    const subcontractorCosts = Math.round(
      actualTotal * rng.nextFloat(0.04, 0.08)
    );
    const travelExpenses = Math.round(
      actualTotal * rng.nextFloat(0.03, 0.05)
    );
    const techCosts = Math.round(actualTotal * rng.nextFloat(0.03, 0.05));
    const officeCosts = Math.round(actualTotal * rng.nextFloat(0.04, 0.06));
    const marketingCosts = Math.round(
      actualTotal * rng.nextFloat(0.01, 0.02)
    );
    const totalCosts =
      staffCosts +
      subcontractorCosts +
      travelExpenses +
      techCosts +
      officeCosts +
      marketingCosts;
    const operatingProfit = actualTotal - totalCosts;
    const operatingMargin = (operatingProfit / actualTotal) * 100;

    // KPIs
    const numPartners = 15;
    const numFTE = 250;
    const revenuePerPartner = Math.round(actualTotal / numPartners);
    const revenuePerFTE = Math.round(actualTotal / numFTE);
    const avgBillRate = rng.nextInt(220, 290);
    const utilization = rng.nextFloat(68, 82, 1);

    rows.push({
      Month: month,
      Audit_Revenue: n(auditRevenue),
      Tax_Revenue: n(taxRevenue),
      Consulting_Revenue: n(consultingRevenue),
      Advisory_Revenue: n(advisoryRevenue),
      Total_Revenue: n(actualTotal),
      Staff_Costs: n(staffCosts),
      Subcontractor_Costs: n(subcontractorCosts),
      Travel_Expenses: n(travelExpenses),
      Technology_Costs: n(techCosts),
      Office_Costs: n(officeCosts),
      Marketing_Costs: n(marketingCosts),
      Total_Costs: n(totalCosts),
      Operating_Profit: n(operatingProfit),
      "Operating_Margin_%": nf(operatingMargin, 1),
      Revenue_per_Partner: n(revenuePerPartner),
      Revenue_per_FTE: n(revenuePerFTE),
      Average_Bill_Rate: n(avgBillRate),
      "Utilization_%": nf(utilization, 1),
    });
  }
  return rows;
}

function generatePipeline(
  rng: SeededRandom,
  employees: Record<string, string>[]
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const partners = employees
    .filter((e) => e.Level === "Partner")
    .map((e) => e.Name);
  while (partners.length < 10) partners.push(genName(rng));

  const REASONS_WON = [
    "Strongest technical proposal",
    "Existing relationship",
    "Best value for money",
    "Industry expertise",
    "Innovation approach",
    "Team quality",
  ];
  const REASONS_LOST = [
    "Price too high",
    "Competitor relationship",
    "Scope mismatch",
    "Timing",
    "Went with incumbent",
    "Budget cut",
  ];

  for (let i = 0; i < 80; i++) {
    const oppId = `OPP-${String(i + 1).padStart(4, "0")}`;
    const clientId = `DC-${String(rng.nextInt(1, 100)).padStart(3, "0")}`;
    const offering = rng.pick(OFFERINGS);
    const serviceLine = OFFERING_TO_SL[offering] || rng.pick(SERVICE_LINES);

    const proposalYear = rng.pick([2024, 2025]);
    const proposalMonth = rng.nextInt(1, 12);
    const proposalDate = `${proposalYear}-${String(proposalMonth).padStart(2, "0")}-${String(rng.nextInt(1, 28)).padStart(2, "0")}`;

    // Decision date: 1-6 months after proposal
    const decisionOffset = rng.nextInt(1, 6);
    const decisionMonth = proposalMonth + decisionOffset;
    const decisionYear =
      proposalYear + Math.floor((decisionMonth - 1) / 12);
    const decisionMonthNorm = ((decisionMonth - 1) % 12) + 1;
    const decisionDate = `${decisionYear}-${String(decisionMonthNorm).padStart(2, "0")}-${String(rng.nextInt(1, 28)).padStart(2, "0")}`;

    const feeEstimate = rng.nextInt(100000, 10000000);
    const stage = rng.pickWeighted(PIPELINE_STAGES, [15, 20, 20, 15, 18, 12]);
    const winProb =
      stage === "Won"
        ? 100
        : stage === "Lost"
          ? 0
          : stage === "Identified"
            ? rng.nextInt(10, 25)
            : stage === "Qualified"
              ? rng.nextInt(20, 45)
              : stage === "Proposal Submitted"
                ? rng.nextInt(30, 60)
                : rng.nextInt(50, 90); // Shortlisted

    const weightedValue = Math.round((feeEstimate * winProb) / 100);
    const competitor = rng.pick(COMPETITORS);
    const partnerLead = rng.pick(partners);

    let reasonWonLost = "";
    if (stage === "Won") reasonWonLost = rng.pick(REASONS_WON);
    else if (stage === "Lost") reasonWonLost = rng.pick(REASONS_LOST);

    rows.push({
      Opportunity_ID: oppId,
      Client_ID: clientId,
      Service_Line: serviceLine,
      Offering: offering,
      Proposal_Date: proposalDate,
      Decision_Date: decisionDate,
      Fee_Estimate: n(feeEstimate),
      "Win_Probability_%": n(winProb),
      Weighted_Value: n(weightedValue),
      Stage: stage,
      Competitor: competitor,
      Partner_Lead: partnerLead,
      Reason_Won_Lost: reasonWonLost,
    });
  }
  return rows;
}

function generateUtilizationMonthly(
  rng: SeededRandom
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const months2025 = [
    "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
    "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  ];

  const headcounts: Record<string, number> = {
    Analyst: 50,
    Consultant: 55,
    "Senior Consultant": 48,
    Manager: 38,
    "Senior Manager": 32,
    Partner: 15,
  };

  const avgRates: Record<string, number> = {
    Analyst: 105,
    Consultant: 150,
    "Senior Consultant": 210,
    Manager: 290,
    "Senior Manager": 375,
    Partner: 520,
  };

  for (const level of UTIL_LEVELS) {
    for (const month of months2025) {
      const monthNum = parseInt(month.split("-")[1]);
      const hc = headcounts[level] + rng.nextInt(-2, 3);
      const availableHoursPerPerson = rng.nextInt(140, 170); // monthly
      const availableHours = hc * availableHoursPerPerson;
      const targetUtil = UTIL_TARGETS[level];

      // Seasonal variation
      const seasonMod =
        monthNum >= 7 && monthNum <= 8
          ? -8
          : monthNum >= 1 && monthNum <= 3
            ? 4
            : 0;
      const actualUtil = Math.max(
        25,
        Math.min(
          98,
          targetUtil + seasonMod + rng.nextInt(-6, 6)
        )
      );
      const billableHours = Math.round(
        (availableHours * actualUtil) / 100
      );
      const rate = avgRates[level] + rng.nextInt(-15, 15);
      const revenueGenerated = billableHours * rate;
      const gap = actualUtil - targetUtil;

      rows.push({
        Level: level,
        Month: month,
        Headcount: n(hc),
        Available_Hours: n(availableHours),
        Billable_Hours: n(billableHours),
        "Utilization_%": nf(actualUtil, 1),
        Average_Rate: n(rate),
        Revenue_Generated: n(revenueGenerated),
        "Target_Utilization_%": n(targetUtil),
        "Gap_%": nf(gap, 1),
      });
    }
  }
  return rows;
}

function generateTraining(
  rng: SeededRandom,
  employees: Record<string, string>[]
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const completionStatuses = [
    "Completed",
    "In Progress",
    "Not Started",
  ] as const;

  for (let i = 0; i < 200; i++) {
    const trainingId = `TR-${String(i + 1).padStart(4, "0")}`;
    const emp = rng.pick(employees);
    const course = rng.pick(TRAINING_COURSES);
    const category = TRAINING_CATEGORIES[course] || "Technical";
    const hours = rng.nextInt(4, 40);
    const date = rng.dateInRange("2025-01-01", "2025-12-31");
    const status = rng.pickWeighted(completionStatuses, [60, 25, 15]);
    const mandatory = rng.pickWeighted(
      ["Yes", "No"] as const,
      [35, 65]
    );
    const costPerHour = rng.nextInt(50, 200);
    const cost = hours * costPerHour;

    rows.push({
      Training_ID: trainingId,
      Employee_ID: emp.Employee_ID,
      Course_Name: course,
      Category: category,
      Hours: n(hours),
      Date: date,
      Completion_Status: status,
      Mandatory: mandatory,
      Cost: n(cost),
    });
  }
  return rows;
}

function generateExpenses(
  rng: SeededRandom,
  employees: Record<string, string>[],
  engagements: Record<string, string>[]
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const currencies = ["EUR", "CHF", "EUR", "EUR"] as const; // weighted toward EUR
  const statuses = [
    "Submitted",
    "Approved",
    "Rejected",
    "Reimbursed",
  ] as const;

  // Approvers are managers+
  const approvers = employees
    .filter(
      (e) =>
        e.Level === "Manager" ||
        e.Level === "Senior Manager" ||
        e.Level === "Director" ||
        e.Level === "Partner"
    )
    .map((e) => e.Name);

  // Active engagements for referential integrity
  const activeEngIds = engagements
    .filter((e) => e.Status === "Active" || e.Status === "Completed")
    .map((e) => e.Engagement_ID);

  for (let i = 0; i < 400; i++) {
    const expId = `EXP-${String(i + 1).padStart(5, "0")}`;
    const emp = rng.pick(employees);
    const engId =
      activeEngIds.length > 0 ? rng.pick(activeEngIds) : "ENG-00001";
    const date = rng.dateInRange("2025-01-01", "2025-12-31");
    const category = rng.pickWeighted(EXPENSE_CATEGORIES, [
      30, 25, 20, 10, 8, 7,
    ]);

    // Amount varies by category
    let amountMin = 20;
    let amountMax = 200;
    if (category === "Travel") {
      amountMin = 50;
      amountMax = 2500;
    } else if (category === "Accommodation") {
      amountMin = 80;
      amountMax = 350;
    } else if (category === "Meals") {
      amountMin = 15;
      amountMax = 120;
    } else if (category === "Technology") {
      amountMin = 50;
      amountMax = 3000;
    } else if (category === "Client Entertainment") {
      amountMin = 100;
      amountMax = 2000;
    } else if (category === "Training") {
      amountMin = 200;
      amountMax = 5000;
    }

    const amount = rng.nextFloat(amountMin, amountMax);
    const currency = rng.pick(currencies);
    const clientBillable = rng.pickWeighted(
      ["Yes", "No"] as const,
      [60, 40]
    );
    const status = rng.pickWeighted(statuses, [15, 40, 5, 40]);
    const approver = rng.pick(approvers);

    rows.push({
      Expense_ID: expId,
      Employee_ID: emp.Employee_ID,
      Engagement_ID: engId,
      Date: date,
      Category: category,
      Amount: nf(amount),
      Currency: currency,
      Client_Billable: clientBillable,
      Status: status,
      Approver: approver,
    });
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════════════════

export function generateDeloitteData(): DemoCompany {
  const rng = new SeededRandom(770033); // Deloitte seed

  // Generate in dependency order
  const clients = generateClients(rng);
  const employees = generateEmployees(rng);
  const engagements = generateEngagements(rng, employees);
  const monthlyPnl = generateMonthlyPnl(rng);
  const pipeline = generatePipeline(rng, employees);
  const utilizationMonthly = generateUtilizationMonthly(rng);
  const training = generateTraining(rng, employees);
  const expenses = generateExpenses(rng, employees, engagements);

  return {
    id: "deloitte",
    name: "Deloitte DACH",
    industry: "Professional Services",
    description:
      "Regional practice with 5 service lines, 250 employees, 100 clients. Covers engagements, utilization, pipeline, P&L, training, and expenses.",
    datasets: [
      {
        id: "dl_engagements",
        name: "Engagements",
        rows: engagements,
        headers: [
          "Engagement_ID", "Client_ID", "Service_Line", "Offering", "Partner",
          "Manager", "Start_Date", "End_Date", "Status", "Fee_Budget",
          "Fee_Actual", "Fee_Variance", "Hours_Budget", "Hours_Actual",
          "Realization_Rate_%", "WIP", "Billing_Status", "Risk_Rating", "Industry",
        ],
        columnTypes: {
          Engagement_ID: "string",
          Client_ID: "string",
          Service_Line: "string",
          Offering: "string",
          Partner: "string",
          Manager: "string",
          Start_Date: "date",
          End_Date: "date",
          Status: "string",
          Fee_Budget: "number",
          Fee_Actual: "number",
          Fee_Variance: "number",
          Hours_Budget: "number",
          Hours_Actual: "number",
          "Realization_Rate_%": "number",
          WIP: "number",
          Billing_Status: "string",
          Risk_Rating: "string",
          Industry: "string",
        },
      },
      {
        id: "dl_employees",
        name: "Employees",
        rows: employees,
        headers: [
          "Employee_ID", "Name", "Level", "Service_Line", "Office",
          "Start_Date", "Annual_Salary", "Charge_Rate_per_Hour",
          "Utilization_Target_%", "Utilization_Actual_%", "Billable_Hours_YTD",
          "Non_Billable_Hours_YTD", "Training_Hours_YTD", "Performance_Rating",
          "Certifications", "Active_Engagements",
        ],
        columnTypes: {
          Employee_ID: "string",
          Name: "string",
          Level: "string",
          Service_Line: "string",
          Office: "string",
          Start_Date: "date",
          Annual_Salary: "number",
          Charge_Rate_per_Hour: "number",
          "Utilization_Target_%": "number",
          "Utilization_Actual_%": "number",
          Billable_Hours_YTD: "number",
          Non_Billable_Hours_YTD: "number",
          Training_Hours_YTD: "number",
          Performance_Rating: "number",
          Certifications: "string",
          Active_Engagements: "number",
        },
      },
      {
        id: "dl_clients",
        name: "Clients",
        rows: clients,
        headers: [
          "Client_ID", "Company_Name", "Industry", "Country", "Segment",
          "Relationship_Partner", "Client_Since", "Annual_Fees",
          "Cross_Sell_Score", "NPS_Score", "Risk_Level",
        ],
        columnTypes: {
          Client_ID: "string",
          Company_Name: "string",
          Industry: "string",
          Country: "string",
          Segment: "string",
          Relationship_Partner: "string",
          Client_Since: "number",
          Annual_Fees: "number",
          Cross_Sell_Score: "number",
          NPS_Score: "number",
          Risk_Level: "string",
        },
      },
      {
        id: "dl_monthly_pnl",
        name: "Monthly P&L",
        rows: monthlyPnl,
        headers: [
          "Month", "Audit_Revenue", "Tax_Revenue", "Consulting_Revenue",
          "Advisory_Revenue", "Total_Revenue", "Staff_Costs", "Subcontractor_Costs",
          "Travel_Expenses", "Technology_Costs", "Office_Costs", "Marketing_Costs",
          "Total_Costs", "Operating_Profit", "Operating_Margin_%",
          "Revenue_per_Partner", "Revenue_per_FTE", "Average_Bill_Rate", "Utilization_%",
        ],
        columnTypes: {
          Month: "date",
          Audit_Revenue: "number",
          Tax_Revenue: "number",
          Consulting_Revenue: "number",
          Advisory_Revenue: "number",
          Total_Revenue: "number",
          Staff_Costs: "number",
          Subcontractor_Costs: "number",
          Travel_Expenses: "number",
          Technology_Costs: "number",
          Office_Costs: "number",
          Marketing_Costs: "number",
          Total_Costs: "number",
          Operating_Profit: "number",
          "Operating_Margin_%": "number",
          Revenue_per_Partner: "number",
          Revenue_per_FTE: "number",
          Average_Bill_Rate: "number",
          "Utilization_%": "number",
        },
      },
      {
        id: "dl_pipeline",
        name: "Pipeline / Opportunities",
        rows: pipeline,
        headers: [
          "Opportunity_ID", "Client_ID", "Service_Line", "Offering",
          "Proposal_Date", "Decision_Date", "Fee_Estimate", "Win_Probability_%",
          "Weighted_Value", "Stage", "Competitor", "Partner_Lead", "Reason_Won_Lost",
        ],
        columnTypes: {
          Opportunity_ID: "string",
          Client_ID: "string",
          Service_Line: "string",
          Offering: "string",
          Proposal_Date: "date",
          Decision_Date: "date",
          Fee_Estimate: "number",
          "Win_Probability_%": "number",
          Weighted_Value: "number",
          Stage: "string",
          Competitor: "string",
          Partner_Lead: "string",
          Reason_Won_Lost: "string",
        },
      },
      {
        id: "dl_utilization_monthly",
        name: "Utilization by Level (Monthly)",
        rows: utilizationMonthly,
        headers: [
          "Level", "Month", "Headcount", "Available_Hours", "Billable_Hours",
          "Utilization_%", "Average_Rate", "Revenue_Generated",
          "Target_Utilization_%", "Gap_%",
        ],
        columnTypes: {
          Level: "string",
          Month: "date",
          Headcount: "number",
          Available_Hours: "number",
          Billable_Hours: "number",
          "Utilization_%": "number",
          Average_Rate: "number",
          Revenue_Generated: "number",
          "Target_Utilization_%": "number",
          "Gap_%": "number",
        },
      },
      {
        id: "dl_training",
        name: "Training Records",
        rows: training,
        headers: [
          "Training_ID", "Employee_ID", "Course_Name", "Category",
          "Hours", "Date", "Completion_Status", "Mandatory", "Cost",
        ],
        columnTypes: {
          Training_ID: "string",
          Employee_ID: "string",
          Course_Name: "string",
          Category: "string",
          Hours: "number",
          Date: "date",
          Completion_Status: "string",
          Mandatory: "string",
          Cost: "number",
        },
      },
      {
        id: "dl_expenses",
        name: "Expenses",
        rows: expenses,
        headers: [
          "Expense_ID", "Employee_ID", "Engagement_ID", "Date",
          "Category", "Amount", "Currency", "Client_Billable",
          "Status", "Approver",
        ],
        columnTypes: {
          Expense_ID: "string",
          Employee_ID: "string",
          Engagement_ID: "string",
          Date: "date",
          Category: "string",
          Amount: "number",
          Currency: "string",
          Client_Billable: "string",
          Status: "string",
          Approver: "string",
        },
      },
    ],
  };
}
