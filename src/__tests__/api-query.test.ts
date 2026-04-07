import { describe, it, expect } from "vitest";
import { parseSQL, executeQuery, SQLError } from "../lib/sql-engine";

// Simulate the API query flow: parse SQL, execute against datasets, return results
const testDatasets = new Map<
  string,
  { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }
>();

testDatasets.set("products", {
  headers: ["name", "price", "category"],
  columnTypes: { name: "string", price: "number", category: "string" },
  rows: [
    { name: "Widget", price: "9.99", category: "tools" },
    { name: "Gadget", price: "24.99", category: "electronics" },
    { name: "Doohickey", price: "14.99", category: "tools" },
    { name: "Thingamajig", price: "39.99", category: "electronics" },
  ],
});

describe("SQL Query API - POST with valid SQL", () => {
  it("returns results for a valid SELECT query", () => {
    const parsed = parseSQL("SELECT * FROM products");
    const result = executeQuery(parsed, testDatasets);
    expect(result.columns).toEqual(["name", "price", "category"]);
    expect(result.rowCount).toBe(4);
    expect(result.rows).toHaveLength(4);
  });

  it("returns filtered results with WHERE", () => {
    const parsed = parseSQL("SELECT name, price FROM products WHERE category = 'tools'");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(2);
    expect(result.columns).toEqual(["name", "price"]);
  });

  it("returns aggregated results", () => {
    const parsed = parseSQL("SELECT category, COUNT(*), AVG(price) FROM products GROUP BY category");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(2);
    const toolsRow = result.rows.find((r) => r.category === "tools");
    expect(toolsRow).toBeDefined();
    expect(toolsRow!["COUNT(*)"]).toBe(2);
  });
});

describe("SQL Query API - POST with invalid SQL", () => {
  it("throws SQLError for invalid SQL syntax", () => {
    expect(() => parseSQL("INVALID QUERY")).toThrow(SQLError);
  });

  it("throws SQLError for missing FROM", () => {
    expect(() => parseSQL("SELECT *")).toThrow(SQLError);
  });

  it("throws for non-SELECT statement", () => {
    expect(() => parseSQL("INSERT INTO products VALUES ('x', 1, 'y')")).toThrow(SQLError);
  });
});

describe("SQL Query API - POST without sql field", () => {
  it("empty string should throw", () => {
    expect(() => parseSQL("")).toThrow();
  });

  it("whitespace-only string should throw", () => {
    expect(() => parseSQL("   ")).toThrow();
  });
});

describe("SQL Query API - Execution time tracking", () => {
  it("returns executionTime as a non-negative number", () => {
    const parsed = parseSQL("SELECT * FROM products");
    const result = executeQuery(parsed, testDatasets);
    expect(typeof result.executionTime).toBe("number");
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it("tracks execution time for complex queries", () => {
    const parsed = parseSQL("SELECT category, SUM(price) FROM products GROUP BY category ORDER BY category ASC");
    const result = executeQuery(parsed, testDatasets);
    expect(typeof result.executionTime).toBe("number");
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });
});
