import { describe, it, expect } from "vitest";
import {
  formatNumber,
  detectFormatType,
  autoFormat,
} from "../lib/format";

describe("formatNumber", () => {
  it("adds thousand separators for plain integers", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("handles small integers without separators needed", () => {
    expect(formatNumber(42)).toBe("42");
  });

  it("formats currency with euro sign", () => {
    expect(formatNumber(1234567, "currency")).toBe("€1,234,567");
  });

  it("formats negative currency", () => {
    expect(formatNumber(-500000, "currency")).toBe("€-500,000");
  });

  it("formats percent from decimal ratio", () => {
    expect(formatNumber(0.253, "percent")).toBe("25.3%");
  });

  it("formats percent from already-percentage value", () => {
    expect(formatNumber(25.3, "percent")).toBe("25.3%");
  });

  it("formats compact K", () => {
    expect(formatNumber(1500, "compact")).toBe("1.5K");
  });

  it("formats compact M", () => {
    expect(formatNumber(1234567, "compact")).toBe("1.2M");
  });

  it("formats compact B", () => {
    expect(formatNumber(2500000000, "compact")).toBe("2.5B");
  });

  it("formats decimal with 2 decimal places", () => {
    expect(formatNumber(1234.5678, "decimal")).toBe("1,234.57");
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(0, "currency")).toBe("€0");
    expect(formatNumber(0, "compact")).toBe("0");
  });

  it("handles negative numbers", () => {
    expect(formatNumber(-1234567)).toBe("-1,234,567");
    expect(formatNumber(-1234567, "compact")).toBe("-1.2M");
  });

  it("handles very large numbers in compact", () => {
    expect(formatNumber(999999999999, "compact")).toBe("1000B");
  });

  it("handles string input", () => {
    expect(formatNumber("42000", "compact")).toBe("42K");
  });

  it("returns original string for non-numeric input", () => {
    expect(formatNumber("hello")).toBe("hello");
  });
});

describe("detectFormatType", () => {
  it("detects percent from column name containing %", () => {
    expect(detectFormatType("Growth %")).toBe("percent");
  });

  it("detects percent from column name containing Rate", () => {
    expect(detectFormatType("Churn Rate")).toBe("percent");
  });

  it("detects percent from column name containing Margin", () => {
    expect(detectFormatType("Gross Margin")).toBe("percent");
  });

  it("detects currency from Revenue", () => {
    expect(detectFormatType("Revenue")).toBe("currency");
  });

  it("detects currency from MRR", () => {
    expect(detectFormatType("MRR")).toBe("currency");
  });

  it("detects currency from Cost", () => {
    expect(detectFormatType("Total Cost")).toBe("currency");
  });

  it("detects decimal from Count", () => {
    expect(detectFormatType("Ticket Count")).toBe("decimal");
  });

  it("returns undefined for generic columns", () => {
    expect(detectFormatType("Name")).toBeUndefined();
  });
});

describe("autoFormat", () => {
  it("returns compact for large numbers with generic column", () => {
    expect(autoFormat("Amount", 1500000)).toBe("compact");
  });

  it("returns undefined for small integers with generic column", () => {
    expect(autoFormat("Score", 42)).toBeUndefined();
  });

  it("prefers column name detection over heuristic", () => {
    expect(autoFormat("Revenue", 42)).toBe("currency");
  });

  it("returns decimal for non-integer small numbers", () => {
    expect(autoFormat("Ratio", 3.14159)).toBe("decimal");
  });
});
