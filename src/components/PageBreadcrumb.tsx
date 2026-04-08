"use client";

import { usePathname } from "next/navigation";
import Breadcrumb, { type BreadcrumbItem } from "./Breadcrumb";

const BREADCRUMBS: Record<string, BreadcrumbItem[]> = {
  "/dashboard": [{ label: "Dashboard" }],
  "/datasets": [{ label: "Data" }, { label: "Datasets" }],
  "/spreadsheet": [{ label: "Data" }, { label: "Spreadsheet" }],
  "/upload": [{ label: "Data" }, { label: "Upload CSV" }],
  "/connect": [{ label: "Data" }, { label: "Connect" }],
  "/demo": [{ label: "Data" }, { label: "Demo Data" }],
  "/query": [{ label: "Analyze" }, { label: "SQL Query" }],
  "/dax": [{ label: "Analyze" }, { label: "DAX" }],
  "/pivot": [{ label: "Analyze" }, { label: "Pivot Tables" }],
  "/profiling": [{ label: "Analyze" }, { label: "Profiling" }],
  "/model": [{ label: "Analyze" }, { label: "Data Model" }],
  "/planning": [{ label: "Planning" }, { label: "Scenarios" }],
  "/planning/simulator": [
    { label: "Planning", href: "/planning" },
    { label: "P&L Simulator" },
  ],
  "/planning/budget": [
    { label: "Planning", href: "/planning" },
    { label: "Budget Builder" },
  ],
  "/planning/variance": [
    { label: "Planning", href: "/planning" },
    { label: "Variance Analysis" },
  ],
  "/planning/forecast": [
    { label: "Planning", href: "/planning" },
    { label: "Forecast" },
  ],
  "/planning/headcount": [
    { label: "Planning", href: "/planning" },
    { label: "Headcount Planning" },
  ],
  "/planning/cashflow": [
    { label: "Planning", href: "/planning" },
    { label: "Cash Flow" },
  ],
  "/planning/goal-seek": [
    { label: "Planning", href: "/planning" },
    { label: "Goal Seek" },
  ],
  "/planning/compare": [
    { label: "Planning", href: "/planning" },
    { label: "Compare Scenarios" },
  ],
  "/ask": [{ label: "AI" }, { label: "Ask Your Data" }],
  "/chat": [{ label: "AI" }, { label: "AI Chat" }],
  "/builder": [{ label: "Build" }, { label: "Dashboard Builder" }],
  "/templates": [{ label: "Build" }, { label: "Templates" }],
  "/presets": [{ label: "Build" }, { label: "Presets" }],
  "/embed": [{ label: "Build" }, { label: "Embeds" }],
  "/alerts": [{ label: "Admin" }, { label: "Alerts" }],
  "/audit": [{ label: "Admin" }, { label: "Audit Trail" }],
  "/audit/versions": [
    { label: "Admin", href: "/audit" },
    { label: "Version History" },
  ],
  "/lineage": [{ label: "Admin" }, { label: "Lineage" }],
  "/benchmarks": [{ label: "Admin" }, { label: "Benchmarks" }],
  "/reports": [{ label: "Admin" }, { label: "Reports" }],
};

export default function PageBreadcrumb() {
  const pathname = usePathname();

  // Don't show breadcrumbs on the home page
  if (pathname === "/") return null;

  const items = BREADCRUMBS[pathname];
  if (!items) {
    // Fallback: try to build a sensible breadcrumb from the pathname
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    const fallbackItems: BreadcrumbItem[] = segments.map((seg) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    }));
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1">
        <Breadcrumb items={fallbackItems} />
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1">
      <Breadcrumb items={items} />
    </div>
  );
}
