"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface PaletteItem {
  id: string;
  label: string;
  category: string;
  href?: string;
  action?: () => void;
  icon?: string;
}

const STATIC_ITEMS: PaletteItem[] = [
  // Pages
  { id: "p-dashboard", label: "Dashboard", category: "Pages", icon: "\uD83D\uDCCA", href: "/dashboard" },
  { id: "p-datasets", label: "Datasets", category: "Pages", icon: "\uD83D\uDCCA", href: "/datasets" },
  { id: "p-spreadsheet", label: "Spreadsheet", category: "Pages", icon: "\uD83D\uDCCA", href: "/spreadsheet" },
  { id: "p-query", label: "SQL Query", category: "Pages", icon: "\uD83D\uDCCA", href: "/query" },
  { id: "p-dax", label: "DAX Formulas", category: "Pages", icon: "\uD83D\uDCCA", href: "/dax" },
  { id: "p-pivot", label: "Pivot Tables", category: "Pages", icon: "\uD83D\uDCCA", href: "/pivot" },
  { id: "p-builder", label: "Dashboard Builder", category: "Pages", icon: "\uD83D\uDCCA", href: "/builder" },
  { id: "p-profiling", label: "Profiling", category: "Pages", icon: "\uD83D\uDCCA", href: "/profiling" },
  { id: "p-model", label: "Data Model", category: "Pages", icon: "\uD83D\uDCCA", href: "/model" },
  { id: "p-templates", label: "Templates", category: "Pages", icon: "\uD83D\uDCCA", href: "/templates" },
  { id: "p-presets", label: "Presets", category: "Pages", icon: "\uD83D\uDCCA", href: "/presets" },
  { id: "p-embeds", label: "Embeds", category: "Pages", icon: "\uD83D\uDCCA", href: "/embed" },
  { id: "p-lineage", label: "Lineage", category: "Pages", icon: "\uD83D\uDCCA", href: "/lineage" },
  { id: "p-benchmarks", label: "Benchmarks", category: "Pages", icon: "\uD83D\uDCCA", href: "/benchmarks" },
  { id: "p-reports", label: "Reports", category: "Pages", icon: "\uD83D\uDCCA", href: "/reports" },
  { id: "p-alerts", label: "Alerts", category: "Pages", icon: "\uD83D\uDCCA", href: "/alerts" },
  { id: "p-audit", label: "Audit Trail", category: "Pages", icon: "\uD83D\uDCCA", href: "/audit" },

  // AI
  { id: "ai-ask", label: "Ask Your Data", category: "AI", icon: "\uD83D\uDD2E", href: "/ask" },
  { id: "ai-chat", label: "AI Chat", category: "AI", icon: "\uD83D\uDD2E", href: "/chat" },
  { id: "ai-compare", label: "Compare Scenarios", category: "AI", icon: "\uD83D\uDD2E", href: "/planning/compare" },

  // Planning
  { id: "pl-scenarios", label: "Scenarios", category: "Planning", icon: "\uD83D\uDCCB", href: "/planning" },
  { id: "pl-simulator", label: "P&L Simulator", category: "Planning", icon: "\uD83D\uDCCB", href: "/planning/simulator" },
  { id: "pl-budget", label: "Budget Builder", category: "Planning", icon: "\uD83D\uDCCB", href: "/planning/budget" },
  { id: "pl-variance", label: "Variance Analysis", category: "Planning", icon: "\uD83D\uDCCB", href: "/planning/variance" },
  { id: "pl-forecast", label: "Forecast", category: "Planning", icon: "\uD83D\uDCCB", href: "/planning/forecast" },
  { id: "pl-headcount", label: "Headcount Planning", category: "Planning", icon: "\uD83D\uDCCB", href: "/planning/headcount" },
  { id: "pl-cashflow", label: "Cash Flow", category: "Planning", icon: "\uD83D\uDCCB", href: "/planning/cashflow" },
  { id: "pl-goalseek", label: "Goal Seek", category: "Planning", icon: "\uD83D\uDCCB", href: "/planning/goal-seek" },

  // Quick Actions
  { id: "qa-upload", label: "Upload CSV", category: "Quick Actions", icon: "\u26A1", href: "/upload" },
  { id: "qa-revolut", label: "Load Revolut Demo", category: "Quick Actions", icon: "\u26A1", href: "/demo" },
  { id: "qa-siemens", label: "Load Siemens Demo", category: "Quick Actions", icon: "\u26A1", href: "/demo" },
  { id: "qa-deloitte", label: "Load Deloitte Demo", category: "Quick Actions", icon: "\u26A1", href: "/demo" },
  { id: "qa-connect", label: "Connect Data Source", category: "Quick Actions", icon: "\u26A1", href: "/connect" },
];

const CATEGORY_ORDER = ["Recent", "Pages", "AI", "Planning", "Quick Actions", "Datasets"];

function getRecentItems(): PaletteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("datapipe_audit_log");
    if (!raw) return [];
    const log = JSON.parse(raw) as { action: string; datasetName: string; details: { description: string; sql?: string } }[];
    const seen = new Set<string>();
    const items: PaletteItem[] = [];
    for (const entry of log.slice(0, 20)) {
      const key = entry.details.description;
      if (seen.has(key)) continue;
      seen.add(key);
      let href = "/audit";
      if (entry.action === "query_run") href = "/query";
      else if (entry.action === "cell_edit" || entry.action === "row_add" || entry.action === "row_delete") href = "/spreadsheet";
      else if (entry.action === "dataset_upload") href = "/datasets";
      else if (entry.action === "formula_eval") href = "/dax";
      items.push({
        id: `recent-${items.length}`,
        label: entry.details.description,
        category: "Recent",
        icon: "\uD83D\uDD54",
        href,
      });
      if (items.length >= 5) break;
    }
    return items;
  } catch {
    return [];
  }
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-accent font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = useCallback(() => {
    const recent = getRecentItems();
    return [...recent, ...STATIC_ITEMS];
  }, []);

  const filtered = (() => {
    const items = allItems();
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  })();

  // Group by category
  const grouped: { category: string; items: PaletteItem[] }[] = [];
  const catMap = new Map<string, PaletteItem[]>();
  for (const item of filtered) {
    const existing = catMap.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      catMap.set(item.category, [item]);
    }
  }
  for (const cat of CATEGORY_ORDER) {
    const items = catMap.get(cat);
    if (items && items.length > 0) {
      grouped.push({ category: cat, items });
    }
  }

  const flatFiltered = grouped.flatMap((g) => g.items);

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector("[data-selected='true']");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function handleSelect(item: PaletteItem) {
    setOpen(false);
    setQuery("");
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatFiltered[selectedIndex]) {
        handleSelect(flatFiltered[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={() => { setOpen(false); setQuery(""); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg bg-bg-card border border-border-subtle rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <svg className="w-5 h-5 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, datasets, actions..."
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted text-sm outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-bg-secondary border border-border-subtle text-[10px] text-text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category}>
                <div className="px-4 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  {group.category}
                </div>
                {group.items.map((item) => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-selected={isSelected}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                        isSelected
                          ? "bg-accent/15 text-accent"
                          : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
                      }`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className="text-base shrink-0">{item.icon}</span>
                      <span className="flex-1 truncate">
                        {highlightMatch(item.label, query)}
                      </span>
                      {item.href && (
                        <span className="text-[11px] text-text-muted font-mono shrink-0">
                          {item.href}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border-subtle text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-bg-secondary border border-border-subtle font-mono">&uarr;&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-bg-secondary border border-border-subtle font-mono">&crarr;</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-bg-secondary border border-border-subtle font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
