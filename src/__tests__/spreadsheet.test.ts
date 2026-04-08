import { describe, it, expect } from "vitest";

// ── Spreadsheet logic helpers (tested in isolation, no React needed) ──

interface HistoryEntry {
  action: "edit" | "addRow" | "deleteRow" | "addColumn";
  row: number;
  col: string;
  oldValue: string;
  newValue: string;
  rowData?: Record<string, string>;
}

const MAX_HISTORY = 50;

/** Apply an edit to a data array (immutable). */
function applyEdit(
  data: Record<string, string>[],
  row: number,
  col: string,
  value: string
): Record<string, string>[] {
  const updated = data.map((r) => ({ ...r }));
  if (updated[row]) {
    updated[row][col] = value;
  }
  return updated;
}

/** Add an empty row. */
function addRow(
  data: Record<string, string>[],
  headers: string[]
): Record<string, string>[] {
  const emptyRow: Record<string, string> = {};
  for (const h of headers) {
    emptyRow[h] = "";
  }
  return [...data, emptyRow];
}

/** Delete a row by index. */
function deleteRow(
  data: Record<string, string>[],
  index: number
): Record<string, string>[] {
  return data.filter((_, i) => i !== index);
}

/** Sort data by column. */
function sortByColumn(
  data: Record<string, string>[],
  col: string,
  dir: "asc" | "desc",
  colType: string
): Record<string, string>[] {
  return [...data].sort((a, b) => {
    const aVal = a[col] ?? "";
    const bVal = b[col] ?? "";
    if (colType === "number") {
      const diff = Number(aVal) - Number(bVal);
      return dir === "asc" ? diff : -diff;
    }
    const cmp = aVal.localeCompare(bVal);
    return dir === "asc" ? cmp : -cmp;
  });
}

/** Validate that a value is numeric. Returns true if valid, false if warning. */
function isValidNumber(value: string): boolean {
  if (value === "") return true;
  return !isNaN(Number(value)) && value.trim() !== "";
}

/** Push to history with undo limit. */
function pushToHistory(
  history: HistoryEntry[],
  historyIndex: number,
  entry: HistoryEntry
): { history: HistoryEntry[]; historyIndex: number } {
  const base = history.slice(0, historyIndex + 1);
  const updated = [...base, entry];
  const trimmed =
    updated.length > MAX_HISTORY
      ? updated.slice(updated.length - MAX_HISTORY)
      : updated;
  return {
    history: trimmed,
    historyIndex: trimmed.length - 1,
  };
}

/** Undo: returns the previous state info. */
function undo(
  data: Record<string, string>[],
  history: HistoryEntry[],
  historyIndex: number
): { data: Record<string, string>[]; historyIndex: number } | null {
  if (historyIndex < 0 || history.length === 0) return null;
  const entry = history[historyIndex];
  if (entry.action === "edit") {
    return {
      data: applyEdit(data, entry.row, entry.col, entry.oldValue),
      historyIndex: historyIndex - 1,
    };
  }
  return null;
}

/** Redo: re-applies the next entry. */
function redo(
  data: Record<string, string>[],
  history: HistoryEntry[],
  historyIndex: number
): { data: Record<string, string>[]; historyIndex: number } | null {
  if (historyIndex >= history.length - 1) return null;
  const entry = history[historyIndex + 1];
  if (entry.action === "edit") {
    return {
      data: applyEdit(data, entry.row, entry.col, entry.newValue),
      historyIndex: historyIndex + 1,
    };
  }
  return null;
}

/** Add a column to data and headers. */
function addColumn(
  data: Record<string, string>[],
  headers: string[],
  name: string
): { data: Record<string, string>[]; headers: string[] } {
  return {
    headers: [...headers, name],
    data: data.map((row) => ({ ...row, [name]: "" })),
  };
}

// ── Tests ──

describe("Spreadsheet: cell editing", () => {
  it("should save a new value to the correct cell", () => {
    const data = [
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ];
    const result = applyEdit(data, 0, "name", "Charlie");
    expect(result[0].name).toBe("Charlie");
    expect(result[1].name).toBe("Bob");
  });

  it("should not mutate original data array", () => {
    const data = [{ name: "Alice", age: "30" }];
    const result = applyEdit(data, 0, "name", "Charlie");
    expect(data[0].name).toBe("Alice");
    expect(result[0].name).toBe("Charlie");
  });
});

describe("Spreadsheet: undo/redo", () => {
  it("undo should restore old value after edit", () => {
    const data = [{ name: "Alice", age: "30" }];
    let history: HistoryEntry[] = [];
    let historyIndex = -1;

    // Edit
    const edited = applyEdit(data, 0, "name", "Bob");
    const h = pushToHistory(history, historyIndex, {
      action: "edit",
      row: 0,
      col: "name",
      oldValue: "Alice",
      newValue: "Bob",
    });
    history = h.history;
    historyIndex = h.historyIndex;

    // Undo
    const undone = undo(edited, history, historyIndex);
    expect(undone).not.toBeNull();
    expect(undone!.data[0].name).toBe("Alice");
    expect(undone!.historyIndex).toBe(-1);
  });

  it("redo should reapply value after undo", () => {
    const data = [{ name: "Alice", age: "30" }];
    let history: HistoryEntry[] = [];
    let historyIndex = -1;

    // Edit
    const edited = applyEdit(data, 0, "name", "Bob");
    const h = pushToHistory(history, historyIndex, {
      action: "edit",
      row: 0,
      col: "name",
      oldValue: "Alice",
      newValue: "Bob",
    });
    history = h.history;
    historyIndex = h.historyIndex;

    // Undo
    const undone = undo(edited, history, historyIndex);
    historyIndex = undone!.historyIndex;

    // Redo
    const redone = redo(undone!.data, history, historyIndex);
    expect(redone).not.toBeNull();
    expect(redone!.data[0].name).toBe("Bob");
    expect(redone!.historyIndex).toBe(0);
  });

  it("multiple undos should work in sequence", () => {
    let data: Record<string, string>[] = [{ val: "A" }];
    let history: HistoryEntry[] = [];
    let historyIndex = -1;

    // Edit 1: A -> B
    data = applyEdit(data, 0, "val", "B");
    let h = pushToHistory(history, historyIndex, {
      action: "edit",
      row: 0,
      col: "val",
      oldValue: "A",
      newValue: "B",
    });
    history = h.history;
    historyIndex = h.historyIndex;

    // Edit 2: B -> C
    data = applyEdit(data, 0, "val", "C");
    h = pushToHistory(history, historyIndex, {
      action: "edit",
      row: 0,
      col: "val",
      oldValue: "B",
      newValue: "C",
    });
    history = h.history;
    historyIndex = h.historyIndex;

    // Undo: C -> B
    let undone = undo(data, history, historyIndex);
    expect(undone!.data[0].val).toBe("B");
    data = undone!.data;
    historyIndex = undone!.historyIndex;

    // Undo: B -> A
    undone = undo(data, history, historyIndex);
    expect(undone!.data[0].val).toBe("A");
  });

  it("undo limit should cap at MAX_HISTORY (50)", () => {
    let history: HistoryEntry[] = [];
    let historyIndex = -1;

    // Push 60 entries
    for (let i = 0; i < 60; i++) {
      const h = pushToHistory(history, historyIndex, {
        action: "edit",
        row: 0,
        col: "val",
        oldValue: String(i),
        newValue: String(i + 1),
      });
      history = h.history;
      historyIndex = h.historyIndex;
    }

    expect(history.length).toBe(MAX_HISTORY);
    expect(historyIndex).toBe(MAX_HISTORY - 1);
  });

  it("undo on empty history returns null", () => {
    const data = [{ name: "Alice" }];
    const result = undo(data, [], -1);
    expect(result).toBeNull();
  });

  it("redo at end of history returns null", () => {
    const data = [{ name: "Alice" }];
    const history: HistoryEntry[] = [
      {
        action: "edit",
        row: 0,
        col: "name",
        oldValue: "X",
        newValue: "Alice",
      },
    ];
    const result = redo(data, history, 0);
    expect(result).toBeNull();
  });
});

describe("Spreadsheet: number validation", () => {
  it("valid number returns true", () => {
    expect(isValidNumber("42")).toBe(true);
    expect(isValidNumber("3.14")).toBe(true);
    expect(isValidNumber("-100")).toBe(true);
    expect(isValidNumber("0")).toBe(true);
  });

  it('"abc" in number column flags warning', () => {
    expect(isValidNumber("abc")).toBe(false);
  });

  it("empty string is considered valid (allows clearing)", () => {
    expect(isValidNumber("")).toBe(true);
  });
});

describe("Spreadsheet: row operations", () => {
  it("addRow creates an empty row with all headers", () => {
    const data = [{ name: "Alice", age: "30" }];
    const headers = ["name", "age"];
    const result = addRow(data, headers);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ name: "", age: "" });
  });

  it("deleteRow removes the correct row", () => {
    const data = [
      { name: "Alice" },
      { name: "Bob" },
      { name: "Charlie" },
    ];
    const result = deleteRow(data, 1);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[1].name).toBe("Charlie");
  });

  it("deleteRow on empty data returns empty array", () => {
    const result = deleteRow([], 0);
    expect(result).toHaveLength(0);
  });
});

describe("Spreadsheet: column sort", () => {
  it("sorts numeric column ascending", () => {
    const data: Record<string, string>[] = [
      { val: "30" },
      { val: "10" },
      { val: "20" },
    ];
    const sorted = sortByColumn(data, "val", "asc", "number");
    expect(sorted[0].val).toBe("10");
    expect(sorted[1].val).toBe("20");
    expect(sorted[2].val).toBe("30");
  });

  it("sorts string column descending", () => {
    const data: Record<string, string>[] = [
      { name: "Alice" },
      { name: "Charlie" },
      { name: "Bob" },
    ];
    const sorted = sortByColumn(data, "name", "desc", "string");
    expect(sorted[0].name).toBe("Charlie");
    expect(sorted[1].name).toBe("Bob");
    expect(sorted[2].name).toBe("Alice");
  });
});

describe("Spreadsheet: empty dataset", () => {
  it("handles empty data gracefully", () => {
    const data: Record<string, string>[] = [];
    const result = addRow(data, ["a", "b"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ a: "", b: "" });
  });
});

describe("Spreadsheet: add column", () => {
  it("addColumn adds column to headers and empty values to all rows", () => {
    const data = [{ name: "Alice" }, { name: "Bob" }];
    const headers = ["name"];
    const result = addColumn(data, headers, "age");
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.data[0]).toEqual({ name: "Alice", age: "" });
    expect(result.data[1]).toEqual({ name: "Bob", age: "" });
  });
});
