"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  createDefaultPnLState,
  adjustPnLItem,
  computeImpactTrail,
  type PnLSimulatorState,
  type ImpactTrailEntry,
} from "@/lib/planning-engine";
import { formatNumber } from "@/lib/format";

export default function SimulatorPage() {
  const [pnl, setPnl] = useState<PnLSimulatorState>(() => createDefaultPnLState());
  const [activeSlider, setActiveSlider] = useState<string | null>(null);
  const [impactTrail, setImpactTrail] = useState<ImpactTrailEntry[]>([]);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const prevPnlRef = useRef<PnLSimulatorState>(pnl);

  const handleAdjust = useCallback(
    (itemId: string, pct: number) => {
      const before = prevPnlRef.current;
      const after = adjustPnLItem(pnl, itemId, pct);
      setPnl(after);

      // Compute impact trail
      const trail = computeImpactTrail(before, after);
      setImpactTrail(trail);

      // Mark changed cells
      const changed = new Set<string>();
      for (const item of after.items) {
        const prev = before.items.find((i) => i.id === item.id);
        if (prev && Math.abs(item.simulatedValue - prev.simulatedValue) > 0.5) {
          changed.add(item.id);
        }
      }
      setChangedIds(changed);
    },
    [pnl]
  );

  // Clear highlights after animation
  useEffect(() => {
    if (changedIds.size > 0) {
      const timer = setTimeout(() => setChangedIds(new Set()), 800);
      return () => clearTimeout(timer);
    }
  }, [changedIds]);

  const handleSliderStart = useCallback(
    (itemId: string) => {
      prevPnlRef.current = pnl;
      setActiveSlider(itemId);
    },
    [pnl]
  );

  const handleSliderEnd = useCallback(() => {
    setActiveSlider(null);
  }, []);

  const handleReset = useCallback(() => {
    const fresh = createDefaultPnLState();
    setPnl(fresh);
    setImpactTrail([]);
    setChangedIds(new Set());
    prevPnlRef.current = fresh;
  }, []);

  const fmtVal = (val: number, isPercent: boolean) => {
    if (isPercent) return `${val}%`;
    return formatNumber(val, "currency");
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">Live P&L Simulator</h1>
        <p className="text-sm text-blue-200 mt-1">
          Click any editable line item to adjust it. All dependent lines cascade
          in real-time.
        </p>
      </div>

      {/* Impact Trail */}
      {impactTrail.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 font-mono transition-all duration-300">
          {impactTrail
            .map(
              (e) =>
                `${e.label} ${e.delta >= 0 ? "+" : ""}${formatNumber(e.delta, "currency")}`
            )
            .join(" -> ")}
        </div>
      )}

      {/* Reset button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm rounded-lg border border-border-subtle text-text-secondary hover:text-accent hover:border-accent transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* P&L Table */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 text-text-muted font-medium w-56">
                  Line Item
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Current
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Simulated
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Delta
                </th>
                <th className="text-center px-4 py-3 text-text-muted font-medium w-64">
                  Adjustment
                </th>
              </tr>
            </thead>
            <tbody>
              {pnl.items.map((item) => {
                const delta = item.simulatedValue - item.baseValue;
                const isChanged = changedIds.has(item.id);
                const isSeparator = [
                  "grossProfit",
                  "ebitda",
                  "ebit",
                  "netIncome",
                ].includes(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-border-subtle/50 transition-all duration-300 ${
                      isChanged ? "bg-blue-500/10" : "hover:bg-bg-card-hover"
                    } ${isSeparator ? "font-semibold" : ""}`}
                  >
                    <td
                      className="px-4 py-2.5 text-text-primary group relative"
                      style={{
                        paddingLeft: `${1 + (item.indent || 0) * 1.5}rem`,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {isSeparator ? "= " : item.indent ? "- " : ""}
                        {item.label}
                        {item.formula && (
                          <span className="hidden group-hover:inline-block text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded absolute left-full ml-2 whitespace-nowrap z-10">
                            {item.formula}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                      {fmtVal(item.baseValue, item.isPercent)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono transition-colors duration-300 ${
                        isChanged ? "text-blue-400" : "text-text-primary"
                      }`}
                    >
                      {fmtVal(item.simulatedValue, item.isPercent)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {item.isPercent ? (
                        <span
                          className={
                            delta > 0
                              ? "text-emerald-400"
                              : delta < 0
                              ? "text-red-400"
                              : "text-text-muted"
                          }
                        >
                          {delta > 0 ? "+" : ""}
                          {Math.round(delta * 10) / 10}pp
                        </span>
                      ) : (
                        <span
                          className={
                            delta > 0
                              ? "text-emerald-400"
                              : delta < 0
                              ? "text-red-400"
                              : "text-text-muted"
                          }
                        >
                          {delta >= 0 ? "+" : ""}
                          {formatNumber(delta, "currency")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.editable ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted w-12 text-right">
                            {item.adjustmentPct >= 0 ? "+" : ""}
                            {Math.round(item.adjustmentPct * 100)}%
                          </span>
                          <input
                            type="range"
                            min={-50}
                            max={100}
                            value={Math.round(item.adjustmentPct * 100)}
                            onMouseDown={() => handleSliderStart(item.id)}
                            onTouchStart={() => handleSliderStart(item.id)}
                            onMouseUp={handleSliderEnd}
                            onTouchEnd={handleSliderEnd}
                            onChange={(e) =>
                              handleAdjust(
                                item.id,
                                Number(e.target.value) / 100
                              )
                            }
                            className="flex-1 h-1.5 rounded-full appearance-none bg-bg-input accent-accent cursor-pointer"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted italic">
                          {item.formula || "auto"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formula Legend */}
      <div className="mt-6 bg-bg-card rounded-xl border border-border-subtle p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Formula Reference
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {pnl.items
            .filter((i) => i.formula)
            .map((item) => (
              <div key={item.id} className="text-text-muted">
                <span className="text-text-secondary font-medium">
                  {item.label}:
                </span>{" "}
                {item.formula}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
