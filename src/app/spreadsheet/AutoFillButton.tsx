"use client";

import { useState } from "react";

interface AutoFillButtonProps {
  data: Record<string, string>[];
  headers: string[];
  onBulkEdit: (edits: { row: number; col: string; value: string }[]) => void;
}

/**
 * Detects a simple pattern from the last values in a column and fills down.
 * - Numeric increment: if last 2+ values differ by a constant, continue the pattern.
 * - Constant: if all recent values are the same, copy.
 * - Date: if values look like dates, increment by 1 month.
 */
function detectAndFill(
  data: Record<string, string>[],
  col: string,
  count: number
): string[] {
  const values = data.map((r) => r[col] ?? "");
  const nonEmpty = values.filter((v) => v.trim() !== "");
  if (nonEmpty.length === 0) return Array(count).fill("");

  // Try numeric pattern
  const lastTwo = nonEmpty.slice(-2).map(Number);
  if (lastTwo.length === 2 && !isNaN(lastTwo[0]) && !isNaN(lastTwo[1])) {
    const diff = lastTwo[1] - lastTwo[0];
    let current = lastTwo[1];
    return Array.from({ length: count }, () => {
      current += diff;
      return String(current);
    });
  }

  // Try date pattern (YYYY-MM or Month names)
  const lastVal = nonEmpty[nonEmpty.length - 1];
  const dateMatch = lastVal.match(/^(\d{4})-(\d{2})$/);
  if (dateMatch) {
    let year = parseInt(dateMatch[1]);
    let month = parseInt(dateMatch[2]);
    return Array.from({ length: count }, () => {
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
      return `${year}-${String(month).padStart(2, "0")}`;
    });
  }

  // Month name detection
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthIdx = months.findIndex(
    (m) => m.toLowerCase() === lastVal.toLowerCase()
  );
  if (monthIdx >= 0) {
    let idx = monthIdx;
    return Array.from({ length: count }, () => {
      idx = (idx + 1) % 12;
      return months[idx];
    });
  }
  const shortMonthIdx = shortMonths.findIndex(
    (m) => m.toLowerCase() === lastVal.toLowerCase()
  );
  if (shortMonthIdx >= 0) {
    let idx = shortMonthIdx;
    return Array.from({ length: count }, () => {
      idx = (idx + 1) % 12;
      return shortMonths[idx];
    });
  }

  // Default: copy last value
  return Array(count).fill(lastVal);
}

export default function AutoFillButton({
  data,
  headers,
  onBulkEdit,
}: AutoFillButtonProps) {
  const [selectedCol, setSelectedCol] = useState(headers[0] ?? "");
  const [fillCount, setFillCount] = useState(10);
  const [open, setOpen] = useState(false);

  const handleFill = () => {
    if (!selectedCol || fillCount <= 0) return;
    const newValues = detectAndFill(data, selectedCol, fillCount);
    const startRow = data.length;
    // We need rows to exist first – create empty rows then set values
    const edits: { row: number; col: string; value: string }[] = [];

    // First, create empty row edits for all headers to ensure rows exist
    for (let i = 0; i < fillCount; i++) {
      for (const h of headers) {
        edits.push({
          row: startRow + i,
          col: h,
          value: h === selectedCol ? newValues[i] : "",
        });
      }
    }

    onBulkEdit(edits);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-color transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        Fill Down
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-bg-card rounded-xl border border-border-subtle">
      <span className="text-xs font-medium text-text-muted">Column:</span>
      <select
        value={selectedCol}
        onChange={(e) => setSelectedCol(e.target.value)}
        className="bg-bg-input border border-border-subtle rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
      >
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-xs font-medium text-text-muted">Rows:</span>
      <input
        type="number"
        value={fillCount}
        onChange={(e) => setFillCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
        className="w-16 bg-bg-input border border-border-subtle rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        min={1}
        max={100}
      />
      <button
        onClick={handleFill}
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
      >
        Fill
      </button>
      <button
        onClick={() => setOpen(false)}
        className="px-2 py-1.5 text-sm text-text-muted hover:text-text-secondary"
      >
        Cancel
      </button>
    </div>
  );
}
