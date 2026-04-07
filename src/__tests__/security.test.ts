import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimit,
  sanitizeInput,
  sanitizeFilename,
  validateFileSize,
  validateCSVContentType,
} from "../lib/security";

describe("Rate Limiter", () => {
  beforeEach(() => {
    resetRateLimit("test-key");
  });

  it("allows requests under the limit", () => {
    const result = checkRateLimit("test-key", { windowMs: 60000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks remaining requests correctly", () => {
    const config = { windowMs: 60000, maxRequests: 3 };
    const r1 = checkRateLimit("test-key", config);
    expect(r1.remaining).toBe(2);
    const r2 = checkRateLimit("test-key", config);
    expect(r2.remaining).toBe(1);
    const r3 = checkRateLimit("test-key", config);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    checkRateLimit("test-key", config);
    checkRateLimit("test-key", config);
    const r3 = checkRateLimit("test-key", config);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("resets after calling resetRateLimit", () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    checkRateLimit("test-key", config);
    const blocked = checkRateLimit("test-key", config);
    expect(blocked.allowed).toBe(false);

    resetRateLimit("test-key");
    const afterReset = checkRateLimit("test-key", config);
    expect(afterReset.allowed).toBe(true);
  });

  it("uses separate limits for different keys", () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    checkRateLimit("key-a", config);
    const resultA = checkRateLimit("key-a", config);
    expect(resultA.allowed).toBe(false);

    const resultB = checkRateLimit("key-b", config);
    expect(resultB.allowed).toBe(true);

    // cleanup
    resetRateLimit("key-a");
    resetRateLimit("key-b");
  });

  it("returns a resetAt timestamp in the future", () => {
    const result = checkRateLimit("test-key", { windowMs: 60000, maxRequests: 10 });
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
  });
});

describe("Input Sanitizer", () => {
  it("escapes HTML angle brackets", () => {
    expect(sanitizeInput("<div>")).toBe("&lt;div&gt;");
  });

  it("escapes script tags", () => {
    const result = sanitizeInput('<script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("escapes ampersands", () => {
    expect(sanitizeInput("a & b")).toBe("a &amp; b");
  });

  it("escapes quotes", () => {
    expect(sanitizeInput('"hello"')).toBe("&quot;hello&quot;");
    expect(sanitizeInput("'world'")).toBe("&#x27;world&#x27;");
  });

  it("escapes forward slashes", () => {
    expect(sanitizeInput("a/b")).toBe("a&#x2F;b");
  });

  it("handles empty string", () => {
    expect(sanitizeInput("")).toBe("");
  });

  it("handles already safe strings", () => {
    expect(sanitizeInput("hello world 123")).toBe("hello world 123");
  });
});

describe("File Size Validator", () => {
  it("accepts files under 10MB", () => {
    const result = validateFileSize(5 * 1024 * 1024);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts files exactly at the limit with custom max", () => {
    const result = validateFileSize(1000, 1000);
    expect(result.valid).toBe(true);
  });

  it("rejects files over 10MB", () => {
    const result = validateFileSize(11 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/exceeds maximum/i);
  });

  it("rejects empty files (0 bytes)", () => {
    const result = validateFileSize(0);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/empty/i);
  });

  it("rejects negative size", () => {
    const result = validateFileSize(-1);
    expect(result.valid).toBe(false);
  });

  it("accepts 1 byte file", () => {
    const result = validateFileSize(1);
    expect(result.valid).toBe(true);
  });
});

describe("Filename Sanitizer", () => {
  it("strips path traversal characters", () => {
    const result = sanitizeFilename("../../etc/passwd");
    expect(result).not.toContain("/");
    expect(result).not.toContain("..");
  });

  it("replaces special characters with underscores", () => {
    const result = sanitizeFilename("file name (1).csv");
    expect(result).toBe("file_name__1_.csv");
  });

  it("preserves valid characters", () => {
    const result = sanitizeFilename("my-file_v2.csv");
    expect(result).toBe("my-file_v2.csv");
  });

  it("truncates to 255 characters", () => {
    const longName = "a".repeat(300) + ".csv";
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(255);
  });

  it("collapses multiple dots", () => {
    const result = sanitizeFilename("file...name.csv");
    expect(result).not.toContain("..");
  });

  it("handles empty filename", () => {
    const result = sanitizeFilename("");
    expect(result).toBe("");
  });
});

describe("CSV Content Type Validator", () => {
  it("accepts text/csv", () => {
    expect(validateCSVContentType("text/csv").valid).toBe(true);
  });

  it("accepts text/plain", () => {
    expect(validateCSVContentType("text/plain").valid).toBe(true);
  });

  it("accepts application/csv", () => {
    expect(validateCSVContentType("application/csv").valid).toBe(true);
  });

  it("rejects application/json", () => {
    const result = validateCSVContentType("application/json");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid content type/);
  });

  it("rejects image/png", () => {
    expect(validateCSVContentType("image/png").valid).toBe(false);
  });
});
