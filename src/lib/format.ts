/**
 * Number formatting utilities with auto-detection based on column names.
 */

export type FormatType = "currency" | "percent" | "compact" | "decimal";

/**
 * Format a number for display.
 *
 * - `undefined` / no type: thousand separators (integer)
 * - `"currency"`: €-prefixed with thousand separators
 * - `"percent"`: value * 100 with % suffix (assumes 0-1 range)
 * - `"compact"`: K / M / B suffix
 * - `"decimal"`: 2 decimal places with thousand separators
 */
export function formatNumber(
  value: number | string,
  type?: FormatType
): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return String(value);

  switch (type) {
    case "currency":
      return `€${formatWithSeparators(Math.round(num))}`;

    case "percent":
      // If the raw number is between -1 and 1 treat it as a ratio (0.253 → 25.3%)
      // Otherwise it's already a percentage value (25.3 → 25.3%)
      if (Math.abs(num) <= 1) {
        return `${round(num * 100, 1)}%`;
      }
      return `${round(num, 1)}%`;

    case "compact":
      return formatCompact(num);

    case "decimal":
      return formatWithSeparators(round(num, 2), 2);

    default:
      // Default: thousand separators, no decimals
      return formatWithSeparators(Math.round(num));
  }
}

/**
 * Auto-detect the best format type for a column based on its name.
 */
export function detectFormatType(columnName: string): FormatType | undefined {
  const lower = columnName.toLowerCase();

  // Percent columns
  if (
    lower.includes("%") ||
    lower.includes("rate") ||
    lower.includes("margin")
  ) {
    return "percent";
  }

  // Currency columns
  if (
    lower.includes("revenue") ||
    lower.includes("cost") ||
    lower.includes("price") ||
    lower.includes("budget") ||
    lower.includes("salary") ||
    lower.includes("mrr")
  ) {
    return "currency";
  }

  // Integer count columns – no decimals
  if (
    lower.includes("count") ||
    lower.includes("headcount") ||
    lower.includes("tickets")
  ) {
    return "decimal"; // will show 2dp but we override below
  }

  return undefined;
}

/**
 * Given a column name and its values, return the best format type.
 * Falls back to compact for large numbers, decimal for small.
 */
export function autoFormat(columnName: string, value: number): FormatType | undefined {
  const detected = detectFormatType(columnName);
  if (detected) return detected;

  // Heuristic: large numbers → compact, otherwise undefined (plain integer separators)
  if (Math.abs(value) >= 100_000) return "compact";
  if (!Number.isInteger(value)) return "decimal";
  return undefined;
}

// ── helpers ──────────────────────────────────────────────────────

function round(n: number, dp: number): number {
  const factor = Math.pow(10, dp);
  return Math.round(n * factor) / factor;
}

function formatWithSeparators(n: number, decimals?: number): string {
  const parts =
    decimals !== undefined ? n.toFixed(decimals).split(".") : String(n).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}${round(abs / 1_000_000_000, 1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${round(abs / 1_000_000, 1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${round(abs / 1_000, 1)}K`;
  }
  return `${sign}${round(abs, 1)}`;
}
