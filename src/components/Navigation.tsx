"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import ScreenshotButton from "@/components/ScreenshotButton";

interface NavGroup {
  label: string;
  items: { label: string; href: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Data",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Datasets", href: "/datasets" },
      { label: "Spreadsheet", href: "/spreadsheet" },
      { label: "Upload CSV", href: "/upload" },
      { label: "Connect", href: "/connect" },
      { label: "Demo Data", href: "/demo" },
    ],
  },
  {
    label: "Analyze",
    items: [
      { label: "SQL Query", href: "/query" },
      { label: "DAX", href: "/dax" },
      { label: "Pivot Tables", href: "/pivot" },
      { label: "Profiling", href: "/profiling" },
      { label: "Data Model", href: "/model" },
    ],
  },
  {
    label: "Planning",
    items: [
      { label: "Scenarios", href: "/planning" },
      { label: "P&L Simulator", href: "/planning/simulator" },
      { label: "Budget Builder", href: "/planning/budget" },
      { label: "Variance", href: "/planning/variance" },
      { label: "Forecast", href: "/planning/forecast" },
      { label: "Headcount", href: "/planning/headcount" },
      { label: "Cash Flow", href: "/planning/cashflow" },
      { label: "Goal Seek", href: "/planning/goal-seek" },
    ],
  },
  {
    label: "AI",
    items: [
      { label: "\u2728 Ask Your Data", href: "/ask" },
      { label: "AI Chat", href: "/chat" },
      { label: "Compare Scenarios", href: "/planning/compare" },
    ],
  },
  {
    label: "Build",
    items: [
      { label: "Dashboard Builder", href: "/builder" },
      { label: "Templates", href: "/templates" },
      { label: "Presets", href: "/presets" },
      { label: "Embeds", href: "/embed" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Alerts", href: "/alerts" },
      { label: "Audit Trail", href: "/audit" },
      { label: "Version History", href: "/audit/versions" },
      { label: "Lineage", href: "/lineage" },
      { label: "Benchmarks", href: "/benchmarks" },
      { label: "Reports", href: "/reports" },
    ],
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
    setMobileSection(null);
  }, [pathname]);

  function toggleDropdown(label: string) {
    setOpenDropdown((prev) => (prev === label ? null : label));
  }

  function isGroupActive(group: NavGroup): boolean {
    return group.items.some(
      (item) =>
        pathname === item.href ||
        (item.href !== "/" && pathname.startsWith(item.href))
    );
  }

  function isItemActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  }

  return (
    <nav
      ref={navRef}
      className="border-b border-border-subtle bg-bg-secondary/90 backdrop-blur-md sticky top-0 z-50"
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-accent/20">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <Link
              href="/"
              className="text-lg font-bold text-text-primary tracking-tight"
            >
              DataPipe
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="relative">
                <button
                  onClick={() => toggleDropdown(group.label)}
                  data-tour={`nav-${group.label.toLowerCase()}`}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isGroupActive(group)
                      ? "text-accent bg-accent/10"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
                  }`}
                >
                  {group.label}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${openDropdown === group.label ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown */}
                {openDropdown === group.label && (
                  <div className="absolute left-0 top-full mt-1 bg-bg-card border border-border-subtle rounded-xl shadow-xl py-1.5 min-w-[200px] z-50">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isItemActive(item.href)
                            ? "text-accent bg-accent/10 font-medium"
                            : "text-text-secondary hover:text-text-primary hover:bg-bg-card-hover"
                        }`}
                        onClick={() => setOpenDropdown(null)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* CTA: Upload CSV */}
            <Link
              href="/upload"
              className="ml-2 text-sm px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors font-medium"
            >
              Upload CSV
            </Link>

            {/* Ctrl+K hint */}
            <button
              onClick={() => {
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
              }}
              className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:border-border-color transition-colors text-xs"
              title="Search (Ctrl+K)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <kbd className="font-mono text-[10px]">&#8984;K</kbd>
            </button>

            {/* Restart Tour */}
            <button
              onClick={() => {
                const fn = (window as unknown as Record<string, unknown>).__datapipeStartTour;
                if (typeof fn === "function") fn();
              }}
              className="ml-1 w-8 h-8 rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:border-border-color transition-colors flex items-center justify-center"
              title="Restart guided tour"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <div className="ml-1">
              <ScreenshotButton />
            </div>
            <div className="ml-1">
              <ThemeCustomizer />
            </div>
          </div>

          {/* Mobile: hamburger + theme toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <ScreenshotButton />
            <ThemeCustomizer />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-9 h-9 rounded-lg bg-bg-card border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border-subtle bg-bg-secondary max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-3 space-y-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() =>
                    setMobileSection((prev) =>
                      prev === group.label ? null : group.label
                    )
                  }
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isGroupActive(group)
                      ? "text-accent bg-accent/10"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
                  }`}
                >
                  {group.label}
                  <svg
                    className={`w-4 h-4 transition-transform ${mobileSection === group.label ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {mobileSection === group.label && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isItemActive(item.href)
                            ? "text-accent bg-accent/10 font-medium"
                            : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Mobile CTA */}
            <div className="pt-2 border-t border-border-subtle">
              <Link
                href="/upload"
                className="block text-center text-sm px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors font-medium"
              >
                Upload CSV
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
