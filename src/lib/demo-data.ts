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
      "Complete FinTech analytics: 500 transactions, 200 customers, 15 products, 24-month P&L, KPIs, regional breakdowns, and cost centers.",
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
      "Enterprise industrial dataset: 400 orders across 5 BUs, 150 B2B customers, quarterly financials, workforce analytics, 100 projects, and supply chain data.",
    datasets: generateSiemensTables(),
  };
}
