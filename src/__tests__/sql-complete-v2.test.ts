import { describe, it, expect } from "vitest";
import { parseSQL, executeQuery, SQLError } from "../lib/sql-engine";

type DS = Map<string, { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }>;

function ds(): DS {
  const m: DS = new Map();

  m.set("sales_transactions", {
    headers: ["Transaction_ID", "Product_ID", "Customer_ID", "Revenue", "Channel", "Date"],
    columnTypes: { Transaction_ID: "string", Product_ID: "string", Customer_ID: "string", Revenue: "number", Channel: "string", Date: "string" },
    rows: [
      { Transaction_ID: "T1", Product_ID: "P1", Customer_ID: "C1", Revenue: "50000", Channel: "Online", Date: "2025-01-15" },
      { Transaction_ID: "T2", Product_ID: "P2", Customer_ID: "C2", Revenue: "30000", Channel: "Retail", Date: "2025-02-20" },
      { Transaction_ID: "T3", Product_ID: "P1", Customer_ID: "C3", Revenue: "75000", Channel: "Online", Date: "2025-03-10" },
      { Transaction_ID: "T4", Product_ID: "P3", Customer_ID: "C1", Revenue: "20000", Channel: "Direct", Date: "2025-04-05" },
      { Transaction_ID: "T5", Product_ID: "P2", Customer_ID: "C4", Revenue: "100000", Channel: "Online", Date: "2025-06-18" },
      { Transaction_ID: "T6", Product_ID: "P4", Customer_ID: "C2", Revenue: "45000", Channel: "Retail", Date: "2025-07-22" },
    ],
  });

  m.set("products", {
    headers: ["Product_ID", "Product_Name", "Category"],
    columnTypes: { Product_ID: "string", Product_Name: "string", Category: "string" },
    rows: [
      { Product_ID: "P1", Product_Name: "Widget Alpha", Category: "Hardware" },
      { Product_ID: "P2", Product_Name: "Service Beta", Category: "Services" },
      { Product_ID: "P3", Product_Name: "Software Gamma", Category: "Software" },
      { Product_ID: "P4", Product_Name: "Device Delta", Category: "Hardware" },
      { Product_ID: "P5", Product_Name: "Plan Epsilon", Category: "Support" },
    ],
  });

  m.set("customers", {
    headers: ["Customer_ID", "Company_Name", "Country", "Segment"],
    columnTypes: { Customer_ID: "string", Company_Name: "string", Country: "string", Segment: "string" },
    rows: [
      { Customer_ID: "C1", Company_Name: "Acme Corp", Country: "USA", Segment: "Enterprise" },
      { Customer_ID: "C2", Company_Name: "Beta Inc", Country: "Germany", Segment: "Mid-Market" },
      { Customer_ID: "C3", Company_Name: "Gamma LLC", Country: "USA", Segment: "SMB" },
      { Customer_ID: "C4", Company_Name: "Delta Co", Country: "UK", Segment: "Enterprise" },
      { Customer_ID: "C5", Company_Name: "Epsilon Ltd", Country: "France", Segment: "SMB" },
    ],
  });

  m.set("regions", {
    headers: ["Country", "Region"],
    columnTypes: { Country: "string", Region: "string" },
    rows: [
      { Country: "USA", Region: "Americas" },
      { Country: "Germany", Region: "EMEA" },
      { Country: "UK", Region: "EMEA" },
      { Country: "France", Region: "EMEA" },
    ],
  });

  return m;
}

// ============================================================
// 1. Multiple JOINs (3+ tables)
// ============================================================
describe("Multiple JOINs (3-table join)", () => {
  it("joins sales_transactions -> products -> customers", () => {
    const parsed = parseSQL(
      "SELECT t.Revenue, p.Product_Name, c.Company_Name FROM sales_transactions t JOIN products p ON t.Product_ID = p.Product_ID JOIN customers c ON t.Customer_ID = c.Customer_ID LIMIT 10"
    );
    expect(parsed.joins.length).toBe(2);
    const result = executeQuery(parsed, ds());
    // All 6 transactions should match (all have valid Product_ID and Customer_ID)
    expect(result.rowCount).toBe(6);
    expect(result.columns).toContain("t.Revenue");
    expect(result.columns).toContain("p.Product_Name");
    expect(result.columns).toContain("c.Company_Name");
    // T1: P1->Widget Alpha, C1->Acme Corp, Revenue 50000
    const row1 = result.rows.find(r => r["t.Revenue"] === "50000" || Number(r["t.Revenue"]) === 50000);
    expect(row1).toBeDefined();
    expect(row1!["p.Product_Name"]).toBe("Widget Alpha");
    expect(row1!["c.Company_Name"]).toBe("Acme Corp");
  });

  it("3-table join with WHERE clause", () => {
    const parsed = parseSQL(
      "SELECT t.Revenue, p.Product_Name, c.Company_Name FROM sales_transactions t JOIN products p ON t.Product_ID = p.Product_ID JOIN customers c ON t.Customer_ID = c.Customer_ID WHERE t.Revenue > 40000"
    );
    const result = executeQuery(parsed, ds());
    for (const row of result.rows) {
      expect(Number(row["t.Revenue"])).toBeGreaterThan(40000);
    }
    expect(result.rowCount).toBeGreaterThan(0);
  });

  it("parseSQL detects multiple JOIN clauses", () => {
    const parsed = parseSQL(
      "SELECT * FROM sales_transactions t JOIN products p ON t.Product_ID = p.Product_ID JOIN customers c ON t.Customer_ID = c.Customer_ID"
    );
    expect(parsed.joins).toHaveLength(2);
    expect(parsed.joins[0].joinTable).toBe("products");
    expect(parsed.joins[1].joinTable).toBe("customers");
  });
});

// ============================================================
// 2. RIGHT JOIN
// ============================================================
describe("RIGHT JOIN", () => {
  it("includes all rows from right table", () => {
    // products has P5 (Plan Epsilon) that has no matching transaction
    const parsed = parseSQL(
      "SELECT t.Revenue, p.Product_Name FROM sales_transactions t RIGHT JOIN products p ON t.Product_ID = p.Product_ID"
    );
    expect(parsed.joins[0].joinType).toBe("RIGHT");
    const result = executeQuery(parsed, ds());
    // P5 has no matching transaction, but should still appear
    const p5Row = result.rows.find(r => r["p.Product_Name"] === "Plan Epsilon");
    expect(p5Row).toBeDefined();
    expect(p5Row!["t.Revenue"]).toBe("");
  });

  it("RIGHT JOIN preserves all right rows even when no match", () => {
    const parsed = parseSQL(
      "SELECT t.Transaction_ID, p.Product_ID, p.Product_Name FROM sales_transactions t RIGHT JOIN products p ON t.Product_ID = p.Product_ID"
    );
    const result = executeQuery(parsed, ds());
    // Products: P1(2 transactions), P2(2), P3(1), P4(1), P5(0) = 6 matched + 1 unmatched = 7
    const productIds = result.rows.map(r => r["p.Product_ID"]);
    expect(productIds).toContain("P5");
  });
});

// ============================================================
// 3. FULL OUTER JOIN
// ============================================================
describe("FULL OUTER JOIN", () => {
  it("includes all rows from both tables", () => {
    // customers C5 has no transaction, products P5 has no transaction
    const parsed = parseSQL(
      "SELECT t.Transaction_ID, c.Company_Name FROM sales_transactions t FULL OUTER JOIN customers c ON t.Customer_ID = c.Customer_ID"
    );
    expect(parsed.joins[0].joinType).toBe("FULL");
    const result = executeQuery(parsed, ds());
    // All transactions match, plus C5 (Epsilon Ltd) has no matching transaction
    const c5Row = result.rows.find(r => r["c.Company_Name"] === "Epsilon Ltd");
    expect(c5Row).toBeDefined();
    expect(c5Row!["t.Transaction_ID"]).toBe("");
  });

  it("FULL OUTER JOIN includes unmatched from both sides", () => {
    const d = ds();
    d.set("left_only", {
      headers: ["id", "lval"],
      columnTypes: { id: "string", lval: "string" },
      rows: [
        { id: "1", lval: "A" },
        { id: "2", lval: "B" },
        { id: "99", lval: "X" },
      ],
    });
    d.set("right_only", {
      headers: ["id", "rval"],
      columnTypes: { id: "string", rval: "string" },
      rows: [
        { id: "1", rval: "C" },
        { id: "2", rval: "D" },
        { id: "88", rval: "Y" },
      ],
    });
    const parsed = parseSQL(
      "SELECT l.lval, r.rval FROM left_only l FULL OUTER JOIN right_only r ON l.id = r.id"
    );
    const result = executeQuery(parsed, d);
    // Matched: id=1, id=2, Unmatched left: id=99, Unmatched right: id=88 => 4 rows
    expect(result.rowCount).toBe(4);
    const unmatchedLeft = result.rows.find(r => r["l.lval"] === "X");
    expect(unmatchedLeft).toBeDefined();
    expect(unmatchedLeft!["r.rval"]).toBe("");
    const unmatchedRight = result.rows.find(r => r["r.rval"] === "Y");
    expect(unmatchedRight).toBeDefined();
    expect(unmatchedRight!["l.lval"]).toBe("");
  });
});

// ============================================================
// 4. ORDER BY alias
// ============================================================
describe("ORDER BY alias", () => {
  it("orders grouped results by aggregate alias DESC", () => {
    const parsed = parseSQL(
      "SELECT Channel, SUM(Revenue) AS Total FROM sales_transactions GROUP BY Channel ORDER BY Total DESC"
    );
    const result = executeQuery(parsed, ds());
    expect(result.rowCount).toBeGreaterThan(1);
    const totals = result.rows.map(r => Number(r.Total));
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i - 1]).toBeGreaterThanOrEqual(totals[i]);
    }
  });

  it("ORDER BY column alias ASC", () => {
    const parsed = parseSQL(
      "SELECT Channel, SUM(Revenue) AS Total FROM sales_transactions GROUP BY Channel ORDER BY Total ASC"
    );
    const result = executeQuery(parsed, ds());
    const totals = result.rows.map(r => Number(r.Total));
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i - 1]).toBeLessThanOrEqual(totals[i]);
    }
  });
});

// ============================================================
// 5. GROUP BY with YEAR/MONTH
// ============================================================
describe("GROUP BY with date expressions", () => {
  it("GROUP BY YEAR(Date)", () => {
    const parsed = parseSQL(
      "SELECT YEAR(Date) AS Y, SUM(Revenue) FROM sales_transactions GROUP BY YEAR(Date)"
    );
    const result = executeQuery(parsed, ds());
    // All dates are 2025
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].Y).toBe(2025);
    expect(result.rows[0]["SUM(Revenue)"]).toBe(320000);
  });

  it("GROUP BY YEAR(Date), MONTH(Date)", () => {
    const parsed = parseSQL(
      "SELECT YEAR(Date) AS Y, MONTH(Date) AS M, SUM(Revenue) FROM sales_transactions GROUP BY YEAR(Date), MONTH(Date)"
    );
    const result = executeQuery(parsed, ds());
    // Months: Jan(50000), Feb(30000), Mar(75000), Apr(20000), Jun(100000), Jul(45000) = 6 groups
    expect(result.rowCount).toBe(6);
    const janRow = result.rows.find(r => Number(r.M) === 1);
    expect(janRow).toBeDefined();
    expect(janRow!["SUM(Revenue)"]).toBe(50000);
  });

  it("GROUP BY MONTH(Date) with ORDER BY", () => {
    const parsed = parseSQL(
      "SELECT MONTH(Date) AS M, SUM(Revenue) AS Total FROM sales_transactions GROUP BY MONTH(Date) ORDER BY Total DESC"
    );
    const result = executeQuery(parsed, ds());
    const totals = result.rows.map(r => Number(r.Total));
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i - 1]).toBeGreaterThanOrEqual(totals[i]);
    }
  });
});

// ============================================================
// 6. Combined: JOIN + CASE WHEN + HAVING
// ============================================================
describe("Combined features", () => {
  it("JOIN + GROUP BY + HAVING", () => {
    const parsed = parseSQL(
      "SELECT p.Category, SUM(t.Revenue) AS Total FROM sales_transactions t JOIN products p ON t.Product_ID = p.Product_ID GROUP BY p.Category HAVING SUM(t.Revenue) > 50000"
    );
    const result = executeQuery(parsed, ds());
    for (const row of result.rows) {
      expect(Number(row.Total)).toBeGreaterThan(50000);
    }
    expect(result.rowCount).toBeGreaterThan(0);
  });

  it("JOIN with CASE WHEN", () => {
    const parsed = parseSQL(
      "SELECT t.Revenue, CASE WHEN t.Revenue > 50000 THEN 'High' ELSE 'Low' END AS Tier, p.Product_Name FROM sales_transactions t JOIN products p ON t.Product_ID = p.Product_ID"
    );
    const result = executeQuery(parsed, ds());
    expect(result.columns).toContain("Tier");
    const highRow = result.rows.find(r => Number(r["t.Revenue"]) === 75000);
    expect(highRow).toBeDefined();
    expect(highRow!.Tier).toBe("High");
    const lowRow = result.rows.find(r => Number(r["t.Revenue"]) === 20000);
    expect(lowRow).toBeDefined();
    expect(lowRow!.Tier).toBe("Low");
  });

  it("RIGHT JOIN parse type detection", () => {
    const parsed = parseSQL(
      "SELECT * FROM sales_transactions t RIGHT JOIN products p ON t.Product_ID = p.Product_ID"
    );
    expect(parsed.joins[0].joinType).toBe("RIGHT");
  });

  it("FULL OUTER JOIN parse type detection", () => {
    const parsed = parseSQL(
      "SELECT * FROM sales_transactions t FULL OUTER JOIN customers c ON t.Customer_ID = c.Customer_ID"
    );
    expect(parsed.joins[0].joinType).toBe("FULL");
  });
});
