"use client";

import { useState, useCallback } from "react";
import BuilderSlot from "@/components/BuilderSlot";
import SlotConfigModal from "@/components/SlotConfigModal";
import type { SlotConfig } from "@/components/SlotConfigModal";

const SLOT_COUNT = 6;
const STORAGE_KEY = "dashboard-builder-config";

const EXAMPLE_LAYOUT: (SlotConfig | null)[] = [
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
];

export default function BuilderPage() {
  const [slots, setSlots] = useState<(SlotConfig | null)[]>(
    Array(SLOT_COUNT).fill(null)
  );
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // localStorage not available
    }
  }, [slots]);

  const handleLoad = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Ensure we always have SLOT_COUNT slots
          const loaded = parsed.slice(0, SLOT_COUNT);
          while (loaded.length < SLOT_COUNT) loaded.push(null);
          setSlots(loaded);
        }
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const handleLoadExample = useCallback(() => {
    setSlots([...EXAMPLE_LAYOUT]);
  }, []);

  const handleApplyConfig = useCallback(
    (config: SlotConfig) => {
      if (editingSlot === null) return;
      setSlots((prev) => {
        const next = [...prev];
        next[editingSlot] = config;
        return next;
      });
      setEditingSlot(null);
    },
    [editingSlot]
  );

  const handleRemoveSlot = useCallback((index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSlots(Array(SLOT_COUNT).fill(null));
  }, []);

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
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Grid of slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slots.map((slot, i) => (
          <div key={i} className="min-h-[200px]">
            <BuilderSlot
              config={slot}
              onConfigure={() => setEditingSlot(i)}
              onRemove={() => handleRemoveSlot(i)}
            />
          </div>
        ))}
      </div>

      {/* Hint when all empty */}
      {slots.every((s) => s === null) && (
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
        existing={editingSlot !== null ? slots[editingSlot] : null}
      />
    </div>
  );
}
