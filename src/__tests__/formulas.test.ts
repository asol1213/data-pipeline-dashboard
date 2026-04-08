import { describe, it, expect } from "vitest";
import { parseFormula, evaluateFormula, FormulaError } from "@/lib/formulas";

const sampleHeaders = ["Revenue", "COGS", "Customers", "Churn_Rate", "Month"];
const sampleRow: Record<string, string> = {
  Revenue: "250000",
  COGS: "100000",
  Customers: "1500",
  Churn_Rate: "2.5",
  Month: "Jan 2026",
};

describe("formulas", () => {
  describe("basic arithmetic", () => {
    it("should evaluate simple addition", () => {
      const result = evaluateFormula("10 + 5", {}, []);
      expect(result).toBe(15);
    });

    it("should evaluate simple subtraction", () => {
      const result = evaluateFormula("20 - 8", {}, []);
      expect(result).toBe(12);
    });

    it("should evaluate multiplication", () => {
      const result = evaluateFormula("6 * 7", {}, []);
      expect(result).toBe(42);
    });

    it("should evaluate division", () => {
      const result = evaluateFormula("100 / 4", {}, []);
      expect(result).toBe(25);
    });

    it("should respect operator precedence", () => {
      const result = evaluateFormula("2 + 3 * 4", {}, []);
      expect(result).toBe(14);
    });
  });

  describe("column references", () => {
    it("should resolve column values", () => {
      const result = evaluateFormula(
        "Revenue - COGS",
        sampleRow,
        sampleHeaders
      );
      expect(result).toBe(150000);
    });

    it("should calculate Revenue * 0.25", () => {
      const result = evaluateFormula(
        "Revenue * 0.25",
        sampleRow,
        sampleHeaders
      );
      expect(result).toBe(62500);
    });
  });

  describe("parentheses", () => {
    it("should handle parenthesized expressions", () => {
      const result = evaluateFormula(
        "(Revenue - COGS) / Revenue * 100",
        sampleRow,
        sampleHeaders
      );
      expect(result).toBe(60);
    });

    it("should handle nested parentheses", () => {
      const result = evaluateFormula("((10 + 5) * 2)", {}, []);
      expect(result).toBe(30);
    });
  });

  describe("IF function", () => {
    it("should return then-value when condition is true", () => {
      const result = evaluateFormula(
        'IF(Revenue > 200000, "High", "Low")',
        sampleRow,
        sampleHeaders
      );
      expect(result).toBe("High");
    });

    it("should return else-value when condition is false", () => {
      const result = evaluateFormula(
        'IF(Revenue < 100000, "Small", "Big")',
        sampleRow,
        sampleHeaders
      );
      expect(result).toBe("Big");
    });

    it("should handle numeric return values", () => {
      const result = evaluateFormula(
        "IF(Churn_Rate > 3, 1, 0)",
        sampleRow,
        sampleHeaders
      );
      expect(result).toBe(0);
    });
  });

  describe("ROUND function", () => {
    it("should round to specified decimal places", () => {
      const result = evaluateFormula(
        "ROUND(Revenue / Customers, 2)",
        sampleRow,
        sampleHeaders
      );
      expect(result).toBeCloseTo(166.67, 2);
    });

    it("should round to zero decimals by default", () => {
      const result = evaluateFormula("ROUND(3.7)", {}, []);
      expect(result).toBe(4);
    });
  });

  describe("ABS function", () => {
    it("should return absolute value of negative number", () => {
      const result = evaluateFormula("ABS(0 - 42)", {}, []);
      expect(result).toBe(42);
    });

    it("should return absolute value of positive number", () => {
      const result = evaluateFormula("ABS(42)", {}, []);
      expect(result).toBe(42);
    });
  });

  describe("MAX and MIN functions", () => {
    it("should return the maximum of values", () => {
      const result = evaluateFormula(
        "MAX(Revenue, COGS)",
        sampleRow,
        sampleHeaders
      );
      expect(result).toBe(250000);
    });

    it("should return the minimum of values", () => {
      const result = evaluateFormula(
        "MIN(Revenue, COGS)",
        sampleRow,
        sampleHeaders
      );
      expect(result).toBe(100000);
    });
  });

  describe("error handling", () => {
    it("should throw on empty formula", () => {
      expect(() => evaluateFormula("", {}, [])).toThrow(FormulaError);
    });

    it("should throw on unknown column", () => {
      expect(() =>
        evaluateFormula("NonExistent + 1", sampleRow, sampleHeaders)
      ).toThrow("Unknown column");
    });

    it("should throw on division by zero", () => {
      expect(() => evaluateFormula("10 / 0", {}, [])).toThrow(
        "Division by zero"
      );
    });

    it("should throw on invalid characters", () => {
      expect(() => evaluateFormula("10 @ 5", {}, [])).toThrow(FormulaError);
    });

    it("should throw on wrong IF argument count", () => {
      expect(() => evaluateFormula("IF(1 > 0, 1)", {}, [])).toThrow(
        "IF() requires exactly 3 arguments"
      );
    });
  });

  describe("parseFormula", () => {
    it("should return a parsed expression object", () => {
      const expr = parseFormula("10 + 5", []);
      expect(expr).toBeDefined();
      expect(expr.type).toBe("binary");
      expect(expr.operator).toBe("+");
    });

    it("should parse column references", () => {
      const expr = parseFormula("Revenue", sampleHeaders);
      expect(expr.type).toBe("column");
      expect(expr.column).toBe("Revenue");
    });
  });

  describe("complex formulas", () => {
    it("should handle ROUND of a division with column references", () => {
      const result = evaluateFormula(
        "ROUND((Revenue - COGS) / Revenue * 100, 1)",
        sampleRow,
        sampleHeaders
      );
      expect(result).toBe(60);
    });

    it("should handle negative numbers via subtraction from zero", () => {
      const result = evaluateFormula("0 - 10 + 25", {}, []);
      expect(result).toBe(15);
    });
  });
});
