import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";

// Mock XLSX.writeFile so we don't trigger actual file download
vi.mock("xlsx", async () => {
  const actual = await vi.importActual<typeof import("xlsx")>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

import { exportToExcel } from "../lib/excel-export";

describe("exportToExcel", () => {
  const headers = ["Name", "Revenue", "Count"];
  const data = [
    { Name: "Alice", Revenue: "50000", Count: "10" },
    { Name: "Bob", Revenue: "75000", Count: "20" },
    { Name: "Charlie", Revenue: "30000", Count: "5" },
  ];

  beforeEach(() => {
    vi.mocked(XLSX.writeFile).mockClear();
  });

  it("calls XLSX.writeFile with correct filename", () => {
    exportToExcel(data, headers, "test-export");
    expect(XLSX.writeFile).toHaveBeenCalled();
    const call = vi.mocked(XLSX.writeFile).mock.calls[0];
    expect(call[1]).toBe("test-export.xlsx");
  });

  it("appends .xlsx if not present", () => {
    exportToExcel(data, headers, "myfile");
    const call = vi.mocked(XLSX.writeFile).mock.calls[0];
    expect(call[1]).toBe("myfile.xlsx");
  });

  it("keeps .xlsx if already present", () => {
    exportToExcel(data, headers, "myfile.xlsx");
    const call = vi.mocked(XLSX.writeFile).mock.calls[0];
    expect(call[1]).toBe("myfile.xlsx");
  });

  it("creates workbook with headers as first row", () => {
    exportToExcel(data, headers, "test");
    const call = vi.mocked(XLSX.writeFile).mock.calls[0];
    const wb = call[0] as XLSX.WorkBook;
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    // Check header cells
    expect(ws["A1"]?.v).toBe("Name");
    expect(ws["B1"]?.v).toBe("Revenue");
    expect(ws["C1"]?.v).toBe("Count");
  });

  it("stores numeric values as numbers, not strings", () => {
    exportToExcel(data, headers, "test");
    const call = vi.mocked(XLSX.writeFile).mock.calls[0];
    const wb = call[0] as XLSX.WorkBook;
    const ws = wb.Sheets[wb.SheetNames[0]];
    // Revenue column (B2) should be a number
    expect(ws["B2"]?.v).toBe(50000);
    expect(typeof ws["B2"]?.v).toBe("number");
  });

  it("includes all data rows", () => {
    exportToExcel(data, headers, "test");
    const call = vi.mocked(XLSX.writeFile).mock.calls[0];
    const wb = call[0] as XLSX.WorkBook;
    const ws = wb.Sheets[wb.SheetNames[0]];
    // Row 4 (A4) should be Charlie
    expect(ws["A4"]?.v).toBe("Charlie");
  });

  it("truncates sheet name to 31 chars", () => {
    exportToExcel(data, headers, "This Is A Very Long Dataset Name That Exceeds Limit.xlsx");
    const call = vi.mocked(XLSX.writeFile).mock.calls[0];
    const wb = call[0] as XLSX.WorkBook;
    expect(wb.SheetNames[0].length).toBeLessThanOrEqual(31);
  });

  it("sets column widths", () => {
    exportToExcel(data, headers, "test");
    const call = vi.mocked(XLSX.writeFile).mock.calls[0];
    const wb = call[0] as XLSX.WorkBook;
    const ws = wb.Sheets[wb.SheetNames[0]];
    expect(ws["!cols"]).toBeDefined();
    expect(ws["!cols"]!.length).toBe(3);
  });
});
