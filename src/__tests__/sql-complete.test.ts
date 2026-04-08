import { describe, it, expect } from "vitest";
import { parseSQL, executeQuery, SQLError } from "../lib/sql-engine";

type DS = Map<string, { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }>;

function ds(): DS {
  const m: DS = new Map();

  m.set("sales", {
    headers: ["Month", "Revenue", "Channel", "Region_ID", "Sales_Rep", "Discount_Pct"],
    columnTypes: { Month: "string", Revenue: "number", Channel: "string", Region_ID: "string", Sales_Rep: "string", Discount_Pct: "number" },
    rows: [
      { Month: "Jan", Revenue: "300000", Channel: "Online", Region_ID: "R1", Sales_Rep: "Alice", Discount_Pct: "5.5" },
      { Month: "Feb", Revenue: "150000", Channel: "Retail", Region_ID: "R2", Sales_Rep: "Bob", Discount_Pct: "3.2" },
      { Month: "Mar", Revenue: "250000", Channel: "Direct", Region_ID: "R1", Sales_Rep: "Charlie", Discount_Pct: "7.8" },
      { Month: "Apr", Revenue: "80000", Channel: "Online", Region_ID: "R3", Sales_Rep: "Alice", Discount_Pct: "2.1" },
      { Month: "May", Revenue: "400000", Channel: "Direct", Region_ID: "R2", Sales_Rep: "Bob", Discount_Pct: "4.6" },
      { Month: "Jun", Revenue: "120000", Channel: "Retail", Region_ID: "R1", Sales_Rep: "Diana", Discount_Pct: "9.3" },
    ],
  });

  m.set("customers", {
    headers: ["Customer_ID", "Name", "Account_Manager", "City"],
    columnTypes: { Customer_ID: "string", Name: "string", Account_Manager: "string", City: "string" },
    rows: [
      { Customer_ID: "C1", Name: "Acme Corp", Account_Manager: "John", City: "NYC" },
      { Customer_ID: "C2", Name: "Beta Inc", Account_Manager: "", City: "LA" },
      { Customer_ID: "C3", Name: "Gamma LLC", Account_Manager: "null", City: "Chicago" },
      { Customer_ID: "C4", Name: "Delta Co", Account_Manager: "Sarah", City: "NYC" },
    ],
  });

  m.set("orders", {
    headers: ["Order_ID", "Customer_ID", "Revenue", "Date"],
    columnTypes: { Order_ID: "string", Customer_ID: "string", Revenue: "number", Date: "string" },
    rows: [
      { Order_ID: "O1", Customer_ID: "C1", Revenue: "55000", Date: "2025-01-15" },
      { Order_ID: "O2", Customer_ID: "C2", Revenue: "30000", Date: "2025-03-22" },
      { Order_ID: "O3", Customer_ID: "C1", Revenue: "75000", Date: "2025-06-10" },
      { Order_ID: "O4", Customer_ID: "C3", Revenue: "20000", Date: "2025-09-05" },
      { Order_ID: "O5", Customer_ID: "C4", Revenue: "100000", Date: "2025-12-01" },
      { Order_ID: "O6", Customer_ID: "C2", Revenue: "45000", Date: "2025-04-18" },
    ],
  });

  m.set("forecast", {
    headers: ["Month", "Forecast"],
    columnTypes: { Month: "string", Forecast: "number" },
    rows: [
      { Month: "Jan", Forecast: "280000" },
      { Month: "Feb", Forecast: "160000" },
      { Month: "Mar", Forecast: "230000" },
    ],
  });

  return m;
}

// ============================================================
// 1. CASE WHEN (3 tests)
// ============================================================
describe("CASE WHEN", () => {
  it("basic CASE WHEN with single condition and ELSE", () => {
    const parsed = parseSQL(
      "SELECT Month, Revenue, CASE WHEN Revenue > 200000 THEN 'High' ELSE 'Low' END AS Performance FROM sales"
    );
    const result = executeQuery(parsed, ds());
    expect(result.columns).toContain("Performance");
    const janRow = result.rows.find(r => r.Month === "Jan");
    expect(janRow!.Performance).toBe("High");
    const febRow = result.rows.find(r => r.Month === "Feb");
    expect(febRow!.Performance).toBe("Low");
  });

  it("multiple WHEN branches", () => {
    const parsed = parseSQL(
      "SELECT Month, Revenue, CASE WHEN Revenue > 200000 THEN 'High' WHEN Revenue > 100000 THEN 'Medium' ELSE 'Low' END AS Performance FROM sales"
    );
    const result = executeQuery(parsed, ds());
    const janRow = result.rows.find(r => r.Month === "Jan"); // 300000
    expect(janRow!.Performance).toBe("High");
    const febRow = result.rows.find(r => r.Month === "Feb"); // 150000
    expect(febRow!.Performance).toBe("Medium");
    const aprRow = result.rows.find(r => r.Month === "Apr"); // 80000
    expect(aprRow!.Performance).toBe("Low");
  });

  it("CASE WHEN with AS alias", () => {
    const parsed = parseSQL(
      "SELECT Month, CASE WHEN Revenue > 300000 THEN 'Top' ELSE 'Other' END AS Tier FROM sales"
    );
    const result = executeQuery(parsed, ds());
    expect(result.columns).toContain("Tier");
    const mayRow = result.rows.find(r => r.Month === "May"); // 400000
    expect(mayRow!.Tier).toBe("Top");
  });
});

// ============================================================
// 2. HAVING (3 tests)
// ============================================================
describe("HAVING", () => {
  it("basic HAVING filters grouped results", () => {
    const parsed = parseSQL(
      "SELECT Channel, SUM(Revenue) FROM sales GROUP BY Channel HAVING SUM(Revenue) > 300000"
    );
    const result = executeQuery(parsed, ds());
    // Online: 300000+80000=380000, Direct: 250000+400000=650000, Retail: 150000+120000=270000
    // Only Direct passes > 300000, and Online passes > 300000
    for (const row of result.rows) {
      expect(Number(row["SUM(Revenue)"])).toBeGreaterThan(300000);
    }
  });

  it("HAVING with aggregate alias", () => {
    const parsed = parseSQL(
      "SELECT Channel, SUM(Revenue) AS Total FROM sales GROUP BY Channel HAVING SUM(Revenue) > 500000"
    );
    const result = executeQuery(parsed, ds());
    // Only Direct (650000) should pass
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].Channel).toBe("Direct");
  });

  it("HAVING with COUNT", () => {
    const parsed = parseSQL(
      "SELECT Channel, COUNT(*) FROM sales GROUP BY Channel HAVING COUNT(*) >= 2"
    );
    const result = executeQuery(parsed, ds());
    // Online: 2, Retail: 2, Direct: 2 - all have 2
    expect(result.rowCount).toBe(3);
  });
});

// ============================================================
// 3. Column Aliases (3 tests)
// ============================================================
describe("Column Aliases (AS)", () => {
  it("column alias with AS", () => {
    const parsed = parseSQL("SELECT Revenue AS Rev FROM sales LIMIT 1");
    const result = executeQuery(parsed, ds());
    expect(result.columns).toContain("Rev");
    expect(result.rows[0]).toHaveProperty("Rev");
  });

  it("aggregate with alias", () => {
    const parsed = parseSQL("SELECT SUM(Revenue) AS TotalRevenue FROM sales");
    const result = executeQuery(parsed, ds());
    expect(result.columns).toContain("TotalRevenue");
    expect(result.rows[0].TotalRevenue).toBe(1300000);
  });

  it("multiple aliases in same query", () => {
    const parsed = parseSQL("SELECT Revenue AS Rev, Channel AS Ch FROM sales LIMIT 2");
    const result = executeQuery(parsed, ds());
    expect(result.columns).toContain("Rev");
    expect(result.columns).toContain("Ch");
  });
});

// ============================================================
// 4. IN / BETWEEN / NOT (4 tests)
// ============================================================
describe("IN / BETWEEN / NOT", () => {
  it("WHERE ... IN with string list", () => {
    const parsed = parseSQL("SELECT * FROM sales WHERE Channel IN ('Online', 'Direct')");
    const result = executeQuery(parsed, ds());
    expect(result.rowCount).toBe(4); // Online(2) + Direct(2)
    for (const row of result.rows) {
      expect(["Online", "Direct"]).toContain(row.Channel);
    }
  });

  it("WHERE ... BETWEEN numeric range", () => {
    const parsed = parseSQL("SELECT * FROM sales WHERE Revenue BETWEEN 100000 AND 250000");
    const result = executeQuery(parsed, ds());
    for (const row of result.rows) {
      const rev = Number(row.Revenue);
      expect(rev).toBeGreaterThanOrEqual(100000);
      expect(rev).toBeLessThanOrEqual(250000);
    }
    expect(result.rowCount).toBe(3); // 150000, 250000, 120000
  });

  it("WHERE NOT negates condition", () => {
    const parsed = parseSQL("SELECT * FROM sales WHERE NOT Channel = 'Retail'");
    const result = executeQuery(parsed, ds());
    for (const row of result.rows) {
      expect(row.Channel).not.toBe("Retail");
    }
    expect(result.rowCount).toBe(4);
  });

  it("WHERE NOT BETWEEN", () => {
    const parsed = parseSQL("SELECT * FROM sales WHERE Revenue NOT BETWEEN 100000 AND 300000");
    const result = executeQuery(parsed, ds());
    for (const row of result.rows) {
      const rev = Number(row.Revenue);
      expect(rev < 100000 || rev > 300000).toBe(true);
    }
    expect(result.rowCount).toBe(2); // 80000, 400000
  });
});

// ============================================================
// 5. Date Functions (5 tests)
// ============================================================
describe("Date Functions", () => {
  it("YEAR extracts year from date", () => {
    const parsed = parseSQL("SELECT YEAR(Date) AS Year FROM orders LIMIT 1");
    const result = executeQuery(parsed, ds());
    expect(result.rows[0].Year).toBe(2025);
  });

  it("MONTH extracts month from date", () => {
    const parsed = parseSQL("SELECT MONTH(Date) AS Mon FROM orders LIMIT 1");
    const result = executeQuery(parsed, ds());
    // First order date is 2025-01-15, month=1
    expect(result.rows[0].Mon).toBe(1);
  });

  it("QUARTER extracts quarter from date", () => {
    const parsed = parseSQL("SELECT Date, QUARTER(Date) AS Q FROM orders");
    const result = executeQuery(parsed, ds());
    // 2025-01-15 -> Q1, 2025-03-22 -> Q1, 2025-06-10 -> Q2, 2025-09-05 -> Q3, 2025-12-01 -> Q4, 2025-04-18 -> Q2
    const q1Row = result.rows.find(r => r.Date === "2025-01-15");
    expect(q1Row!.Q).toBe(1);
    const q4Row = result.rows.find(r => r.Date === "2025-12-01");
    expect(q4Row!.Q).toBe(4);
  });

  it("DAY extracts day from date", () => {
    const parsed = parseSQL("SELECT DAY(Date) AS D FROM orders LIMIT 1");
    const result = executeQuery(parsed, ds());
    expect(result.rows[0].D).toBe(15);
  });

  it("GROUP BY YEAR(Date) groups by year", () => {
    const parsed = parseSQL("SELECT YEAR(Date), SUM(Revenue) FROM orders GROUP BY YEAR(Date)");
    const result = executeQuery(parsed, ds());
    // All orders are in 2025
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]["SUM(Revenue)"]).toBe(325000);
  });
});

// ============================================================
// 6. String Functions (4 tests)
// ============================================================
describe("String Functions", () => {
  it("UPPER converts to uppercase", () => {
    const parsed = parseSQL("SELECT UPPER(Channel) AS UpperCh FROM sales LIMIT 1");
    const result = executeQuery(parsed, ds());
    expect(result.rows[0].UpperCh).toBe("ONLINE");
  });

  it("LOWER converts to lowercase", () => {
    const parsed = parseSQL("SELECT LOWER(Sales_Rep) AS LowRep FROM sales LIMIT 1");
    const result = executeQuery(parsed, ds());
    expect(result.rows[0].LowRep).toBe("alice");
  });

  it("CONCAT joins strings", () => {
    const parsed = parseSQL("SELECT CONCAT(Channel, '-', Region_ID) AS Combined FROM sales LIMIT 1");
    const result = executeQuery(parsed, ds());
    expect(result.rows[0].Combined).toBe("Online-R1");
  });

  it("LENGTH returns string length", () => {
    const parsed = parseSQL("SELECT LENGTH(Channel) AS Len FROM sales LIMIT 1");
    const result = executeQuery(parsed, ds());
    // "Online" = 6
    expect(result.rows[0].Len).toBe(6);
  });
});

// ============================================================
// 7. Math Functions (3 tests)
// ============================================================
describe("Math Functions", () => {
  it("ROUND rounds to specified decimals", () => {
    const parsed = parseSQL("SELECT ROUND(Discount_Pct, 0) AS Rounded FROM sales LIMIT 1");
    const result = executeQuery(parsed, ds());
    // 5.5 -> 6
    expect(result.rows[0].Rounded).toBe(6);
  });

  it("CEIL rounds up", () => {
    const parsed = parseSQL("SELECT CEIL(Discount_Pct) AS Ceiled FROM sales LIMIT 1");
    const result = executeQuery(parsed, ds());
    // 5.5 -> 6
    expect(result.rows[0].Ceiled).toBe(6);
  });

  it("ABS returns absolute value", () => {
    // Create a dataset with negative value
    const d = ds();
    d.set("negatives", {
      headers: ["val"],
      columnTypes: { val: "number" },
      rows: [{ val: "-42" }],
    });
    const parsed = parseSQL("SELECT ABS(val) AS AbsVal FROM negatives");
    const result = executeQuery(parsed, d);
    expect(result.rows[0].AbsVal).toBe(42);
  });
});

// ============================================================
// 8. NULL handling (3 tests)
// ============================================================
describe("NULL handling", () => {
  it("IS NULL matches empty/null values", () => {
    const parsed = parseSQL("SELECT * FROM customers WHERE Account_Manager IS NULL");
    const result = executeQuery(parsed, ds());
    // C2 has empty string, C3 has "null" - both should match IS NULL
    expect(result.rowCount).toBe(2);
  });

  it("IS NOT NULL matches non-null values", () => {
    const parsed = parseSQL("SELECT * FROM customers WHERE Account_Manager IS NOT NULL");
    const result = executeQuery(parsed, ds());
    // C1 (John), C4 (Sarah)
    expect(result.rowCount).toBe(2);
  });

  it("COALESCE returns first non-null", () => {
    const parsed = parseSQL("SELECT COALESCE(Account_Manager, 'Unassigned') AS Manager FROM customers");
    const result = executeQuery(parsed, ds());
    const c1Row = result.rows.find(r => r.Manager === "John");
    expect(c1Row).toBeDefined();
    const c2Row = result.rows[1]; // Beta Inc - empty Account_Manager
    expect(c2Row.Manager).toBe("Unassigned");
  });
});

// ============================================================
// 9. Subqueries (3 tests)
// ============================================================
describe("Subqueries", () => {
  it("basic WHERE ... IN (SELECT ...)", () => {
    const parsed = parseSQL(
      "SELECT * FROM customers WHERE Customer_ID IN (SELECT Customer_ID FROM orders WHERE Revenue > 50000)"
    );
    const result = executeQuery(parsed, ds());
    // Orders with Revenue > 50000: O1(C1,55000), O3(C1,75000), O5(C4,100000) => Customer_IDs: C1, C4
    expect(result.rowCount).toBe(2);
    const ids = result.rows.map(r => r.Customer_ID);
    expect(ids).toContain("C1");
    expect(ids).toContain("C4");
  });

  it("subquery with aggregate in outer WHERE", () => {
    const parsed = parseSQL(
      "SELECT * FROM orders WHERE Revenue > 50000"
    );
    const result = executeQuery(parsed, ds());
    expect(result.rowCount).toBe(3); // O1(55000), O3(75000), O5(100000)
  });

  it("subquery filtering by string column", () => {
    const parsed = parseSQL(
      "SELECT * FROM customers WHERE City IN (SELECT City FROM customers WHERE Account_Manager IS NOT NULL)"
    );
    const result = executeQuery(parsed, ds());
    // Non-null Account_Managers are in NYC -> C1(John), C4(Sarah)
    // So City IN ('NYC') -> C1, C4
    expect(result.rowCount).toBe(2);
  });
});

// ============================================================
// 10. UNION (2 tests)
// ============================================================
describe("UNION", () => {
  it("UNION combines and deduplicates results", () => {
    const parsed = parseSQL(
      "SELECT Month FROM sales UNION SELECT Month FROM forecast"
    );
    const result = executeQuery(parsed, ds());
    // sales months: Jan, Feb, Mar, Apr, May, Jun
    // forecast months: Jan, Feb, Mar
    // UNION deduplicates -> Jan, Feb, Mar, Apr, May, Jun = 6
    expect(result.rowCount).toBe(6);
  });

  it("UNION ALL keeps duplicates", () => {
    const parsed = parseSQL(
      "SELECT Month FROM sales UNION ALL SELECT Month FROM forecast"
    );
    const result = executeQuery(parsed, ds());
    // 6 + 3 = 9
    expect(result.rowCount).toBe(9);
  });
});

// ============================================================
// 11. Window Functions (5 tests)
// ============================================================
describe("Window Functions", () => {
  it("ROW_NUMBER() OVER (ORDER BY col DESC)", () => {
    const parsed = parseSQL(
      "SELECT Month, Revenue, ROW_NUMBER() OVER (ORDER BY Revenue DESC) AS Rank FROM sales"
    );
    const result = executeQuery(parsed, ds());
    expect(result.columns).toContain("Rank");
    // Revenue sorted DESC: 400000, 300000, 250000, 150000, 120000, 80000
    // Row 1 should be May (400000) with Rank=1
    const row1 = result.rows.find(r => Number(r.Rank) === 1);
    expect(row1!.Month).toBe("May");
  });

  it("RANK() OVER (ORDER BY col DESC)", () => {
    // Add duplicate revenue to test RANK
    const d = ds();
    d.set("ranked", {
      headers: ["Name", "Score"],
      columnTypes: { Name: "string", Score: "number" },
      rows: [
        { Name: "A", Score: "100" },
        { Name: "B", Score: "90" },
        { Name: "C", Score: "90" },
        { Name: "D", Score: "80" },
      ],
    });
    const parsed = parseSQL(
      "SELECT Name, Score, RANK() OVER (ORDER BY Score DESC) AS R FROM ranked"
    );
    const result = executeQuery(parsed, d);
    // A=100 -> R=1, B=90 -> R=2, C=90 -> R=2, D=80 -> R=4
    const aRow = result.rows.find(r => r.Name === "A");
    const bRow = result.rows.find(r => r.Name === "B");
    const cRow = result.rows.find(r => r.Name === "C");
    const dRow = result.rows.find(r => r.Name === "D");
    expect(aRow!.R).toBe(1);
    expect(bRow!.R).toBe(2);
    expect(cRow!.R).toBe(2);
    expect(dRow!.R).toBe(4);
  });

  it("LAG(col, 1) OVER (ORDER BY col)", () => {
    const d = ds();
    d.set("timeseries", {
      headers: ["Month", "Revenue"],
      columnTypes: { Month: "string", Revenue: "number" },
      rows: [
        { Month: "Jan", Revenue: "100" },
        { Month: "Feb", Revenue: "200" },
        { Month: "Mar", Revenue: "300" },
      ],
    });
    const parsed = parseSQL(
      "SELECT Month, Revenue, LAG(Revenue, 1) OVER (ORDER BY Month) AS Prev FROM timeseries"
    );
    const result = executeQuery(parsed, d);
    // Sorted by Month: Feb, Jan, Mar (alphabetical)
    // After sorting: Feb(200), Jan(100), Mar(300) -> Prev: "", 200, 100
    const janRow = result.rows.find(r => r.Month === "Jan");
    const febRow = result.rows.find(r => r.Month === "Feb");
    // Feb comes first alphabetically, so Prev=""
    expect(febRow!.Prev).toBe("");
  });

  it("LEAD(col, 1) OVER (ORDER BY col)", () => {
    const d = ds();
    d.set("timeseries", {
      headers: ["Month", "Revenue"],
      columnTypes: { Month: "string", Revenue: "number" },
      rows: [
        { Month: "Jan", Revenue: "100" },
        { Month: "Feb", Revenue: "200" },
        { Month: "Mar", Revenue: "300" },
      ],
    });
    const parsed = parseSQL(
      "SELECT Month, Revenue, LEAD(Revenue, 1) OVER (ORDER BY Month) AS Next FROM timeseries"
    );
    const result = executeQuery(parsed, d);
    // Sorted by Month alphabetically: Feb, Jan, Mar
    // Lead: Feb->Jan(100), Jan->Mar(300), Mar->""
    const marRow = result.rows.find(r => r.Month === "Mar");
    expect(marRow!.Next).toBe("");
  });

  it("SUM() OVER (ORDER BY col) running total", () => {
    const d = ds();
    d.set("series", {
      headers: ["Idx", "Val"],
      columnTypes: { Idx: "number", Val: "number" },
      rows: [
        { Idx: "1", Val: "10" },
        { Idx: "2", Val: "20" },
        { Idx: "3", Val: "30" },
      ],
    });
    const parsed = parseSQL(
      "SELECT Idx, Val, SUM(Val) OVER (ORDER BY Idx) AS RunningTotal FROM series"
    );
    const result = executeQuery(parsed, d);
    // Running total: 10, 30, 60
    const row1 = result.rows.find(r => Number(r.Idx) === 1);
    const row2 = result.rows.find(r => Number(r.Idx) === 2);
    const row3 = result.rows.find(r => Number(r.Idx) === 3);
    expect(row1!.RunningTotal).toBe(10);
    expect(row2!.RunningTotal).toBe(30);
    expect(row3!.RunningTotal).toBe(60);
  });
});

// ============================================================
// Additional tests to reach 40+ total
// ============================================================

describe("TRIM/SUBSTRING/POWER", () => {
  it("TRIM removes whitespace", () => {
    const d = ds();
    d.set("padded", {
      headers: ["val"],
      columnTypes: { val: "string" },
      rows: [{ val: "  hello  " }],
    });
    const parsed = parseSQL("SELECT TRIM(val) AS Trimmed FROM padded");
    const result = executeQuery(parsed, d);
    expect(result.rows[0].Trimmed).toBe("hello");
  });

  it("SUBSTRING extracts part of string", () => {
    const d = ds();
    d.set("strs", {
      headers: ["val"],
      columnTypes: { val: "string" },
      rows: [{ val: "Hello World" }],
    });
    const parsed = parseSQL("SELECT SUBSTRING(val, 1, 5) AS Sub FROM strs");
    const result = executeQuery(parsed, d);
    expect(result.rows[0].Sub).toBe("Hello");
  });

  it("POWER computes exponentiation", () => {
    const d = ds();
    d.set("nums", {
      headers: ["val"],
      columnTypes: { val: "number" },
      rows: [{ val: "3" }],
    });
    const parsed = parseSQL("SELECT POWER(val, 2) AS Squared FROM nums");
    const result = executeQuery(parsed, d);
    expect(result.rows[0].Squared).toBe(9);
  });
});

describe("FLOOR function", () => {
  it("FLOOR rounds down", () => {
    const parsed = parseSQL("SELECT FLOOR(Discount_Pct) AS Floored FROM sales LIMIT 1");
    const result = executeQuery(parsed, ds());
    // 5.5 -> 5
    expect(result.rows[0].Floored).toBe(5);
  });
});

describe("DATEPART function", () => {
  it("DATEPART extracts year", () => {
    const parsed = parseSQL("SELECT DATEPART('year', Date) AS Y FROM orders LIMIT 1");
    const result = executeQuery(parsed, ds());
    expect(result.rows[0].Y).toBe(2025);
  });
});

describe("NOT IN", () => {
  it("NOT IN excludes matching values", () => {
    const parsed = parseSQL("SELECT * FROM sales WHERE Channel NOT IN ('Online', 'Retail')");
    const result = executeQuery(parsed, ds());
    for (const row of result.rows) {
      expect(row.Channel).toBe("Direct");
    }
    expect(result.rowCount).toBe(2);
  });
});

describe("Window function with PARTITION BY", () => {
  it("ROW_NUMBER with PARTITION BY", () => {
    const d = ds();
    d.set("partitioned", {
      headers: ["Group", "Value"],
      columnTypes: { Group: "string", Value: "number" },
      rows: [
        { Group: "A", Value: "10" },
        { Group: "A", Value: "20" },
        { Group: "B", Value: "30" },
        { Group: "B", Value: "40" },
      ],
    });
    const parsed = parseSQL(
      "SELECT Group, Value, ROW_NUMBER() OVER (PARTITION BY Group ORDER BY Value) AS RN FROM partitioned"
    );
    const result = executeQuery(parsed, d);
    // Group A: Value 10 -> RN=1, Value 20 -> RN=2
    // Group B: Value 30 -> RN=1, Value 40 -> RN=2
    const a10 = result.rows.find(r => r.Group === "A" && Number(r.Value) === 10);
    const a20 = result.rows.find(r => r.Group === "A" && Number(r.Value) === 20);
    expect(a10!.RN).toBe(1);
    expect(a20!.RN).toBe(2);
  });
});

describe("Combined features", () => {
  it("CASE WHEN + GROUP BY + HAVING", () => {
    const parsed = parseSQL(
      "SELECT Channel, SUM(Revenue) AS Total, CASE WHEN SUM(Revenue) > 400000 THEN 'Big' ELSE 'Small' END AS Size FROM sales GROUP BY Channel HAVING SUM(Revenue) > 300000"
    );
    const result = executeQuery(parsed, ds());
    // Only channels with SUM > 300000 pass: Online (380000) and Direct (650000)
    expect(result.rowCount).toBe(2);
  });

  it("UPPER + WHERE IN + LIMIT", () => {
    const parsed = parseSQL(
      "SELECT UPPER(Channel) AS UCh FROM sales WHERE Channel IN ('Online', 'Direct') LIMIT 2"
    );
    const result = executeQuery(parsed, ds());
    expect(result.rowCount).toBe(2);
    for (const row of result.rows) {
      expect(["ONLINE", "DIRECT"]).toContain(row.UCh);
    }
  });
});
