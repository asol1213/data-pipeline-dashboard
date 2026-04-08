import { describe, it, expect } from "vitest";
import {
  parseCellRef,
  parseCellRange,
  evaluateCellFormula,
  CellFormulaError,
} from "../lib/cell-formulas";

// Sample data: 5 rows, 4 columns (A=Price, B=Qty, C=Tax, D=Label)
const headers = ["Price", "Qty", "Tax", "Label"];
const data = [
  ["100", "5", "10", "Widget"],    // row 1 (index 0)
  ["200", "3", "20", "Gadget"],    // row 2 (index 1)
  ["50", "10", "5", "Gizmo"],      // row 3 (index 2)
  ["300", "2", "30", "Doohickey"], // row 4 (index 3)
  ["150", "7", "15", "Thingamajig"], // row 5 (index 4)
];

// ============================================================
// 1. Parse cell references
// ============================================================
describe("parseCellRef", () => {
  it("parses A1 correctly", () => {
    const ref = parseCellRef("A1");
    expect(ref).toEqual({ col: 0, row: 0 });
  });

  it("parses B2 correctly", () => {
    const ref = parseCellRef("B2");
    expect(ref).toEqual({ col: 1, row: 1 });
  });

  it("parses Z26 correctly", () => {
    const ref = parseCellRef("Z26");
    expect(ref).toEqual({ col: 25, row: 25 });
  });

  it("throws on invalid ref", () => {
    expect(() => parseCellRef("123")).toThrow(CellFormulaError);
    expect(() => parseCellRef("")).toThrow(CellFormulaError);
  });
});

// ============================================================
// 2. Parse cell ranges
// ============================================================
describe("parseCellRange", () => {
  it("parses A1:A10", () => {
    const range = parseCellRange("A1:A10");
    expect(range.start).toEqual({ col: 0, row: 0 });
    expect(range.end).toEqual({ col: 0, row: 9 });
  });

  it("parses B1:D5", () => {
    const range = parseCellRange("B1:D5");
    expect(range.start).toEqual({ col: 1, row: 0 });
    expect(range.end).toEqual({ col: 3, row: 4 });
  });

  it("throws on invalid range", () => {
    expect(() => parseCellRange("A1")).toThrow(CellFormulaError);
    expect(() => parseCellRange("A1:B2:C3")).toThrow(CellFormulaError);
  });
});

// ============================================================
// 3. SUM formula
// ============================================================
describe("SUM formula", () => {
  it("=SUM(A1:A5) sums the Price column", () => {
    // 100+200+50+300+150 = 800
    const result = evaluateCellFormula("SUM(A1:A5)", data, headers);
    expect(result).toBe(800);
  });

  it("=SUM(B1:B3) sums first 3 quantities", () => {
    // 5+3+10 = 18
    const result = evaluateCellFormula("SUM(B1:B3)", data, headers);
    expect(result).toBe(18);
  });
});

// ============================================================
// 4. AVERAGE formula
// ============================================================
describe("AVERAGE formula", () => {
  it("=AVERAGE(A1:A5) averages the Price column", () => {
    // (100+200+50+300+150) / 5 = 160
    const result = evaluateCellFormula("AVERAGE(A1:A5)", data, headers);
    expect(result).toBe(160);
  });
});

// ============================================================
// 5. Cell ref arithmetic
// ============================================================
describe("Cell ref arithmetic", () => {
  it("=A1+B1 adds Price and Qty of row 1", () => {
    // 100 + 5 = 105
    const result = evaluateCellFormula("A1+B1", data, headers);
    expect(result).toBe(105);
  });

  it("=A1*B1 multiplies Price by Qty", () => {
    // 100 * 5 = 500
    const result = evaluateCellFormula("A1*B1", data, headers);
    expect(result).toBe(500);
  });

  it("=A1*1.19 arithmetic with constant", () => {
    // 100 * 1.19 = 119
    const result = evaluateCellFormula("A1*1.19", data, headers);
    expect(result).toBeCloseTo(119, 2);
  });
});

// ============================================================
// 6. IF formula
// ============================================================
describe("IF formula", () => {
  it('=IF(A1>100,"High","Low") returns Low for 100', () => {
    const result = evaluateCellFormula('IF(A1>100,"High","Low")', data, headers);
    expect(result).toBe("Low");
  });

  it('=IF(A2>100,"High","Low") returns High for 200', () => {
    const result = evaluateCellFormula('IF(A2>100,"High","Low")', data, headers);
    expect(result).toBe("High");
  });
});

// ============================================================
// 7. Nested formulas
// ============================================================
describe("Nested formulas", () => {
  it("=SUM(A1:A5)*2 doubles the sum", () => {
    // 800 * 2 = 1600
    const result = evaluateCellFormula("SUM(A1:A5)*2", data, headers);
    expect(result).toBe(1600);
  });

  it("=SUM(A1:A3)+SUM(B1:B3) combines two sums", () => {
    // (100+200+50) + (5+3+10) = 350 + 18 = 368
    const result = evaluateCellFormula("SUM(A1:A3)+SUM(B1:B3)", data, headers);
    expect(result).toBe(368);
  });
});

// ============================================================
// 8. COUNT, MIN, MAX
// ============================================================
describe("COUNT, MIN, MAX", () => {
  it("=COUNT(A1:A5) returns 5", () => {
    const result = evaluateCellFormula("COUNT(A1:A5)", data, headers);
    expect(result).toBe(5);
  });

  it("=MIN(A1:A5) returns 50", () => {
    const result = evaluateCellFormula("MIN(A1:A5)", data, headers);
    expect(result).toBe(50);
  });

  it("=MAX(A1:A5) returns 300", () => {
    const result = evaluateCellFormula("MAX(A1:A5)", data, headers);
    expect(result).toBe(300);
  });
});

// ============================================================
// 9. ROUND and ABS
// ============================================================
describe("ROUND and ABS", () => {
  it("=ROUND(A1*1.19, 0) rounds result", () => {
    const result = evaluateCellFormula("ROUND(A1*1.19,0)", data, headers);
    expect(result).toBe(119);
  });

  it("=ABS(-42) returns 42 with literal", () => {
    const negData = [["42", "-42"]];
    const negHeaders = ["a", "b"];
    const result = evaluateCellFormula("ABS(B1)", negData, negHeaders);
    expect(result).toBe(42);
  });
});

// ============================================================
// 10. Error: invalid reference
// ============================================================
describe("Error handling", () => {
  it("throws on out-of-bounds cell reference", () => {
    expect(() => evaluateCellFormula("Z99", data, headers)).toThrow(CellFormulaError);
  });

  it("throws on invalid formula syntax", () => {
    expect(() => evaluateCellFormula("+++", data, headers)).toThrow();
  });
});

// ============================================================
// 11. Circular reference detection
// ============================================================
describe("Circular reference detection", () => {
  it("detects basic circular reference", () => {
    // Cell A1 contains "=A1" which references itself
    const circData = [["=A1"]];
    const circHeaders = ["A"];
    expect(() => evaluateCellFormula("A1", circData, circHeaders)).toThrow(CellFormulaError);
    expect(() => evaluateCellFormula("A1", circData, circHeaders)).toThrow("Circular reference");
  });
});

// ============================================================
// 12. Formula with parentheses
// ============================================================
describe("Parentheses", () => {
  it("=(A1+B1)*C1 respects order of operations", () => {
    // (100 + 5) * 10 = 1050
    const result = evaluateCellFormula("(A1+B1)*C1", data, headers);
    expect(result).toBe(1050);
  });
});
