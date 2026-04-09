import { describe, it, expect, beforeAll } from "vitest";
import initSqlJs, { Database } from "sql.js";

let db: Database;

function createTestDB(database: Database) {
  // Create sales table
  database.run(`CREATE TABLE sales (
    "Month" TEXT,
    "Revenue" REAL,
    "Channel" TEXT,
    "Region_ID" TEXT,
    "Sales_Rep" TEXT,
    "Discount_Pct" REAL
  )`);

  const salesData = [
    ["Jan", 300000, "Online", "R1", "Alice", 5.5],
    ["Feb", 150000, "Retail", "R2", "Bob", 3.2],
    ["Mar", 250000, "Direct", "R1", "Charlie", 7.8],
    ["Apr", 80000, "Online", "R3", "Alice", 2.1],
    ["May", 400000, "Direct", "R2", "Bob", 4.6],
    ["Jun", 120000, "Retail", "R1", "Diana", 9.3],
  ];

  const stmt = database.prepare("INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?)");
  for (const row of salesData) {
    stmt.bind(row as (string | number)[]);
    stmt.step();
    stmt.reset();
  }
  stmt.free();

  // Create customers table
  database.run(`CREATE TABLE customers (
    "Customer_ID" TEXT,
    "Name" TEXT,
    "Account_Manager" TEXT,
    "City" TEXT
  )`);

  const customersData = [
    ["C1", "Acme Corp", "John", "NYC"],
    ["C2", "Beta Inc", null, "LA"],
    ["C3", "Gamma LLC", null, "Chicago"],
    ["C4", "Delta Co", "Sarah", "NYC"],
  ];

  const cstmt = database.prepare("INSERT INTO customers VALUES (?, ?, ?, ?)");
  for (const row of customersData) {
    cstmt.bind(row as (string | number | null)[]);
    cstmt.step();
    cstmt.reset();
  }
  cstmt.free();

  // Create orders table
  database.run(`CREATE TABLE orders (
    "Order_ID" TEXT,
    "Customer_ID" TEXT,
    "Revenue" REAL,
    "Date" TEXT
  )`);

  const ordersData = [
    ["O1", "C1", 55000, "2025-01-15"],
    ["O2", "C2", 30000, "2025-03-22"],
    ["O3", "C1", 75000, "2025-06-10"],
    ["O4", "C3", 20000, "2025-09-05"],
    ["O5", "C4", 100000, "2025-12-01"],
    ["O6", "C2", 45000, "2025-04-18"],
  ];

  const ostmt = database.prepare("INSERT INTO orders VALUES (?, ?, ?, ?)");
  for (const row of ordersData) {
    ostmt.bind(row as (string | number)[]);
    ostmt.step();
    ostmt.reset();
  }
  ostmt.free();

  // Create a table with a hyphenated name (via view) to test quoting
  database.run(`CREATE TABLE sales_q1_2026 (
    "Month" TEXT,
    "Revenue" REAL
  )`);
  database.run(`INSERT INTO sales_q1_2026 VALUES ('Jan', 100000)`);
  database.run(`INSERT INTO sales_q1_2026 VALUES ('Feb', 200000)`);
  database.run(`INSERT INTO sales_q1_2026 VALUES ('Mar', 300000)`);
  database.run(`CREATE VIEW "sales-q1-2026" AS SELECT * FROM sales_q1_2026`);
}

function execQuery(sql: string) {
  const result = db.exec(sql);
  if (result.length === 0) return { columns: [], rows: [] };
  const columns = result[0].columns;
  const rows = result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
  return { columns, rows };
}

beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  createTestDB(db);
});

// ── Test 1: Create a table and SELECT * ──
describe("SQLite Engine", () => {
  it("can SELECT * from a table", () => {
    const { columns, rows } = execQuery("SELECT * FROM sales");
    expect(columns).toContain("Month");
    expect(columns).toContain("Revenue");
    expect(rows.length).toBe(6);
  });

  // ── Test 2: WHERE with date functions ──
  it("can use strftime for date filtering", () => {
    const { rows } = execQuery(
      "SELECT * FROM orders WHERE strftime('%Y', Date) = '2025' AND CAST(strftime('%m', Date) AS INTEGER) <= 3"
    );
    // Jan (01) and Mar (03) are within first quarter
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.Order_ID)).toContain("O1");
    expect(rows.map((r) => r.Order_ID)).toContain("O2");
  });

  // ── Test 3: JOIN ──
  it("can execute JOIN between tables", () => {
    const { columns, rows } = execQuery(
      "SELECT c.Name, o.Revenue FROM customers c JOIN orders o ON c.Customer_ID = o.Customer_ID ORDER BY o.Revenue DESC"
    );
    expect(columns).toContain("Name");
    expect(columns).toContain("Revenue");
    expect(rows.length).toBe(6);
    // Highest revenue is 100000 from Delta Co
    expect(rows[0].Name).toBe("Delta Co");
    expect(rows[0].Revenue).toBe(100000);
  });

  // ── Test 4: GROUP BY + HAVING ──
  it("can execute GROUP BY with HAVING", () => {
    const { rows } = execQuery(
      "SELECT Channel, SUM(Revenue) AS Total FROM sales GROUP BY Channel HAVING SUM(Revenue) > 300000"
    );
    // Online: 380000, Direct: 650000, Retail: 270000
    // Only Online and Direct pass
    expect(rows.length).toBe(2);
    for (const row of rows) {
      expect(Number(row.Total)).toBeGreaterThan(300000);
    }
  });

  // ── Test 5: CASE WHEN ──
  it("can execute CASE WHEN expressions", () => {
    const { rows } = execQuery(
      "SELECT Month, CASE WHEN Revenue > 200000 THEN 'High' WHEN Revenue > 100000 THEN 'Medium' ELSE 'Low' END AS Performance FROM sales"
    );
    const jan = rows.find((r) => r.Month === "Jan");
    expect(jan!.Performance).toBe("High");
    const feb = rows.find((r) => r.Month === "Feb");
    expect(feb!.Performance).toBe("Medium");
    const apr = rows.find((r) => r.Month === "Apr");
    expect(apr!.Performance).toBe("Low");
  });

  // ── Test 6: CTE (WITH) ──
  it("can execute CTEs (WITH clause)", () => {
    const { rows } = execQuery(
      `WITH high_revenue AS (
        SELECT * FROM sales WHERE Revenue > 200000
      )
      SELECT Month, Revenue FROM high_revenue ORDER BY Revenue DESC`
    );
    expect(rows.length).toBe(3); // 400000, 300000, 250000
    expect(rows[0].Month).toBe("May");
    expect(rows[0].Revenue).toBe(400000);
  });

  // ── Test 7: Window function (ROW_NUMBER) ──
  it("can execute window functions (ROW_NUMBER)", () => {
    const { rows } = execQuery(
      "SELECT Month, Revenue, ROW_NUMBER() OVER (ORDER BY Revenue DESC) AS Rank FROM sales"
    );
    expect(rows.length).toBe(6);
    // First row should be May (400000) with Rank=1
    const topRow = rows.find((r) => r.Rank === 1);
    expect(topRow!.Month).toBe("May");
    expect(topRow!.Revenue).toBe(400000);
  });

  // ── Test 8: OFFSET ──
  it("can execute LIMIT with OFFSET", () => {
    const { rows } = execQuery(
      "SELECT Month, Revenue FROM sales ORDER BY Revenue DESC LIMIT 2 OFFSET 2"
    );
    expect(rows.length).toBe(2);
    // Sorted DESC: 400000, 300000, 250000, 150000, 120000, 80000
    // Offset 2 = skip first 2, take next 2: 250000, 150000
    expect(rows[0].Revenue).toBe(250000);
    expect(rows[1].Revenue).toBe(150000);
  });

  // ── Test 9: Subquery ──
  it("can execute subqueries", () => {
    const { rows } = execQuery(
      "SELECT * FROM customers WHERE Customer_ID IN (SELECT Customer_ID FROM orders WHERE Revenue > 50000)"
    );
    // Orders with Revenue > 50000: O1(C1,55000), O3(C1,75000), O5(C4,100000) -> C1, C4
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.Customer_ID)).toContain("C1");
    expect(rows.map((r) => r.Customer_ID)).toContain("C4");
  });

  // ── Test 10: Table names with hyphens (via quoted identifiers or views) ──
  it("handles table names with hyphens via quoted identifiers", () => {
    const { rows } = execQuery('SELECT * FROM "sales-q1-2026"');
    expect(rows.length).toBe(3);
    expect(rows[0].Month).toBe("Jan");

    // Also works via underscore name
    const { rows: rows2 } = execQuery("SELECT * FROM sales_q1_2026");
    expect(rows2.length).toBe(3);
  });
});
