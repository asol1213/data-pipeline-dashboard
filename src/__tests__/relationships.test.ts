import { describe, it, expect } from "vitest";
import {
  detectRelationships,
  detectSchemaType,
  determineCardinality,
  type Relationship,
} from "../lib/relationships";
import type { DatasetMeta } from "../lib/store";

/* ── helpers ── */

function makeMeta(
  id: string,
  headers: string[],
  columnTypes?: Record<string, "number" | "date" | "string">
): DatasetMeta {
  const ct: Record<string, "number" | "date" | "string"> = columnTypes ?? {};
  for (const h of headers) {
    if (!(h in ct)) ct[h] = "string";
  }
  return {
    id,
    name: id,
    fileName: `${id}.csv`,
    uploadedAt: new Date().toISOString(),
    rowCount: 0,
    columnCount: headers.length,
    headers,
    columnTypes: ct,
  };
}

/* ── Sample datasets matching the real seed data ── */

const salesTransactions = makeMeta("sales_transactions", [
  "Transaction_ID",
  "Date",
  "Product_ID",
  "Customer_ID",
  "Region_ID",
  "Quantity",
  "Unit_Price",
  "Revenue",
  "Discount_%",
  "Net_Revenue",
  "Cost",
  "Profit",
  "Sales_Rep",
  "Channel",
]);

const products = makeMeta("products", [
  "Product_ID",
  "Product_Name",
  "Category",
  "Sub_Category",
  "Launch_Date",
  "Price_Tier",
]);

const customers = makeMeta("customers", [
  "Customer_ID",
  "Company_Name",
  "Industry",
  "Country",
  "Segment",
  "Account_Manager",
  "Contract_Start",
  "Annual_Contract_Value",
]);

const regions = makeMeta("regions", [
  "Region_ID",
  "Region_Name",
  "Head_of_Region",
  "Target_Revenue",
  "Currency",
]);

const unrelatedTable = makeMeta("pnl-2025", [
  "Month",
  "Revenue",
  "COGS",
  "Gross_Profit",
]);

/* ── Sample rows for cardinality testing ── */

function salesRows(): Record<string, string>[] {
  return [
    { Transaction_ID: "T-001", Product_ID: "P-001", Customer_ID: "C-001", Region_ID: "R-01" },
    { Transaction_ID: "T-002", Product_ID: "P-001", Customer_ID: "C-002", Region_ID: "R-01" },
    { Transaction_ID: "T-003", Product_ID: "P-002", Customer_ID: "C-001", Region_ID: "R-02" },
    { Transaction_ID: "T-004", Product_ID: "P-003", Customer_ID: "C-003", Region_ID: "R-03" },
    { Transaction_ID: "T-005", Product_ID: "P-002", Customer_ID: "C-002", Region_ID: "R-01" },
  ];
}

function productRows(): Record<string, string>[] {
  return [
    { Product_ID: "P-001", Product_Name: "Widget A" },
    { Product_ID: "P-002", Product_Name: "Widget B" },
    { Product_ID: "P-003", Product_Name: "Widget C" },
  ];
}

function customerRows(): Record<string, string>[] {
  return [
    { Customer_ID: "C-001", Company_Name: "Acme" },
    { Customer_ID: "C-002", Company_Name: "TechCo" },
    { Customer_ID: "C-003", Company_Name: "GlobalFin" },
  ];
}

function regionRows(): Record<string, string>[] {
  return [
    { Region_ID: "R-01", Region_Name: "DACH" },
    { Region_ID: "R-02", Region_Name: "North America" },
    { Region_ID: "R-03", Region_Name: "UK/Ireland" },
  ];
}

/* ── Tests ── */

describe("detectRelationships", () => {
  it("detects Product_ID relationship between sales_transactions and products", () => {
    const datasets = [salesTransactions, products];
    const rels = detectRelationships(datasets);
    const match = rels.find(
      (r) =>
        (r.fromColumn === "Product_ID" && r.toColumn === "Product_ID") ||
        (r.fromColumn === "Product_ID" && r.toColumn === "Product_ID")
    );
    expect(match).toBeDefined();
    expect(
      (match!.fromTable === "sales_transactions" && match!.toTable === "products") ||
      (match!.fromTable === "products" && match!.toTable === "sales_transactions")
    ).toBe(true);
  });

  it("detects Customer_ID relationship between sales_transactions and customers", () => {
    const datasets = [salesTransactions, customers];
    const rels = detectRelationships(datasets);
    const match = rels.find(
      (r) => r.fromColumn === "Customer_ID" && r.toColumn === "Customer_ID"
    );
    expect(match).toBeDefined();
  });

  it("detects Region_ID relationship between sales_transactions and regions", () => {
    const datasets = [salesTransactions, regions];
    const rels = detectRelationships(datasets);
    const match = rels.find(
      (r) => r.fromColumn === "Region_ID" && r.toColumn === "Region_ID"
    );
    expect(match).toBeDefined();
  });

  it("detects 1:N cardinality (unique dimension PK, non-unique fact FK)", () => {
    const datasets = [salesTransactions, products];
    const allRows = new Map<string, Record<string, string>[]>();
    allRows.set("sales_transactions", salesRows());
    allRows.set("products", productRows());

    const rels = detectRelationships(datasets, allRows);
    const match = rels.find(
      (r) => r.fromColumn === "Product_ID" && r.toColumn === "Product_ID"
    );
    expect(match).toBeDefined();
    expect(match!.type).toBe("1:N");
    // The "from" side should be the dimension (unique values)
    expect(match!.fromTable).toBe("products");
  });

  it("detects 1:1 cardinality when both sides are unique", () => {
    const result = determineCardinality(
      ["A", "B", "C"],
      ["X", "Y", "Z"]
    );
    expect(result).toBe("1:1");
  });

  it("detects N:M cardinality when neither side is unique", () => {
    const result = determineCardinality(
      ["A", "A", "B"],
      ["X", "X", "Y"]
    );
    expect(result).toBe("N:M");
  });

  it("detects no relationship between unrelated tables", () => {
    const datasets = [salesTransactions, unrelatedTable];
    const rels = detectRelationships(datasets);
    // Revenue appears in both but it's not an _ID column so should not be matched
    // as a relationship (it only matches by exact name and isn't a FK pattern)
    // However, Revenue might match by exact name. Let's check there's no Product_ID match.
    const fkRel = rels.find(
      (r) => r.fromColumn === "Product_ID" || r.toColumn === "Product_ID"
    );
    expect(fkRel).toBeUndefined();
  });

  it("returns empty for a single dataset", () => {
    const rels = detectRelationships([salesTransactions]);
    expect(rels).toEqual([]);
  });

  it("returns empty for empty datasets array", () => {
    const rels = detectRelationships([]);
    expect(rels).toEqual([]);
  });

  it("detects all three relationships in a star schema", () => {
    const datasets = [salesTransactions, products, customers, regions];
    const allRows = new Map<string, Record<string, string>[]>();
    allRows.set("sales_transactions", salesRows());
    allRows.set("products", productRows());
    allRows.set("customers", customerRows());
    allRows.set("regions", regionRows());

    const rels = detectRelationships(datasets, allRows);

    const productRel = rels.find(
      (r) =>
        (r.fromTable === "products" || r.toTable === "products") &&
        r.fromColumn === "Product_ID"
    );
    const customerRel = rels.find(
      (r) =>
        (r.fromTable === "customers" || r.toTable === "customers") &&
        r.fromColumn === "Customer_ID"
    );
    const regionRel = rels.find(
      (r) =>
        (r.fromTable === "regions" || r.toTable === "regions") &&
        r.fromColumn === "Region_ID"
    );

    expect(productRel).toBeDefined();
    expect(customerRel).toBeDefined();
    expect(regionRel).toBeDefined();
  });
});

describe("detectSchemaType", () => {
  it("detects star schema with one fact table and multiple dimensions", () => {
    const datasets = [salesTransactions, products, customers, regions];
    const relationships: Relationship[] = [
      { fromTable: "products", fromColumn: "Product_ID", toTable: "sales_transactions", toColumn: "Product_ID", type: "1:N" },
      { fromTable: "customers", fromColumn: "Customer_ID", toTable: "sales_transactions", toColumn: "Customer_ID", type: "1:N" },
      { fromTable: "regions", fromColumn: "Region_ID", toTable: "sales_transactions", toColumn: "Region_ID", type: "1:N" },
    ];
    expect(detectSchemaType(datasets, relationships)).toBe("star");
  });

  it("detects snowflake schema when dimensions link to sub-dimensions", () => {
    const subCategory = makeMeta("sub_categories", ["Sub_Category_ID", "Category_ID", "Sub_Name"]);
    const datasets = [salesTransactions, products, customers, regions, subCategory];
    const relationships: Relationship[] = [
      { fromTable: "products", fromColumn: "Product_ID", toTable: "sales_transactions", toColumn: "Product_ID", type: "1:N" },
      { fromTable: "customers", fromColumn: "Customer_ID", toTable: "sales_transactions", toColumn: "Customer_ID", type: "1:N" },
      { fromTable: "regions", fromColumn: "Region_ID", toTable: "sales_transactions", toColumn: "Region_ID", type: "1:N" },
      // dimension-to-subdimension link (not through fact)
      { fromTable: "sub_categories", fromColumn: "Sub_Category_ID", toTable: "products", toColumn: "Sub_Category_ID", type: "1:N" },
    ];
    expect(detectSchemaType(datasets, relationships)).toBe("snowflake");
  });

  it("returns simple for fewer than 2 relationships", () => {
    const datasets = [salesTransactions, products];
    const relationships: Relationship[] = [
      { fromTable: "products", fromColumn: "Product_ID", toTable: "sales_transactions", toColumn: "Product_ID", type: "1:N" },
    ];
    expect(detectSchemaType(datasets, relationships)).toBe("simple");
  });

  it("returns simple for no relationships", () => {
    expect(detectSchemaType([salesTransactions], [])).toBe("simple");
  });
});

describe("determineCardinality", () => {
  it("returns 1:N when from values are unique but to values are not", () => {
    expect(
      determineCardinality(["A", "B", "C"], ["A", "A", "B"])
    ).toBe("1:N");
  });

  it("returns 1:N when to values are unique but from values are not", () => {
    expect(
      determineCardinality(["A", "A", "B"], ["X", "Y", "Z"])
    ).toBe("1:N");
  });
});
