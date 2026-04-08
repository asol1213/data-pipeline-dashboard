"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getSchedules,
  saveSchedules,
  createDemoSchedules,
  computeNextRun,
  getDayName,
} from "@/lib/report-schedules";
import type { ReportSchedule } from "@/lib/report-schedules";

interface DatasetOption {
  id: string;
  name: string;
}

const DEFAULT_FORM: Omit<ReportSchedule, "id" | "nextRun"> = {
  name: "",
  datasetId: "",
  frequency: "weekly",
  dayOfWeek: 1,
  dayOfMonth: 1,
  time: "09:00",
  recipients: [],
  includeKPIs: true,
  includeCharts: true,
  includeInsights: false,
  includeRawData: false,
  format: "pdf",
  enabled: true,
};

function formatNextRun(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ReportsPage() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [recipientInput, setRecipientInput] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);

  // Load schedules and datasets
  useEffect(() => {
    const existing = getSchedules();
    if (existing.length === 0) {
      const demo = createDemoSchedules();
      saveSchedules(demo);
      setSchedules(demo);
    } else {
      setSchedules(existing);
    }

    fetch("/api/datasets")
      .then((r) => r.json())
      .then((data: DatasetOption[]) => setDatasets(data))
      .catch(() => {});
  }, []);

  const persist = useCallback((updated: ReportSchedule[]) => {
    setSchedules(updated);
    saveSchedules(updated);
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...DEFAULT_FORM, datasetId: datasets[0]?.id ?? "" });
    setRecipientInput("");
    setEditingId(null);
    setShowForm(false);
  }, [datasets]);

  const handleSubmit = useCallback(() => {
    if (!form.name.trim() || !form.datasetId) return;

    const nextRun = computeNextRun(
      form.frequency,
      form.time,
      form.dayOfWeek,
      form.dayOfMonth
    );

    if (editingId) {
      const updated = schedules.map((s) =>
        s.id === editingId ? { ...form, id: editingId, nextRun } : s
      );
      persist(updated);
    } else {
      const newSchedule: ReportSchedule = {
        ...form,
        id: `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nextRun,
      };
      persist([...schedules, newSchedule]);
    }
    resetForm();
  }, [form, editingId, schedules, persist, resetForm]);

  const handleEdit = useCallback((schedule: ReportSchedule) => {
    setForm({
      name: schedule.name,
      datasetId: schedule.datasetId,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      time: schedule.time,
      recipients: schedule.recipients,
      includeKPIs: schedule.includeKPIs,
      includeCharts: schedule.includeCharts,
      includeInsights: schedule.includeInsights,
      includeRawData: schedule.includeRawData,
      format: schedule.format,
      enabled: schedule.enabled,
    });
    setRecipientInput("");
    setEditingId(schedule.id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      persist(schedules.filter((s) => s.id !== id));
    },
    [schedules, persist]
  );

  const handleToggle = useCallback(
    (id: string) => {
      persist(
        schedules.map((s) =>
          s.id === id ? { ...s, enabled: !s.enabled } : s
        )
      );
    },
    [schedules, persist]
  );

  const handleRunNow = useCallback(
    (id: string) => {
      setRunningId(id);
      // Simulate generating a report
      setTimeout(() => {
        const updated = schedules.map((s) =>
          s.id === id ? { ...s, lastRun: new Date().toISOString() } : s
        );
        persist(updated);
        setRunningId(null);
        alert("Report generated! (simulated — in production this would email the recipients)");
      }, 1500);
    },
    [schedules, persist]
  );

  const addRecipient = useCallback(() => {
    const email = recipientInput.trim();
    if (email && !form.recipients.includes(email)) {
      setForm((prev) => ({
        ...prev,
        recipients: [...prev.recipients, email],
      }));
    }
    setRecipientInput("");
  }, [recipientInput, form.recipients]);

  const removeRecipient = useCallback((email: string) => {
    setForm((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((r) => r !== email),
    }));
  }, []);

  const datasetNameMap: Record<string, string> = {};
  for (const d of datasets) {
    datasetNameMap[d.id] = d.name;
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Scheduled Reports</h1>
            <p className="text-sm text-blue-200 mt-1">
              Configure automated report delivery (simulated)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setForm({ ...DEFAULT_FORM, datasetId: datasets[0]?.id ?? "" });
                setEditingId(null);
                setShowForm(true);
              }}
              className="text-sm bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors font-medium"
            >
              + Create Schedule
            </button>
            <Link
              href="/"
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {editingId ? "Edit Report Schedule" : "Create Report Schedule"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report Name */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Report Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Weekly Revenue Report"
                className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </div>

            {/* Dataset */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Dataset</label>
              <select
                value={form.datasetId}
                onChange={(e) => setForm((f) => ({ ...f, datasetId: e.target.value }))}
                className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="">Select dataset...</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {(["daily", "weekly", "monthly"] as const).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setForm((f) => ({ ...f, frequency: freq }))}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border capitalize ${
                      form.frequency === freq
                        ? "bg-accent text-white border-accent"
                        : "bg-bg-secondary text-text-secondary border-border-subtle hover:border-accent/50"
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Day selector */}
            <div>
              {form.frequency === "weekly" && (
                <>
                  <label className="block text-sm text-text-secondary mb-2">Day of Week</label>
                  <select
                    value={form.dayOfWeek ?? 1}
                    onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>{getDayName(d)}</option>
                    ))}
                  </select>
                </>
              )}
              {form.frequency === "monthly" && (
                <>
                  <label className="block text-sm text-text-secondary mb-2">Day of Month</label>
                  <select
                    value={form.dayOfMonth ?? 1}
                    onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: Number(e.target.value) }))}
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </>
              )}
              {form.frequency === "daily" && (
                <>
                  <label className="block text-sm text-text-secondary mb-2">Schedule</label>
                  <p className="text-sm text-text-muted py-2.5">Runs every day</p>
                </>
              )}
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Format</label>
              <div className="grid grid-cols-2 gap-2">
                {(["pdf", "excel"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setForm((f) => ({ ...f, format: fmt }))}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border uppercase ${
                      form.format === fmt
                        ? "bg-accent text-white border-accent"
                        : "bg-bg-secondary text-text-secondary border-border-subtle hover:border-accent/50"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div className="mt-4">
            <label className="block text-sm text-text-secondary mb-2">Recipients</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
                placeholder="email@company.com"
                className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
              <button
                onClick={addRecipient}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-bg-secondary text-text-secondary border border-border-subtle hover:border-accent/50 transition-colors"
              >
                Add
              </button>
            </div>
            {form.recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium"
                  >
                    {email}
                    <button onClick={() => removeRecipient(email)} className="hover:text-red-500 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Include options */}
          <div className="mt-4">
            <label className="block text-sm text-text-secondary mb-2">Include in Report</label>
            <div className="flex flex-wrap gap-4">
              {[
                { key: "includeKPIs" as const, label: "KPIs" },
                { key: "includeCharts" as const, label: "Charts" },
                { key: "includeInsights" as const, label: "Insights" },
                { key: "includeRawData" as const, label: "Raw Data" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-border-subtle text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-text-primary">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border-subtle">
            <button
              onClick={handleSubmit}
              disabled={!form.name.trim() || !form.datasetId}
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? "Update Schedule" : "Create Schedule"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Schedules */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 rounded-full bg-accent"></div>
          <h2 className="text-lg font-semibold text-text-primary">Active Schedules</h2>
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
            {schedules.filter((s) => s.enabled).length} active
          </span>
        </div>

        {schedules.length === 0 ? (
          <div className="text-center py-12 bg-bg-card rounded-xl border border-border-subtle">
            <p className="text-text-muted text-sm">No report schedules yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`bg-bg-card rounded-xl border transition-all p-5 ${
                  schedule.enabled
                    ? "border-border-subtle hover:border-accent/30"
                    : "border-border-subtle opacity-60"
                }`}
              >
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-text-primary truncate">{schedule.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        schedule.enabled
                          ? "bg-green-500/10 text-green-500"
                          : "bg-gray-500/10 text-gray-500"
                      }`}>
                        {schedule.enabled ? "Active" : "Paused"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted uppercase font-medium">
                        {schedule.format}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-text-muted flex-wrap">
                      <span>
                        {datasetNameMap[schedule.datasetId] ?? schedule.datasetId}
                      </span>
                      <span className="capitalize">
                        {schedule.frequency === "weekly"
                          ? `Every ${getDayName(schedule.dayOfWeek ?? 1)}`
                          : schedule.frequency === "monthly"
                          ? `${schedule.dayOfMonth ?? 1}${["st", "nd", "rd"][((schedule.dayOfMonth ?? 1) - 1) % 10] && (schedule.dayOfMonth ?? 1) <= 3 ? ["st", "nd", "rd"][(schedule.dayOfMonth ?? 1) - 1] : "th"} of each month`
                          : "Daily"}
                        {" at "}
                        {schedule.time}
                      </span>
                    </div>

                    {schedule.recipients.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {schedule.recipients.map((r) => (
                          <span key={r} className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                      <span>Next run: <span className="text-text-secondary font-medium">{formatNextRun(schedule.nextRun)}</span></span>
                      {schedule.lastRun && (
                        <span>Last run: {formatNextRun(schedule.lastRun)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunNow(schedule.id)}
                      disabled={runningId === schedule.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50"
                    >
                      {runningId === schedule.id ? "Running..." : "Run Now"}
                    </button>
                    <button
                      onClick={() => handleToggle(schedule.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        schedule.enabled
                          ? "bg-bg-secondary text-text-secondary border-border-subtle hover:border-accent/50"
                          : "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                      }`}
                    >
                      {schedule.enabled ? "Pause" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-secondary text-text-secondary border border-border-subtle hover:border-accent/50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
