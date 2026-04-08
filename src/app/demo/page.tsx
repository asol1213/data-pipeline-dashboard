"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DemoCompany {
  id: string;
  name: string;
  industry: string;
  revenue: string;
  tables: number;
  totalRows: string;
  description: string;
  color: string;
  gradient: string;
  datasets: string[];
}

const COMPANIES: DemoCompany[] = [
  {
    id: "revolut",
    name: "Revolut",
    industry: "FinTech / Digital Banking",
    revenue: "~1.8B EUR",
    tables: 7,
    totalRows: "~1,100",
    description:
      "Complete FinTech analytics stack: 500 transactions, 200 customers across 5 segments (Free to Metal), 15 products, 24-month P&L and KPIs, regional breakdowns across 8 markets, and departmental cost centers. Interconnected with realistic FX rates, LTV/CAC metrics, and regulatory statuses.",
    color: "from-blue-500 to-indigo-600",
    gradient: "bg-gradient-to-br from-blue-500/10 to-indigo-600/10",
    datasets: [
      "rev_transactions (500 rows)",
      "rev_customers (200 rows)",
      "rev_products (15 rows)",
      "rev_monthly_kpis (24 rows)",
      "rev_pl_monthly (24 rows)",
      "rev_regional (~192 rows)",
      "rev_cost_centers (120 rows)",
    ],
  },
  {
    id: "siemens",
    name: "Siemens",
    industry: "Industrial Conglomerate",
    revenue: "~72B EUR",
    tables: 7,
    totalRows: "~790",
    description:
      "Enterprise industrial dataset: 400 orders across 5 real BUs (Digital Industries, Smart Infrastructure, Mobility, Healthineers, Financial Services), 150 B2B customers, 8 quarters of financials, workforce analytics by function, 100 active projects with risk scoring, and 80 supply chain suppliers with quality metrics.",
    color: "from-teal-500 to-emerald-600",
    gradient: "bg-gradient-to-br from-teal-500/10 to-emerald-600/10",
    datasets: [
      "si_orders (400 rows)",
      "si_business_units (5 rows)",
      "si_customers (150 rows)",
      "si_financials_quarterly (40 rows)",
      "si_employees (~30 rows)",
      "si_projects (100 rows)",
      "si_supply_chain (80 rows)",
    ],
  },
];

export default function DemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{
    company: string;
    tableCount: number;
    totalRows: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDemo(companyId: string) {
    setLoading(companyId);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: companyId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load demo data");
      }

      const data = await res.json();
      setResult(data);

      // Redirect to datasets page after a short delay
      setTimeout(() => {
        router.push("/datasets");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Enterprise Demo Data
        </h1>
        <p className="text-text-secondary max-w-2xl">
          Load realistic, interconnected enterprise datasets to explore the full
          capabilities of DataPipe. Each company includes fact tables, dimension
          tables, P&amp;L statements, KPIs, and operational data.
        </p>
      </div>

      {/* Warning banner */}
      <div className="mb-8 p-4 rounded-xl border border-warning/30 bg-warning/5">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-warning mt-0.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-warning">
              Loading demo data will replace any existing demo datasets
            </p>
            <p className="text-xs text-text-muted mt-1">
              Your custom uploaded datasets will not be affected. Only datasets
              with matching prefixes (rev_, si_) will be replaced.
            </p>
          </div>
        </div>
      </div>

      {/* Success / Error messages */}
      {result && (
        <div className="mb-8 p-4 rounded-xl border border-success/30 bg-success/5">
          <p className="text-sm text-success font-medium">
            Successfully loaded {result.tableCount} tables with{" "}
            {result.totalRows.toLocaleString()} total rows. Redirecting to
            datasets...
          </p>
        </div>
      )}
      {error && (
        <div className="mb-8 p-4 rounded-xl border border-danger/30 bg-danger/5">
          <p className="text-sm text-danger font-medium">{error}</p>
        </div>
      )}

      {/* Company cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {COMPANIES.map((company) => (
          <div
            key={company.id}
            className={`relative rounded-2xl border border-border-subtle bg-bg-card overflow-hidden transition-all hover:border-border-color hover:shadow-lg ${company.gradient}`}
          >
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${company.color} text-white mb-3`}
                  >
                    {company.industry}
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary">
                    {company.name}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-text-primary">
                    {company.revenue}
                  </p>
                  <p className="text-xs text-text-muted">Annual Revenue</p>
                </div>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                {company.description}
              </p>

              {/* Stats row */}
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary">
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-text-primary">
                    {company.tables} tables
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary">
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-text-primary">
                    {company.totalRows} rows
                  </span>
                </div>
              </div>
            </div>

            {/* Dataset list */}
            <div className="px-6 pb-4">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                Included Tables
              </p>
              <div className="flex flex-wrap gap-1.5">
                {company.datasets.map((ds) => (
                  <span
                    key={ds}
                    className="text-xs px-2 py-1 rounded-md bg-bg-secondary text-text-secondary font-mono"
                  >
                    {ds}
                  </span>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="p-6 pt-4 border-t border-border-subtle">
              <button
                onClick={() => loadDemo(company.id)}
                disabled={loading !== null}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                  loading === company.id
                    ? "bg-accent/50 text-white/70 cursor-wait"
                    : loading !== null
                      ? "bg-bg-secondary text-text-muted cursor-not-allowed"
                      : "bg-gradient-to-r " +
                        company.color +
                        " text-white hover:shadow-lg hover:shadow-accent/20 hover:scale-[1.01] active:scale-[0.99]"
                }`}
              >
                {loading === company.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating datasets...
                  </span>
                ) : (
                  `Load ${company.name} Demo`
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
