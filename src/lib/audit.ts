// Audit Trail & Version History system
// Stores audit log entries and dataset version snapshots in localStorage

export interface AuditEntry {
  id: string;
  timestamp: string;
  action:
    | "cell_edit"
    | "row_add"
    | "row_delete"
    | "column_add"
    | "dataset_upload"
    | "dataset_delete"
    | "query_run"
    | "formula_eval";
  datasetId: string;
  datasetName: string;
  details: {
    row?: number;
    column?: string;
    oldValue?: string;
    newValue?: string;
    sql?: string;
    formula?: string;
    description: string;
  };
  user: string;
}

export interface DatasetVersion {
  id: string;
  datasetId: string;
  timestamp: string;
  rowCount: number;
  description: string;
  snapshot: string; // JSON stringified rows
}

const AUDIT_KEY = "datapipe_audit_log";
const VERSION_KEY_PREFIX = "datapipe_versions_";
const MAX_AUDIT_ENTRIES = 500;
const MAX_VERSIONS_PER_DATASET = 10;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// --- Audit Log ---

export function logAudit(
  entry: Omit<AuditEntry, "id" | "timestamp">
): void {
  const storage = getStorage();
  if (!storage) return;

  const fullEntry: AuditEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  try {
    const raw = storage.getItem(AUDIT_KEY);
    const log: AuditEntry[] = raw ? JSON.parse(raw) : [];
    log.unshift(fullEntry);

    // FIFO: keep max entries
    while (log.length > MAX_AUDIT_ENTRIES) {
      log.pop();
    }

    storage.setItem(AUDIT_KEY, JSON.stringify(log));
  } catch {
    // localStorage quota or parse error — silently skip
  }
}

export function getAuditLog(
  datasetId?: string,
  limit?: number
): AuditEntry[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(AUDIT_KEY);
    if (!raw) return [];
    let log: AuditEntry[] = JSON.parse(raw);

    // Already stored newest-first
    if (datasetId) {
      log = log.filter((e) => e.datasetId === datasetId);
    }
    if (limit && limit > 0) {
      log = log.slice(0, limit);
    }
    return log;
  } catch {
    return [];
  }
}

export function clearAuditLog(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(AUDIT_KEY);
  } catch {
    // ignore
  }
}

// --- Version History ---

function versionKey(datasetId: string): string {
  return VERSION_KEY_PREFIX + datasetId;
}

export function saveVersion(
  datasetId: string,
  rows: Record<string, string>[],
  description: string
): void {
  const storage = getStorage();
  if (!storage) return;

  const version: DatasetVersion = {
    id: generateId(),
    datasetId,
    timestamp: new Date().toISOString(),
    rowCount: rows.length,
    description,
    snapshot: JSON.stringify(rows),
  };

  try {
    const key = versionKey(datasetId);
    const raw = storage.getItem(key);
    const versions: DatasetVersion[] = raw ? JSON.parse(raw) : [];
    versions.unshift(version);

    // Keep max versions per dataset
    while (versions.length > MAX_VERSIONS_PER_DATASET) {
      versions.pop();
    }

    storage.setItem(key, JSON.stringify(versions));
  } catch {
    // localStorage quota or parse error
  }
}

export function getVersions(datasetId: string): DatasetVersion[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const key = versionKey(datasetId);
    const raw = storage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function restoreVersion(
  datasetId: string,
  versionId: string
): Record<string, string>[] | null {
  const versions = getVersions(datasetId);
  const version = versions.find((v) => v.id === versionId);
  if (!version) return null;

  try {
    return JSON.parse(version.snapshot);
  } catch {
    return null;
  }
}

export function compareVersions(
  v1: DatasetVersion,
  v2: DatasetVersion
): { added: number; removed: number; changed: number } {
  let rows1: Record<string, string>[];
  let rows2: Record<string, string>[];

  try {
    rows1 = JSON.parse(v1.snapshot);
    rows2 = JSON.parse(v2.snapshot);
  } catch {
    return { added: 0, removed: 0, changed: 0 };
  }

  const maxLen = Math.max(rows1.length, rows2.length);
  const minLen = Math.min(rows1.length, rows2.length);

  let changed = 0;
  for (let i = 0; i < minLen; i++) {
    const r1 = rows1[i];
    const r2 = rows2[i];
    const allKeys = new Set([...Object.keys(r1), ...Object.keys(r2)]);
    for (const key of allKeys) {
      if ((r1[key] ?? "") !== (r2[key] ?? "")) {
        changed++;
        break; // count each row only once
      }
    }
  }

  const added = rows2.length > rows1.length ? rows2.length - rows1.length : 0;
  const removed =
    rows1.length > rows2.length ? rows1.length - rows2.length : 0;

  return { added, removed, changed };
}
