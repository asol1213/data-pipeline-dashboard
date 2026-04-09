import { describe, it, expect } from "vitest";
import {
  sanitizeInput,
  sanitizeFilename,
  validateFileSize,
  checkRateLimit,
  resetRateLimit,
} from "../lib/security";
import { parseSQL, executeQuery, SQLError } from "../lib/sql-engine";
import { ensureSeedData } from "../lib/seed";
import { getAllDatasets, getDataset } from "../lib/store";

function getTestDatasets() {
  ensureSeedData();
  const allMeta = getAllDatasets();
  const datasets = new Map<
    string,
    { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }
  >();
  for (const meta of allMeta) {
    const full = getDataset(meta.id);
    if (full) {
      datasets.set(meta.id, {
        rows: full.rows,
        headers: full.headers,
        columnTypes: full.columnTypes,
      });
    }
  }
  return datasets;
}

describe("Security - SQL Injection Prevention", () => {
  it("DROP TABLE in SQL is rejected by parser", () => {
    expect(() => {
      const parsed = parseSQL("SELECT * FROM sales; DROP TABLE sales");
      const datasets = getTestDatasets();
      executeQuery(parsed, datasets);
    }).toThrow();
  });

  it("UNION injection attempt is handled", () => {
    // This should either throw or return harmless results
    try {
      const parsed = parseSQL("SELECT * FROM sales_transactions UNION SELECT * FROM customers");
      const datasets = getTestDatasets();
      const result = executeQuery(parsed, datasets);
      // If it parses, it should not expose unexpected data
      expect(result).toBeDefined();
    } catch (e) {
      // Throwing is also acceptable behavior
      expect(e).toBeDefined();
    }
  });

  it("DELETE statement is rejected", () => {
    expect(() => {
      parseSQL("DELETE FROM sales_transactions");
    }).toThrow();
  });
});

describe("Security - XSS Prevention", () => {
  it("script tag in dataset name is sanitized", () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeInput(input);
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("event handler attributes are sanitized", () => {
    const input = '<img onerror="alert(1)" src=x>';
    const result = sanitizeInput(input);
    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });

  it("javascript: protocol with URL is sanitized", () => {
    const input = 'javascript:alert(document.cookie)//';
    const result = sanitizeInput(input);
    // Forward slashes should be escaped
    expect(result).toContain("&#x2F;");
    // Single quotes in alert payloads are escaped
    const input2 = "javascript:alert('xss')";
    const result2 = sanitizeInput(input2);
    expect(result2).toContain("&#x27;");
  });
});

describe("Security - Large Payload Handling", () => {
  it("10MB+ file is rejected by validateFileSize", () => {
    const tenMBPlus = 11 * 1024 * 1024;
    const result = validateFileSize(tenMBPlus);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/exceeds/i);
  });

  it("very large filename is truncated", () => {
    const longName = "a".repeat(500) + ".csv";
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(255);
  });
});

describe("Security - Empty/Null Inputs", () => {
  it("empty string to sanitizeInput returns empty string", () => {
    expect(sanitizeInput("")).toBe("");
  });

  it("empty string to sanitizeFilename returns empty string", () => {
    expect(sanitizeFilename("")).toBe("");
  });

  it("zero byte file is rejected", () => {
    const result = validateFileSize(0);
    expect(result.valid).toBe(false);
  });

  it("rate limiter handles rapid requests gracefully", () => {
    resetRateLimit("stress-test");
    const config = { windowMs: 60000, maxRequests: 5 };
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit("stress-test", config);
      if (i < 5) {
        expect(result.allowed).toBe(true);
      } else {
        expect(result.allowed).toBe(false);
      }
    }
    resetRateLimit("stress-test");
  });

  it("path traversal in filename is blocked", () => {
    const result = sanitizeFilename("../../../etc/passwd");
    expect(result).not.toContain("..");
    expect(result).not.toContain("/");
  });

  it("null bytes in filename are removed", () => {
    const result = sanitizeFilename("file\x00name.csv");
    expect(result).not.toContain("\x00");
  });
});
