import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { saveDataset, getAllDatasets, getDataset, deleteDataset, type DatasetFull } from "../lib/store";
import { computeDatasetStats } from "../lib/stats";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DATASETS_FILE = path.join(DATA_DIR, "datasets.json");

let originalContent: string | null = null;
const testIds: string[] = [];

const SEED_META = JSON.stringify([{"id":"sales-q1-2026","name":"Sales Performance 2026","fileName":"sales-q1-2026.csv","uploadedAt":"2026-01-01T00:00:00Z","rowCount":12,"columnCount":6,"headers":["Month","Revenue","Customers","Churn_Rate","MRR","Support_Tickets"],"columnTypes":{"Month":"string","Revenue":"number","Customers":"number","Churn_Rate":"number","MRR":"number","Support_Tickets":"number"}}], null, 2);

function backup() {
  if (fs.existsSync(DATASETS_FILE)) {
    originalContent = fs.readFileSync(DATASETS_FILE, "utf-8");
  }
}

function restore() {
  // Always restore to known good state
  fs.writeFileSync(DATASETS_FILE, originalContent || SEED_META, "utf-8");
  for (const id of testIds) {
    const f = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  testIds.length = 0;
}

function makeDataset(id: string): DatasetFull {
  testIds.push(id);
  return {
    id,
    name: `API Test ${id}`,
    fileName: "test.csv",
    uploadedAt: new Date().toISOString(),
    rowCount: 3,
    columnCount: 2,
    headers: ["Name", "Value"],
    columnTypes: { Name: "string", Value: "number" },
    rows: [
      { Name: "A", Value: "10" },
      { Name: "B", Value: "20" },
      { Name: "C", Value: "30" },
    ],
  };
}

describe("API - GET /api/datasets (list)", () => {
  beforeEach(backup);
  afterEach(restore);

  it("returns a list of datasets", () => {
    const datasets = getAllDatasets();
    expect(Array.isArray(datasets)).toBe(true);
  });

  it("includes saved dataset in list after save", () => {
    const id = `__api_list_${Date.now()}`;
    const ds = makeDataset(id);
    saveDataset(ds);

    // Re-read from disk to verify persistence
    const raw = fs.readFileSync(DATASETS_FILE, "utf-8");
    const datasets = JSON.parse(raw);
    const found = datasets.find((d: { id: string }) => d.id === id);
    expect(found).toBeDefined();
    expect(found.name).toBe(`API Test ${id}`);
  });
});

describe("API - GET /api/datasets/[id] (single)", () => {
  beforeEach(backup);
  afterEach(restore);

  it("returns dataset with data for valid id", () => {
    const id = `__api_get_${Date.now()}`;
    const ds = makeDataset(id);
    saveDataset(ds);

    const result = getDataset(id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(id);
    expect(result!.rows).toHaveLength(3);
    expect(result!.headers).toEqual(["Name", "Value"]);
  });

  it("returns null (404) for missing dataset", () => {
    const result = getDataset("nonexistent-dataset-xyz");
    expect(result).toBeNull();
  });
});

describe("API - DELETE /api/datasets/[id]", () => {
  beforeEach(backup);
  afterEach(restore);

  it("removes a dataset and returns true", () => {
    const id = `__api_del_${Date.now()}`;
    saveDataset(makeDataset(id));

    const deleted = deleteDataset(id);
    expect(deleted).toBe(true);
    expect(getDataset(id)).toBeNull();
  });

  it("returns false for non-existent dataset", () => {
    const result = deleteDataset("nonexistent-delete-xyz");
    expect(result).toBe(false);
  });
});

describe("API - GET /api/datasets/[id]/stats", () => {
  beforeEach(backup);
  afterEach(restore);

  it("returns column stats for a dataset", () => {
    const id = `__api_stats_${Date.now()}`;
    const ds = makeDataset(id);
    saveDataset(ds);

    const full = getDataset(id);
    expect(full).not.toBeNull();

    const stats = computeDatasetStats(full!.rows, full!.headers, full!.columnTypes);
    expect(stats.totalRows).toBe(3);
    expect(stats.totalColumns).toBe(2);
    expect(stats.columns).toHaveLength(2);

    const valueCol = stats.columns.find((c) => c.column === "Value");
    expect(valueCol).toBeDefined();
    expect(valueCol!.type).toBe("number");
    expect(valueCol!.mean).toBe(20);
    expect(valueCol!.min).toBe(10);
    expect(valueCol!.max).toBe(30);
  });
});
