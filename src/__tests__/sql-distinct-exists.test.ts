import { describe, it, expect } from "vitest";
import { parseSQL, executeQuery } from "../lib/sql-engine";

const testDatasets = new Map<
  string,
  { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }
>();

testDatasets.set("sales_transactions", {
  headers: ["Transaction_ID", "Customer_ID", "Channel", "Country", "Segment", "Revenue"],
  columnTypes: {
    Transaction_ID: "string",
    Customer_ID: "string",
    Channel: "string",
    Country: "string",
    Segment: "string",
    Revenue: "number",
  },
  rows: [
    { Transaction_ID: "T-001", Customer_ID: "C-001", Channel: "Online", Country: "USA", Segment: "Enterprise", Revenue: "15000" },
    { Transaction_ID: "T-002", Customer_ID: "C-002", Channel: "Retail", Country: "Germany", Segment: "SMB", Revenue: "8000" },
    { Transaction_ID: "T-003", Customer_ID: "C-001", Channel: "Online", Country: "USA", Segment: "Enterprise", Revenue: "20000" },
    { Transaction_ID: "T-004", Customer_ID: "C-003", Channel: "Partner", Country: "UK", Segment: "Mid-Market", Revenue: "12000" },
    { Transaction_ID: "T-005", Customer_ID: "C-002", Channel: "Retail", Country: "Germany", Segment: "SMB", Revenue: "5000" },
    { Transaction_ID: "T-006", Customer_ID: "C-004", Channel: "Online", Country: "France", Segment: "Enterprise", Revenue: "25000" },
    { Transaction_ID: "T-007", Customer_ID: "C-005", Channel: "Partner", Country: "USA", Segment: "Mid-Market", Revenue: "3000" },
  ],
});

testDatasets.set("customers", {
  headers: ["Customer_ID", "Company_Name", "Country", "Segment"],
  columnTypes: {
    Customer_ID: "string",
    Company_Name: "string",
    Country: "string",
    Segment: "string",
  },
  rows: [
    { Customer_ID: "C-001", Company_Name: "Acme Corp", Country: "USA", Segment: "Enterprise" },
    { Customer_ID: "C-002", Company_Name: "TechVision", Country: "Germany", Segment: "SMB" },
    { Customer_ID: "C-003", Company_Name: "GlobalFin", Country: "UK", Segment: "Mid-Market" },
    { Customer_ID: "C-004", Company_Name: "MedTech", Country: "France", Segment: "Enterprise" },
    { Customer_ID: "C-005", Company_Name: "RetailMax", Country: "USA", Segment: "Mid-Market" },
  ],
});

describe("DISTINCT", () => {
  it("SELECT DISTINCT on a single column removes duplicates", () => {
    const parsed = parseSQL("SELECT DISTINCT Channel FROM sales_transactions");
    expect(parsed.distinct).toBe(true);
    const result = executeQuery(parsed, testDatasets);
    const channels = result.rows.map(r => r.Channel);
    // Should have 3 unique channels: Online, Retail, Partner
    expect(channels.length).toBe(3);
    expect(new Set(channels).size).toBe(3);
    expect(channels).toContain("Online");
    expect(channels).toContain("Retail");
    expect(channels).toContain("Partner");
  });

  it("SELECT DISTINCT on multiple columns removes duplicate combinations", () => {
    const parsed = parseSQL("SELECT DISTINCT Country, Segment FROM customers");
    expect(parsed.distinct).toBe(true);
    const result = executeQuery(parsed, testDatasets);
    // Verify all rows are unique combinations
    const keys = result.rows.map(r => `${r.Country}|||${r.Segment}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("SELECT without DISTINCT returns all rows including duplicates", () => {
    const parsed = parseSQL("SELECT Channel FROM sales_transactions");
    expect(parsed.distinct).toBe(false);
    const result = executeQuery(parsed, testDatasets);
    // Should have all 7 rows including duplicate channels
    expect(result.rows.length).toBe(7);
  });

  it("DISTINCT with WHERE filters correctly", () => {
    const parsed = parseSQL("SELECT DISTINCT Country FROM sales_transactions WHERE Revenue > 10000");
    const result = executeQuery(parsed, testDatasets);
    // Rows with Revenue > 10000: T-001 (USA, 15000), T-003 (USA, 20000), T-004 (UK, 12000), T-006 (France, 25000)
    // Distinct countries: USA, UK, France
    expect(result.rows.length).toBe(3);
  });
});

describe("EXISTS / NOT EXISTS", () => {
  it("EXISTS filters rows where subquery returns results", () => {
    const parsed = parseSQL(
      "SELECT * FROM customers c WHERE EXISTS (SELECT 1 FROM sales_transactions t WHERE t.Customer_ID = c.Customer_ID AND t.Revenue > 15000)"
    );
    expect(parsed.existsConditions.length).toBe(1);
    expect(parsed.existsConditions[0].negated).toBe(false);
    const result = executeQuery(parsed, testDatasets);
    // Customers with transactions > 15000: C-001 (has 20000), C-004 (has 25000)
    expect(result.rows.length).toBe(2);
    const ids = result.rows.map(r => r.Customer_ID);
    expect(ids).toContain("C-001");
    expect(ids).toContain("C-004");
  });

  it("NOT EXISTS filters rows where subquery returns no results", () => {
    const parsed = parseSQL(
      "SELECT * FROM customers c WHERE NOT EXISTS (SELECT 1 FROM sales_transactions t WHERE t.Customer_ID = c.Customer_ID)"
    );
    expect(parsed.existsConditions.length).toBe(1);
    expect(parsed.existsConditions[0].negated).toBe(true);
    const result = executeQuery(parsed, testDatasets);
    // C-001, C-002, C-003, C-004, C-005 all have transactions except...
    // All 5 customers have at least one transaction, so 0 results
    // Actually C-005 has T-007, so all have transactions
    expect(result.rows.length).toBe(0);
  });

  it("EXISTS with no matching subquery rows returns empty", () => {
    const parsed = parseSQL(
      "SELECT * FROM customers c WHERE EXISTS (SELECT 1 FROM sales_transactions t WHERE t.Customer_ID = c.Customer_ID AND t.Revenue > 100000)"
    );
    const result = executeQuery(parsed, testDatasets);
    // No transaction has Revenue > 100000
    expect(result.rows.length).toBe(0);
  });

  it("NOT EXISTS returns all rows when subquery never matches", () => {
    const parsed = parseSQL(
      "SELECT * FROM customers c WHERE NOT EXISTS (SELECT 1 FROM sales_transactions t WHERE t.Customer_ID = c.Customer_ID AND t.Revenue > 100000)"
    );
    const result = executeQuery(parsed, testDatasets);
    // No transaction has Revenue > 100000, so NOT EXISTS is true for all customers
    expect(result.rows.length).toBe(5);
  });
});
