import { describe, it, expect, beforeEach } from "vitest";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  removeFavoriteByHref,
  isFavorite,
  clearFavorites,
} from "../lib/favorites";

// Mock localStorage and window for Node environment
const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() { return storage.size; },
  key: (_index: number) => null as string | null,
};

const eventListeners: Array<(e: Event) => void> = [];

Object.defineProperty(globalThis, "window", {
  value: {
    dispatchEvent: (e: Event) => {
      eventListeners.forEach((fn) => fn(e));
    },
    addEventListener: (_type: string, fn: (e: Event) => void) => {
      eventListeners.push(fn);
    },
  },
  writable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(globalThis, "CustomEvent", {
  value: class CustomEvent extends Event {
    detail: unknown;
    constructor(type: string, opts?: { detail?: unknown }) {
      super(type);
      this.detail = opts?.detail;
    }
  },
  writable: true,
});

describe("Favorites", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("getFavorites returns empty list initially", () => {
    const result = getFavorites();
    expect(result).toEqual([]);
  });

  it("addFavorite creates an entry", () => {
    addFavorite({ type: "page", label: "Dashboard", href: "/dashboard" });
    const favs = getFavorites();
    expect(favs).toHaveLength(1);
    expect(favs[0].label).toBe("Dashboard");
    expect(favs[0].href).toBe("/dashboard");
    expect(favs[0].type).toBe("page");
    expect(favs[0].id).toBeTruthy();
    expect(favs[0].addedAt).toBeTruthy();
  });

  it("getFavorites returns all favorites", () => {
    addFavorite({ type: "page", label: "Dashboard", href: "/dashboard" });
    addFavorite({ type: "dataset", label: "Sales", href: "/data/sales" });
    addFavorite({ type: "query", label: "Top 10", href: "/query/top10" });
    const favs = getFavorites();
    expect(favs).toHaveLength(3);
  });

  it("removeFavorite removes the correct one", () => {
    addFavorite({ type: "page", label: "Dashboard", href: "/dashboard" });
    addFavorite({ type: "dataset", label: "Sales", href: "/data/sales" });
    const favs = getFavorites();
    const idToRemove = favs[0].id;

    removeFavorite(idToRemove);
    const after = getFavorites();
    expect(after).toHaveLength(1);
    expect(after[0].label).toBe("Sales");
  });

  it("removeFavoriteByHref removes the correct one", () => {
    addFavorite({ type: "page", label: "Dashboard", href: "/dashboard" });
    addFavorite({ type: "dataset", label: "Sales", href: "/data/sales" });

    removeFavoriteByHref("/dashboard");
    const after = getFavorites();
    expect(after).toHaveLength(1);
    expect(after[0].href).toBe("/data/sales");
  });

  it("isFavorite returns true for existing href", () => {
    addFavorite({ type: "page", label: "Dashboard", href: "/dashboard" });
    expect(isFavorite("/dashboard")).toBe(true);
  });

  it("isFavorite returns false for non-existing href", () => {
    expect(isFavorite("/nonexistent")).toBe(false);
  });

  it("clearFavorites empties the list", () => {
    addFavorite({ type: "page", label: "Dashboard", href: "/dashboard" });
    addFavorite({ type: "dataset", label: "Sales", href: "/data/sales" });
    expect(getFavorites()).toHaveLength(2);

    clearFavorites();
    expect(getFavorites()).toHaveLength(0);
  });

  it("addFavorite does not add duplicates with same href", () => {
    addFavorite({ type: "page", label: "Dashboard", href: "/dashboard" });
    addFavorite({ type: "page", label: "Dashboard Again", href: "/dashboard" });
    const favs = getFavorites();
    expect(favs).toHaveLength(1);
    expect(favs[0].label).toBe("Dashboard");
  });

  it("removeFavorite with non-existing id does not remove anything", () => {
    addFavorite({ type: "page", label: "Dashboard", href: "/dashboard" });
    removeFavorite("non-existing-id");
    expect(getFavorites()).toHaveLength(1);
  });
});
