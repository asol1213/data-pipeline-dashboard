import { describe, it, expect } from "vitest";
import { parseSQL, executeQuery, SQLError } from "../lib/sql-engine";

const testDatasets = new Map<string, { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }>();

testDatasets.set("users", {
  headers: ["name", "age", "city", "score"],
  columnTypes: { name: "string", age: "number", city: "string", score: "number" },
  rows: [
    { name: "Alice", age: "30", city: "NYC", score: "95" },
    { name: "Bob", age: "25", city: "LA", score: "82" },
    { name: "Charlie", age: "35", city: "NYC", score: "78" },
    { name: "Diana", age: "28", city: "Chicago", score: "91" },
    { name: "Eve", age: "32", city: "LA", score: "88" },
  ],
});

testDatasets.set("sales", {
  headers: ["month", "revenue", "region"],
  columnTypes: { month: "string", revenue: "number", region: "string" },
  rows: [
    { month: "Jan", revenue: "1000", region: "East" },
    { month: "Feb", revenue: "1500", region: "East" },
    { month: "Mar", revenue: "1200", region: "West" },
    { month: "Apr", revenue: "1800", region: "West" },
    { month: "May", revenue: "2000", region: "East" },
  ],
});

describe("parseSQL", () => {
  it("parses a simple SELECT * FROM table", () => {
    const result = parseSQL("SELECT * FROM users");
    expect(result.table).toBe("users");
    expect(result.selectAll).toBe(true);
    expect(result.where).toEqual([]);
    expect(result.orderBy).toEqual([]);
    expect(result.limit).toBeNull();
  });

  it("parses SELECT with specific columns", () => {
    const result = parseSQL("SELECT name, age FROM users");
    expect(result.columns).toEqual(["name", "age"]);
    expect(result.selectAll).toBe(false);
  });

  it("parses WHERE clause with numeric comparison", () => {
    const result = parseSQL("SELECT * FROM users WHERE age > 30");
    expect(result.where).toHaveLength(1);
    expect(result.where[0].column).toBe("age");
    expect(result.where[0].operator).toBe(">");
    expect(result.where[0].value).toBe(30);
  });

  it("parses ORDER BY clause", () => {
    const result = parseSQL("SELECT * FROM users ORDER BY age DESC");
    expect(result.orderBy).toHaveLength(1);
    expect(result.orderBy[0].column).toBe("age");
    expect(result.orderBy[0].direction).toBe("DESC");
  });

  it("parses LIMIT clause", () => {
    const result = parseSQL("SELECT * FROM users LIMIT 3");
    expect(result.limit).toBe(3);
  });

  it("parses aggregate functions", () => {
    const result = parseSQL("SELECT COUNT(*), AVG(age) FROM users");
    expect(result.aggregates).toHaveLength(2);
    expect(result.aggregates[0].func).toBe("COUNT");
    expect(result.aggregates[0].column).toBe("*");
    expect(result.aggregates[1].func).toBe("AVG");
    expect(result.aggregates[1].column).toBe("age");
  });

  it("parses GROUP BY clause", () => {
    const result = parseSQL("SELECT city, COUNT(*) FROM users GROUP BY city");
    expect(result.groupBy).toEqual(["city"]);
  });

  it("throws for non-SELECT statements", () => {
    expect(() => parseSQL("INSERT INTO users VALUES (1)")).toThrow(SQLError);
    expect(() => parseSQL("INSERT INTO users VALUES (1)")).toThrow("Only SELECT statements are supported");
  });

  it("throws for missing FROM clause", () => {
    expect(() => parseSQL("SELECT *")).toThrow("Missing FROM clause");
  });
});

describe("executeQuery", () => {
  it("executes SELECT * and returns all rows", () => {
    const parsed = parseSQL("SELECT * FROM users");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(5);
    expect(result.columns).toEqual(["name", "age", "city", "score"]);
  });

  it("executes SELECT with specific columns", () => {
    const parsed = parseSQL("SELECT name, city FROM users");
    const result = executeQuery(parsed, testDatasets);
    expect(result.columns).toEqual(["name", "city"]);
    expect(result.rows[0]).toHaveProperty("name");
    expect(result.rows[0]).toHaveProperty("city");
    expect(result.rows[0]).not.toHaveProperty("age");
  });

  it("filters rows with WHERE =", () => {
    const parsed = parseSQL("SELECT * FROM users WHERE city = 'NYC'");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(2);
    expect(result.rows.every((r) => r.city === "NYC")).toBe(true);
  });

  it("filters rows with WHERE > (numeric)", () => {
    const parsed = parseSQL("SELECT * FROM users WHERE age > 30");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(2);
    expect(result.rows.every((r) => Number(r.age) > 30)).toBe(true);
  });

  it("filters rows with WHERE !=", () => {
    const parsed = parseSQL("SELECT * FROM users WHERE city != 'NYC'");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(3);
  });

  it("filters rows with WHERE >=", () => {
    const parsed = parseSQL("SELECT * FROM users WHERE age >= 30");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(3);
  });

  it("filters rows with WHERE LIKE", () => {
    const parsed = parseSQL("SELECT * FROM users WHERE name LIKE 'A%'");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].name).toBe("Alice");
  });

  it("sorts rows with ORDER BY ASC", () => {
    const parsed = parseSQL("SELECT * FROM users ORDER BY age ASC");
    const result = executeQuery(parsed, testDatasets);
    const ages = result.rows.map((r) => Number(r.age));
    expect(ages).toEqual([25, 28, 30, 32, 35]);
  });

  it("sorts rows with ORDER BY DESC", () => {
    const parsed = parseSQL("SELECT * FROM users ORDER BY score DESC");
    const result = executeQuery(parsed, testDatasets);
    const scores = result.rows.map((r) => Number(r.score));
    expect(scores).toEqual([95, 91, 88, 82, 78]);
  });

  it("applies LIMIT", () => {
    const parsed = parseSQL("SELECT * FROM users LIMIT 2");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(2);
  });

  it("computes COUNT(*)", () => {
    const parsed = parseSQL("SELECT COUNT(*) FROM users");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rows[0]["COUNT(*)"]).toBe(5);
  });

  it("computes SUM, AVG, MIN, MAX", () => {
    const parsed = parseSQL("SELECT SUM(age), AVG(age), MIN(age), MAX(age) FROM users");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rows[0]["SUM(age)"]).toBe(150);
    expect(result.rows[0]["AVG(age)"]).toBe(30);
    expect(result.rows[0]["MIN(age)"]).toBe(25);
    expect(result.rows[0]["MAX(age)"]).toBe(35);
  });

  it("executes GROUP BY with COUNT", () => {
    const parsed = parseSQL("SELECT city, COUNT(*) FROM users GROUP BY city");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(3); // NYC, LA, Chicago
    const nycRow = result.rows.find((r) => r.city === "NYC");
    expect(nycRow).toBeDefined();
    expect(nycRow!["COUNT(*)"]).toBe(2);
  });

  it("executes GROUP BY with SUM", () => {
    const parsed = parseSQL("SELECT region, SUM(revenue) FROM sales GROUP BY region");
    const result = executeQuery(parsed, testDatasets);
    const eastRow = result.rows.find((r) => r.region === "East");
    const westRow = result.rows.find((r) => r.region === "West");
    expect(eastRow!["SUM(revenue)"]).toBe(4500);
    expect(westRow!["SUM(revenue)"]).toBe(3000);
  });

  it("throws for non-existent table", () => {
    const parsed = parseSQL("SELECT * FROM nonexistent");
    expect(() => executeQuery(parsed, testDatasets)).toThrow(SQLError);
    expect(() => executeQuery(parsed, testDatasets)).toThrow("Table 'nonexistent' not found");
  });

  it("throws for non-existent column in WHERE", () => {
    const parsed = parseSQL("SELECT * FROM users WHERE nonexistent > 5");
    expect(() => executeQuery(parsed, testDatasets)).toThrow(SQLError);
    expect(() => executeQuery(parsed, testDatasets)).toThrow("Column 'nonexistent' does not exist");
  });

  it("handles combined WHERE + ORDER BY + LIMIT", () => {
    const parsed = parseSQL("SELECT * FROM users WHERE age >= 28 ORDER BY score DESC LIMIT 2");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(2);
    expect(Number(result.rows[0].score)).toBeGreaterThanOrEqual(Number(result.rows[1].score));
    expect(result.rows.every((r) => Number(r.age) >= 28)).toBe(true);
  });

  it("returns executionTime as a number", () => {
    const parsed = parseSQL("SELECT * FROM users");
    const result = executeQuery(parsed, testDatasets);
    expect(typeof result.executionTime).toBe("number");
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it("handles WHERE with string equality using quotes", () => {
    const parsed = parseSQL("SELECT * FROM users WHERE name = 'Bob'");
    const result = executeQuery(parsed, testDatasets);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].name).toBe("Bob");
  });
});
