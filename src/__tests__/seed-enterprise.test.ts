import { describe, it, expect } from "vitest";
import {
  generateSalesTransactions,
  generateProducts,
  generateCustomers,
  generateRegions,
} from "@/lib/seed";

describe("Enterprise Star Schema Data", () => {
  const transactions = generateSalesTransactions();
  const products = generateProducts();
  const customers = generateCustomers();
  const regions = generateRegions();

  it("should generate exactly 200 sales transactions", () => {
    expect(transactions).toHaveLength(200);
  });

  it("should generate exactly 20 products", () => {
    expect(products).toHaveLength(20);
  });

  it("should generate exactly 50 customers", () => {
    expect(customers).toHaveLength(50);
  });

  it("should generate exactly 5 regions", () => {
    expect(regions).toHaveLength(5);
  });

  it("should have referential integrity: all Product_IDs in transactions exist in products", () => {
    const productIds = new Set(products.map((p) => p.Product_ID));
    const txProductIds = new Set(transactions.map((t) => t.Product_ID));
    for (const pid of txProductIds) {
      expect(productIds.has(pid)).toBe(true);
    }
  });

  it("should have referential integrity: all Customer_IDs in transactions exist in customers", () => {
    const customerIds = new Set(customers.map((c) => c.Customer_ID));
    const txCustomerIds = new Set(transactions.map((t) => t.Customer_ID));
    for (const cid of txCustomerIds) {
      expect(customerIds.has(cid)).toBe(true);
    }
  });

  it("should have referential integrity: all Region_IDs in transactions exist in regions", () => {
    const regionIds = new Set(regions.map((r) => r.Region_ID));
    const txRegionIds = new Set(transactions.map((t) => t.Region_ID));
    for (const rid of txRegionIds) {
      expect(regionIds.has(rid)).toBe(true);
    }
  });

  it("should produce deterministic data (seeded RNG)", () => {
    const tx1 = generateSalesTransactions();
    const tx2 = generateSalesTransactions();
    expect(tx1[0].Transaction_ID).toBe(tx2[0].Transaction_ID);
    expect(tx1[0].Revenue).toBe(tx2[0].Revenue);
    expect(tx1[199].Revenue).toBe(tx2[199].Revenue);
  });

  it("should have valid date format in transactions", () => {
    for (const tx of transactions) {
      expect(tx.Date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("should have correct Revenue calculation (Quantity * Unit_Price)", () => {
    for (const tx of transactions) {
      const expected = parseInt(tx.Quantity) * parseInt(tx.Unit_Price);
      expect(parseInt(tx.Revenue)).toBe(expected);
    }
  });
});
