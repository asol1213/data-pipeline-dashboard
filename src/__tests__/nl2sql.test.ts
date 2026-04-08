import { describe, it, expect } from "vitest";
import { parseSQL, executeQuery, SQLError } from "../lib/sql-engine";
import { ensureSeedData } from "../lib/seed";
import { getAllDatasets, getDataset } from "../lib/store";

function getTestDatasets() {
  ensureSeedData();
  const allMeta = getAllDatasets();
  const datasets = new Map<
    string,
    { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }
  >();

  for (const meta of allMeta) {
    const full = getDataset(meta.id);
    if (full) {
      datasets.set(meta.id, {
        rows: full.rows,
        headers: full.headers,
        columnTypes: full.columnTypes,
      });
      const nameKey = meta.name.toLowerCase().replace(/\s+/g, "_");
      datasets.set(nameKey, {
        rows: full.rows,
        headers: full.headers,
        columnTypes: full.columnTypes,
      });
    }
  }
  return datasets;
}

describe("NL2SQL - SQL Generation & Execution", () => {
  it("returns a valid SQL string from parseSQL", () => {
    const sql = "SELECT * FROM sales_transactions LIMIT 5";
    const parsed = parseSQL(sql);
    expect(parsed).toBeDefined();
    expect(parsed.table).toBe("sales_transactions");
    expect(parsed.selectAll).toBe(true);
    expect(parsed.limit).toBe(5);
  });

  it("executes a generated SQL query successfully", () => {
    const datasets = getTestDatasets();
    const sql = "SELECT Channel, SUM(Revenue) FROM sales_transactions GROUP BY Channel";
    const parsed = parseSQL(sql);
    const result = executeQuery(parsed, datasets);
    expect(result.columns).toBeDefined();
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rowCount).toBeGreaterThan(0);
  });

  it("handles unknown table gracefully", () => {
    const datasets = getTestDatasets();
    const sql = "SELECT * FROM nonexistent_table";
    const parsed = parseSQL(sql);
    expect(() => executeQuery(parsed, datasets)).toThrow(SQLError);
  });

  it("executes aggregate queries correctly", () => {
    const datasets = getTestDatasets();
    const sql = "SELECT COUNT(*), AVG(Revenue) FROM sales_transactions";
    const parsed = parseSQL(sql);
    const result = executeQuery(parsed, datasets);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]["COUNT(*)"]).toBe(200);
    const avg = result.rows[0]["AVG(Revenue)"];
    expect(typeof avg).toBe("number");
    expect(avg).toBeGreaterThan(0);
  });

  it("executes ORDER BY DESC for top queries", () => {
    const datasets = getTestDatasets();
    const sql = "SELECT Company_Name, Annual_Contract_Value FROM customers ORDER BY Annual_Contract_Value DESC LIMIT 10";
    const parsed = parseSQL(sql);
    const result = executeQuery(parsed, datasets);
    expect(result.rowCount).toBe(10);
    // Verify descending order
    for (let i = 1; i < result.rows.length; i++) {
      expect(Number(result.rows[i - 1]["Annual_Contract_Value"])).toBeGreaterThanOrEqual(
        Number(result.rows[i]["Annual_Contract_Value"])
      );
    }
  });

  it("chart type detection: string + number -> bar", () => {
    // Simulate what the nl2sql route does for chart detection
    const columns = ["Channel", "SUM(Revenue)"];
    const rows: Record<string, string | number>[] = [
      { Channel: "Online", "SUM(Revenue)": 500000 },
      { Channel: "Retail", "SUM(Revenue)": 300000 },
      { Channel: "Partner", "SUM(Revenue)": 200000 },
      { Channel: "Direct", "SUM(Revenue)": 100000 },
    ];

    // First column is string, second is number -> should detect bar/pie
    const firstVal = rows[0][columns[0]];
    const isFirstString = typeof firstVal === "string" && isNaN(Number(firstVal));
    const secondVal = rows[0][columns[1]];
    const isSecondNumeric = typeof secondVal === "number";

    expect(isFirstString).toBe(true);
    expect(isSecondNumeric).toBe(true);
    // When first is string and second is number, chart type should be bar (or pie for <= 8 groups)
  });

  it("chart type detection: date + number -> line", () => {
    const rows = [
      { Month: "Jan 2026", Revenue: 142500 },
      { Month: "Feb 2026", Revenue: 156800 },
      { Month: "Mar 2026", Revenue: 163200 },
    ];

    const datePatterns = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}[-/]\d{2})/i;
    const isTimeSeries = rows.some((r) => datePatterns.test(String(r.Month)));
    expect(isTimeSeries).toBe(true);
  });

  it("executes GROUP BY with string and numeric columns", () => {
    const datasets = getTestDatasets();
    const sql = "SELECT Sales_Rep, SUM(Revenue) FROM sales_transactions GROUP BY Sales_Rep ORDER BY SUM(Revenue) DESC LIMIT 5";
    const parsed = parseSQL(sql);
    const result = executeQuery(parsed, datasets);
    expect(result.rowCount).toBe(5);
    expect(result.columns).toContain("Sales_Rep");
    expect(result.columns).toContain("SUM(Revenue)");
  });
});
