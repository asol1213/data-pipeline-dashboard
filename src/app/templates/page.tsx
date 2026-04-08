"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { getTemplates, applyTemplate } from "@/lib/templates";
import type { DashboardTemplate } from "@/lib/templates";

const ICON_COLORS: Record<string, string> = {
  saas: "from-cyan-500 to-blue-600",
  finance: "from-purple-500 to-indigo-600",
  sales: "from-green-500 to-emerald-600",
  hr: "from-orange-500 to-amber-600",
  executive: "from-rose-500 to-pink-600",
};

const ICON_SVG: Record<string, React.ReactNode> = {
  saas: (
    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  finance: (
    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  sales: (
    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  hr: (
    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  executive: (
    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

function TemplateCard({ template, onApply }: { template: DashboardTemplate; onApply: () => void }) {
  const gradientClass = ICON_COLORS[template.icon] ?? "from-gray-500 to-gray-600";
  const icon = ICON_SVG[template.icon] ?? ICON_SVG.executive;

  const kpiCount = template.slots.filter((s) => s.type === "kpi").length;
  const chartCount = template.slots.filter((s) => s.type === "chart").length;
  const tableCount = template.slots.filter((s) => s.type === "table").length;

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all overflow-hidden group">
      {/* Preview thumbnail */}
      <div className={`h-32 bg-gradient-to-br ${gradientClass} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex flex-col items-center gap-2">
          {icon}
          <span className="text-xs text-white/80 font-medium">{template.category}</span>
        </div>
        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-3 grid-rows-2 h-full w-full gap-1 p-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded" />
            ))}
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-base font-semibold text-text-primary mb-1">{template.name}</h3>
        <p className="text-sm text-text-muted mb-4 leading-relaxed">{template.description}</p>

        {/* Slot summary */}
        <div className="flex items-center gap-3 mb-4 text-xs text-text-muted">
          {kpiCount > 0 && (
            <span className="px-2 py-1 rounded bg-bg-secondary">{kpiCount} KPIs</span>
          )}
          {chartCount > 0 && (
            <span className="px-2 py-1 rounded bg-bg-secondary">{chartCount} Charts</span>
          )}
          {tableCount > 0 && (
            <span className="px-2 py-1 rounded bg-bg-secondary">{tableCount} Tables</span>
          )}
        </div>

        {/* Recommended datasets */}
        <div className="text-xs text-text-muted mb-4">
          <span className="font-medium">Best with:</span>{" "}
          {template.recommendedDatasets.join(", ")}
        </div>

        <button
          onClick={onApply}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors"
        >
          Apply Template
        </button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const templates = getTemplates();

  const handleApply = (templateId: string) => {
    const slots = applyTemplate(templateId);
    if (slots.length === 0) return;

    // Save to localStorage in the same format as the builder
    const page = {
      id: `template-${templateId}-${Date.now()}`,
      name: templates.find((t) => t.id === templateId)?.name ?? "Template",
      slots: [...slots, ...Array(Math.max(0, 6 - slots.length)).fill(null)],
    };

    try {
      localStorage.setItem("dashboard-pages", JSON.stringify([page]));
    } catch {
      // localStorage not available
    }

    router.push("/builder");
  };

  // Group templates by category
  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Template Marketplace</h1>
            <p className="text-sm text-blue-200 mt-1">
              Pre-built dashboard templates for different industries and use cases
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/builder"
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
            >
              Open Builder
            </Link>
            <Link
              href="/"
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Templates count */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-4 mb-8">
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{templates.length}</span> templates available
          </span>
          <span className="text-xs text-text-muted">
            across {categories.length} categories: {categories.join(", ")}
          </span>
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onApply={() => handleApply(template.id)}
          />
        ))}
      </div>
    </div>
  );
}
