import { getAllDatasets, getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import {
  detectRelationships,
  detectSchemaType,
} from "@/lib/relationships";

export async function GET() {
  ensureSeedData();
  const datasets = getAllDatasets();

  // Load all row data for cardinality detection
  const allRows = new Map<string, Record<string, string>[]>();
  for (const ds of datasets) {
    const full = getDataset(ds.id);
    if (full) {
      allRows.set(ds.id, full.rows);
    }
  }

  const relationships = detectRelationships(datasets, allRows);
  const schemaType = detectSchemaType(datasets, relationships);

  return Response.json({ datasets, relationships, schemaType });
}
