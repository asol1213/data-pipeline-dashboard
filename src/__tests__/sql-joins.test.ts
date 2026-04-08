import { describe, it, expect } from "vitest";
import { parseSQL, executeQuery, SQLError } from "../lib/sql-engine";

const testDatasets = new Map<
  string,
  { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }
>();

testDatasets.set("orders", {
  headers: ["id", "customer_id", "amount", "status"],
  columnTypes: { id: "number", customer_id: "number", amount: "number", status: "string" },
  rows: [
    { id: "1", customer_id: "10", amount: "100", status: "completed" },
    { id: "2", customer_id: "20", amount: "250", status: "pending" },
    { id: "3", customer_id: "10", amount: "75", status: "completed" },
    { id: "4", customer_id: "30", amount: "300", status: "completed" },
    { id: "5", customer_id: "40", amount: "150", status: "cancelled" },
  ],
});

testDatasets.set("customers", {
  headers: ["customer_id", "name", "city"],
  columnTypes: { customer_id: "number", name: "string", city: "string" },
  rows: [
    { customer_id: "10", name: "Alice", city: "NYC" },
    { customer_id: "20", name: "Bob", city: "LA" },
    { customer_id: "30", name: "Charlie", city: "Chicago" },
  ],
});

testDatasets.set("pnl", {
  headers: ["Month", "Revenue", "COGS"],
  columnTypes: { Month: "string", Revenue: "number", COGS: "number" },
  rows: [
    { Month: "Jan", Revenue: "1000", COGS: "400" },
    { Month: "Feb", Revenue: "1200", COGS: "500" },
    { Month: "Mar", Revenue: "1100", COGS: "450" },
  ],
});

testDatasets.set("kpis", {
  headers: ["Month", "MRR", "Customers"],
  columnTypes: { Month: "string", MRR: "number", Customers: "number" },
  rows: [
    { Month: "Jan", MRR: "800", Customers: "50" },
    { Month: "Feb", MRR: "900", Customers: "55" },
    { Month: "Mar", MRR: "950", Customers: "60" },
  ],
});

testDatasets.set("forecasts", {
  headers: ["Month", "Forecast", "Actual"],
  columnTypes: { Month: "string", Forecast: "number", Actual: "number" },
  rows: [
    { Month: "Jan", Forecast: "950", Actual: "1000" },
    { Month: "Feb", Forecast: "1150", Actual: "1200" },
    { Month: "Apr", Forecast: "1300", Actual: "1250" },
  ],
});

describe("SQL JOINs - INNER JOIN", () => {
  it("performs basic INNER JOIN on matching column", () => {
    const parsed = parseSQL(
      "SELECT * FROM orders JOIN customers ON orders.customer_id = customers.customer_id"
    );
    expect(parsed.join).not.toBeNull();
    expect(parsed.join!.joinType).toBe("INNER");
    const result = executeQuery(parsed, testDatasets);
    // customer_id 40 has no match in customers, so it should be excluded
    expect(result.rowCount).toBe(4); // orders 1,2,3,4 match customers 10,20,10,30
  });

  it("performs JOIN with table aliases", () => {
    const parsed = parseSQL(
      "SELECT o.amount, c.name FROM orders o JOIN customers c ON o.customer_id = c.customer_id"
    );
    expect(parsed.tableAlias).toBe("o");
    expect(parsed.join!.joinAlias).toBe("c");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(4);
    expect(result.columns).toContain("o.amount");
    expect(result.columns).toContain("c.name");
    expect(result.rows[0]).toHaveProperty("o.amount");
    expect(result.rows[0]).toHaveProperty("c.name");
  });

  it("performs JOIN with WHERE clause", () => {
    const parsed = parseSQL(
      "SELECT * FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.amount > 100"
    );
    const result = executeQuery(parsed, testDatasets);
    for (const row of result.rows) {
      expect(Number(row["o.amount"] ?? row["amount"])).toBeGreaterThan(100);
    }
    expect(result.rowCount).toBeGreaterThan(0);
  });

  it("performs JOIN with ORDER BY", () => {
    const parsed = parseSQL(
      "SELECT o.amount, c.name FROM orders o JOIN customers c ON o.customer_id = c.customer_id ORDER BY o.amount DESC"
    );
    const result = executeQuery(parsed, testDatasets);
    const amounts = result.rows.map((r) => Number(r["o.amount"]));
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i - 1]).toBeGreaterThanOrEqual(amounts[i]);
    }
  });

  it("performs JOIN with LIMIT", () => {
    const parsed = parseSQL(
      "SELECT * FROM orders JOIN customers ON orders.customer_id = customers.customer_id LIMIT 2"
    );
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(2);
  });

  it("joins datasets with same column name (Month)", () => {
    const parsed = parseSQL(
      "SELECT p.Revenue, k.MRR FROM pnl p JOIN kpis k ON p.Month = k.Month"
    );
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(3);
    expect(result.rows[0]).toHaveProperty("p.Revenue");
    expect(result.rows[0]).toHaveProperty("k.MRR");
  });

  it("excludes non-matching rows in INNER JOIN", () => {
    // forecasts has Apr but not Mar; pnl has Mar but not Apr
    const parsed = parseSQL(
      "SELECT p.Revenue, f.Forecast FROM pnl p JOIN forecasts f ON p.Month = f.Month"
    );
    const result = executeQuery(parsed, testDatasets);
    // Only Jan and Feb match
    expect(result.rowCount).toBe(2);
  });

  it("performs JOIN with aggregate functions", () => {
    const parsed = parseSQL(
      "SELECT SUM(o.amount), COUNT(*) FROM orders o JOIN customers c ON o.customer_id = c.customer_id"
    );
    const result = executeQuery(parsed, testDatasets);
    expect(result.rows[0]["COUNT(*)"]).toBe(4);
    // 100 + 250 + 75 + 300 = 725
    expect(result.rows[0]["SUM(o.amount)"]).toBe(725);
  });
});

describe("SQL JOINs - LEFT JOIN", () => {
  it("performs LEFT JOIN keeping all left rows", () => {
    const parsed = parseSQL(
      "SELECT * FROM orders o LEFT JOIN customers c ON o.customer_id = c.customer_id"
    );
    expect(parsed.join!.joinType).toBe("LEFT");
    const result = executeQuery(parsed, testDatasets);
    // All 5 orders should be included, even order 5 (customer_id=40 with no match)
    expect(result.rowCount).toBe(5);
  });

  it("LEFT JOIN fills nulls for non-matching right rows", () => {
    const parsed = parseSQL(
      "SELECT o.id, o.customer_id, c.name FROM orders o LEFT JOIN customers c ON o.customer_id = c.customer_id"
    );
    const result = executeQuery(parsed, testDatasets);
    // Find the row for customer_id 40 (no match)
    const noMatchRow = result.rows.find((r) => String(r["o.customer_id"]) === "40");
    expect(noMatchRow).toBeDefined();
    expect(noMatchRow!["c.name"]).toBe("");
  });

  it("LEFT JOIN with data that partially matches", () => {
    const parsed = parseSQL(
      "SELECT p.Month, p.Revenue, f.Forecast FROM pnl p LEFT JOIN forecasts f ON p.Month = f.Month"
    );
    const result = executeQuery(parsed, testDatasets);
    // All 3 pnl rows should be present
    expect(result.rowCount).toBe(3);
    // Mar has no forecast match
    const marRow = result.rows.find((r) => String(r["p.Month"]) === "Mar");
    expect(marRow).toBeDefined();
    expect(marRow!["f.Forecast"]).toBe("");
  });
});

describe("SQL JOINs - Error handling", () => {
  it("throws error for JOIN without ON clause", () => {
    expect(() =>
      parseSQL("SELECT * FROM orders JOIN customers")
    ).toThrow(SQLError);
    expect(() =>
      parseSQL("SELECT * FROM orders JOIN customers")
    ).toThrow("JOIN requires an ON clause");
  });

  it("throws error for non-existent join table", () => {
    const parsed = parseSQL(
      "SELECT * FROM orders JOIN nonexistent ON orders.id = nonexistent.id"
    );
    expect(() => executeQuery(parsed, testDatasets)).toThrow(SQLError);
    expect(() => executeQuery(parsed, testDatasets)).toThrow("Table 'nonexistent' not found");
  });

  it("throws error for non-existent left table in JOIN", () => {
    const parsed = parseSQL(
      "SELECT * FROM nonexistent JOIN customers ON nonexistent.id = customers.customer_id"
    );
    expect(() => executeQuery(parsed, testDatasets)).toThrow(SQLError);
    expect(() => executeQuery(parsed, testDatasets)).toThrow("Table 'nonexistent' not found");
  });
});

describe("SQL JOINs - parseSQL detection", () => {
  it("parses INNER JOIN keyword", () => {
    const parsed = parseSQL(
      "SELECT * FROM orders INNER JOIN customers ON orders.customer_id = customers.customer_id"
    );
    expect(parsed.join).not.toBeNull();
    expect(parsed.join!.joinType).toBe("INNER");
    expect(parsed.join!.joinTable).toBe("customers");
  });

  it("parses LEFT JOIN keyword", () => {
    const parsed = parseSQL(
      "SELECT * FROM orders LEFT JOIN customers ON orders.customer_id = customers.customer_id"
    );
    expect(parsed.join).not.toBeNull();
    expect(parsed.join!.joinType).toBe("LEFT");
  });

  it("parses JOIN with aliases correctly", () => {
    const parsed = parseSQL(
      "SELECT a.Revenue, b.MRR FROM pnl a JOIN kpis b ON a.Month = b.Month"
    );
    expect(parsed.tableAlias).toBe("a");
    expect(parsed.join!.joinAlias).toBe("b");
    expect(parsed.join!.joinTable).toBe("kpis");
    expect(parsed.join!.onLeft).toBe("a.Month");
    expect(parsed.join!.onRight).toBe("b.Month");
  });

  it("returns null join for non-JOIN queries", () => {
    const parsed = parseSQL("SELECT * FROM orders");
    expect(parsed.join).toBeNull();
  });
});
