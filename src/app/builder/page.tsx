"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import BuilderSlot from "@/components/BuilderSlot";
import SlotConfigModal from "@/components/SlotConfigModal";
import type { SlotConfig } from "@/components/SlotConfigModal";

const SLOT_COUNT = 6;
const STORAGE_KEY = "dashboard-pages";
const MAX_PAGES = 10;

interface DashboardPage {
  id: string;
  name: string;
  slots: (SlotConfig | null)[];
}

function createEmptyPage(name: string): DashboardPage {
  return {
    id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    slots: Array(SLOT_COUNT).fill(null),
  };
}

const EXAMPLE_PAGES: DashboardPage[] = [
  {
    id: "example-overview",
    name: "Overview",
    slots: [
      {
        type: "kpi",
        datasetId: "sales-q1-2026",
        datasetName: "Sales Performance 2026",
        column: "Revenue",
        aggregation: "sum",
      },
      {
        type: "kpi",
        datasetId: "sales-q1-2026",
        datasetName: "Sales Performance 2026",
        column: "Customers",
        aggregation: "latest",
      },
      {
        type: "kpi",
        datasetId: "sales-q1-2026",
        datasetName: "Sales Performance 2026",
        column: "MRR",
        aggregation: "avg",
      },
      {
        type: "chart",
        datasetId: "sales-q1-2026",
        datasetName: "Sales Performance 2026",
        column: "Revenue",
        chartType: "line",
      },
      {
        type: "chart",
        datasetId: "sales-q1-2026",
        datasetName: "Sales Performance 2026",
        column: "Customers",
        chartType: "bar",
      },
      {
        type: "table",
        datasetId: "sales-q1-2026",
        datasetName: "Sales Performance 2026",
        columns: ["Month", "Revenue", "Customers", "MRR"],
        rowLimit: 6,
      },
    ],
  },
  {
    id: "example-financial",
    name: "Financial",
    slots: [
      {
        type: "kpi",
        datasetId: "pnl-2025",
        datasetName: "P&L Income Statement 2025",
        column: "Revenue",
        aggregation: "sum",
      },
      {
        type: "kpi",
        datasetId: "pnl-2025",
        datasetName: "P&L Income Statement 2025",
        column: "Net_Income",
        aggregation: "sum",
      },
      {
        type: "kpi",
        datasetId: "pnl-2025",
        datasetName: "P&L Income Statement 2025",
        column: "EBITDA",
        aggregation: "avg",
      },
      {
        type: "chart",
        datasetId: "pnl-2025",
        datasetName: "P&L Income Statement 2025",
        column: "Revenue",
        chartType: "line",
      },
      {
        type: "chart",
        datasetId: "pnl-2025",
        datasetName: "P&L Income Statement 2025",
        column: "Net_Income",
        chartType: "area",
      },
      {
        type: "chart",
        datasetId: "pnl-2025",
        datasetName: "P&L Income Statement 2025",
        column: "EBITDA",
        chartType: "bar",
      },
    ],
  },
  {
    id: "example-saas",
    name: "SaaS Metrics",
    slots: [
      {
        type: "kpi",
        datasetId: "saas-kpis",
        datasetName: "SaaS KPI Dashboard",
        column: "MRR",
        aggregation: "latest",
      },
      {
        type: "kpi",
        datasetId: "saas-kpis",
        datasetName: "SaaS KPI Dashboard",
        column: "Churn_Rate_%",
        aggregation: "avg",
      },
      {
        type: "kpi",
        datasetId: "saas-kpis",
        datasetName: "SaaS KPI Dashboard",
        column: "LTV",
        aggregation: "latest",
      },
      {
        type: "chart",
        datasetId: "saas-kpis",
        datasetName: "SaaS KPI Dashboard",
        column: "MRR",
        chartType: "line",
      },
      {
        type: "chart",
        datasetId: "saas-kpis",
        datasetName: "SaaS KPI Dashboard",
        column: "Churn_Rate_%",
        chartType: "area",
      },
      {
        type: "chart",
        datasetId: "saas-kpis",
        datasetName: "SaaS KPI Dashboard",
        column: "LTV",
        chartType: "bar",
      },
    ],
  },
];

export default function BuilderPage() {
  const [pages, setPages] = useState<DashboardPage[]>([
    createEmptyPage("Page 1"),
  ]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [renamingPageIndex, setRenamingPageIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenuPage, setContextMenuPage] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activePage = pages[activePageIndex] ?? pages[0];

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenuPage(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // Focus rename input
  useEffect(() => {
    if (renamingPageIndex !== null) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingPageIndex]);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // localStorage not available
    }
  }, [pages]);

  const handleLoad = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate and normalize pages
          const loaded: DashboardPage[] = parsed.map((p: DashboardPage) => ({
            id: p.id || `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: p.name || "Untitled",
            slots: Array.isArray(p.slots)
              ? [...p.slots.slice(0, SLOT_COUNT), ...Array(Math.max(0, SLOT_COUNT - (p.slots?.length ?? 0))).fill(null)]
              : Array(SLOT_COUNT).fill(null),
          }));
          setPages(loaded);
          setActivePageIndex(0);
        }
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const handleLoadExample = useCallback(() => {
    setPages(EXAMPLE_PAGES.map((p) => ({ ...p, slots: [...p.slots] })));
    setActivePageIndex(0);
  }, []);

  const handleApplyConfig = useCallback(
    (config: SlotConfig) => {
      if (editingSlot === null) return;
      setPages((prev) => {
        const next = [...prev];
        const page = { ...next[activePageIndex] };
        const slots = [...page.slots];
        slots[editingSlot] = config;
        page.slots = slots;
        next[activePageIndex] = page;
        return next;
      });
      setEditingSlot(null);
    },
    [editingSlot, activePageIndex]
  );

  const handleRemoveSlot = useCallback(
    (index: number) => {
      setPages((prev) => {
        const next = [...prev];
        const page = { ...next[activePageIndex] };
        const slots = [...page.slots];
        slots[index] = null;
        page.slots = slots;
        next[activePageIndex] = page;
        return next;
      });
    },
    [activePageIndex]
  );

  const handleClearAll = useCallback(() => {
    setPages((prev) => {
      const next = [...prev];
      next[activePageIndex] = {
        ...next[activePageIndex],
        slots: Array(SLOT_COUNT).fill(null),
      };
      return next;
    });
  }, [activePageIndex]);

  // Page management
  const handleAddPage = useCallback(() => {
    if (pages.length >= MAX_PAGES) return;
    const newPage = createEmptyPage(`Page ${pages.length + 1}`);
    setPages((prev) => [...prev, newPage]);
    setActivePageIndex(pages.length);
  }, [pages.length]);

  const handleDeletePage = useCallback(
    (index: number) => {
      if (pages.length <= 1) return;
      const confirmed = window.confirm(`Delete page "${pages[index].name}"?`);
      if (!confirmed) return;
      setPages((prev) => prev.filter((_, i) => i !== index));
      if (activePageIndex >= index && activePageIndex > 0) {
        setActivePageIndex((prev) => prev - 1);
      }
      setContextMenuPage(null);
    },
    [pages, activePageIndex]
  );

  const handleStartRename = useCallback(
    (index: number) => {
      setRenamingPageIndex(index);
      setRenameValue(pages[index].name);
      setContextMenuPage(null);
    },
    [pages]
  );

  const handleFinishRename = useCallback(() => {
    if (renamingPageIndex === null) return;
    const trimmed = renameValue.trim();
    if (trimmed) {
      setPages((prev) => {
        const next = [...prev];
        next[renamingPageIndex] = { ...next[renamingPageIndex], name: trimmed };
        return next;
      });
    }
    setRenamingPageIndex(null);
    setRenameValue("");
  }, [renamingPageIndex, renameValue]);

  const handleTabContextMenu = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      setContextMenuPage({ index, x: e.clientX, y: e.clientY });
    },
    []
  );

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Builder</h1>
            <p className="text-sm text-blue-200 mt-1">
              Create a custom dashboard with KPIs, Charts, and Tables
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadExample}
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
            >
              Load Example
            </button>
            <button
              onClick={handleLoad}
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
            >
              Load Saved
            </button>
            <button
              onClick={handleSave}
              className="text-sm bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors font-medium"
            >
              {saved ? "Saved!" : "Save"}
            </button>
            <button
              onClick={handleClearAll}
              className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
            >
              Clear Page
            </button>
          </div>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="flex items-end gap-0.5 mb-6 border-b border-border-subtle overflow-x-auto">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`relative group flex items-center gap-1 px-4 py-2.5 text-sm font-medium rounded-t-lg cursor-pointer select-none transition-all ${
              index === activePageIndex
                ? "bg-bg-card border border-border-subtle border-b-bg-card text-accent -mb-px z-10"
                : "bg-bg-secondary/50 text-text-muted hover:text-text-secondary hover:bg-bg-secondary"
            }`}
            onClick={() => {
              if (renamingPageIndex !== index) {
                setActivePageIndex(index);
              }
            }}
            onDoubleClick={() => handleStartRename(index)}
            onContextMenu={(e) => handleTabContextMenu(e, index)}
          >
            {renamingPageIndex === index ? (
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFinishRename();
                  if (e.key === "Escape") {
                    setRenamingPageIndex(null);
                    setRenameValue("");
                  }
                }}
                className="bg-transparent border-b border-accent text-text-primary text-sm w-24 focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{page.name}</span>
            )}
            {/* Close button */}
            {pages.length > 1 && renamingPageIndex !== index && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePage(index);
                }}
                className="ml-1 p-0.5 text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                title="Delete page"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {/* Add Page Tab */}
        {pages.length < MAX_PAGES && (
          <button
            onClick={handleAddPage}
            className="px-3 py-2.5 text-sm text-text-muted hover:text-accent transition-colors rounded-t-lg hover:bg-bg-secondary/50"
            title="Add new page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Grid of slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activePage.slots.map((slot, i) => (
          <div key={`${activePage.id}-${i}`} className="min-h-[200px]">
            <BuilderSlot
              config={slot}
              onConfigure={() => setEditingSlot(i)}
              onRemove={() => handleRemoveSlot(i)}
            />
          </div>
        ))}
      </div>

      {/* Hint when all empty */}
      {activePage.slots.every((s) => s === null) && (
        <div className="mt-8 text-center">
          <p className="text-text-muted text-sm">
            Click any &quot;+&quot; slot above to add a widget, or click{" "}
            <button
              onClick={handleLoadExample}
              className="text-accent hover:text-accent-hover underline"
            >
              Load Example
            </button>{" "}
            to see a pre-built dashboard.
          </p>
        </div>
      )}

      {/* Config Modal */}
      <SlotConfigModal
        open={editingSlot !== null}
        onClose={() => setEditingSlot(null)}
        onApply={handleApplyConfig}
        existing={editingSlot !== null ? activePage.slots[editingSlot] : null}
      />

      {/* Page Tab Context Menu */}
      {contextMenuPage && (
        <div
          className="fixed z-50 bg-bg-card border border-border-subtle rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{ left: contextMenuPage.x, top: contextMenuPage.y }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartRename(contextMenuPage.index);
            }}
            className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-accent/10 hover:text-text-primary transition-colors"
          >
            Rename
          </button>
          {pages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePage(contextMenuPage.index);
              }}
              className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
