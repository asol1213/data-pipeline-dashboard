import { getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";

export async function GET(request: Request) {
  try {
    ensureSeedData();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const col = searchParams.get("col");

    if (!id || !col) {
      return Response.json(
        { error: "id and col query parameters are required" },
        { status: 400 }
      );
    }

    const dataset = getDataset(id);
    if (!dataset) {
      return Response.json(
        { error: `Dataset '${id}' not found` },
        { status: 404 }
      );
    }

    if (!dataset.headers.includes(col)) {
      return Response.json(
        { error: `Column '${col}' not found in dataset` },
        { status: 400 }
      );
    }

    // Find a suitable label column (first string column, or first column)
    const labelCol =
      dataset.headers.find((h) => dataset.columnTypes[h] === "string") ??
      dataset.headers[0];

    const chartData = dataset.rows.map((row) => {
      const item: Record<string, string | number> = {
        [labelCol]: row[labelCol],
      };
      item[col] = Number(row[col]) || 0;
      return item;
    });

    return Response.json({
      datasetName: dataset.name,
      col,
      labelCol,
      chartData,
    });
  } catch {
    return Response.json(
      { error: "Failed to load embed data" },
      { status: 500 }
    );
  }
}
