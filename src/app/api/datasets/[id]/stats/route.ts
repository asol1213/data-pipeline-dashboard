import { getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { computeDatasetStats } from "@/lib/stats";
import { profileDataset } from "@/lib/profiling";

export async function GET(
  request: Request,
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

  // Check if profiling is requested
  const url = new URL(request.url);
  const wantProfile = url.searchParams.get("profile") === "true";

  if (wantProfile) {
    const profile = profileDataset(
      dataset.rows,
      dataset.headers,
      dataset.columnTypes
    );

    // Build missing values map (boolean[][]: true = present, false = missing)
    const missingMap = dataset.rows.map((row) =>
      dataset.headers.map((h) => {
        const v = row[h];
        return v !== undefined && v !== null && v !== "";
      })
    );

    return Response.json({
      ...stats,
      profile,
      missingMap,
      missingHeaders: dataset.headers,
    });
  }

  return Response.json(stats);
}
