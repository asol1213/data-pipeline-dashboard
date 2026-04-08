"use client";

import { useState, useMemo, useCallback } from "react";
import {
  allocateBudgetTopDown,
  type AllocationBasis,
  type Department,
  type BudgetAllocation,
} from "@/lib/planning-engine";
import { formatNumber } from "@/lib/format";

const DEFAULT_DEPARTMENTS: Department[] = [
  { name: "Engineering", headcount: 45, revenue: 0, customPercent: 30 },
  { name: "Marketing", headcount: 20, revenue: 0, customPercent: 20 },
  { name: "Sales", headcount: 16, revenue: 0, customPercent: 20 },
  { name: "Customer Success", headcount: 12, revenue: 0, customPercent: 10 },
  { name: "Operations", headcount: 13, revenue: 0, customPercent: 10 },
  { name: "HR", headcount: 8, revenue: 0, customPercent: 5 },
  { name: "Finance", headcount: 8, revenue: 0, customPercent: 5 },
];

interface LineItem {
  category: string;
  amount: number;
}

interface DeptBottomUp {
  name: string;
  items: LineItem[];
}

const LINE_ITEM_CATEGORIES = ["Salaries", "Marketing", "Technology", "Travel", "Training", "Other"];

export default function BudgetPage() {
  const [mode, setMode] = useState<"top-down" | "bottom-up">("top-down");
  const [totalBudget, setTotalBudget] = useState(5000000);
  const [basis, setBasis] = useState<AllocationBasis>("equal");
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [quarterSplit, setQuarterSplit] = useState<[number, number, number, number]>([25, 25, 25, 25]);
  const [editedAllocations, setEditedAllocations] = useState<Map<string, number>>(new Map());

  // Bottom-up state
  const [bottomUpDepts, setBottomUpDepts] = useState<DeptBottomUp[]>(
    DEFAULT_DEPARTMENTS.map(d => ({
      name: d.name,
      items: LINE_ITEM_CATEGORIES.map(c => ({ category: c, amount: 0 })),
    }))
  );

  const allocations = useMemo(() => {
    const base = allocateBudgetTopDown(totalBudget, departments, basis, quarterSplit);
    // Apply manual edits
    return base.map(a => {
      if (editedAllocations.has(a.department)) {
        const annual = editedAllocations.get(a.department)!;
        return {
          ...a,
          annual,
          q1: Math.round(annual * quarterSplit[0] / 100),
          q2: Math.round(annual * quarterSplit[1] / 100),
          q3: Math.round(annual * quarterSplit[2] / 100),
          q4: Math.round(annual * quarterSplit[3] / 100),
          percentOfTotal: totalBudget > 0 ? Math.round((annual / totalBudget) * 1000) / 10 : 0,
        };
      }
      return a;
    });
  }, [totalBudget, departments, basis, quarterSplit, editedAllocations]);

  const allocTotal = allocations.reduce((s, a) => s + a.annual, 0);

  // Bottom-up totals
  const bottomUpTotals = useMemo(() => {
    return bottomUpDepts.map(d => ({
      name: d.name,
      total: d.items.reduce((s, i) => s + i.amount, 0),
      items: d.items,
    }));
  }, [bottomUpDepts]);
  const bottomUpGrandTotal = bottomUpTotals.reduce((s, d) => s + d.total, 0);

  const updateBottomUpItem = useCallback((deptIdx: number, itemIdx: number, amount: number) => {
    setBottomUpDepts(prev => {
      const next = [...prev];
      next[deptIdx] = {
        ...next[deptIdx],
        items: next[deptIdx].items.map((item, i) =>
          i === itemIdx ? { ...item, amount } : item
        ),
      };
      return next;
    });
  }, []);

  const handleEditAllocation = useCallback((dept: string, value: number) => {
    setEditedAllocations(prev => {
      const next = new Map(prev);
      next.set(dept, value);
      return next;
    });
  }, []);

  const exportBudget = useCallback(() => {
    const data = mode === "top-down"
      ? allocations.map(a => ({
          Department: a.department,
          Q1: String(a.q1),
          Q2: String(a.q2),
          Q3: String(a.q3),
          Q4: String(a.q4),
          Annual: String(a.annual),
          Percent_of_Total: String(a.percentOfTotal),
        }))
      : bottomUpTotals.map(d => ({
          Department: d.name,
          ...Object.fromEntries(d.items.map(i => [i.category, String(i.amount)])),
          Total: String(d.total),
        }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mode, allocations, bottomUpTotals]);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}n      <div className="flex items-center gap-2 mb-4 text-sm">n        <a href="/planning" className="text-text-muted hover:text-text-primary transition-colors">← Planning Hub</a>n        <span className="text-text-muted">|</span>n        <a href="/planning/simulator" className="text-text-muted hover:text-accent transition-colors text-xs">Simulator</a>n        <a href="/planning/budget" className="text-text-muted hover:text-accent transition-colors text-xs">Budget</a>n        <a href="/planning/variance" className="text-text-muted hover:text-accent transition-colors text-xs">Variance</a>n        <a href="/planning/forecast" className="text-text-muted hover:text-accent transition-colors text-xs">Forecast</a>n        <a href="/planning/compare" className="text-text-muted hover:text-accent transition-colors text-xs">Compare</a>n        <a href="/planning/headcount" className="text-text-muted hover:text-accent transition-colors text-xs">Headcount</a>n        <a href="/planning/cashflow" className="text-text-muted hover:text-accent transition-colors text-xs">Cash Flow</a>n        <a href="/planning/goal-seek" className="text-text-muted hover:text-accent transition-colors text-xs">Goal Seek</a>n      </div>
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">Budget Builder</h1>
        <p className="text-sm text-blue-200 mt-1">
          Build budgets top-down or bottom-up with department-level allocation.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex bg-bg-card rounded-lg border border-border-subtle overflow-hidden">
          <button
            onClick={() => setMode("top-down")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === "top-down" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Top-Down
          </button>
          <button
            onClick={() => setMode("bottom-up")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === "bottom-up" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Bottom-Up
          </button>
        </div>
        <button
          onClick={exportBudget}
          className="px-4 py-2 text-sm rounded-lg border border-border-subtle text-text-secondary hover:text-accent hover:border-accent transition-colors"
        >
          Export Budget
        </button>
      </div>

      {mode === "top-down" ? (
        <TopDownBudget
          totalBudget={totalBudget}
          setTotalBudget={setTotalBudget}
          basis={basis}
          setBasis={setBasis}
          departments={departments}
          setDepartments={setDepartments}
          quarterSplit={quarterSplit}
          setQuarterSplit={setQuarterSplit}
          allocations={allocations}
          allocTotal={allocTotal}
          onEditAllocation={handleEditAllocation}
        />
      ) : (
        <BottomUpBudget
          depts={bottomUpTotals}
          grandTotal={bottomUpGrandTotal}
          onUpdateItem={updateBottomUpItem}
          categories={LINE_ITEM_CATEGORIES}
        />
      )}
    </div>
  );
}

function TopDownBudget({
  totalBudget,
  setTotalBudget,
  basis,
  setBasis,
  departments,
  setDepartments,
  quarterSplit,
  setQuarterSplit,
  allocations,
  allocTotal,
  onEditAllocation,
}: {
  totalBudget: number;
  setTotalBudget: (v: number) => void;
  basis: AllocationBasis;
  setBasis: (v: AllocationBasis) => void;
  departments: Department[];
  setDepartments: (v: Department[]) => void;
  quarterSplit: [number, number, number, number];
  setQuarterSplit: (v: [number, number, number, number]) => void;
  allocations: BudgetAllocation[];
  allocTotal: number;
  onEditAllocation: (dept: string, value: number) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Config Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Total Budget
          </label>
          <input
            type="number"
            value={totalBudget}
            onChange={(e) => setTotalBudget(Number(e.target.value))}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-lg font-mono text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Allocation Basis
          </label>
          <select
            value={basis}
            onChange={(e) => setBasis(e.target.value as AllocationBasis)}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="equal">Equal</option>
            <option value="by-headcount">By Headcount</option>
            <option value="by-revenue">By Revenue</option>
            <option value="custom">Custom %</option>
          </select>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Quarterly Split (%)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {["Q1", "Q2", "Q3", "Q4"].map((q, i) => (
              <div key={q}>
                <span className="text-[10px] text-text-muted">{q}</span>
                <input
                  type="number"
                  value={quarterSplit[i]}
                  onChange={(e) => {
                    const next = [...quarterSplit] as [number, number, number, number];
                    next[i] = Number(e.target.value);
                    setQuarterSplit(next);
                  }}
                  className="w-full bg-bg-input border border-border-subtle rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Validation Banner */}
      <div className={`p-3 rounded-lg text-sm font-medium ${
        Math.abs(allocTotal - totalBudget) < 2
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-red-500/10 text-red-400 border border-red-500/20"
      }`}>
        Allocated: {formatNumber(allocTotal, "currency")} / Total: {formatNumber(totalBudget, "currency")}
        {Math.abs(allocTotal - totalBudget) >= 2 && (
          <span className="ml-2">
            (Difference: {formatNumber(allocTotal - totalBudget, "currency")})
          </span>
        )}
      </div>

      {/* Allocation Table */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Department</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Q1</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Q2</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Q3</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Q4</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Annual</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.department} className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors">
                  <td className="px-4 py-2.5 text-text-primary font-medium">{a.department}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{formatNumber(a.q1, "currency")}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{formatNumber(a.q2, "currency")}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{formatNumber(a.q3, "currency")}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{formatNumber(a.q4, "currency")}</td>
                  <td className="px-4 py-2.5 text-right">
                    <input
                      type="number"
                      value={a.annual}
                      onChange={(e) => onEditAllocation(a.department, Number(e.target.value))}
                      className="w-28 text-right bg-bg-input border border-border-subtle rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-muted">{a.percentOfTotal}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-subtle bg-bg-secondary/30">
                <td className="px-4 py-2.5 font-semibold text-text-primary">Total</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {formatNumber(allocations.reduce((s, a) => s + a.q1, 0), "currency")}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {formatNumber(allocations.reduce((s, a) => s + a.q2, 0), "currency")}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {formatNumber(allocations.reduce((s, a) => s + a.q3, 0), "currency")}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {formatNumber(allocations.reduce((s, a) => s + a.q4, 0), "currency")}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {formatNumber(allocTotal, "currency")}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {totalBudget > 0 ? Math.round((allocTotal / totalBudget) * 1000) / 10 : 0}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function BottomUpBudget({
  depts,
  grandTotal,
  onUpdateItem,
  categories,
}: {
  depts: { name: string; total: number; items: { category: string; amount: number }[] }[];
  grandTotal: number;
  onUpdateItem: (deptIdx: number, itemIdx: number, amount: number) => void;
  categories: string[];
}) {
  return (
    <div className="space-y-6">
      <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
        <div className="text-lg font-semibold text-text-primary">
          Company Total: {formatNumber(grandTotal, "currency")}
        </div>
      </div>

      {depts.map((dept, deptIdx) => (
        <div key={dept.name} className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <span className="font-semibold text-text-primary">{dept.name}</span>
            <span className="text-sm font-mono text-accent">{formatNumber(dept.total, "currency")}</span>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {dept.items.map((item, itemIdx) => (
              <div key={item.category}>
                <label className="block text-xs text-text-muted mb-1">{item.category}</label>
                <input
                  type="number"
                  value={item.amount || ""}
                  onChange={(e) => onUpdateItem(deptIdx, itemIdx, Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
