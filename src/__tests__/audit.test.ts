import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  logAudit,
  getAuditLog,
  clearAuditLog,
  saveVersion,
  getVersions,
  restoreVersion,
  compareVersions,
  type AuditEntry,
  type DatasetVersion,
} from "@/lib/audit";

// Mock localStorage
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }
  }),
  get length() {
    return Object.keys(storage).length;
  },
  key: vi.fn((i: number) => Object.keys(storage)[i] ?? null),
};

Object.defineProperty(globalThis, "window", {
  value: { localStorage: localStorageMock },
  writable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

function clearStorage() {
  for (const key of Object.keys(storage)) {
    delete storage[key];
  }
}

describe("Audit Trail", () => {
  beforeEach(() => {
    clearStorage();
    vi.clearAllMocks();
  });

  it("logAudit creates entry with timestamp and id", () => {
    logAudit({
      action: "cell_edit",
      datasetId: "ds1",
      datasetName: "Test Dataset",
      details: {
        row: 0,
        column: "Name",
        oldValue: "Alice",
        newValue: "Bob",
        description: 'Row 1, Column "Name": "Alice" -> "Bob"',
      },
      user: "Andrew Arbo",
    });

    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].id).toBeDefined();
    expect(log[0].timestamp).toBeDefined();
    expect(new Date(log[0].timestamp).getTime()).toBeGreaterThan(0);
    expect(log[0].action).toBe("cell_edit");
    expect(log[0].datasetId).toBe("ds1");
    expect(log[0].user).toBe("Andrew Arbo");
  });

  it("getAuditLog returns entries newest first", () => {
    logAudit({
      action: "cell_edit",
      datasetId: "ds1",
      datasetName: "Test",
      details: { description: "First edit" },
      user: "Andrew Arbo",
    });
    logAudit({
      action: "row_add",
      datasetId: "ds1",
      datasetName: "Test",
      details: { description: "Second action" },
      user: "Andrew Arbo",
    });

    const log = getAuditLog();
    expect(log).toHaveLength(2);
    // Newest first
    expect(log[0].action).toBe("row_add");
    expect(log[1].action).toBe("cell_edit");
  });

  it("filters by datasetId", () => {
    logAudit({
      action: "cell_edit",
      datasetId: "ds1",
      datasetName: "Dataset 1",
      details: { description: "Edit ds1" },
      user: "Andrew Arbo",
    });
    logAudit({
      action: "row_add",
      datasetId: "ds2",
      datasetName: "Dataset 2",
      details: { description: "Add row ds2" },
      user: "Andrew Arbo",
    });
    logAudit({
      action: "row_delete",
      datasetId: "ds1",
      datasetName: "Dataset 1",
      details: { description: "Delete row ds1" },
      user: "Andrew Arbo",
    });

    const ds1Log = getAuditLog("ds1");
    expect(ds1Log).toHaveLength(2);
    expect(ds1Log.every((e) => e.datasetId === "ds1")).toBe(true);

    const ds2Log = getAuditLog("ds2");
    expect(ds2Log).toHaveLength(1);
    expect(ds2Log[0].datasetId).toBe("ds2");
  });

  it("respects limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      logAudit({
        action: "cell_edit",
        datasetId: "ds1",
        datasetName: "Test",
        details: { description: `Edit ${i}` },
        user: "Andrew Arbo",
      });
    }

    const limited = getAuditLog(undefined, 3);
    expect(limited).toHaveLength(3);
  });

  it("enforces max 500 entries (FIFO)", () => {
    for (let i = 0; i < 510; i++) {
      logAudit({
        action: "cell_edit",
        datasetId: "ds1",
        datasetName: "Test",
        details: { description: `Edit #${i}` },
        user: "Andrew Arbo",
      });
    }

    const log = getAuditLog();
    expect(log.length).toBeLessThanOrEqual(500);
    // Most recent entry should be the last one added
    expect(log[0].details.description).toBe("Edit #509");
  });

  it("clearAuditLog empties the log", () => {
    logAudit({
      action: "cell_edit",
      datasetId: "ds1",
      datasetName: "Test",
      details: { description: "Edit" },
      user: "Andrew Arbo",
    });
    expect(getAuditLog()).toHaveLength(1);

    clearAuditLog();
    expect(getAuditLog()).toHaveLength(0);
  });

  it("filters by action type when combined with datasetId", () => {
    logAudit({
      action: "cell_edit",
      datasetId: "ds1",
      datasetName: "Test",
      details: { description: "Cell edit" },
      user: "Andrew Arbo",
    });
    logAudit({
      action: "query_run",
      datasetId: "ds1",
      datasetName: "Test",
      details: { sql: "SELECT *", description: "Query" },
      user: "Andrew Arbo",
    });

    const all = getAuditLog("ds1");
    expect(all).toHaveLength(2);

    // Filter by action manually (the function supports datasetId filter)
    const queries = all.filter((e) => e.action === "query_run");
    expect(queries).toHaveLength(1);
    expect(queries[0].details.sql).toBe("SELECT *");
  });
});

describe("Version History", () => {
  beforeEach(() => {
    clearStorage();
    vi.clearAllMocks();
  });

  it("saveVersion creates a snapshot", () => {
    const rows = [
      { Name: "Alice", Age: "30" },
      { Name: "Bob", Age: "25" },
    ];
    saveVersion("ds1", rows, "Initial version");

    const versions = getVersions("ds1");
    expect(versions).toHaveLength(1);
    expect(versions[0].datasetId).toBe("ds1");
    expect(versions[0].rowCount).toBe(2);
    expect(versions[0].description).toBe("Initial version");
    expect(versions[0].timestamp).toBeDefined();
    expect(JSON.parse(versions[0].snapshot)).toEqual(rows);
  });

  it("getVersions returns versions for specific dataset", () => {
    saveVersion("ds1", [{ A: "1" }], "Version 1 for ds1");
    saveVersion("ds2", [{ B: "2" }], "Version 1 for ds2");
    saveVersion("ds1", [{ A: "1" }, { A: "2" }], "Version 2 for ds1");

    const ds1Versions = getVersions("ds1");
    expect(ds1Versions).toHaveLength(2);

    const ds2Versions = getVersions("ds2");
    expect(ds2Versions).toHaveLength(1);

    // Empty dataset returns empty
    const ds3Versions = getVersions("ds3");
    expect(ds3Versions).toHaveLength(0);
  });

  it("compareVersions detects added rows", () => {
    const rows1 = [{ Name: "Alice" }];
    const rows2 = [{ Name: "Alice" }, { Name: "Bob" }];

    saveVersion("ds1", rows1, "V1");
    saveVersion("ds1", rows2, "V2");

    const versions = getVersions("ds1");
    // Newest first
    const result = compareVersions(versions[1], versions[0]);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);
  });

  it("compareVersions detects removed rows", () => {
    const rows1 = [{ Name: "Alice" }, { Name: "Bob" }];
    const rows2 = [{ Name: "Alice" }];

    saveVersion("ds1", rows1, "V1");
    saveVersion("ds1", rows2, "V2");

    const versions = getVersions("ds1");
    const result = compareVersions(versions[1], versions[0]);
    expect(result.removed).toBe(1);
    expect(result.added).toBe(0);
  });

  it("compareVersions detects changed rows", () => {
    const rows1 = [
      { Name: "Alice", Age: "30" },
      { Name: "Bob", Age: "25" },
    ];
    const rows2 = [
      { Name: "Alice", Age: "31" },
      { Name: "Bob", Age: "25" },
    ];

    saveVersion("ds1", rows1, "V1");
    saveVersion("ds1", rows2, "V2");

    const versions = getVersions("ds1");
    const result = compareVersions(versions[1], versions[0]);
    expect(result.changed).toBe(1);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
  });

  it("restoreVersion returns correct data", () => {
    const rows = [{ Name: "Alice", Age: "30" }];
    saveVersion("ds1", rows, "V1");

    const versions = getVersions("ds1");
    const restored = restoreVersion("ds1", versions[0].id);
    expect(restored).toEqual(rows);
  });

  it("restoreVersion returns null for non-existent version", () => {
    const restored = restoreVersion("ds1", "non-existent-id");
    expect(restored).toBeNull();
  });

  it("enforces max 10 versions per dataset", () => {
    for (let i = 0; i < 15; i++) {
      saveVersion("ds1", [{ val: String(i) }], `Version ${i}`);
    }

    const versions = getVersions("ds1");
    expect(versions.length).toBeLessThanOrEqual(10);
    // Most recent should be the last one saved
    expect(versions[0].description).toBe("Version 14");
  });
});
