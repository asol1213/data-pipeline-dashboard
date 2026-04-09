import { getAllDatasets, saveDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { parseCSV, detectAllColumnTypes } from "@/lib/csv-parser";
import type { DatasetFull } from "@/lib/store";
import { refreshTable } from "@/lib/sqlite-engine";

export async function GET() {
  ensureSeedData();
  const datasets = getAllDatasets();
  return Response.json(datasets);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, fileName, csvContent } = body as {
      name: string;
      fileName: string;
      csvContent: string;
    };

    if (!name || !csvContent) {
      return Response.json(
        { error: "name and csvContent are required" },
        { status: 400 }
      );
    }

    const parsed = parseCSV(csvContent);
    if (parsed.headers.length === 0) {
      return Response.json(
        { error: "CSV appears to be empty or invalid" },
        { status: 400 }
      );
    }

    const columnTypes = detectAllColumnTypes(parsed.headers, parsed.rows);
    const id = `ds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const dataset: DatasetFull = {
      id,
      name,
      fileName: fileName || "upload.csv",
      uploadedAt: new Date().toISOString(),
      rowCount: parsed.rows.length,
      columnCount: parsed.headers.length,
      headers: parsed.headers,
      columnTypes,
      rows: parsed.rows,
    };

    saveDataset(dataset);

    // Refresh SQLite to include the new dataset as a table
    await refreshTable(id);

    const { rows: _, ...meta } = dataset;
    return Response.json(meta, { status: 201 });
  } catch {
    return Response.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
