import { describe, it, expect } from "vitest";
import { createPivotTable } from "../lib/pivot";
import type { AggregationType } from "../lib/pivot";

const budgetData: Record<string, string>[] = [
  { Department: "Engineering", Quarter: "Q1", Budget: "500" },
  { Department: "Engineering", Quarter: "Q2", Budget: "600" },
  { Department: "Marketing", Quarter: "Q1", Budget: "300" },
  { Department: "Marketing", Quarter: "Q2", Budget: "400" },
  { Department: "Sales", Quarter: "Q1", Budget: "200" },
  { Department: "Sales", Quarter: "Q2", Budget: "250" },
];

const detailedData: Record<string, string>[] = [
  { Department: "Engineering", Quarter: "Q1", Budget: "500" },
  { Department: "Engineering", Quarter: "Q1", Budget: "100" },
  { Department: "Engineering", Quarter: "Q2", Budget: "600" },
  { Department: "Marketing", Quarter: "Q1", Budget: "300" },
  { Department: "Marketing", Quarter: "Q2", Budget: "400" },
];

describe("Pivot Table - SUM", () => {
  it("creates basic pivot table with SUM aggregation", () => {
    const result = createPivotTable(budgetData, "Department", "Quarter", "Budget", "SUM");
    expect(result.rowHeaders).toEqual(["Engineering", "Marketing", "Sales"]);
    expect(result.colHeaders).toEqual(["Q1", "Q2"]);
    // Engineering Q1=500, Q2=600
    expect(result.cells[0]).toEqual([500, 600]);
    // Marketing Q1=300, Q2=400
    expect(result.cells[1]).toEqual([300, 400]);
    // Sales Q1=200, Q2=250
    expect(result.cells[2]).toEqual([200, 250]);
  });

  it("computes correct row totals with SUM", () => {
    const result = createPivotTable(budgetData, "Department", "Quarter", "Budget", "SUM");
    expect(result.rowTotals[0]).toBe(1100); // Engineering
    expect(result.rowTotals[1]).toBe(700);  // Marketing
    expect(result.rowTotals[2]).toBe(450);  // Sales
  });

  it("computes correct column totals with SUM", () => {
    const result = createPivotTable(budgetData, "Department", "Quarter", "Budget", "SUM");
    expect(result.colTotals[0]).toBe(1000); // Q1: 500+300+200
    expect(result.colTotals[1]).toBe(1250); // Q2: 600+400+250
  });

  it("computes correct grand total with SUM", () => {
    const result = createPivotTable(budgetData, "Department", "Quarter", "Budget", "SUM");
    expect(result.grandTotal).toBe(2250); // 500+600+300+400+200+250
  });

  it("sums multiple values in same cell", () => {
    const result = createPivotTable(detailedData, "Department", "Quarter", "Budget", "SUM");
    // Engineering Q1 has 500+100=600
    expect(result.cells[0][0]).toBe(600);
  });
});

describe("Pivot Table - AVG", () => {
  it("computes AVG aggregation", () => {
    const result = createPivotTable(detailedData, "Department", "Quarter", "Budget", "AVG");
    // Engineering Q1: (500+100)/2 = 300
    expect(result.cells[0][0]).toBe(300);
    // Engineering Q2: 600/1 = 600
    expect(result.cells[0][1]).toBe(600);
  });
});

describe("Pivot Table - COUNT", () => {
  it("computes COUNT aggregation", () => {
    const result = createPivotTable(detailedData, "Department", "Quarter", "Budget", "COUNT");
    // Engineering Q1 has 2 entries
    expect(result.cells[0][0]).toBe(2);
    // Engineering Q2 has 1 entry
    expect(result.cells[0][1]).toBe(1);
    // Marketing Q1 has 1 entry
    expect(result.cells[1][0]).toBe(1);
  });

  it("computes COUNT grand total", () => {
    const result = createPivotTable(detailedData, "Department", "Quarter", "Budget", "COUNT");
    expect(result.grandTotal).toBe(5);
  });
});

describe("Pivot Table - MIN", () => {
  it("computes MIN aggregation", () => {
    const result = createPivotTable(detailedData, "Department", "Quarter", "Budget", "MIN");
    // Engineering Q1: min(500, 100) = 100
    expect(result.cells[0][0]).toBe(100);
  });
});

describe("Pivot Table - MAX", () => {
  it("computes MAX aggregation", () => {
    const result = createPivotTable(detailedData, "Department", "Quarter", "Budget", "MAX");
    // Engineering Q1: max(500, 100) = 500
    expect(result.cells[0][0]).toBe(500);
  });
});

describe("Pivot Table - Edge cases", () => {
  it("handles empty data", () => {
    const result = createPivotTable([], "Department", "Quarter", "Budget", "SUM");
    expect(result.rowHeaders).toEqual([]);
    expect(result.colHeaders).toEqual([]);
    expect(result.cells).toEqual([]);
    expect(result.rowTotals).toEqual([]);
    expect(result.colTotals).toEqual([]);
    expect(result.grandTotal).toBe(0);
  });

  it("handles single row of data", () => {
    const singleRow = [{ Department: "Engineering", Quarter: "Q1", Budget: "500" }];
    const result = createPivotTable(singleRow, "Department", "Quarter", "Budget", "SUM");
    expect(result.rowHeaders).toEqual(["Engineering"]);
    expect(result.colHeaders).toEqual(["Q1"]);
    expect(result.cells).toEqual([[500]]);
    expect(result.rowTotals).toEqual([500]);
    expect(result.colTotals).toEqual([500]);
    expect(result.grandTotal).toBe(500);
  });

  it("handles cells with no data (sparse matrix)", () => {
    const sparseData = [
      { Department: "Engineering", Quarter: "Q1", Budget: "500" },
      { Department: "Marketing", Quarter: "Q2", Budget: "400" },
    ];
    const result = createPivotTable(sparseData, "Department", "Quarter", "Budget", "SUM");
    // Engineering Q2 = 0 (no data)
    expect(result.cells[0][1]).toBe(0);
    // Marketing Q1 = 0 (no data)
    expect(result.cells[1][0]).toBe(0);
  });
});
