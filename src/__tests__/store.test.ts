import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import {
  getAllDatasets,
  getDataset,
  saveDataset,
  deleteDataset,
  type DatasetFull,
} from "../lib/store";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DATASETS_FILE = path.join(DATA_DIR, "datasets.json");

let originalContent: string | null = null;
let testDatasetIds: string[] = [];

function backupDatasets() {
  if (fs.existsSync(DATASETS_FILE)) {
    originalContent = fs.readFileSync(DATASETS_FILE, "utf-8");
  }
}

const SEED_META = JSON.stringify([{"id":"sales-q1-2026","name":"Sales Performance 2026","fileName":"sales-q1-2026.csv","uploadedAt":"2026-01-01T00:00:00Z","rowCount":12,"columnCount":6,"headers":["Month","Revenue","Customers","Churn_Rate","MRR","Support_Tickets"],"columnTypes":{"Month":"string","Revenue":"number","Customers":"number","Churn_Rate":"number","MRR":"number","Support_Tickets":"number"}}], null, 2);

function restoreDatasets() {
  fs.writeFileSync(DATASETS_FILE, originalContent || SEED_META, "utf-8");
  // Clean up test data files
  for (const id of testDatasetIds) {
    const dataFile = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(dataFile)) {
      fs.unlinkSync(dataFile);
    }
  }
  testDatasetIds = [];
}

function makeTestDataset(id: string): DatasetFull {
  testDatasetIds.push(id);
  return {
    id,
    name: `Test Dataset ${id}`,
    fileName: "test.csv",
    uploadedAt: new Date().toISOString(),
    rowCount: 2,
    columnCount: 2,
    headers: ["a", "b"],
    columnTypes: { a: "number", b: "string" },
    rows: [
      { a: "1", b: "hello" },
      { a: "2", b: "world" },
    ],
  };
}

describe("store CRUD operations", () => {
  beforeEach(() => {
    backupDatasets();
  });

  afterEach(() => {
    restoreDatasets();
  });

  it("getAllDatasets returns an array", () => {
    const datasets = getAllDatasets();
    expect(Array.isArray(datasets)).toBe(true);
  });

  it("saveDataset adds a dataset and getDataset retrieves it", () => {
    const testId = `__test_${Date.now()}`;
    const dataset = makeTestDataset(testId);

    saveDataset(dataset);

    const retrieved = getDataset(testId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(testId);
    expect(retrieved!.name).toBe(`Test Dataset ${testId}`);
    expect(retrieved!.rows).toHaveLength(2);
    expect(retrieved!.rows[0]).toEqual({ a: "1", b: "hello" });
  });

  it("deleteDataset removes a dataset", () => {
    const testId = `__test_del_${Date.now()}`;
    const dataset = makeTestDataset(testId);

    saveDataset(dataset);
    expect(getDataset(testId)).not.toBeNull();

    const deleted = deleteDataset(testId);
    expect(deleted).toBe(true);
    expect(getDataset(testId)).toBeNull();
  });

  it("deleteDataset returns false for non-existent id", () => {
    const result = deleteDataset("nonexistent_id_12345");
    expect(result).toBe(false);
  });

  it("getDataset returns null for non-existent id", () => {
    const result = getDataset("nonexistent_id_12345");
    expect(result).toBeNull();
  });

  it("saveDataset persists metadata in datasets list", () => {
    const testId = `__test_meta_${Date.now()}`;
    const dataset = makeTestDataset(testId);

    saveDataset(dataset);

    const all = getAllDatasets();
    const found = all.find((d) => d.id === testId);
    expect(found).toBeDefined();
    expect(found!.headers).toEqual(["a", "b"]);
    expect(found!.rowCount).toBe(2);
  });
});
