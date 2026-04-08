import type { SlotConfig } from "@/components/SlotConfigModal";

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  recommendedDatasets: string[];
  slots: SlotConfig[];
}

const TEMPLATES: DashboardTemplate[] = [
  {
    id: "saas-metrics",
    name: "SaaS Metrics Dashboard",
    description: "Track MRR, ARR, Churn Rate, LTV/CAC, and NRR with trend charts.",
    category: "SaaS",
    icon: "saas",
    recommendedDatasets: ["saas-kpis"],
    slots: [
      { type: "kpi", datasetId: "saas-kpis", datasetName: "SaaS KPI Dashboard", column: "MRR", aggregation: "latest" },
      { type: "kpi", datasetId: "saas-kpis", datasetName: "SaaS KPI Dashboard", column: "Churn_Rate_%", aggregation: "avg" },
      { type: "kpi", datasetId: "saas-kpis", datasetName: "SaaS KPI Dashboard", column: "LTV_CAC_Ratio", aggregation: "latest" },
      { type: "chart", datasetId: "saas-kpis", datasetName: "SaaS KPI Dashboard", column: "MRR", chartType: "line" },
      { type: "chart", datasetId: "saas-kpis", datasetName: "SaaS KPI Dashboard", column: "Churn_Rate_%", chartType: "bar" },
      { type: "chart", datasetId: "saas-kpis", datasetName: "SaaS KPI Dashboard", column: "LTV", chartType: "bar" },
    ],
  },
  {
    id: "financial-controller",
    name: "Financial Controller",
    description: "Revenue, Gross Margin, EBITDA, and Net Income with P&L views.",
    category: "Finance",
    icon: "finance",
    recommendedDatasets: ["pnl-2025"],
    slots: [
      { type: "kpi", datasetId: "pnl-2025", datasetName: "P&L Income Statement 2025", column: "Revenue", aggregation: "sum" },
      { type: "kpi", datasetId: "pnl-2025", datasetName: "P&L Income Statement 2025", column: "Gross_Margin_%", aggregation: "avg" },
      { type: "kpi", datasetId: "pnl-2025", datasetName: "P&L Income Statement 2025", column: "EBITDA", aggregation: "sum" },
      { type: "chart", datasetId: "pnl-2025", datasetName: "P&L Income Statement 2025", column: "Revenue", chartType: "line" },
      { type: "chart", datasetId: "pnl-2025", datasetName: "P&L Income Statement 2025", column: "Net_Income", chartType: "area" },
      { type: "chart", datasetId: "pnl-2025", datasetName: "P&L Income Statement 2025", column: "EBITDA", chartType: "bar" },
    ],
  },
  {
    id: "sales-performance",
    name: "Sales Performance",
    description: "Total Revenue, Win Rate, Pipeline Value, and Avg Deal Size with charts.",
    category: "Sales",
    icon: "sales",
    recommendedDatasets: ["sales_transactions", "sales-q1-2026"],
    slots: [
      { type: "kpi", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Revenue", aggregation: "sum" },
      { type: "kpi", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Customers", aggregation: "latest" },
      { type: "kpi", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "MRR", aggregation: "avg" },
      { type: "chart", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Revenue", chartType: "line" },
      { type: "chart", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Customers", chartType: "bar" },
      { type: "table", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", columns: ["Month", "Revenue", "Customers", "MRR"], rowLimit: 6 },
    ],
  },
  {
    id: "hr-analytics",
    name: "HR/People Analytics",
    description: "Headcount, Avg Salary, Utilization, and Training Hours with department views.",
    category: "HR",
    icon: "hr",
    recommendedDatasets: ["employee"],
    slots: [
      { type: "kpi", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Customers", aggregation: "sum" },
      { type: "kpi", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Revenue", aggregation: "avg" },
      { type: "kpi", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "MRR", aggregation: "latest" },
      { type: "chart", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Customers", chartType: "bar" },
      { type: "chart", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Revenue", chartType: "line" },
      { type: "table", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", columns: ["Month", "Revenue", "Customers"], rowLimit: 10 },
    ],
  },
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "Revenue, EBITDA Margin, Customer Count, and Churn overview for leadership.",
    category: "Executive",
    icon: "executive",
    recommendedDatasets: ["pnl-2025", "saas-kpis"],
    slots: [
      { type: "kpi", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Revenue", aggregation: "sum" },
      { type: "kpi", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Customers", aggregation: "latest" },
      { type: "kpi", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "MRR", aggregation: "latest" },
      { type: "chart", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "Revenue", chartType: "line" },
      { type: "chart", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", column: "MRR", chartType: "area" },
      { type: "table", datasetId: "sales-q1-2026", datasetName: "Sales Performance 2026", columns: ["Month", "Revenue", "Customers", "MRR"], rowLimit: 6 },
    ],
  },
];

export function getTemplates(): DashboardTemplate[] {
  return TEMPLATES;
}

export function applyTemplate(templateId: string): SlotConfig[] {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return [];
  return template.slots.map((s) => ({ ...s }));
}
