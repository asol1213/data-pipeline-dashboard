import { getAllDatasets, getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { executeSQL } from "@/lib/sqlite-engine";
import { evaluateDAX, DAXError } from "@/lib/dax";

export async function POST(request: Request) {
  try {
    ensureSeedData();
    const body = await request.json();
    const { sql, dax, datasetId } = body as { sql?: string; dax?: string; datasetId?: string };

    // ── DAX mode ──
    if (dax && typeof dax === "string" && dax.trim().length > 0) {
      const allMeta = getAllDatasets();
      const dsId = datasetId || allMeta[0]?.id;
      if (!dsId) {
        return Response.json({ error: "No dataset available" }, { status: 400 });
      }

      // Load datasets into a map for DAX evaluation
      const datasets = new Map<string, { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }>();
      for (const meta of allMeta) {
        const full = getDataset(meta.id);
        if (full) {
          datasets.set(meta.id, {
            rows: full.rows,
            headers: full.headers,
            columnTypes: full.columnTypes,
          });
        }
      }

      const ds = datasets.get(dsId);
      if (!ds) {
        return Response.json({ error: `Dataset '${dsId}' not found` }, { status: 400 });
      }

      try {
        const value = evaluateDAX(dax.trim(), {
          data: ds.rows,
          headers: ds.headers,
          columnTypes: ds.columnTypes,
        });
        return Response.json({ value });
      } catch (err) {
        if (err instanceof DAXError) {
          return Response.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }
    }

    // ── SQL mode (SQLite via sql.js) ──
    if (!sql || typeof sql !== "string" || sql.trim().length === 0) {
      return Response.json(
        { error: "SQL query is required" },
        { status: 400 }
      );
    }

    const result = await executeSQL(sql.trim());

    return Response.json({
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to execute query";
    return Response.json(
      { error: message },
      { status: 400 }
    );
  }
}
