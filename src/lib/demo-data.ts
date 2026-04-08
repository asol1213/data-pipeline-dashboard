import type { DemoTable } from "./demo-datasets";
import { generateRevolutData as generateRevolutTables } from "./demo-revolut";
import { generateSiemensData as generateSiemensTables } from "./demo-siemens";

// ─── Shared types ───────────────────────────────────────────────────────────

export interface DemoCompany {
  id: string;
  name: string;
  industry: string;
  description: string;
  datasets: DemoTable[];
}

// ─── Revolut ────────────────────────────────────────────────────────────────

export function generateRevolutData(): DemoCompany {
  return {
    id: "revolut",
    name: "Revolut",
    industry: "FinTech / Digital Banking",
    description:
      "Digital banking platform: 500 transactions, 200 customers across 5 plans, 8 products, 24-month P&L and KPIs, 200 compliance events, and cost centers. ~EUR 50M revenue.",
    datasets: generateRevolutTables(),
  };
}

// ─── Siemens ────────────────────────────────────────────────────────────────

export function generateSiemensData(): DemoCompany {
  return {
    id: "siemens",
    name: "Siemens",
    industry: "Industrial Conglomerate",
    description:
      "Industrial technology division: 400 orders across 3 BUs, 100 B2B customers, 12-month P&L, 200 employees, 80 projects, 150 supply chain POs, and budget vs actual. ~EUR 500M revenue.",
    datasets: generateSiemensTables(),
  };
}
