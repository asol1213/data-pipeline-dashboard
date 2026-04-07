import { describe, it, expect } from "vitest";
import { parseSQL, executeQuery, SQLError } from "../lib/sql-engine";

const testDatasets = new Map<
  string,
  { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }
>();

testDatasets.set("metrics", {
  headers: ["Month", "Revenue", "Churn_Rate", "Customers"],
  columnTypes: { Month: "string", Revenue: "number", Churn_Rate: "number", Customers: "number" },
  rows: [
    { Month: "Jan", Revenue: "50000", Churn_Rate: "3.2", Customers: "100" },
    { Month: "Feb", Revenue: "60000", Churn_Rate: "2.8", Customers: "120" },
    { Month: "Mar", Revenue: "55000", Churn_Rate: "3.5", Customers: "110" },
    { Month: "Apr", Revenue: "70000", Churn_Rate: "2.1", Customers: "150" },
    { Month: "May", Revenue: "80000", Churn_Rate: "1.9", Customers: "180" },
    { Month: "Jun", Revenue: "45000", Churn_Rate: "4.0", Customers: "90" },
  ],
});

describe("SQL Engine - Advanced SELECT", () => {
  it("selects specific columns: SELECT Revenue, Month FROM table", () => {
    const parsed = parseSQL("SELECT Revenue, Month FROM metrics");
    const result = executeQuery(parsed, testDatasets);
    expect(result.columns).toEqual(["Revenue", "Month"]);
    expect(result.rowCount).toBe(6);
    expect(result.rows[0]).toHaveProperty("Revenue");
    expect(result.rows[0]).toHaveProperty("Month");
    expect(result.rows[0]).not.toHaveProperty("Churn_Rate");
  });

  it("handles COUNT(*) standalone", () => {
    const parsed = parseSQL("SELECT COUNT(*) FROM metrics");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]["COUNT(*)"]).toBe(6);
  });
});

describe("SQL Engine - Advanced WHERE", () => {
  it("filters with multiple AND conditions: Revenue > 50000 AND Churn_Rate < 3", () => {
    const parsed = parseSQL("SELECT * FROM metrics WHERE Revenue > 50000 AND Churn_Rate < 3");
    const result = executeQuery(parsed, testDatasets);
    for (const row of result.rows) {
      expect(Number(row.Revenue)).toBeGreaterThan(50000);
      expect(Number(row.Churn_Rate)).toBeLessThan(3);
    }
    expect(result.rowCount).toBeGreaterThan(0);
  });

  it("filters with LIKE: WHERE Month LIKE 'Jan%'", () => {
    const parsed = parseSQL("SELECT * FROM metrics WHERE Month LIKE 'Jan%'");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].Month).toBe("Jan");
  });

  it("filters with LIKE wildcard in middle", () => {
    const parsed = parseSQL("SELECT * FROM metrics WHERE Month LIKE '%a%'");
    const result = executeQuery(parsed, testDatasets);
    // Jan, Mar, May, Apr all contain 'a' (case-insensitive LIKE)
    expect(result.rowCount).toBe(4);
  });
});

describe("SQL Engine - Advanced ORDER BY", () => {
  it("orders by DESC: SELECT * FROM metrics ORDER BY Revenue DESC", () => {
    const parsed = parseSQL("SELECT * FROM metrics ORDER BY Revenue DESC");
    const result = executeQuery(parsed, testDatasets);
    const revenues = result.rows.map((r) => Number(r.Revenue));
    for (let i = 1; i < revenues.length; i++) {
      expect(revenues[i - 1]).toBeGreaterThanOrEqual(revenues[i]);
    }
  });
});

describe("SQL Engine - Advanced GROUP BY", () => {
  it("groups with multiple aggregates: SUM(Revenue), AVG(Churn_Rate)", () => {
    // Use a dataset where grouping makes sense - group all into one by adding a category
    const groupDatasets = new Map<
      string,
      { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }
    >();
    groupDatasets.set("grouped", {
      headers: ["Region", "Revenue", "Churn_Rate"],
      columnTypes: { Region: "string", Revenue: "number", Churn_Rate: "number" },
      rows: [
        { Region: "East", Revenue: "100", Churn_Rate: "2.0" },
        { Region: "East", Revenue: "200", Churn_Rate: "3.0" },
        { Region: "West", Revenue: "150", Churn_Rate: "1.0" },
        { Region: "West", Revenue: "250", Churn_Rate: "4.0" },
      ],
    });

    const parsed = parseSQL("SELECT Region, SUM(Revenue), AVG(Churn_Rate) FROM grouped GROUP BY Region");
    const result = executeQuery(parsed, groupDatasets);
    expect(result.rowCount).toBe(2);

    const eastRow = result.rows.find((r) => r.Region === "East");
    const westRow = result.rows.find((r) => r.Region === "West");
    expect(eastRow).toBeDefined();
    expect(eastRow!["SUM(Revenue)"]).toBe(300);
    expect(eastRow!["AVG(Churn_Rate)"]).toBe(2.5);
    expect(westRow!["SUM(Revenue)"]).toBe(400);
    expect(westRow!["AVG(Churn_Rate)"]).toBe(2.5);
  });
});

describe("SQL Engine - LIMIT edge cases", () => {
  it("LIMIT 0 returns empty result", () => {
    const parsed = parseSQL("SELECT * FROM metrics LIMIT 0");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(0);
    expect(result.rows).toEqual([]);
  });
});

describe("SQL Engine - Error handling", () => {
  it("errors on non-existent table with helpful message", () => {
    const parsed = parseSQL("SELECT * FROM nonexistent");
    expect(() => executeQuery(parsed, testDatasets)).toThrow(SQLError);
    expect(() => executeQuery(parsed, testDatasets)).toThrow("Table 'nonexistent' not found");
  });

  it("errors on non-existent column in WHERE", () => {
    const parsed = parseSQL("SELECT * FROM metrics WHERE fake_col > 5");
    expect(() => executeQuery(parsed, testDatasets)).toThrow(SQLError);
    expect(() => executeQuery(parsed, testDatasets)).toThrow("Column 'fake_col' does not exist");
  });

  it("errors on non-existent column in SELECT", () => {
    const parsed = parseSQL("SELECT fake_col FROM metrics");
    expect(() => executeQuery(parsed, testDatasets)).toThrow(SQLError);
    expect(() => executeQuery(parsed, testDatasets)).toThrow("Column 'fake_col' does not exist");
  });

  it("rejects SQL injection: only SELECT is allowed, not DROP/DELETE/INSERT", () => {
    // The parser only supports SELECT statements, so injections via other statement types are blocked
    expect(() => parseSQL("DROP TABLE users")).toThrow(SQLError);
    expect(() => parseSQL("DELETE FROM users WHERE 1=1")).toThrow(SQLError);
    expect(() => parseSQL("INSERT INTO users VALUES (1)")).toThrow(SQLError);
  });

  it("rejects non-SELECT statements", () => {
    expect(() => parseSQL("DROP TABLE users")).toThrow(SQLError);
    expect(() => parseSQL("DELETE FROM users")).toThrow(SQLError);
    expect(() => parseSQL("UPDATE users SET name = 'x'")).toThrow(SQLError);
  });

  it("errors on empty SQL string", () => {
    expect(() => parseSQL("")).toThrow();
  });
});

describe("SQL Engine - Case insensitivity and whitespace", () => {
  it("handles case insensitive keywords: select * from METRICS", () => {
    const parsed = parseSQL("select * from metrics");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(6);
  });

  it("handles extra whitespace in SQL", () => {
    const parsed = parseSQL("  SELECT   *   FROM   metrics   ");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(6);
  });

  it("handles tabs and multiple spaces", () => {
    const parsed = parseSQL("SELECT\t*\t\tFROM\t\tmetrics");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(6);
  });
});
