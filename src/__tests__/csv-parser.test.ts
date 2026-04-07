import { describe, it, expect } from "vitest";
import { parseCSV, detectColumnType, detectAllColumnTypes } from "../lib/csv-parser";

describe("parseCSV", () => {
  it("parses headers correctly", () => {
    const result = parseCSV("name,age,city\nAlice,30,NYC");
    expect(result.headers).toEqual(["name", "age", "city"]);
  });

  it("parses row values correctly", () => {
    const result = parseCSV("name,age\nAlice,30\nBob,25");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: "Alice", age: "30" });
    expect(result.rows[1]).toEqual({ name: "Bob", age: "25" });
  });

  it("handles quoted fields with commas", () => {
    const result = parseCSV('name,address\nAlice,"123 Main St, Apt 4"');
    expect(result.rows[0].address).toBe("123 Main St, Apt 4");
  });

  it("handles escaped quotes inside quoted fields", () => {
    const result = parseCSV('name,quote\nAlice,"She said ""hello"""');
    expect(result.rows[0].quote).toBe('She said "hello"');
  });

  it("handles empty values", () => {
    const result = parseCSV("a,b,c\n1,,3");
    expect(result.rows[0]).toEqual({ a: "1", b: "", c: "3" });
  });

  it("handles missing trailing columns", () => {
    const result = parseCSV("a,b,c\n1");
    expect(result.rows[0]).toEqual({ a: "1", b: "", c: "" });
  });

  it("returns empty result for empty input", () => {
    const result = parseCSV("");
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.rawRows).toEqual([]);
  });

  it("handles Windows-style line endings (CRLF)", () => {
    const result = parseCSV("a,b\r\n1,2\r\n3,4");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ a: "1", b: "2" });
  });

  it("populates rawRows correctly", () => {
    const result = parseCSV("x,y\n10,20\n30,40");
    expect(result.rawRows).toEqual([
      ["10", "20"],
      ["30", "40"],
    ]);
  });

  it("skips blank lines", () => {
    const result = parseCSV("a,b\n1,2\n\n3,4\n");
    expect(result.rows).toHaveLength(2);
  });
});

describe("detectColumnType", () => {
  it("detects number columns", () => {
    expect(detectColumnType(["1", "2", "3.5", "100"])).toBe("number");
  });

  it("detects date columns (ISO format)", () => {
    expect(detectColumnType(["2024-01-01", "2024-02-15", "2024-03-20"])).toBe("date");
  });

  it("detects date columns (US format)", () => {
    expect(detectColumnType(["1/15/2024", "2/20/2024", "12/31/2023"])).toBe("date");
  });

  it("detects date columns (month name format)", () => {
    expect(detectColumnType(["Jan 2024", "Feb 2024", "Mar 2024"])).toBe("date");
  });

  it("detects string columns", () => {
    expect(detectColumnType(["Alice", "Bob", "Charlie"])).toBe("string");
  });

  it("returns string for empty values", () => {
    expect(detectColumnType(["", "", ""])).toBe("string");
  });

  it("tolerates some non-numeric values in a number column (>80% threshold)", () => {
    // 9 out of 10 = 90% > 80% threshold
    expect(detectColumnType(["1", "2", "3", "4", "5", "6", "7", "8", "9", "N/A"])).toBe("number");
  });

  it("returns string when numbers are below threshold", () => {
    expect(detectColumnType(["1", "hello", "world", "foo", "bar"])).toBe("string");
  });
});

describe("detectAllColumnTypes", () => {
  it("detects types for all columns", () => {
    const headers = ["name", "age", "date"];
    const rows = [
      { name: "Alice", age: "30", date: "2024-01-01" },
      { name: "Bob", age: "25", date: "2024-02-15" },
      { name: "Charlie", age: "35", date: "2024-03-20" },
    ];
    const types = detectAllColumnTypes(headers, rows);
    expect(types.name).toBe("string");
    expect(types.age).toBe("number");
    expect(types.date).toBe("date");
  });
});
