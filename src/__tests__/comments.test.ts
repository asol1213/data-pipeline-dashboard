import { describe, it, expect, beforeEach } from "vitest";

// Mock localStorage for Node.js environment
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) delete store[key];
  },
  length: 0,
  key: () => null,
};

// Set up before importing the module
Object.defineProperty(globalThis, "window", {
  value: { localStorage: localStorageMock },
  writable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Import after mocking
const { addComment, getComments, resolveComment, deleteComment } = await import(
  "../lib/comments"
);

beforeEach(() => {
  localStorageMock.clear();
});

describe("Comments - add comment", () => {
  it("creates a comment with correct fields", () => {
    const comment = addComment("ds-1", "This looks wrong");
    expect(comment.id).toBeTruthy();
    expect(comment.datasetId).toBe("ds-1");
    expect(comment.text).toBe("This looks wrong");
    expect(comment.author).toBe("Andrew Arbo");
    expect(comment.resolved).toBe(false);
    expect(comment.timestamp).toBeTruthy();
  });
});

describe("Comments - get comments by dataset", () => {
  it("returns only comments for the given dataset", () => {
    addComment("ds-1", "Comment A");
    addComment("ds-2", "Comment B");
    addComment("ds-1", "Comment C");

    const ds1Comments = getComments("ds-1");
    expect(ds1Comments).toHaveLength(2);
    expect(ds1Comments.every((c: { datasetId: string }) => c.datasetId === "ds-1")).toBe(true);
  });
});

describe("Comments - resolve comment", () => {
  it("toggles resolved state", () => {
    const comment = addComment("ds-1", "Needs review");
    expect(comment.resolved).toBe(false);

    resolveComment(comment.id);
    const updated = getComments("ds-1").find((c: { id: string }) => c.id === comment.id);
    expect(updated?.resolved).toBe(true);

    // Toggle back
    resolveComment(comment.id);
    const toggled = getComments("ds-1").find((c: { id: string }) => c.id === comment.id);
    expect(toggled?.resolved).toBe(false);
  });
});

describe("Comments - thread (reply)", () => {
  it("creates a reply linked to parent", () => {
    const parent = addComment("ds-1", "Main comment");
    const reply = addComment("ds-1", "This is a reply", undefined, parent.id);

    expect(reply.parentId).toBe(parent.id);
    const all = getComments("ds-1");
    const replies = all.filter((c: { parentId?: string }) => c.parentId === parent.id);
    expect(replies).toHaveLength(1);
    expect(replies[0].text).toBe("This is a reply");
  });
});

describe("Comments - delete comment", () => {
  it("removes comment and its replies", () => {
    const parent = addComment("ds-1", "To delete");
    addComment("ds-1", "Reply to delete", undefined, parent.id);

    expect(getComments("ds-1")).toHaveLength(2);

    deleteComment(parent.id);
    expect(getComments("ds-1")).toHaveLength(0);
  });
});
