"use client";

import { useState, useMemo } from "react";
import {
  projectCashFlow,
  type CashFlowInput,
} from "@/lib/cashflow-engine";
import { formatNumber } from "@/lib/format";

const DEFAULT_REVENUE = [
  120000, 135000, 140000, 150000, 145000, 130000,
  110000, 100000, 115000, 140000, 155000, 170000,
];

const DEFAULT_COGS = [
  48000, 54000, 56000, 60000, 58000, 52000,
  44000, 40000, 46000, 56000, 62000, 68000,
];

const DEFAULT_SALARIES = [
  80000, 80000, 82000, 82000, 85000, 85000,
  85000, 88000, 88000, 90000, 90000, 90000,
];

const COLLECTION_OPTIONS = [0, 30, 45, 60, 90];
const PAYMENT_OPTIONS = [0, 30, 45, 60];

export default function CashFlowPage() {
  const [startingCash, setStartingCash] = useState(2000000);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>(DEFAULT_REVENUE);
  const [monthlyCOGS, setMonthlyCOGS] = useState<number[]>(DEFAULT_COGS);
  const [monthlySalaries, setMonthlySalaries] = useState<number[]>(DEFAULT_SALARIES);
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState(15000);
  const [collectionDays, setCollectionDays] = useState(45);
  const [paymentDays, setPaymentDays] = useState(30);

  const input: CashFlowInput = useMemo(
    () => ({
      startingCash,
      monthlyRevenue,
      monthlyCOGS,
      monthlySalaries,
      monthlyFixedCosts,
      collectionDays,
      paymentDays,
    }),
    [startingCash, monthlyRevenue, monthlyCOGS, monthlySalaries, monthlyFixedCosts, collectionDays, paymentDays]
  );

  const result = useMemo(() => projectCashFlow(input), [input]);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const updateArray = (
    setter: (v: number[]) => void,
    arr: number[],
    index: number,
    value: number
  ) => {
    const next = [...arr];
    next[index] = value;
    setter(next);
  };

  const hasNegative = result.monthly.some((m) => m.status === "negative");
  const firstNegativeMonth = result.monthly.find((m) => m.status === "negative");

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-white">Cash Flow Projection</h1>
        <p className="text-sm text-blue-200 mt-1">
          Project 12 months of cash flow based on revenue, costs, and payment
          terms.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Starting Cash
          </div>
          <div className="text-lg font-bold font-mono text-text-primary">
            {formatNumber(startingCash, "currency")}
          </div>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Ending Balance
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              (result.monthly[11]?.cashBalance ?? 0) >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {formatNumber(result.monthly[11]?.cashBalance ?? 0, "currency")}
          </div>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Avg Burn Rate
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              result.burnRate >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatNumber(result.burnRate, "currency")}/mo
          </div>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Runway
          </div>
          <div className="text-lg font-bold font-mono text-text-primary">
            {result.runwayMonths >= 999 ? "Infinite" : `${result.runwayMonths} months`}
          </div>
        </div>
        <div
          className={`rounded-xl border p-4 ${
            result.lowestBalance < 0
              ? "bg-red-500/10 border-red-500/20"
              : "bg-bg-card border-border-subtle"
          }`}
        >
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Lowest Balance
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              result.lowestBalance < 0 ? "text-red-400" : "text-text-primary"
            }`}
          >
            {formatNumber(result.lowestBalance, "currency")}
          </div>
          <div className="text-xs text-text-muted">{result.lowestMonth}</div>
        </div>
      </div>

      {/* Alert if cash goes negative */}
      {hasNegative && firstNegativeMonth && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-red-400 text-lg">!</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-red-400">
                Cash will go negative in {firstNegativeMonth.month}!
              </h4>
              <p className="text-xs text-text-muted mt-1">
                Consider: reducing costs by{" "}
                {formatNumber(Math.abs(firstNegativeMonth.cashBalance), "currency")},{" "}
                collecting faster (reduce collection days), or securing
                additional funding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Starting Cash Balance
          </label>
          <input
            type="number"
            value={startingCash}
            onChange={(e) => setStartingCash(Number(e.target.value))}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Customer Collection (days)
          </label>
          <select
            value={collectionDays}
            onChange={(e) => setCollectionDays(Number(e.target.value))}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {COLLECTION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d === 0 ? "Immediate" : `${d} days`}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Supplier Payment (days)
          </label>
          <select
            value={paymentDays}
            onChange={(e) => setPaymentDays(Number(e.target.value))}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {PAYMENT_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d === 0 ? "Immediate" : `${d} days`}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Monthly Fixed Costs
          </label>
          <input
            type="number"
            value={monthlyFixedCosts}
            onChange={(e) => setMonthlyFixedCosts(Number(e.target.value))}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Monthly Input Grid */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary">
            Monthly Inputs
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 text-text-muted font-medium w-24">
                  Month
                </th>
                <th className="text-right px-3 py-3 text-text-muted font-medium">
                  Revenue
                </th>
                <th className="text-right px-3 py-3 text-text-muted font-medium">
                  COGS
                </th>
                <th className="text-right px-3 py-3 text-text-muted font-medium">
                  Salaries
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => (
                <tr
                  key={m}
                  className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                >
                  <td className="px-4 py-2 text-text-primary font-medium">
                    {m}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={monthlyRevenue[i]}
                      onChange={(e) =>
                        updateArray(
                          setMonthlyRevenue,
                          monthlyRevenue,
                          i,
                          Number(e.target.value)
                        )
                      }
                      className="w-full text-right bg-bg-input border border-border-subtle rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={monthlyCOGS[i]}
                      onChange={(e) =>
                        updateArray(
                          setMonthlyCOGS,
                          monthlyCOGS,
                          i,
                          Number(e.target.value)
                        )
                      }
                      className="w-full text-right bg-bg-input border border-border-subtle rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={monthlySalaries[i]}
                      onChange={(e) =>
                        updateArray(
                          setMonthlySalaries,
                          monthlySalaries,
                          i,
                          Number(e.target.value)
                        )
                      }
                      className="w-full text-right bg-bg-input border border-border-subtle rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Balance Chart (CSS-based line approximation) */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Cash Balance Over 12 Months
        </h3>
        <div className="relative h-48">
          {/* Zero line */}
          {(() => {
            const allBalances = result.monthly.map((m) => m.cashBalance);
            const maxBal = Math.max(...allBalances, startingCash);
            const minBal = Math.min(...allBalances, 0);
            const range = maxBal - minBal || 1;
            const zeroY = ((maxBal - 0) / range) * 100;
            return (
              <>
                {minBal < 0 && (
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-red-500/40"
                    style={{ top: `${zeroY}%` }}
                  >
                    <span className="absolute -top-3 left-0 text-[10px] text-red-400">
                      0
                    </span>
                  </div>
                )}
                {/* Red zone below zero */}
                {minBal < 0 && (
                  <div
                    className="absolute left-0 right-0 bottom-0 bg-red-500/10"
                    style={{ height: `${100 - zeroY}%` }}
                  />
                )}
                {/* Balance bars */}
                <div className="flex items-end gap-1 h-full relative z-10">
                  {result.monthly.map((m) => {
                    const pctFromBottom =
                      ((m.cashBalance - minBal) / range) * 100;
                    return (
                      <div
                        key={m.month}
                        className="flex flex-col items-center flex-1"
                        title={`${m.month}: ${formatNumber(m.cashBalance, "currency")}`}
                      >
                        <div className="w-full flex flex-col justify-end h-full">
                          <div
                            className={`w-full rounded-t-sm ${
                              m.cashBalance >= 0
                                ? "bg-accent/60"
                                : "bg-red-500/60"
                            }`}
                            style={{
                              height: `${Math.max(2, pctFromBottom)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted mt-1">
                          {m.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Cash Flow Table */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary">
            Monthly Cash Flow
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
                  Cash In
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Cash Out
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Net Cash Flow
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">
                  Cash Balance
                </th>
                <th className="text-center px-4 py-3 text-text-muted font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {result.monthly.map((m) => (
                <tr
                  key={m.month}
                  className={`border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors ${
                    m.status === "negative" ? "bg-red-500/5" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-text-primary font-medium">
                    {m.month}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                    {formatNumber(m.cashIn, "currency")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-400">
                    {formatNumber(m.cashOut, "currency")}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono ${
                      m.netCashFlow >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {m.netCashFlow >= 0 ? "+" : ""}
                    {formatNumber(m.netCashFlow, "currency")}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono font-semibold ${
                      m.cashBalance >= 0
                        ? "text-text-primary"
                        : "text-red-400"
                    }`}
                  >
                    {formatNumber(m.cashBalance, "currency")}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        m.status === "positive"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : m.status === "warning"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {m.status === "positive"
                        ? "OK"
                        : m.status === "warning"
                        ? "LOW"
                        : "NEGATIVE"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
