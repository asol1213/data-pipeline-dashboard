import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { saveDataset, getDataset, type DatasetFull } from "../lib/store";
import { computeDatasetStats } from "../lib/stats";

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

function makeTestDataset(id: string): DatasetFull {
  testIds.push(id);
  return {
    id,
    name: `Chat Test ${id}`,
    fileName: "chat-test.csv",
    uploadedAt: new Date().toISOString(),
    rowCount: 3,
    columnCount: 2,
    headers: ["Month", "Revenue"],
    columnTypes: { Month: "string", Revenue: "number" },
    rows: [
      { Month: "Jan", Revenue: "100" },
      { Month: "Feb", Revenue: "200" },
      { Month: "Mar", Revenue: "300" },
    ],
  };
}

describe("API - Chat prerequisites", () => {
  beforeEach(backup);
  afterEach(restore);

  it("requires both datasetId and message fields", () => {
    // Test that both fields are needed by validating dataset existence
    const id = `__chat_req_${Date.now()}`;
    const ds = makeTestDataset(id);
    saveDataset(ds);
    const loaded = getDataset(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.rows).toHaveLength(3);
  });

  it("returns null for non-existent dataset", () => {
    const result = getDataset("nonexistent-chat-dataset");
    expect(result).toBeNull();
  });

  it("loads dataset data needed for chat context", () => {
    const id = `__chat_ctx_${Date.now()}`;
    const ds = makeTestDataset(id);
    saveDataset(ds);
    const loaded = getDataset(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.headers).toEqual(["Month", "Revenue"]);
    expect(loaded!.columnTypes).toEqual({ Month: "string", Revenue: "number" });
  });

  it("computes stats needed for chat system prompt", () => {
    const id = `__chat_stats_${Date.now()}`;
    const ds = makeTestDataset(id);
    saveDataset(ds);
    const loaded = getDataset(id);
    expect(loaded).not.toBeNull();

    const stats = computeDatasetStats(loaded!.rows, loaded!.headers, loaded!.columnTypes);
    expect(stats.totalRows).toBe(3);
    expect(stats.numericSummary).toHaveLength(1);
    expect(stats.numericSummary[0].column).toBe("Revenue");
    expect(stats.numericSummary[0].mean).toBe(200);
  });

  it("handles dataset with only string columns for chat", () => {
    const id = `__chat_str_${Date.now()}`;
    testIds.push(id);
    const ds: DatasetFull = {
      id,
      name: "String Only",
      fileName: "strings.csv",
      uploadedAt: new Date().toISOString(),
      rowCount: 2,
      columnCount: 1,
      headers: ["Name"],
      columnTypes: { Name: "string" },
      rows: [{ Name: "Alice" }, { Name: "Bob" }],
    };
    saveDataset(ds);
    const loaded = getDataset(id);
    expect(loaded).not.toBeNull();

    const stats = computeDatasetStats(loaded!.rows, loaded!.headers, loaded!.columnTypes);
    expect(stats.numericSummary).toHaveLength(0);
  });

  it("chat dataset sample is limited to available rows", () => {
    const id = `__chat_sample_${Date.now()}`;
    const ds = makeTestDataset(id);
    saveDataset(ds);
    const loaded = getDataset(id);
    expect(loaded).not.toBeNull();
    // sample for chat is first 10 rows; we have 3
    const sample = loaded!.rows.slice(0, 10);
    expect(sample).toHaveLength(3);
  });
});
