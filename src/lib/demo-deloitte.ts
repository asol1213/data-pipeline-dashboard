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

// ── Client companies (German DAX / MDAX / Mid-Market) ──
const DL_COMPANIES: { name: string; industry: string; segment: string; country: string }[] = [
  { name: "Allianz SE", industry: "Insurance", segment: "DAX 40", country: "Germany" },
  { name: "Deutsche Bank AG", industry: "Banking", segment: "DAX 40", country: "Germany" },
  { name: "SAP SE", industry: "Technology", segment: "DAX 40", country: "Germany" },
  { name: "BMW AG", industry: "Automotive", segment: "DAX 40", country: "Germany" },
  { name: "BASF SE", industry: "Chemicals", segment: "DAX 40", country: "Germany" },
  { name: "Siemens AG", industry: "Industrial", segment: "DAX 40", country: "Germany" },
  { name: "Mercedes-Benz Group", industry: "Automotive", segment: "DAX 40", country: "Germany" },
  { name: "Deutsche Telekom AG", industry: "Telecom", segment: "DAX 40", country: "Germany" },
  { name: "Bayer AG", industry: "Pharma", segment: "DAX 40", country: "Germany" },
  { name: "Volkswagen AG", industry: "Automotive", segment: "DAX 40", country: "Germany" },
  { name: "adidas AG", industry: "Consumer Goods", segment: "DAX 40", country: "Germany" },
  { name: "Henkel AG", industry: "Chemicals", segment: "DAX 40", country: "Germany" },
  { name: "Continental AG", industry: "Automotive", segment: "DAX 40", country: "Germany" },
  { name: "Deutsche Post DHL", industry: "Logistics", segment: "DAX 40", country: "Germany" },
  { name: "E.ON SE", industry: "Energy", segment: "DAX 40", country: "Germany" },
  { name: "Infineon Technologies", industry: "Technology", segment: "DAX 40", country: "Germany" },
  { name: "Fresenius SE", industry: "Healthcare", segment: "DAX 40", country: "Germany" },
  { name: "RWE AG", industry: "Energy", segment: "DAX 40", country: "Germany" },
  { name: "Muenchener Rueck", industry: "Insurance", segment: "DAX 40", country: "Germany" },
  { name: "HeidelbergCement AG", industry: "Industrial", segment: "DAX 40", country: "Germany" },
  { name: "Commerzbank AG", industry: "Banking", segment: "MDAX", country: "Germany" },
  { name: "Hugo Boss AG", industry: "Consumer Goods", segment: "MDAX", country: "Germany" },
  { name: "Puma SE", industry: "Consumer Goods", segment: "MDAX", country: "Germany" },
  { name: "Fraport AG", industry: "Transport", segment: "MDAX", country: "Germany" },
  { name: "K+S AG", industry: "Chemicals", segment: "MDAX", country: "Germany" },
  { name: "Lufthansa Group", industry: "Transport", segment: "MDAX", country: "Germany" },
  { name: "ThyssenKrupp AG", industry: "Industrial", segment: "MDAX", country: "Germany" },
  { name: "Salzgitter AG", industry: "Industrial", segment: "MDAX", country: "Germany" },
  { name: "GEA Group AG", industry: "Industrial", segment: "MDAX", country: "Germany" },
  { name: "Nemetschek SE", industry: "Technology", segment: "MDAX", country: "Germany" },
  { name: "TeamViewer AG", industry: "Technology", segment: "MDAX", country: "Germany" },
  { name: "Wacker Chemie AG", industry: "Chemicals", segment: "MDAX", country: "Germany" },
  { name: "Bilfinger SE", industry: "Industrial", segment: "MDAX", country: "Germany" },
  { name: "Duerr AG", industry: "Industrial", segment: "MDAX", country: "Germany" },
  { name: "Knorr-Bremse AG", industry: "Automotive", segment: "MDAX", country: "Germany" },
  { name: "OMV AG", industry: "Energy", segment: "Mid-Market", country: "Austria" },
  { name: "Erste Group Bank", industry: "Banking", segment: "Mid-Market", country: "Austria" },
  { name: "voestalpine AG", industry: "Industrial", segment: "Mid-Market", country: "Austria" },
  { name: "Swatch Group AG", industry: "Consumer Goods", segment: "Mid-Market", country: "Switzerland" },
  { name: "Lindt & Spruengli", industry: "Consumer Goods", segment: "Mid-Market", country: "Switzerland" },
  { name: "Schindler Holding", industry: "Industrial", segment: "Mid-Market", country: "Switzerland" },
  { name: "Geberit AG", industry: "Industrial", segment: "Mid-Market", country: "Switzerland" },
  { name: "Sonova Holding AG", industry: "Healthcare", segment: "Mid-Market", country: "Switzerland" },
  { name: "Kuehne + Nagel", industry: "Logistics", segment: "Mid-Market", country: "Switzerland" },
  { name: "Mediengruppe RTL", industry: "Media", segment: "Mid-Market", country: "Germany" },
  { name: "ProSiebenSat.1", industry: "Media", segment: "Mid-Market", country: "Germany" },
  { name: "Hapag-Lloyd AG", industry: "Transport", segment: "Mid-Market", country: "Germany" },
  { name: "Freudenberg Group", industry: "Industrial", segment: "Mid-Market", country: "Germany" },
  { name: "Bosch GmbH", industry: "Automotive", segment: "Mid-Market", country: "Germany" },
  { name: "Trumpf GmbH", industry: "Industrial", segment: "Mid-Market", country: "Germany" },
  { name: "Miele & Cie KG", industry: "Consumer Goods", segment: "Mid-Market", country: "Germany" },
  { name: "Liebherr Group", industry: "Industrial", segment: "Mid-Market", country: "Switzerland" },
  { name: "Evonik Industries", industry: "Chemicals", segment: "Mid-Market", country: "Germany" },
  { name: "Fuchs Petrolub SE", industry: "Chemicals", segment: "Mid-Market", country: "Germany" },
  { name: "Draegerwerk AG", industry: "Healthcare", segment: "Mid-Market", country: "Germany" },
  { name: "Carl Zeiss AG", industry: "Technology", segment: "Mid-Market", country: "Germany" },
  { name: "ZF Friedrichshafen", industry: "Automotive", segment: "Mid-Market", country: "Germany" },
  { name: "Schaeffler AG", industry: "Automotive", segment: "Mid-Market", country: "Germany" },
  { name: "Merck KGaA", industry: "Pharma", segment: "DAX 40", country: "Germany" },
  { name: "Covestro AG", industry: "Chemicals", segment: "Mid-Market", country: "Germany" },
  { name: "Brenntag SE", industry: "Chemicals", segment: "MDAX", country: "Germany" },
  { name: "LEG Immobilien SE", industry: "Real Estate", segment: "MDAX", country: "Germany" },
  { name: "Vonovia SE", industry: "Real Estate", segment: "DAX 40", country: "Germany" },
  { name: "Deutsche Wohnen", industry: "Real Estate", segment: "MDAX", country: "Germany" },
  { name: "Scout24 SE", industry: "Technology", segment: "MDAX", country: "Germany" },
  { name: "Delivery Hero SE", industry: "Technology", segment: "DAX 40", country: "Germany" },
  { name: "Zalando SE", industry: "E-Commerce", segment: "DAX 40", country: "Germany" },
  { name: "HelloFresh SE", industry: "E-Commerce", segment: "MDAX", country: "Germany" },
  { name: "AUTO1 Group SE", industry: "E-Commerce", segment: "Mid-Market", country: "Germany" },
  { name: "Stabilus SE", industry: "Industrial", segment: "Mid-Market", country: "Germany" },
  { name: "Jungheinrich AG", industry: "Industrial", segment: "MDAX", country: "Germany" },
  { name: "Krones AG", industry: "Industrial", segment: "Mid-Market", country: "Germany" },
  { name: "Sixt SE", industry: "Transport", segment: "Mid-Market", country: "Germany" },
  { name: "CTS Eventim AG", industry: "Media", segment: "MDAX", country: "Germany" },
  { name: "Rheinmetall AG", industry: "Industrial", segment: "MDAX", country: "Germany" },
  { name: "Hella GmbH", industry: "Automotive", segment: "Mid-Market", country: "Germany" },
  { name: "MTU Aero Engines", industry: "Industrial", segment: "DAX 40", country: "Germany" },
  { name: "Symrise AG", industry: "Chemicals", segment: "DAX 40", country: "Germany" },
  { name: "Sartorius AG", industry: "Healthcare", segment: "DAX 40", country: "Germany" },
  { name: "Qiagen NV", industry: "Healthcare", segment: "DAX 40", country: "Germany" },
  { name: "Rational AG", industry: "Industrial", segment: "Mid-Market", country: "Germany" },
  { name: "Fielmann AG", industry: "Healthcare", segment: "Mid-Market", country: "Germany" },
  { name: "Gerresheimer AG", industry: "Healthcare", segment: "MDAX", country: "Germany" },
  { name: "Siltronic AG", industry: "Technology", segment: "MDAX", country: "Germany" },
  { name: "Software AG", industry: "Technology", segment: "MDAX", country: "Germany" },
  { name: "Bechtle AG", industry: "Technology", segment: "MDAX", country: "Germany" },
  { name: "CANCOM SE", industry: "Technology", segment: "Mid-Market", country: "Germany" },
  { name: "CompuGroup Medical", industry: "Technology", segment: "Mid-Market", country: "Germany" },
  { name: "Nordex SE", industry: "Energy", segment: "Mid-Market", country: "Germany" },
  { name: "SMA Solar Technology", industry: "Energy", segment: "Mid-Market", country: "Germany" },
  { name: "Encavis AG", industry: "Energy", segment: "Mid-Market", country: "Germany" },
  { name: "Verbio SE", industry: "Energy", segment: "Mid-Market", country: "Germany" },
  { name: "Befesa SA", industry: "Industrial", segment: "Mid-Market", country: "Germany" },
  { name: "Kion Group AG", industry: "Industrial", segment: "MDAX", country: "Germany" },
  { name: "Fuchs SE", industry: "Industrial", segment: "Mid-Market", country: "Germany" },
  { name: "Hochtief AG", industry: "Industrial", segment: "MDAX", country: "Germany" },
  { name: "Aurubis AG", industry: "Industrial", segment: "MDAX", country: "Germany" },
  { name: "Lanxess AG", industry: "Chemicals", segment: "MDAX", country: "Germany" },
  { name: "Wuestenrot & Wuerttembergische", industry: "Insurance", segment: "Mid-Market", country: "Germany" },
  { name: "Talanx AG", industry: "Insurance", segment: "MDAX", country: "Germany" },
];

// ── Offering catalogues per service line ──
const OFFERINGS: Record<string, string[]> = {
  "Audit": ["Statutory Audit", "IFRS Conversion", "Internal Audit", "SOX Compliance", "ESG Assurance", "IT Audit"],
  "Tax": ["Corporate Tax", "Transfer Pricing", "VAT Advisory", "International Tax", "M&A Tax", "Tax Technology"],
  "Consulting": ["Strategy & Operations", "Technology Transformation", "Human Capital", "SAP Implementation", "Cloud Migration", "Data & Analytics"],
  "Risk Advisory": ["Cyber Security", "Regulatory Compliance", "Internal Controls", "Forensic Investigation", "Data Privacy (GDPR)", "Business Continuity"],
  "Financial Advisory": ["M&A Advisory", "Valuation", "Restructuring", "Transaction Services", "Capital Markets", "Real Estate Advisory"],
};

const SERVICE_LINES = Object.keys(OFFERINGS) as (keyof typeof OFFERINGS)[];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Training course catalogue ──
const TRAINING_COURSES: { name: string; category: string; hours: number }[] = [
  { name: "IFRS 17 Update", category: "Technical", hours: 16 },
  { name: "Advanced Excel Modelling", category: "Technical", hours: 8 },
  { name: "Power BI Fundamentals", category: "Technical", hours: 12 },
  { name: "Python for Auditors", category: "Technical", hours: 24 },
  { name: "SAP S/4HANA Overview", category: "Technical", hours: 16 },
  { name: "Cyber Incident Response", category: "Technical", hours: 8 },
  { name: "GDPR Deep Dive", category: "Regulatory", hours: 8 },
  { name: "Anti-Money Laundering", category: "Regulatory", hours: 4 },
  { name: "ESG Reporting Standards", category: "Regulatory", hours: 12 },
  { name: "Ethics & Independence", category: "Regulatory", hours: 4 },
  { name: "Transfer Pricing Masterclass", category: "Technical", hours: 16 },
  { name: "Leadership Essentials", category: "Soft Skills", hours: 16 },
  { name: "Client Relationship Management", category: "Soft Skills", hours: 8 },
  { name: "Presentation Skills", category: "Soft Skills", hours: 8 },
  { name: "Negotiation Workshop", category: "Soft Skills", hours: 12 },
  { name: "Project Management (PMP)", category: "Management", hours: 40 },
  { name: "Agile & Scrum", category: "Management", hours: 16 },
  { name: "Risk Management Framework", category: "Management", hours: 12 },
  { name: "Data Analytics with Alteryx", category: "Technical", hours: 16 },
  { name: "Cloud Architecture (AWS/Azure)", category: "Technical", hours: 24 },
  { name: "Valuation Techniques", category: "Technical", hours: 16 },
  { name: "Due Diligence Methodology", category: "Technical", hours: 12 },
  { name: "Restructuring Fundamentals", category: "Technical", hours: 12 },
  { name: "Diversity & Inclusion", category: "Soft Skills", hours: 4 },
  { name: "Mental Health Awareness", category: "Soft Skills", hours: 4 },
];

// ── Expense categories ──
const EXPENSE_CATEGORIES = ["Travel", "Accommodation", "Meals", "Transport", "Office Supplies", "Software Licenses", "Client Entertainment", "Conferences"] as const;

// ── Certification pools per service line ──
const CERTIFICATIONS: Record<string, string[]> = {
  "Audit": ["CPA", "WP (Wirtschaftspruefer)", "ACCA", "CIA", "CISA"],
  "Tax": ["StB (Steuerberater)", "CPA", "LL.M. Tax", "ADIT"],
  "Consulting": ["PMP", "SAP Certified", "AWS Solutions Architect", "Scrum Master", "TOGAF"],
  "Risk Advisory": ["CISA", "CISSP", "CISM", "CFE", "CRISC"],
  "Financial Advisory": ["CFA", "CVA", "ACCA", "CPA", "FRM"],
};

// ─── Main generator ─────────────────────────────────────────────────────────

export function generateDeloitteData(): DemoTable[] {
  const rng = new SeededRandom(999_001);

  // ── Clients (100 rows) ──
  const clients: Record<string, string>[] = [];
  for (let i = 0; i < 100; i++) {
    const c = DL_COMPANIES[i];
    const cid = `DC-${String(i + 1).padStart(3, "0")}`;
    const annualFees = rng.nextInt(50_000, 5_000_000);
    const nps = rng.nextInt(1, 10);
    clients.push({
      Client_ID: cid,
      Company_Name: c.name,
      Industry: c.industry,
      Country: c.country,
      Segment: c.segment,
      Annual_Fees: n(annualFees),
      NPS_Score: n(nps),
    });
  }

  // ── Employees (250 rows) ──
  const levels = ["Analyst", "Consultant", "Senior Consultant", "Manager", "Senior Manager", "Director", "Partner"] as const;
  const levelWeights = [40, 45, 40, 35, 30, 20, 10];
  const offices = ["Munich", "Frankfurt", "Berlin", "Hamburg"] as const;
  const salaryRanges: Record<string, [number, number]> = {
    "Analyst": [45_000, 65_000],
    "Consultant": [60_000, 90_000],
    "Senior Consultant": [80_000, 120_000],
    "Manager": [100_000, 160_000],
    "Senior Manager": [140_000, 220_000],
    "Director": [200_000, 350_000],
    "Partner": [300_000, 500_000],
  };
  const chargeRates: Record<string, [number, number]> = {
    "Analyst": [80, 150],
    "Consultant": [120, 200],
    "Senior Consultant": [180, 280],
    "Manager": [250, 380],
    "Senior Manager": [320, 450],
    "Director": [400, 520],
    "Partner": [480, 600],
  };

  const employees: Record<string, string>[] = [];
  for (let i = 1; i <= 250; i++) {
    const eid = `DE-${String(i).padStart(3, "0")}`;
    const level = rng.pickWeighted(levels, levelWeights);
    const sl = rng.pick(SERVICE_LINES);
    const office = rng.pick(offices);
    const [salMin, salMax] = salaryRanges[level];
    const salary = rng.nextInt(salMin, salMax);
    const [crMin, crMax] = chargeRates[level];
    const chargeRate = rng.nextInt(crMin, crMax);
    const utilTarget = level === "Partner" ? rng.nextInt(30, 50) : rng.nextInt(65, 85);
    const utilActual = rng.nextInt(Math.max(20, utilTarget - 20), Math.min(100, utilTarget + 15));
    const perfRating = rng.nextInt(1, 5);
    const certPool = CERTIFICATIONS[sl];
    const numCerts = rng.nextInt(0, 3);
    const certs: string[] = [];
    for (let c = 0; c < numCerts; c++) {
      const cert = rng.pick(certPool);
      if (!certs.includes(cert)) certs.push(cert);
    }

    employees.push({
      Employee_ID: eid,
      Name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
      Level: level,
      Service_Line: sl,
      Office: office,
      Salary: n(salary),
      Charge_Rate: n(chargeRate),
      Utilization_Target_Pct: n(utilTarget),
      Utilization_Actual_Pct: n(utilActual),
      Performance_Rating: n(perfRating),
      Certifications: certs.length > 0 ? certs.join(", ") : "None",
    });
  }

  // ── Engagements (300 rows) ──
  const engStatuses = ["Active", "Completed", "On Hold", "Cancelled"] as const;
  const billingStatuses = ["Current", "WIP Pending", "Invoiced", "Overdue", "Write-Off"] as const;
  const riskRatings = ["Low", "Medium", "High"] as const;
  const engRng = new SeededRandom(999_002);

  const engagements: Record<string, string>[] = [];
  for (let i = 1; i <= 300; i++) {
    const engId = `ENG-${String(i).padStart(4, "0")}`;
    const clientIdx = engRng.nextInt(0, 99);
    const cid = clients[clientIdx].Client_ID;
    const sl = engRng.pick(SERVICE_LINES);
    const offering = engRng.pick(OFFERINGS[sl]);
    // Pick partner and manager from employees in similar service line
    const partnerPool = employees.filter(e => e.Level === "Partner");
    const managerPool = employees.filter(e => e.Level === "Manager" || e.Level === "Senior Manager");
    const partner = engRng.pick(partnerPool).Name;
    const manager = engRng.pick(managerPool).Name;
    const startDate = engRng.dateInRange("2023-06-01", "2025-09-30");
    const durationDays = engRng.nextInt(30, 365);
    const endDate = new Date(new Date(startDate).getTime() + durationDays * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const feeBudget = engRng.nextInt(20_000, 2_000_000);
    const feeActual = Math.round(feeBudget * engRng.nextFloat(0.70, 1.25));
    const feeVariance = feeActual - feeBudget;
    const hoursBudget = engRng.nextInt(100, 8000);
    const hoursActual = Math.round(hoursBudget * engRng.nextFloat(0.65, 1.30));
    const wip = engRng.nextInt(0, Math.round(feeActual * 0.3));
    const status = engRng.pickWeighted(engStatuses, [45, 35, 12, 8]);
    const billingStatus = engRng.pickWeighted(billingStatuses, [35, 25, 20, 15, 5]);
    const riskRating = feeVariance > feeBudget * 0.1
      ? engRng.pickWeighted(riskRatings, [10, 40, 50])
      : engRng.pickWeighted(riskRatings, [60, 30, 10]);
    const industry = clients[clientIdx].Industry;

    engagements.push({
      Engagement_ID: engId,
      Client_ID: cid,
      Service_Line: sl,
      Offering: offering,
      Partner: partner,
      Manager: manager,
      Start_Date: startDate,
      End_Date: endDate,
      Status: status,
      Fee_Budget: n(feeBudget),
      Fee_Actual: n(feeActual),
      Fee_Variance: n(feeVariance),
      Hours_Budget: n(hoursBudget),
      Hours_Actual: n(hoursActual),
      WIP: n(wip),
      Billing_Status: billingStatus,
      Risk_Rating: riskRating,
      Industry: industry,
    });
  }

  // ── Monthly P&L (24 rows: Jan 2024 - Dec 2025) ──
  const pnlRng = new SeededRandom(999_003);
  const monthlyPnl: Record<string, string>[] = [];
  for (let yr = 2024; yr <= 2025; yr++) {
    for (let m = 1; m <= 12; m++) {
      const monthLabel = `${MONTH_NAMES[m - 1]} ${yr}`;
      const auditRev = pnlRng.nextInt(3_500_000, 6_000_000);
      const taxRev = pnlRng.nextInt(2_000_000, 4_000_000);
      const consultingRev = pnlRng.nextInt(2_500_000, 5_500_000);
      const advisoryRev = pnlRng.nextInt(1_500_000, 3_500_000);
      const totalRev = auditRev + taxRev + consultingRev + advisoryRev;
      const staffCosts = Math.round(totalRev * pnlRng.nextFloat(0.55, 0.65));
      const otherCosts = Math.round(totalRev * pnlRng.nextFloat(0.10, 0.18));
      const totalCosts = staffCosts + otherCosts;
      const operatingProfit = totalRev - totalCosts;
      const operatingMargin = parseFloat(((operatingProfit / totalRev) * 100).toFixed(1));

      monthlyPnl.push({
        Month: monthLabel,
        Audit_Revenue: n(auditRev),
        Tax_Revenue: n(taxRev),
        Consulting_Revenue: n(consultingRev),
        Advisory_Revenue: n(advisoryRev),
        Total_Revenue: n(totalRev),
        Staff_Costs: n(staffCosts),
        Total_Costs: n(totalCosts),
        Operating_Profit: n(operatingProfit),
        Operating_Margin_Pct: nf(operatingMargin, 1),
      });
    }
  }

  // ── Pipeline (80 rows) ──
  const pipelineRng = new SeededRandom(999_004);
  const stages = ["Identified", "Qualified", "Proposal", "Won", "Lost"] as const;
  const competitors = ["EY", "PwC", "KPMG"] as const;

  const pipeline: Record<string, string>[] = [];
  for (let i = 1; i <= 80; i++) {
    const oppId = `OPP-${String(i).padStart(3, "0")}`;
    const clientIdx = pipelineRng.nextInt(0, 99);
    const cid = clients[clientIdx].Client_ID;
    const sl = pipelineRng.pick(SERVICE_LINES);
    const feeEstimate = pipelineRng.nextInt(30_000, 3_000_000);
    const stage = pipelineRng.pickWeighted(stages, [15, 25, 30, 20, 10]);
    const winProb = stage === "Won" ? 100
      : stage === "Lost" ? 0
      : stage === "Proposal" ? pipelineRng.nextInt(40, 75)
      : stage === "Qualified" ? pipelineRng.nextInt(20, 50)
      : pipelineRng.nextInt(5, 25);
    const weightedValue = Math.round(feeEstimate * (winProb / 100));
    const competitor = pipelineRng.pick(competitors);

    pipeline.push({
      Opportunity_ID: oppId,
      Client_ID: cid,
      Service_Line: sl,
      Fee_Estimate: n(feeEstimate),
      Win_Probability_Pct: n(winProb),
      Weighted_Value: n(weightedValue),
      Stage: stage,
      Competitor: competitor,
    });
  }

  // ── Utilization (72 rows: 6 levels x 12 months) ──
  const utilRng = new SeededRandom(999_005);
  const utilLevels = ["Analyst", "Consultant", "Senior Consultant", "Manager", "Senior Manager", "Director"] as const;
  const baseHeadcounts: Record<string, number> = {
    "Analyst": 50, "Consultant": 55, "Senior Consultant": 45,
    "Manager": 40, "Senior Manager": 30, "Director": 20,
  };
  const baseRates: Record<string, number> = {
    "Analyst": 120, "Consultant": 170, "Senior Consultant": 240,
    "Manager": 330, "Senior Manager": 400, "Director": 480,
  };

  const utilization: Record<string, string>[] = [];
  for (const level of utilLevels) {
    for (let m = 1; m <= 12; m++) {
      const monthLabel = `${MONTH_NAMES[m - 1]} 2025`;
      const hc = baseHeadcounts[level] + utilRng.nextInt(-3, 5);
      const utilPct = utilRng.nextInt(60, 90);
      const availableHours = hc * 160; // ~160 working hours per month
      const billableHours = Math.round(availableHours * (utilPct / 100));
      const revenueGen = Math.round(billableHours * baseRates[level]);

      utilization.push({
        Level: level,
        Month: monthLabel,
        Headcount: n(hc),
        Billable_Hours: n(billableHours),
        Utilization_Pct: n(utilPct),
        Revenue_Generated: n(revenueGen),
      });
    }
  }

  // ── Training (200 rows) ──
  const trainRng = new SeededRandom(999_006);
  const completionStatuses = ["Completed", "In Progress", "Enrolled", "Overdue"] as const;

  const training: Record<string, string>[] = [];
  for (let i = 1; i <= 200; i++) {
    const tid = `TR-${String(i).padStart(4, "0")}`;
    const empIdx = trainRng.nextInt(0, 249);
    const eid = employees[empIdx].Employee_ID;
    const course = trainRng.pick(TRAINING_COURSES);
    const status = trainRng.pickWeighted(completionStatuses, [50, 20, 15, 15]);

    training.push({
      Training_ID: tid,
      Employee_ID: eid,
      Course_Name: course.name,
      Category: course.category,
      Hours: n(course.hours),
      Completion_Status: status,
    });
  }

  // ── Expenses (400 rows) ──
  const expRng = new SeededRandom(999_007);
  const expenseStatuses = ["Approved", "Pending", "Rejected"] as const;

  const expenses: Record<string, string>[] = [];
  for (let i = 1; i <= 400; i++) {
    const expId = `EXP-${String(i).padStart(5, "0")}`;
    const empIdx = expRng.nextInt(0, 249);
    const eid = employees[empIdx].Employee_ID;
    const engIdx = expRng.nextInt(0, 299);
    const engId = engagements[engIdx].Engagement_ID;
    const date = expRng.dateInRange("2024-01-01", "2025-12-31");
    const category = expRng.pick(EXPENSE_CATEGORIES);
    const amount = category === "Travel"
      ? expRng.nextFloat(50, 2500)
      : category === "Accommodation"
        ? expRng.nextFloat(80, 350)
        : category === "Meals"
          ? expRng.nextFloat(10, 120)
          : category === "Client Entertainment"
            ? expRng.nextFloat(50, 800)
            : category === "Software Licenses"
              ? expRng.nextFloat(20, 1500)
              : category === "Conferences"
                ? expRng.nextFloat(200, 3000)
                : expRng.nextFloat(5, 200);
    const clientBillable = expRng.next() > 0.35 ? "Yes" : "No";
    const status = expRng.pickWeighted(expenseStatuses, [70, 20, 10]);

    expenses.push({
      Expense_ID: expId,
      Employee_ID: eid,
      Engagement_ID: engId,
      Date: date,
      Category: category,
      Amount: nf(amount),
      Client_Billable: clientBillable,
      Status: status,
    });
  }

  // ── Assemble all tables ──
  return [
    {
      id: "dl_engagements",
      name: "Deloitte Engagements",
      rows: engagements,
      headers: ["Engagement_ID", "Client_ID", "Service_Line", "Offering", "Partner", "Manager", "Start_Date", "End_Date", "Status", "Fee_Budget", "Fee_Actual", "Fee_Variance", "Hours_Budget", "Hours_Actual", "WIP", "Billing_Status", "Risk_Rating", "Industry"],
      columnTypes: {
        Engagement_ID: "string", Client_ID: "string", Service_Line: "string", Offering: "string",
        Partner: "string", Manager: "string", Start_Date: "date", End_Date: "date",
        Status: "string", Fee_Budget: "number", Fee_Actual: "number", Fee_Variance: "number",
        Hours_Budget: "number", Hours_Actual: "number", WIP: "number", Billing_Status: "string",
        Risk_Rating: "string", Industry: "string",
      },
    },
    {
      id: "dl_employees",
      name: "Deloitte Employees",
      rows: employees,
      headers: ["Employee_ID", "Name", "Level", "Service_Line", "Office", "Salary", "Charge_Rate", "Utilization_Target_Pct", "Utilization_Actual_Pct", "Performance_Rating", "Certifications"],
      columnTypes: {
        Employee_ID: "string", Name: "string", Level: "string", Service_Line: "string",
        Office: "string", Salary: "number", Charge_Rate: "number",
        Utilization_Target_Pct: "number", Utilization_Actual_Pct: "number",
        Performance_Rating: "number", Certifications: "string",
      },
    },
    {
      id: "dl_clients",
      name: "Deloitte Clients",
      rows: clients,
      headers: ["Client_ID", "Company_Name", "Industry", "Country", "Segment", "Annual_Fees", "NPS_Score"],
      columnTypes: {
        Client_ID: "string", Company_Name: "string", Industry: "string", Country: "string",
        Segment: "string", Annual_Fees: "number", NPS_Score: "number",
      },
    },
    {
      id: "dl_monthly_pnl",
      name: "Deloitte Monthly P&L",
      rows: monthlyPnl,
      headers: ["Month", "Audit_Revenue", "Tax_Revenue", "Consulting_Revenue", "Advisory_Revenue", "Total_Revenue", "Staff_Costs", "Total_Costs", "Operating_Profit", "Operating_Margin_Pct"],
      columnTypes: {
        Month: "string", Audit_Revenue: "number", Tax_Revenue: "number",
        Consulting_Revenue: "number", Advisory_Revenue: "number", Total_Revenue: "number",
        Staff_Costs: "number", Total_Costs: "number", Operating_Profit: "number",
        Operating_Margin_Pct: "number",
      },
    },
    {
      id: "dl_pipeline",
      name: "Deloitte Pipeline",
      rows: pipeline,
      headers: ["Opportunity_ID", "Client_ID", "Service_Line", "Fee_Estimate", "Win_Probability_Pct", "Weighted_Value", "Stage", "Competitor"],
      columnTypes: {
        Opportunity_ID: "string", Client_ID: "string", Service_Line: "string",
        Fee_Estimate: "number", Win_Probability_Pct: "number", Weighted_Value: "number",
        Stage: "string", Competitor: "string",
      },
    },
    {
      id: "dl_utilization",
      name: "Deloitte Utilization",
      rows: utilization,
      headers: ["Level", "Month", "Headcount", "Billable_Hours", "Utilization_Pct", "Revenue_Generated"],
      columnTypes: {
        Level: "string", Month: "string", Headcount: "number",
        Billable_Hours: "number", Utilization_Pct: "number", Revenue_Generated: "number",
      },
    },
    {
      id: "dl_training",
      name: "Deloitte Training",
      rows: training,
      headers: ["Training_ID", "Employee_ID", "Course_Name", "Category", "Hours", "Completion_Status"],
      columnTypes: {
        Training_ID: "string", Employee_ID: "string", Course_Name: "string",
        Category: "string", Hours: "number", Completion_Status: "string",
      },
    },
    {
      id: "dl_expenses",
      name: "Deloitte Expenses",
      rows: expenses,
      headers: ["Expense_ID", "Employee_ID", "Engagement_ID", "Date", "Category", "Amount", "Client_Billable", "Status"],
      columnTypes: {
        Expense_ID: "string", Employee_ID: "string", Engagement_ID: "string",
        Date: "date", Category: "string", Amount: "number", Client_Billable: "string",
        Status: "string",
      },
    },
  ];
}
