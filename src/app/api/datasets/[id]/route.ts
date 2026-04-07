import { getDataset, deleteDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";

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

  return Response.json(dataset);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteDataset(id);

  if (!deleted) {
    return Response.json({ error: "Dataset not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
