"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RecentActivity from "@/components/RecentActivity";

interface DemoCard {
  id: string;
  name: string;
  emoji: string;
  industry: string;
  tables: number;
  rows: string;
  color: string;
}

const DEMOS: DemoCard[] = [
  {
    id: "revolut",
    name: "Revolut",
    emoji: "\uD83C\uDFE6",
    industry: "FinTech",
    tables: 7,
    rows: "1,158",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "siemens",
    name: "Siemens",
    emoji: "\u2699\uFE0F",
    industry: "Industrial",
    tables: 7,
    rows: "990",
    color: "from-teal-500 to-emerald-600",
  },
  {
    id: "deloitte",
    name: "Deloitte",
    emoji: "\uD83C\uDFE2",
    industry: "Consulting",
    tables: 8,
    rows: "1,500",
    color: "from-purple-500 to-pink-600",
  },
];

interface FeatureCard {
  emoji: string;
  title: string;
  subtitle: string;
  href: string;
}

const FEATURES: FeatureCard[] = [
  { emoji: "\u2728", title: "Ask AI", subtitle: "AI Data Analyst", href: "/ask" },
  { emoji: "\uD83D\uDCCA", title: "SQL Query", subtitle: "Query Editor", href: "/query" },
  { emoji: "\uD83D\uDCDD", title: "Excel Sheet", subtitle: "Sheet Editor", href: "/spreadsheet" },
  { emoji: "\uD83D\uDCC8", title: "Plan", subtitle: "Budget Builder", href: "/planning/budget" },
  { emoji: "\uD83C\uDFD7\uFE0F", title: "Dash Builder", subtitle: "Drag & Drop", href: "/builder" },
  { emoji: "\uD83D\uDD04", title: "Pivot Tables", subtitle: "Cross-tabulate", href: "/pivot" },
  { emoji: "\uD83D\uDCD1", title: "DAX Formulas", subtitle: "Power BI-style", href: "/dax" },
  { emoji: "\uD83C\uDFAF", title: "Goal Seek", subtitle: "What-if Analysis", href: "/planning/goal-seek" },
];

export default function HeroPage() {
  const router = useRouter();
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function loadDemo(demo: DemoCard) {
    setLoadingDemo(demo.id);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: demo.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load demo data");
      }

      const data = await res.json();
      setToast(
        `Loaded ${demo.name} demo (${data.tableCount} tables, ${data.totalRows.toLocaleString()} rows)`
      );

      setTimeout(() => {
        router.push("/datasets");
      }, 1200);
    } catch (err) {
      setToast(
        `Error: ${err instanceof Error ? err.message : "Failed to load demo"}`
      );
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoadingDemo(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
          <div
            className={`px-5 py-3 rounded-xl shadow-xl text-sm font-medium ${
              toast.startsWith("Error")
                ? "bg-danger/90 text-white"
                : "bg-success/90 text-white"
            }`}
          >
            {toast}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden" data-tour="hero">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-[#8b5cf6]/5" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-[#8b5cf6]/10 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Open-Source Data Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight mb-4">
            DataPipe
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-3">
            The All-in-One Data Platform
          </p>
          <p className="text-sm sm:text-base text-text-muted max-w-lg mx-auto mb-8">
            SQL &middot; Excel &middot; BI &middot; Planning &middot; AI
            &mdash; all in your browser
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-bg-card border border-border-subtle text-text-primary hover:border-accent/50 hover:shadow-lg transition-all text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Try with Demo Data
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white transition-colors text-sm font-medium shadow-lg shadow-accent/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Your Data
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FEATURES.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group bg-bg-card border border-border-subtle rounded-xl p-4 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all"
            >
              <div className="text-2xl mb-2">{feature.emoji}</div>
              <div className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                {feature.title}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                {feature.subtitle}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Enterprise Demo Section */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12" data-tour="demos">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Try with Enterprise Data
          </h2>
          <p className="text-sm text-text-muted">
            Load realistic, interconnected datasets and explore the full
            platform
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DEMOS.map((demo) => (
            <div
              key={demo.id}
              className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden hover:border-border-color hover:shadow-lg transition-all"
            >
              <div className={`h-1.5 bg-gradient-to-r ${demo.color}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-2xl">{demo.emoji}</span>
                    <h3 className="text-lg font-bold text-text-primary mt-1">
                      {demo.name}
                    </h3>
                    <p className="text-xs text-text-muted">{demo.industry}</p>
                  </div>
                </div>

                <div className="flex gap-3 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {demo.tables} tables
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                    {demo.rows} rows
                  </div>
                </div>

                <button
                  onClick={() => loadDemo(demo)}
                  disabled={loadingDemo !== null}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    loadingDemo === demo.id
                      ? "bg-accent/30 text-accent cursor-wait"
                      : loadingDemo !== null
                        ? "bg-bg-secondary text-text-muted cursor-not-allowed"
                        : `bg-gradient-to-r ${demo.color} text-white hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98]`
                  }`}
                >
                  {loadingDemo === demo.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    `Load ${demo.name} Demo`
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <RecentActivity />

      {/* Stats Bar */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
          <div className="flex items-center justify-center gap-8 flex-wrap text-sm text-text-muted">
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">575</span> Tests
            </div>
            <div className="w-px h-4 bg-border-subtle" />
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">33</span> Features
            </div>
            <div className="w-px h-4 bg-border-subtle" />
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">9</span> Demo Datasets
            </div>
            <div className="w-px h-4 bg-border-subtle" />
            <div className="flex items-center gap-2">
              Built with Next.js &middot; TypeScript &middot; Groq AI
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
