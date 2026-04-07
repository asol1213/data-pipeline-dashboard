import { getAllDatasets, getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { parseSQL, executeQuery, SQLError } from "@/lib/sql-engine";

export async function POST(request: Request) {
  try {
    ensureSeedData();
    const body = await request.json();
    const { sql } = body as { sql: string };

    if (!sql || typeof sql !== "string" || sql.trim().length === 0) {
      return Response.json(
        { error: "SQL query is required" },
        { status: 400 }
      );
    }

    const parsed = parseSQL(sql.trim());

    // Load all datasets into a map
    const allMeta = getAllDatasets();
    const datasets = new Map<string, { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }>();

    for (const meta of allMeta) {
      const full = getDataset(meta.id);
      if (full) {
        datasets.set(meta.id, {
          rows: full.rows,
          headers: full.headers,
          columnTypes: full.columnTypes,
        });
        // Also register by name (lowercase, spaces replaced with underscores)
        const nameKey = meta.name.toLowerCase().replace(/\s+/g, "_");
        datasets.set(nameKey, {
          rows: full.rows,
          headers: full.headers,
          columnTypes: full.columnTypes,
        });
      }
    }

    const result = executeQuery(parsed, datasets);

    return Response.json({
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
    });
  } catch (err) {
    if (err instanceof SQLError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return Response.json(
      { error: "Failed to execute query" },
      { status: 500 }
    );
  }
}
