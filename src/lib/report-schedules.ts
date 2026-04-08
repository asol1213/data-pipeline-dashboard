export interface ReportSchedule {
  id: string;
  name: string;
  datasetId: string;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number; // 0=Sunday, 1=Monday, etc. (for weekly)
  dayOfMonth?: number; // 1-31 (for monthly)
  time: string; // "09:00"
  recipients: string[];
  includeKPIs: boolean;
  includeCharts: boolean;
  includeInsights: boolean;
  includeRawData: boolean;
  format: "pdf" | "excel";
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
}

const STORAGE_KEY = "report-schedules";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function getDayName(dayIndex: number): string {
  return DAYS[dayIndex] ?? "Unknown";
}

export function computeNextRun(
  frequency: "daily" | "weekly" | "monthly",
  time: string,
  dayOfWeek?: number,
  dayOfMonth?: number
): string {
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (frequency === "daily") {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly" && dayOfWeek !== undefined) {
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
      daysUntil += 7;
    }
    next.setDate(now.getDate() + daysUntil);
  } else if (frequency === "monthly" && dayOfMonth !== undefined) {
    next.setDate(dayOfMonth);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next.toISOString();
}

export function getSchedules(): ReportSchedule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSchedules(schedules: ReportSchedule[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch {
    // localStorage not available
  }
}

export function createDemoSchedules(): ReportSchedule[] {
  return [
    {
      id: "demo-weekly-revenue",
      name: "Weekly Revenue Report",
      datasetId: "sales-q1-2026",
      frequency: "weekly",
      dayOfWeek: 1, // Monday
      time: "09:00",
      recipients: ["cfo@company.com", "finance-team@company.com"],
      includeKPIs: true,
      includeCharts: true,
      includeInsights: true,
      includeRawData: false,
      format: "pdf",
      enabled: true,
      nextRun: computeNextRun("weekly", "09:00", 1),
    },
    {
      id: "demo-monthly-financial",
      name: "Monthly Financial Summary",
      datasetId: "pnl-2025",
      frequency: "monthly",
      dayOfMonth: 1,
      time: "08:00",
      recipients: ["ceo@company.com", "board@company.com"],
      includeKPIs: true,
      includeCharts: true,
      includeInsights: true,
      includeRawData: true,
      format: "excel",
      enabled: true,
      nextRun: computeNextRun("monthly", "08:00", undefined, 1),
    },
  ];
}
