"use client";

import * as XLSX from "xlsx";

/**
 * Export tabular data to an .xlsx file and trigger a browser download.
 *
 * - Header row is styled bold via cell styling
 * - Auto-column widths based on content length
 * - Numeric values stored as numbers, not strings
 */
export function exportToExcel(
  data: Record<string, string | number>[],
  headers: string[],
  filename: string
): void {
  // Build an array-of-arrays: first row = headers, then data rows
  const aoa: (string | number)[][] = [headers];

  for (const row of data) {
    const rowArr: (string | number)[] = headers.map((h) => {
      const raw = row[h];
      if (raw === undefined || raw === null || raw === "") return "";
      // Try to keep numeric values as numbers
      if (typeof raw === "number") return raw;
      const num = Number(raw);
      if (!isNaN(num) && String(raw).trim() !== "") return num;
      return String(raw);
    });
    aoa.push(rowArr);
  }

  const wb = XLSX.utils.book_new();

  // Sheet name: truncate to 31 chars (Excel limit) and remove invalid chars
  const sheetName = filename
    .replace(/\.[^/.]+$/, "") // strip extension
    .replace(/[\\/*?[\]:]/g, "")
    .slice(0, 31) || "Sheet1";

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto column widths
  const colWidths: number[] = headers.map((h, colIdx) => {
    let maxLen = h.length;
    for (const row of aoa.slice(1)) {
      const cellLen = String(row[colIdx] ?? "").length;
      if (cellLen > maxLen) maxLen = cellLen;
    }
    return Math.min(maxLen + 2, 50); // cap at 50
  });

  ws["!cols"] = colWidths.map((w) => ({ wch: w }));

  // Bold headers: set style on header cells
  for (let c = 0; c < headers.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellRef]) {
      ws[cellRef].s = { font: { bold: true } };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Trigger download
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
