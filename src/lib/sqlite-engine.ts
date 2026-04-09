import initSqlJs, { Database } from "sql.js";
import { getAllDatasets, getDataset } from "@/lib/store";

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

function sanitizeTableName(name: string): string {
  return name.replace(/-/g, "_");
}

function createTable(
  database: Database,
  tableName: string,
  headers: string[],
  columnTypes: Record<string, string>,
  rows: Record<string, string>[]
) {
  const safeName = sanitizeTableName(tableName);

  // Build column definitions
  const cols = headers
    .map((h) => {
      const type = columnTypes[h] === "number" ? "REAL" : "TEXT";
      return `"${h}" ${type}`;
    })
    .join(", ");

  // Drop and recreate with safe (underscored) name
  database.run(`DROP TABLE IF EXISTS "${safeName}"`);
  database.run(`CREATE TABLE "${safeName}" (${cols})`);

  // Also create a view with the original hyphenated name if different
  if (safeName !== tableName) {
    database.run(`DROP VIEW IF EXISTS "${tableName}"`);
    database.run(`CREATE VIEW "${tableName}" AS SELECT * FROM "${safeName}"`);
  }

  // Insert data
  if (rows.length > 0 && headers.length > 0) {
    const placeholders = headers.map(() => "?").join(", ");
    const stmt = database.prepare(
      `INSERT INTO "${safeName}" VALUES (${placeholders})`
    );

    for (const row of rows) {
      const values = headers.map((h) => {
        const val = row[h];
        if (columnTypes[h] === "number") {
          const num = parseFloat(val);
          return isNaN(num) ? null : num;
        }
        return val || null;
      });
      stmt.bind(values);
      stmt.step();
      stmt.reset();
    }
    stmt.free();
  }
}

/** Initialize SQLite and load all datasets as tables */
async function getDB(): Promise<Database> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Server-side (Node.js / API routes): do NOT pass locateFile
    const SQL = await initSqlJs();
    db = new SQL.Database();

    // Load all datasets as tables
    const datasets = getAllDatasets();
    for (const meta of datasets) {
      const full = getDataset(meta.id);
      if (!full) continue;
      createTable(db, meta.id, full.headers, full.columnTypes, full.rows);
    }

    initPromise = null;
    return db;
  })();

  return initPromise;
}

/** Execute a SQL query and return structured results */
async function executeSQL(sql: string): Promise<{
  columns: string[];
  rows: Record<string, string | number | null>[];
  rowCount: number;
  executionTime: number;
}> {
  const database = await getDB();
  const start = performance.now();

  try {
    const result = database.exec(sql);
    const executionTime = Math.round((performance.now() - start) * 100) / 100;

    if (result.length === 0) {
      return { columns: [], rows: [], rowCount: 0, executionTime };
    }

    const columns = result[0].columns;
    const rows = result[0].values.map((row) => {
      const obj: Record<string, string | number | null> = {};
      columns.forEach((col, i) => {
        obj[col] = row[i] as string | number | null;
      });
      return obj;
    });

    return { columns, rows, rowCount: rows.length, executionTime };
  } catch (err) {
    throw new Error(
      `SQL Error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/** Refresh a single table (after data edit or new upload) */
async function refreshTable(datasetId: string) {
  const database = await getDB();
  const full = getDataset(datasetId);
  if (!full) return;
  createTable(database, datasetId, full.headers, full.columnTypes, full.rows);
}

/** Refresh all tables (after demo load or bulk change) */
async function refreshAllTables() {
  db = null;
  initPromise = null;
  // Force re-init on next call to getDB()
}

export { executeSQL, refreshTable, refreshAllTables, getDB };
