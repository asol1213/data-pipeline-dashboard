import { describe, it, expect, beforeEach } from "vitest";
import {
  getSchedules,
  saveSchedules,
  computeNextRun,
  getDayName,
  createDemoSchedules,
  type ReportSchedule,
} from "../lib/report-schedules";

// Mock localStorage and window for Node environment
const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

if (typeof globalThis.window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    value: { dispatchEvent: () => {} },
    writable: true,
    configurable: true,
  });
}

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

describe("Report Schedules", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("getSchedules returns empty list initially", () => {
    expect(getSchedules()).toEqual([]);
  });

  it("create and save a schedule", () => {
    const schedule: ReportSchedule = {
      id: "test-1",
      name: "Weekly Report",
      datasetId: "sales",
      frequency: "weekly",
      dayOfWeek: 1,
      time: "09:00",
      recipients: ["test@example.com"],
      includeKPIs: true,
      includeCharts: true,
      includeInsights: false,
      includeRawData: false,
      format: "pdf",
      enabled: true,
      nextRun: computeNextRun("weekly", "09:00", 1),
    };

    saveSchedules([schedule]);
    const result = getSchedules();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Weekly Report");
    expect(result[0].id).toBe("test-1");
  });

  it("list schedules returns all saved schedules", () => {
    const schedules: ReportSchedule[] = [
      {
        id: "s1", name: "Report A", datasetId: "d1", frequency: "daily",
        time: "08:00", recipients: ["a@test.com"], includeKPIs: true,
        includeCharts: false, includeInsights: false, includeRawData: false,
        format: "pdf", enabled: true, nextRun: computeNextRun("daily", "08:00"),
      },
      {
        id: "s2", name: "Report B", datasetId: "d2", frequency: "weekly",
        dayOfWeek: 5, time: "17:00", recipients: ["b@test.com"],
        includeKPIs: false, includeCharts: true, includeInsights: true,
        includeRawData: false, format: "excel", enabled: false,
        nextRun: computeNextRun("weekly", "17:00", 5),
      },
    ];
    saveSchedules(schedules);
    expect(getSchedules()).toHaveLength(2);
  });

  it("toggle enable/disable on a schedule", () => {
    const schedule: ReportSchedule = {
      id: "t1", name: "Toggle Me", datasetId: "d1", frequency: "daily",
      time: "10:00", recipients: ["x@test.com"], includeKPIs: true,
      includeCharts: false, includeInsights: false, includeRawData: false,
      format: "pdf", enabled: true, nextRun: computeNextRun("daily", "10:00"),
    };
    saveSchedules([schedule]);

    // Toggle off
    const list = getSchedules();
    list[0].enabled = false;
    saveSchedules(list);
    expect(getSchedules()[0].enabled).toBe(false);

    // Toggle on
    list[0].enabled = true;
    saveSchedules(list);
    expect(getSchedules()[0].enabled).toBe(true);
  });

  it("delete a schedule", () => {
    const schedules: ReportSchedule[] = [
      {
        id: "d1", name: "Keep", datasetId: "x", frequency: "daily",
        time: "08:00", recipients: [], includeKPIs: true,
        includeCharts: false, includeInsights: false, includeRawData: false,
        format: "pdf", enabled: true, nextRun: computeNextRun("daily", "08:00"),
      },
      {
        id: "d2", name: "Delete Me", datasetId: "x", frequency: "daily",
        time: "08:00", recipients: [], includeKPIs: true,
        includeCharts: false, includeInsights: false, includeRawData: false,
        format: "pdf", enabled: true, nextRun: computeNextRun("daily", "08:00"),
      },
    ];
    saveSchedules(schedules);

    const filtered = getSchedules().filter((s) => s.id !== "d2");
    saveSchedules(filtered);
    const result = getSchedules();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Keep");
  });

  it("computeNextRun returns a valid ISO date string", () => {
    const next = computeNextRun("daily", "09:00");
    expect(next).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const date = new Date(next);
    expect(date.getTime()).toBeGreaterThan(0);
  });

  it("computeNextRun for weekly returns a future date", () => {
    const next = computeNextRun("weekly", "09:00", 1); // Monday
    const date = new Date(next);
    expect(date.getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
  });

  it("computeNextRun for monthly returns a future date", () => {
    const next = computeNextRun("monthly", "08:00", undefined, 15);
    const date = new Date(next);
    expect(date.getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
  });

  it("getDayName returns correct day names", () => {
    expect(getDayName(0)).toBe("Sunday");
    expect(getDayName(1)).toBe("Monday");
    expect(getDayName(6)).toBe("Saturday");
    expect(getDayName(99)).toBe("Unknown");
  });

  it("createDemoSchedules returns valid schedules", () => {
    const demos = createDemoSchedules();
    expect(demos.length).toBeGreaterThanOrEqual(2);
    for (const s of demos) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.nextRun).toBeTruthy();
      expect(s.recipients.length).toBeGreaterThan(0);
    }
  });
});
