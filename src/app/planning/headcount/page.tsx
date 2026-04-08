"use client";

import { useState, useMemo, useCallback } from "react";
import {
  calculateHeadcountCosts,
  type PlannedHire,
} from "@/lib/headcount-engine";
import { formatNumber } from "@/lib/format";

const DEPARTMENTS = [
  { name: "Engineering", currentHC: 35 },
  { name: "Sales", currentHC: 20 },
  { name: "Marketing", currentHC: 12 },
  { name: "Operations", currentHC: 10 },
  { name: "Finance", currentHC: 8 },
  { name: "HR", currentHC: 6 },
];

const INITIAL_HIRES: PlannedHire[] = [
  // Engineering: 8 hires
  { id: "e1", department: "Engineering", role: "Senior Engineer", startMonth: 1, annualSalary: 95000 },
  { id: "e2", department: "Engineering", role: "Senior Engineer", startMonth: 2, annualSalary: 95000 },
  { id: "e3", department: "Engineering", role: "Staff Engineer", startMonth: 3, annualSalary: 120000 },
  { id: "e4", department: "Engineering", role: "Junior Engineer", startMonth: 4, annualSalary: 60000 },
  { id: "e5", department: "Engineering", role: "DevOps Engineer", startMonth: 5, annualSalary: 90000 },
  { id: "e6", department: "Engineering", role: "Senior Engineer", startMonth: 7, annualSalary: 95000 },
  { id: "e7", department: "Engineering", role: "QA Engineer", startMonth: 8, annualSalary: 70000 },
  { id: "e8", department: "Engineering", role: "Engineering Manager", startMonth: 9, annualSalary: 130000 },
  // Sales: 5 hires
  { id: "s1", department: "Sales", role: "Account Executive", startMonth: 1, annualSalary: 75000 },
  { id: "s2", department: "Sales", role: "Account Executive", startMonth: 3, annualSalary: 75000 },
  { id: "s3", department: "Sales", role: "Sales Director", startMonth: 4, annualSalary: 110000 },
  { id: "s4", department: "Sales", role: "SDR", startMonth: 6, annualSalary: 50000 },
  { id: "s5", department: "Sales", role: "Account Executive", startMonth: 9, annualSalary: 75000 },
  // Marketing: 3 hires
  { id: "m1", department: "Marketing", role: "Content Manager", startMonth: 2, annualSalary: 65000 },
  { id: "m2", department: "Marketing", role: "Growth Marketer", startMonth: 5, annualSalary: 72000 },
  { id: "m3", department: "Marketing", role: "Brand Designer", startMonth: 8, annualSalary: 68000 },
  // Operations: 2 hires
  { id: "o1", department: "Operations", role: "Operations Analyst", startMonth: 3, annualSalary: 62000 },
  { id: "o2", department: "Operations", role: "Project Manager", startMonth: 7, annualSalary: 78000 },
  // Finance: 2 hires
  { id: "f1", department: "Finance", role: "Financial Analyst", startMonth: 2, annualSalary: 70000 },
  { id: "f2", department: "Finance", role: "Controller", startMonth: 6, annualSalary: 95000 },
  // HR: 1 hire
  { id: "h1", department: "HR", role: "HR Business Partner", startMonth: 4, annualSalary: 72000 },
];

let nextId = 100;

export default function HeadcountPage() {
  const [activeDept, setActiveDept] = useState("Engineering");
  const [hires, setHires] = useState<PlannedHire[]>(INITIAL_HIRES);

  const currentHeadcount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of DEPARTMENTS) map[d.name] = d.currentHC;
    return map;
  }, []);

  const result = useMemo(
    () => calculateHeadcountCosts(currentHeadcount, hires),
    [currentHeadcount, hires]
  );

  const deptHires = useMemo(
    () => hires.filter((h) => h.department === activeDept),
    [hires, activeDept]
  );

  const addHire = useCallback(() => {
    const id = `new-${nextId++}`;
    setHires((prev) => [
      ...prev,
      {
        id,
        department: activeDept,
        role: "New Role",
        startMonth: 1,
        annualSalary: 70000,
      },
    ]);
  }, [activeDept]);

  const removeHire = useCallback((id: string) => {
    setHires((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const updateHire = useCallback(
    (id: string, field: keyof PlannedHire, value: string | number) => {
      setHires((prev) =>
        prev.map((h) => (h.id === id ? { ...h, [field]: value } : h))
      );
    },
    []
  );

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">Headcount Planning</h1>
        <p className="text-sm text-blue-200 mt-1">
          Plan hires by department, visualize cost build-up, and track your
          hiring timeline.
        </p>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Total Annual Cost
          </div>
          <div className="text-xl font-bold font-mono text-text-primary">
            {formatNumber(result.annual.totalCost, "currency")}
          </div>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Total New Hires
          </div>
          <div className="text-xl font-bold font-mono text-text-primary">
            {result.annual.totalHires}
          </div>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Avg Cost / Employee
          </div>
          <div className="text-xl font-bold font-mono text-text-primary">
            {formatNumber(result.annual.avgCostPerEmployee, "currency")}
          </div>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Year-End Headcount
          </div>
          <div className="text-xl font-bold font-mono text-text-primary">
            {result.monthly[11]?.headcount ?? 0}
          </div>
        </div>
      </div>

      {/* Department Tabs */}
      <div className="flex gap-1 bg-bg-card rounded-lg border border-border-subtle p-1 mb-6 overflow-x-auto">
        {DEPARTMENTS.map((d) => (
          <button
            key={d.name}
            onClick={() => setActiveDept(d.name)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeDept === d.name
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {d.name} ({currentHeadcount[d.name]})
          </button>
        ))}
      </div>

      {/* Hire Grid for active department */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {activeDept} — Planned Hires
          </h3>
          <button
            onClick={addHire}
            className="px-3 py-1.5 text-xs rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            + Add Hire
          </button>
        </div>
        {deptHires.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No planned hires for {activeDept}. Click &quot;Add Hire&quot; to start.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">
                    Start Month
                  </th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">
                    Annual Salary
                  </th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">
                    Benefits (25%)
                  </th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">
                    Equipment
                  </th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">
                    Office/mo
                  </th>
                  <th className="text-center px-4 py-3 text-text-muted font-medium">
                    Remove
                  </th>
                </tr>
              </thead>
              <tbody>
                {deptHires.map((h) => {
                  const monthsActive = 12 - h.startMonth + 1;
                  const benefits = h.annualSalary * 0.25;
                  return (
                    <tr
                      key={h.id}
                      className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                    >
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={h.role}
                          onChange={(e) =>
                            updateHire(h.id, "role", e.target.value)
                          }
                          className="w-full bg-bg-input border border-border-subtle rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={h.startMonth}
                          onChange={(e) =>
                            updateHire(
                              h.id,
                              "startMonth",
                              Number(e.target.value)
                            )
                          }
                          className="bg-bg-input border border-border-subtle rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {
                                [
                                  "Jan",
                                  "Feb",
                                  "Mar",
                                  "Apr",
                                  "May",
                                  "Jun",
                                  "Jul",
                                  "Aug",
                                  "Sep",
                                  "Oct",
                                  "Nov",
                                  "Dec",
                                ][i]
                              }
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={h.annualSalary}
                          onChange={(e) =>
                            updateHire(
                              h.id,
                              "annualSalary",
                              Number(e.target.value)
                            )
                          }
                          className="w-28 text-right bg-bg-input border border-border-subtle rounded px-2 py-1 text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-text-secondary">
                        {formatNumber(benefits / 12 * monthsActive, "currency")}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-text-secondary">
                        {formatNumber(2000, "currency")}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-text-secondary">
                        {formatNumber(500, "currency")}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => removeHire(h.id)}
                          className="text-red-400 hover:text-red-300 transition-colors text-lg leading-none"
                          title="Remove hire"
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Cost Breakdown */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary">
            Monthly Cost Breakdown (All Departments)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 text-text-muted font-medium">
                  Month
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Headcount
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Salary
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Benefits
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Equipment
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Office
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {result.monthly.map((m) => (
                <tr
                  key={m.month}
                  className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                >
                  <td className="px-4 py-2.5 text-text-primary font-medium">
                    {m.month}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {m.headcount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {formatNumber(m.salaryCost, "currency")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {formatNumber(m.benefitsCost, "currency")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {formatNumber(m.equipmentCost, "currency")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {formatNumber(m.officeCost, "currency")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-accent">
                    {formatNumber(m.totalCost, "currency")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-subtle bg-bg-secondary/30">
                <td className="px-4 py-2.5 font-semibold text-text-primary">
                  Annual Total
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {result.monthly[11]?.headcount ?? 0}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {formatNumber(
                    result.monthly.reduce((s, m) => s + m.salaryCost, 0),
                    "currency"
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {formatNumber(
                    result.monthly.reduce((s, m) => s + m.benefitsCost, 0),
                    "currency"
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {formatNumber(
                    result.monthly.reduce((s, m) => s + m.equipmentCost, 0),
                    "currency"
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {formatNumber(
                    result.monthly.reduce((s, m) => s + m.officeCost, 0),
                    "currency"
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-accent">
                  {formatNumber(result.annual.totalCost, "currency")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Hiring Timeline Bar Chart (CSS-based) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Hiring Timeline (New Hires per Month)
          </h3>
          <div className="flex items-end gap-2 h-40">
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const count = hires.filter((h) => h.startMonth === month).length;
              const maxCount = Math.max(
                1,
                ...Array.from({ length: 12 }, (_, j) =>
                  hires.filter((h) => h.startMonth === j + 1).length
                )
              );
              const pct = (count / maxCount) * 100;
              return (
                <div
                  key={month}
                  className="flex flex-col items-center flex-1"
                >
                  <span className="text-xs font-mono text-text-secondary mb-1">
                    {count > 0 ? count : ""}
                  </span>
                  <div
                    className="w-full bg-accent/60 rounded-t-sm min-h-[2px]"
                    style={{ height: `${Math.max(2, pct)}%` }}
                  />
                  <span className="text-[10px] text-text-muted mt-1">
                    {
                      [
                        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                      ][i]
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost Waterfall */}
        <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Cumulative Cost Build-Up
          </h3>
          <div className="flex items-end gap-2 h-40">
            {(() => {
              let cumulative = 0;
              const cumulativeData = result.monthly.map((m) => {
                cumulative += m.totalCost;
                return { month: m.month, value: cumulative };
              });
              const maxVal = Math.max(1, ...cumulativeData.map((d) => d.value));
              return cumulativeData.map((d) => {
                const pct = (d.value / maxVal) * 100;
                return (
                  <div
                    key={d.month}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className="w-full bg-purple-500/60 rounded-t-sm min-h-[2px]"
                      style={{ height: `${Math.max(2, pct)}%` }}
                    />
                    <span className="text-[10px] text-text-muted mt-1">
                      {d.month}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Department Summary Table */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary">
            Department Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 text-text-muted font-medium">
                  Department
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Current HC
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Planned Hires
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Year-End HC
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Total Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {result.byDepartment.map((d) => (
                <tr
                  key={d.department}
                  className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                >
                  <td className="px-4 py-2.5 text-text-primary font-medium">
                    {d.department}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {d.currentHC}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {d.plannedHires}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {d.yearEndHC}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-accent">
                    {formatNumber(d.totalCost, "currency")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-subtle bg-bg-secondary/30">
                <td className="px-4 py-2.5 font-semibold text-text-primary">
                  Total
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {result.byDepartment.reduce((s, d) => s + d.currentHC, 0)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {result.byDepartment.reduce(
                    (s, d) => s + d.plannedHires,
                    0
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                  {result.byDepartment.reduce(
                    (s, d) => s + d.yearEndHC,
                    0
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-accent">
                  {formatNumber(result.annual.totalCost, "currency")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
