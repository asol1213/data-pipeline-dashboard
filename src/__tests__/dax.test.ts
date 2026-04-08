import { describe, it, expect } from "vitest";
import { evaluateDAX, DAXError } from "@/lib/dax";
import type { DAXContext } from "@/lib/dax";

// Build a small test dataset similar to sales_transactions
const testData: Record<string, string>[] = [
  { Date: "2025-01-10", Revenue: "1000", Profit: "300", Quantity: "5", Channel: "Online", Region: "DACH", Product_ID: "P-001" },
  { Date: "2025-01-20", Revenue: "2000", Profit: "600", Quantity: "10", Channel: "Retail", Region: "DACH", Product_ID: "P-002" },
  { Date: "2025-02-15", Revenue: "1500", Profit: "400", Quantity: "8", Channel: "Online", Region: "APAC", Product_ID: "P-001" },
  { Date: "2025-03-05", Revenue: "3000", Profit: "900", Quantity: "15", Channel: "Partner", Region: "DACH", Product_ID: "P-003" },
  { Date: "2025-04-12", Revenue: "2500", Profit: "750", Quantity: "12", Channel: "Online", Region: "APAC", Product_ID: "P-001" },
  { Date: "2025-04-25", Revenue: "1800", Profit: "500", Quantity: "9", Channel: "Direct", Region: "MENA", Product_ID: "P-002" },
  { Date: "2025-06-10", Revenue: "4000", Profit: "1200", Quantity: "20", Channel: "Online", Region: "DACH", Product_ID: "P-004" },
  { Date: "2025-07-01", Revenue: "3500", Profit: "1000", Quantity: "18", Channel: "Retail", Region: "North America", Product_ID: "P-005" },
  { Date: "2025-09-15", Revenue: "2200", Profit: "660", Quantity: "11", Channel: "Partner", Region: "UK/Ireland", Product_ID: "P-001" },
  { Date: "2025-12-20", Revenue: "5000", Profit: "1500", Quantity: "25", Channel: "Online", Region: "DACH", Product_ID: "P-003" },
  // Previous year data for SAMEPERIODLASTYEAR
  { Date: "2024-01-10", Revenue: "800", Profit: "200", Quantity: "4", Channel: "Online", Region: "DACH", Product_ID: "P-001" },
  { Date: "2024-06-15", Revenue: "1200", Profit: "350", Quantity: "6", Channel: "Retail", Region: "APAC", Product_ID: "P-002" },
];

const ctx: DAXContext = {
  data: testData,
  headers: ["Date", "Revenue", "Profit", "Quantity", "Channel", "Region", "Product_ID"],
  columnTypes: {
    Date: "string",
    Revenue: "number",
    Profit: "number",
    Quantity: "number",
    Channel: "string",
    Region: "string",
    Product_ID: "string",
  },
};

describe("DAX Engine", () => {
  // ── Basic Aggregations ──

  describe("SUM", () => {
    it("should sum a numeric column", () => {
      const result = evaluateDAX("SUM(Revenue)", ctx);
      expect(result).toBe(28500);
    });

    it("should sum Profit column", () => {
      const result = evaluateDAX("SUM(Profit)", ctx);
      expect(result).toBe(8360);
    });
  });

  describe("AVERAGE", () => {
    it("should compute mean of a numeric column", () => {
      const result = evaluateDAX("AVERAGE(Quantity)", ctx);
      // sum=143, count=12, avg=11.916... -> 11.92
      expect(result).toBeCloseTo(11.92, 1);
    });
  });

  describe("COUNT", () => {
    it("should count non-empty values in a column", () => {
      const result = evaluateDAX("COUNT(Revenue)", ctx);
      expect(result).toBe(12);
    });
  });

  describe("COUNTROWS", () => {
    it("should count total rows", () => {
      const result = evaluateDAX("COUNTROWS()", ctx);
      expect(result).toBe(12);
    });
  });

  describe("MIN", () => {
    it("should return the minimum value", () => {
      const result = evaluateDAX("MIN(Revenue)", ctx);
      expect(result).toBe(800);
    });
  });

  describe("MAX", () => {
    it("should return the maximum value", () => {
      const result = evaluateDAX("MAX(Revenue)", ctx);
      expect(result).toBe(5000);
    });
  });

  describe("DISTINCTCOUNT", () => {
    it("should count unique values in a column", () => {
      const result = evaluateDAX("DISTINCTCOUNT(Channel)", ctx);
      expect(result).toBe(4); // Online, Retail, Partner, Direct
    });

    it("should count unique Product_IDs", () => {
      const result = evaluateDAX("DISTINCTCOUNT(Product_ID)", ctx);
      expect(result).toBe(5); // P-001 to P-005
    });
  });

  // ── Time Intelligence ──

  describe("TOTALYTD", () => {
    it("should compute year-to-date sum for the latest year", () => {
      // Latest year is 2025 (max date = 2025-12-20)
      // 2025 rows: indices 0-9, sum Revenue = 1000+2000+1500+3000+2500+1800+4000+3500+2200+5000 = 26500
      const result = evaluateDAX("TOTALYTD(SUM(Revenue), Date)", ctx);
      expect(result).toBe(26500);
    });
  });

  describe("TOTALQTD", () => {
    it("should compute quarter-to-date sum for the latest quarter", () => {
      // Max date = 2025-12-20, Q4
      // Q4 2025 rows: 2025-12-20 (Revenue=5000)
      const result = evaluateDAX("TOTALQTD(SUM(Revenue), Date)", ctx);
      expect(result).toBe(5000);
    });
  });

  describe("TOTALMTD", () => {
    it("should compute month-to-date sum for the latest month", () => {
      // Max date = 2025-12-20
      // December 2025 rows: 2025-12-20 (Revenue=5000)
      const result = evaluateDAX("TOTALMTD(SUM(Revenue), Date)", ctx);
      expect(result).toBe(5000);
    });
  });

  describe("SAMEPERIODLASTYEAR", () => {
    it("should sum revenue from the previous year", () => {
      // Max date = 2025-12-20, previous year = 2024
      // 2024 rows: 800 + 1200 = 2000
      const result = evaluateDAX("SAMEPERIODLASTYEAR(SUM(Revenue), Date)", ctx);
      expect(result).toBe(2000);
    });
  });

  // ── CALCULATE ──

  describe("CALCULATE", () => {
    it("should filter and then aggregate", () => {
      const result = evaluateDAX('CALCULATE(SUM(Revenue), Channel = "Online")', ctx);
      // Online rows: 1000 + 1500 + 2500 + 4000 + 5000 + 800 = 14800
      expect(result).toBe(14800);
    });

    it("should handle multiple filters", () => {
      const result = evaluateDAX('CALCULATE(SUM(Revenue), Channel = "Online", Region = "DACH")', ctx);
      // Online + DACH: 1000, 4000, 5000, 800 (2024 row) = 10800
      expect(result).toBe(10800);
    });

    it("should work with AVERAGE inside CALCULATE", () => {
      const result = evaluateDAX('CALCULATE(AVERAGE(Revenue), Region = "DACH")', ctx);
      // DACH rows: 1000, 2000, 3000, 4000, 5000, 800 => avg = 15800/6 = 2633.33
      expect(result).toBeCloseTo(2633.33, 1);
    });
  });

  // ── DIVIDE ──

  describe("DIVIDE", () => {
    it("should safely divide two aggregations", () => {
      const result = evaluateDAX("DIVIDE(SUM(Profit), SUM(Revenue), 0)", ctx);
      // 8360 / 28500 = 0.2933... -> 0.29
      expect(result).toBeCloseTo(0.29, 1);
    });

    it("should return fallback on division by zero", () => {
      // Create a context with zero revenue
      const emptyCtx: DAXContext = {
        ...ctx,
        data: [{ Date: "2025-01-01", Revenue: "0", Profit: "0", Quantity: "0", Channel: "Online", Region: "DACH", Product_ID: "P-001" }],
      };
      const result = evaluateDAX("DIVIDE(SUM(Profit), SUM(Revenue), -1)", emptyCtx);
      expect(result).toBe(-1);
    });
  });

  // ── IF ──

  describe("IF", () => {
    it("should return then-value when condition is truthy", () => {
      const result = evaluateDAX("IF(SUM(Revenue), 1, 0)", ctx);
      expect(result).toBe(1);
    });

    it("should return else-value when condition is falsy", () => {
      const emptyCtx: DAXContext = { ...ctx, data: [] };
      const result = evaluateDAX("IF(SUM(Revenue), 1, 0)", emptyCtx);
      expect(result).toBe(0);
    });
  });

  // ── SWITCH ──

  describe("SWITCH", () => {
    it("should match and return correct result", () => {
      // DISTINCTCOUNT(Channel) = 4
      const result = evaluateDAX('SWITCH(DISTINCTCOUNT(Channel), 3, "few", 4, "some", "many")', ctx);
      expect(result).toBe("some");
    });

    it("should return default when no match", () => {
      const result = evaluateDAX('SWITCH(DISTINCTCOUNT(Channel), 1, "one", 2, "two", "other")', ctx);
      expect(result).toBe("other");
    });
  });

  // ── Math functions ──

  describe("ABS", () => {
    it("should return absolute value", () => {
      const result = evaluateDAX("ABS(-42)", ctx);
      expect(result).toBe(42);
    });
  });

  describe("ROUND", () => {
    it("should round to specified decimals", () => {
      const result = evaluateDAX("ROUND(DIVIDE(SUM(Profit), SUM(Revenue), 0), 4)", ctx);
      // DIVIDE rounds to 2 decimals internally (0.29), then ROUND to 4 => 0.29
      expect(result).toBeCloseTo(0.29, 2);
    });
  });

  // ── Nested expressions ──

  describe("Nested expressions", () => {
    it("should handle arithmetic with aggregations", () => {
      const result = evaluateDAX("SUM(Revenue) - SUM(Profit)", ctx);
      expect(result).toBe(20140); // 28500 - 8360
    });
  });

  // ── Error handling ──

  describe("Error handling", () => {
    it("should throw on empty expression", () => {
      expect(() => evaluateDAX("", ctx)).toThrow(DAXError);
    });

    it("should throw on unknown function", () => {
      expect(() => evaluateDAX("FOOBAR(Revenue)", ctx)).toThrow("Unknown DAX function");
    });

    it("should throw when SUM has no arguments", () => {
      expect(() => evaluateDAX("SUM()", ctx)).toThrow();
    });

    it("should throw on invalid expression", () => {
      expect(() => evaluateDAX("SUM(Revenue", ctx)).toThrow();
    });
  });
});
