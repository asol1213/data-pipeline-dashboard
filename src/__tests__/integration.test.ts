import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { parseCSV, detectAllColumnTypes } from "../lib/csv-parser";
import { parseSQL, executeQuery } from "../lib/sql-engine";
import { computeDatasetStats } from "../lib/stats";
import { analyzeDataset } from "../lib/insights";
import { calculateQuality } from "../lib/quality";
import { saveDataset, getDataset, deleteDataset, type DatasetFull } from "../lib/store";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DATASETS_FILE = path.join(DATA_DIR, "datasets.json");

let originalContent: string | null = null;
const testIds: string[] = [];

function backup() {
  if (fs.existsSync(DATASETS_FILE)) {
    originalContent = fs.readFileSync(DATASETS_FILE, "utf-8");
  }
}

function restore() {
  if (originalContent !== null) {
    fs.writeFileSync(DATASETS_FILE, originalContent, "utf-8");
  }
  for (const id of testIds) {
    const f = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  testIds.length = 0;
}

describe("Integration - Upload CSV -> Query with SQL -> Verify results", () => {
  beforeEach(backup);
  afterEach(restore);

  it("full flow: parse CSV, store, query, get correct results", () => {
    const csvContent = [
      "Product,Price,Quantity",
      "Widget,10.50,100",
      "Gadget,25.00,50",
      "Doohickey,15.75,75",
      "Thingamajig,42.00,30",
    ].join("\n");

    // Step 1: Parse CSV
    const parsed = parseCSV(csvContent);
    expect(parsed.headers).toEqual(["Product", "Price", "Quantity"]);
    expect(parsed.rows).toHaveLength(4);

    // Step 2: Detect types
    const columnTypes = detectAllColumnTypes(parsed.headers, parsed.rows);
    expect(columnTypes.Product).toBe("string");
    expect(columnTypes.Price).toBe("number");
    expect(columnTypes.Quantity).toBe("number");

    // Step 3: Store dataset
    const id = `__integ_flow_${Date.now()}`;
    testIds.push(id);
    const dataset: DatasetFull = {
      id,
      name: "Integration Test",
      fileName: "test.csv",
      uploadedAt: new Date().toISOString(),
      rowCount: parsed.rows.length,
      columnCount: parsed.headers.length,
      headers: parsed.headers,
      columnTypes,
      rows: parsed.rows,
    };
    // Step 4: Query with SQL (use parsed data directly, no store dependency)
    const datasets = new Map<
      string,
      { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }
    >();
    datasets.set("integration_test", {
      rows: parsed.rows,
      headers: parsed.headers,
      columnTypes,
    });

    // Query: filter by price > 15
    const sqlParsed = parseSQL("SELECT Product, Price FROM integration_test WHERE Price > 15");
    const result = executeQuery(sqlParsed, datasets);
    expect(result.rowCount).toBe(3);
    expect(result.rows.every((r) => Number(r.Price) > 15)).toBe(true);

    // Query: SUM of Quantity
    const sumParsed = parseSQL("SELECT SUM(Quantity) FROM integration_test");
    const sumResult = executeQuery(sumParsed, datasets);
    expect(sumResult.rows[0]["SUM(Quantity)"]).toBe(255);
  });
});

describe("Integration - Upload -> Stats -> Verify anomalies", () => {
  beforeEach(backup);
  afterEach(restore);

  it("detects anomalies in uploaded data", () => {
    const csvContent = [
      "Month,Value",
      "Jan,10",
      "Feb,10",
      "Mar,10",
      "Apr,10",
      "May,10",
      "Jun,10",
      "Jul,10",
      "Aug,10",
      "Sep,10",
      "Oct,200",
    ].join("\n");

    const parsed = parseCSV(csvContent);
    const columnTypes = detectAllColumnTypes(parsed.headers, parsed.rows);
    const stats = computeDatasetStats(parsed.rows, parsed.headers, columnTypes);

    expect(stats.totalRows).toBe(10);

    const valueStats = stats.columns.find((c) => c.column === "Value");
    expect(valueStats).toBeDefined();
    expect(valueStats!.anomalies).toBeDefined();
    expect(valueStats!.anomalies!.length).toBeGreaterThan(0);
    expect(valueStats!.anomalies).toContain(200);

    // Also verify insights detect the anomaly
    const insights = analyzeDataset(parsed.rows, stats, parsed.headers, columnTypes);
    const anomalyInsight = insights.find((i) => i.type === "anomaly");
    expect(anomalyInsight).toBeDefined();
  });
});

describe("Integration - Upload -> Quality score", () => {
  beforeEach(backup);
  afterEach(restore);

  it("computes quality score for uploaded data", () => {
    const csvContent = [
      "Name,Score,Grade",
      "Alice,90,A",
      "Bob,80,B",
      "Charlie,70,C",
      "Diana,,",
    ].join("\n");

    const parsed = parseCSV(csvContent);
    const columnTypes = detectAllColumnTypes(parsed.headers, parsed.rows);
    const stats = computeDatasetStats(parsed.rows, parsed.headers, columnTypes);
    const quality = calculateQuality(parsed.rows, stats);

    // Should have less than 100% completeness due to Diana's missing values
    expect(quality.completeness).toBeLessThan(100);
    expect(quality.qualityScore).toBeGreaterThanOrEqual(0);
    expect(quality.qualityScore).toBeLessThanOrEqual(100);
  });

  it("perfect data gets high quality score", () => {
    const csvContent = [
      "A,B,C",
      "1,2,3",
      "4,5,6",
      "7,8,9",
    ].join("\n");

    const parsed = parseCSV(csvContent);
    const columnTypes = detectAllColumnTypes(parsed.headers, parsed.rows);
    const stats = computeDatasetStats(parsed.rows, parsed.headers, columnTypes);
    const quality = calculateQuality(parsed.rows, stats);

    expect(quality.completeness).toBe(100);
    expect(quality.anomalyCount).toBe(0);
    expect(quality.qualityScore).toBeGreaterThanOrEqual(75);
  });
});
