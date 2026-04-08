export interface SavedQuery {
  name: string;
  sql: string;
  createdAt: number;
}

const STORAGE_KEY = "sql_saved_queries";

/** Get all saved queries from localStorage */
export function getSavedQueries(): SavedQuery[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedQuery[];
  } catch {
    return [];
  }
}

/** Save a query by name. Overwrites if name already exists. */
export function saveQuery(name: string, sql: string): void {
  if (typeof window === "undefined") return;
  const queries = getSavedQueries();
  const existing = queries.findIndex((q) => q.name === name);
  const entry: SavedQuery = { name, sql, createdAt: Date.now() };
  if (existing >= 0) {
    queries[existing] = entry;
  } else {
    queries.push(entry);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
}

/** Delete a saved query by name */
export function deleteSavedQuery(name: string): void {
  if (typeof window === "undefined") return;
  const queries = getSavedQueries().filter((q) => q.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
}
