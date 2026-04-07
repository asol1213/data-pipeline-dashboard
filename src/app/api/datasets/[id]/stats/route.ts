import { getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { computeDatasetStats } from "@/lib/stats";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureSeedData();
  const { id } = await params;
  const dataset = getDataset(id);

  if (!dataset) {
    return Response.json({ error: "Dataset not found" }, { status: 404 });
  }

  const stats = computeDatasetStats(
    dataset.rows,
    dataset.headers,
    dataset.columnTypes
  );

  return Response.json(stats);
}
