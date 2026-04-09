import { describe, it, expect } from "vitest";
import {
  generateRevolutData,
  generateSiemensData,
  generateDeloitteData,
} from "../lib/demo-data";

describe("Demo Data - Revolut", () => {
  const revolut = generateRevolutData();

  it("generates 7 tables", () => {
    expect(revolut.datasets).toHaveLength(7);
  });

  it("all tables have rows", () => {
    for (const table of revolut.datasets) {
      expect(table.rows.length).toBeGreaterThan(0);
    }
  });

  it("all tables have headers matching row keys", () => {
    for (const table of revolut.datasets) {
      const rowKeys = Object.keys(table.rows[0]);
      for (const header of table.headers) {
        expect(rowKeys).toContain(header);
      }
    }
  });

  it("transactions reference valid customer IDs", () => {
    const transactions = revolut.datasets.find((d) => d.id === "rev_transactions")!;
    const customers = revolut.datasets.find((d) => d.id === "rev_customers")!;
    const customerIds = new Set(customers.rows.map((r) => r.Customer_ID));
    for (const txn of transactions.rows) {
      expect(customerIds.has(txn.Customer_ID)).toBe(true);
    }
  });

  it("compliance events reference valid customer IDs", () => {
    const compliance = revolut.datasets.find((d) => d.id === "rev_compliance")!;
    const customers = revolut.datasets.find((d) => d.id === "rev_customers")!;
    const customerIds = new Set(customers.rows.map((r) => r.Customer_ID));
    for (const evt of compliance.rows) {
      expect(customerIds.has(evt.Customer_ID)).toBe(true);
    }
  });

  it("has correct company metadata", () => {
    expect(revolut.id).toBe("revolut");
    expect(revolut.name).toBe("Revolut");
    expect(revolut.industry).toBeTruthy();
  });
});

describe("Demo Data - Siemens", () => {
  const siemens = generateSiemensData();

  it("generates 7 tables", () => {
    expect(siemens.datasets).toHaveLength(7);
  });

  it("all tables have rows", () => {
    for (const table of siemens.datasets) {
      expect(table.rows.length).toBeGreaterThan(0);
    }
  });

  it("all tables have headers matching row keys", () => {
    for (const table of siemens.datasets) {
      const rowKeys = Object.keys(table.rows[0]);
      for (const header of table.headers) {
        expect(rowKeys).toContain(header);
      }
    }
  });

  it("has correct company metadata", () => {
    expect(siemens.id).toBe("siemens");
    expect(siemens.name).toBe("Siemens");
  });
});

describe("Demo Data - Deloitte", () => {
  const deloitte = generateDeloitteData();

  it("generates 8 tables", () => {
    expect(deloitte.datasets).toHaveLength(8);
  });

  it("all tables have rows", () => {
    for (const table of deloitte.datasets) {
      expect(table.rows.length).toBeGreaterThan(0);
    }
  });

  it("all tables have headers matching row keys", () => {
    for (const table of deloitte.datasets) {
      const rowKeys = Object.keys(table.rows[0]);
      for (const header of table.headers) {
        expect(rowKeys).toContain(header);
      }
    }
  });

  it("has correct company metadata", () => {
    expect(deloitte.id).toBe("deloitte");
    expect(deloitte.name).toBe("Deloitte DACH");
  });
});

describe("Demo Data - Cross-company integrity", () => {
  it("total row count across all companies exceeds 3000", () => {
    const rev = generateRevolutData();
    const si = generateSiemensData();
    const dl = generateDeloitteData();
    const totalRows =
      rev.datasets.reduce((s, t) => s + t.rows.length, 0) +
      si.datasets.reduce((s, t) => s + t.rows.length, 0) +
      dl.datasets.reduce((s, t) => s + t.rows.length, 0);
    expect(totalRows).toBeGreaterThan(3000);
  });

  it("all table IDs are unique across companies", () => {
    const rev = generateRevolutData();
    const si = generateSiemensData();
    const dl = generateDeloitteData();
    const allIds = [
      ...rev.datasets.map((d) => d.id),
      ...si.datasets.map((d) => d.id),
      ...dl.datasets.map((d) => d.id),
    ];
    const unique = new Set(allIds);
    expect(allIds.length).toBe(unique.size);
  });

  it("each table has columnTypes defined for every header", () => {
    const all = [
      ...generateRevolutData().datasets,
      ...generateSiemensData().datasets,
      ...generateDeloitteData().datasets,
    ];
    for (const table of all) {
      for (const header of table.headers) {
        expect(table.columnTypes[header]).toBeDefined();
        expect(["number", "string", "date"]).toContain(table.columnTypes[header]);
      }
    }
  });
});
