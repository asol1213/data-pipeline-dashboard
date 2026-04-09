import { describe, it, expect, beforeEach } from "vitest";
import {
  getSavedQueries,
  saveQuery,
  deleteSavedQuery,
} from "../lib/saved-queries";

// Mock localStorage for Node environment
const storage = new Map<string, string>();

Object.defineProperty(globalThis, "window", {
  value: {
    dispatchEvent: () => {},
  },
  writable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
  writable: true,
});

describe("Saved Queries", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("getSavedQueries returns empty list initially", () => {
    const result = getSavedQueries();
    expect(result).toEqual([]);
  });

  it("saveQuery stores a query", () => {
    saveQuery("Top Revenue", "SELECT * FROM sales ORDER BY revenue DESC");
    const queries = getSavedQueries();
    expect(queries).toHaveLength(1);
    expect(queries[0].name).toBe("Top Revenue");
    expect(queries[0].sql).toBe("SELECT * FROM sales ORDER BY revenue DESC");
    expect(queries[0].createdAt).toBeGreaterThan(0);
  });

  it("getSavedQueries returns all saved queries", () => {
    saveQuery("Q1", "SELECT 1");
    saveQuery("Q2", "SELECT 2");
    saveQuery("Q3", "SELECT 3");
    const queries = getSavedQueries();
    expect(queries).toHaveLength(3);
  });

  it("deleteSavedQuery removes the correct one", () => {
    saveQuery("Q1", "SELECT 1");
    saveQuery("Q2", "SELECT 2");
    saveQuery("Q3", "SELECT 3");

    deleteSavedQuery("Q2");
    const queries = getSavedQueries();
    expect(queries).toHaveLength(2);
    expect(queries.find((q) => q.name === "Q2")).toBeUndefined();
    expect(queries.find((q) => q.name === "Q1")).toBeDefined();
    expect(queries.find((q) => q.name === "Q3")).toBeDefined();
  });

  it("saveQuery overwrites existing query with same name", () => {
    saveQuery("Q1", "SELECT 1");
    saveQuery("Q1", "SELECT 2");
    const queries = getSavedQueries();
    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toBe("SELECT 2");
  });

  it("deleteSavedQuery with non-existing name does nothing", () => {
    saveQuery("Q1", "SELECT 1");
    deleteSavedQuery("Nonexistent");
    const queries = getSavedQueries();
    expect(queries).toHaveLength(1);
  });

  it("handles corrupt localStorage gracefully", () => {
    storage.set("sql_saved_queries", "not valid json");
    const result = getSavedQueries();
    expect(result).toEqual([]);
  });
});
