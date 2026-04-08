import { getDataset, updateDatasetRows } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureSeedData();
  const { id } = await params;

  const dataset = getDataset(id);
  if (!dataset) {
    return Response.json({ error: "Dataset not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { rows } = body as { rows: Record<string, string>[] };

    if (!Array.isArray(rows)) {
      return Response.json(
        { error: "rows must be an array" },
        { status: 400 }
      );
    }

    const success = updateDatasetRows(id, rows);
    if (!success) {
      return Response.json(
        { error: "Failed to update dataset" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, rowCount: rows.length });
  } catch {
    return Response.json(
      { error: "Failed to process update" },
      { status: 500 }
    );
  }
}
