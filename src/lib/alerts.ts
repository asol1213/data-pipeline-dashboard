export interface AlertRule {
  id: string;
  name: string;
  datasetId: string;
  column: string;
  operator: ">" | "<" | ">=" | "<=" | "=";
  threshold: number;
  severity: "info" | "warning" | "critical";
  enabled: boolean;
  createdAt: string;
}

export interface AlertResult {
  rule: AlertRule;
  triggered: boolean;
  currentValue: number;
  message: string;
}

const ALERTS_KEY = "pipeline_alerts";
const ALERT_HISTORY_KEY = "pipeline_alert_history";

export interface AlertHistoryEntry {
  ruleId: string;
  ruleName: string;
  severity: "info" | "warning" | "critical";
  triggered: boolean;
  currentValue: number;
  threshold: number;
  operator: string;
  message: string;
  timestamp: string;
}

export function getAlerts(): AlertRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AlertRule[];
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: AlertRule[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function addAlert(alert: AlertRule): void {
  const alerts = getAlerts();
  alerts.push(alert);
  saveAlerts(alerts);
}

export function removeAlert(id: string): void {
  const alerts = getAlerts().filter((a) => a.id !== id);
  saveAlerts(alerts);
}

export function toggleAlert(id: string): void {
  const alerts = getAlerts();
  const alert = alerts.find((a) => a.id === id);
  if (alert) {
    alert.enabled = !alert.enabled;
    saveAlerts(alerts);
  }
}

export function getAlertHistory(): AlertHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AlertHistoryEntry[];
  } catch {
    return [];
  }
}

export function saveAlertHistory(history: AlertHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(history));
}

/**
 * Evaluate a single alert rule against a dataset's column values.
 * Returns the numeric value of the latest row for that column (last row).
 */
export function evaluateAlert(
  rule: AlertRule,
  rows: Record<string, string | number>[]
): AlertResult {
  if (!rule.enabled) {
    return {
      rule,
      triggered: false,
      currentValue: 0,
      message: "Alert is disabled",
    };
  }

  // Find the column value - use the last row as "current"
  const columnValues = rows
    .map((r) => {
      const v = r[rule.column];
      if (v === undefined || v === null || v === "") return NaN;
      return typeof v === "number" ? v : Number(v);
    })
    .filter((v) => !isNaN(v));

  if (columnValues.length === 0) {
    return {
      rule,
      triggered: false,
      currentValue: 0,
      message: `Column "${rule.column}" not found or has no numeric values`,
    };
  }

  const currentValue = columnValues[columnValues.length - 1];
  let triggered = false;

  switch (rule.operator) {
    case ">":
      triggered = currentValue > rule.threshold;
      break;
    case "<":
      triggered = currentValue < rule.threshold;
      break;
    case ">=":
      triggered = currentValue >= rule.threshold;
      break;
    case "<=":
      triggered = currentValue <= rule.threshold;
      break;
    case "=":
      triggered = currentValue === rule.threshold;
      break;
  }

  const message = triggered
    ? `${rule.name}: ${rule.column} is ${currentValue.toLocaleString()} (${rule.operator} ${rule.threshold.toLocaleString()})`
    : `${rule.name}: ${rule.column} is ${currentValue.toLocaleString()} (within threshold)`;

  return { rule, triggered, currentValue, message };
}

/**
 * Evaluate all alert rules against available datasets.
 * datasets is a Map of datasetId -> rows
 */
export function evaluateAlerts(
  rules: AlertRule[],
  datasets: Map<string, Record<string, string | number>[]>
): AlertResult[] {
  return rules.map((rule) => {
    const rows = datasets.get(rule.datasetId);
    if (!rows) {
      return {
        rule,
        triggered: false,
        currentValue: 0,
        message: `Dataset "${rule.datasetId}" not found`,
      };
    }
    return evaluateAlert(rule, rows);
  });
}
