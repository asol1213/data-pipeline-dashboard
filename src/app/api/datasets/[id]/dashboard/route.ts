import { getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { computeDatasetStats } from "@/lib/stats";
import { analyzeDataset } from "@/lib/insights";
import { calculateQuality } from "@/lib/quality";

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

  const insights = analyzeDataset(dataset.rows, stats, dataset.headers, dataset.columnTypes);
  const quality = calculateQuality(dataset.rows, stats);

  return Response.json({
    stats,
    insights,
    quality,
    rows: dataset.rows,
    headers: dataset.headers,
    columnTypes: dataset.columnTypes,
  });
}
