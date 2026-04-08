import { getAllDatasets, saveDataset, deleteDataset } from "@/lib/store";
import { generateRevolutData, generateSiemensData } from "@/lib/demo-data";
import type { DemoCompany } from "@/lib/demo-data";
import type { DatasetFull } from "@/lib/store";

const generators: Record<string, () => DemoCompany> = {
  revolut: generateRevolutData,
  siemens: generateSiemensData,
};

// Prefix mapping for each company's demo data
const DEMO_PREFIXES: Record<string, string> = {
  revolut: "rev_",
  siemens: "si_",
};

const companyMeta = [
  { id: "revolut", name: "Revolut", industry: "FinTech", datasetCount: 7, description: "Digital banking: payments, trading, insurance. ~EUR 50M revenue, 7 interconnected tables." },
  { id: "siemens", name: "Siemens", industry: "Industrial Conglomerate", datasetCount: 7, description: "Industrial technology division: automation, infrastructure, mobility. ~EUR 500M revenue, 7 tables." },
  { id: "deloitte", name: "Deloitte", industry: "Professional Services", datasetCount: 0, description: "Coming soon: Consulting engagements, audit, tax, and advisory datasets." },
];

export async function GET() {
  return Response.json(companyMeta);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company } = body as { company: string };

    if (!company || !generators[company]) {
      return Response.json(
        { error: `Invalid company. Choose: ${Object.keys(generators).join(", ")}` },
        { status: 400 },
      );
    }

    // Generate company data
    const companyData = generators[company]();

    // Remove any existing demo datasets for this company
    const prefix = DEMO_PREFIXES[company];
    const existing = getAllDatasets();
    for (const ds of existing) {
      if (ds.id.startsWith(prefix)) {
        deleteDataset(ds.id);
      }
    }

    // Save all new datasets
    const created: string[] = [];
    for (const table of companyData.datasets) {
      const dataset: DatasetFull = {
        id: table.id,
        name: table.name,
        fileName: `${table.id}.csv`,
        uploadedAt: new Date().toISOString(),
        rowCount: table.rows.length,
        columnCount: table.headers.length,
        headers: table.headers,
        columnTypes: table.columnTypes,
        rows: table.rows,
      };
      saveDataset(dataset);
      created.push(table.id);
    }

    return Response.json({
      success: true,
      company,
      datasets: created,
      tableCount: created.length,
      totalRows: companyData.datasets.reduce((sum, t) => sum + t.rows.length, 0),
    });
  } catch {
    return Response.json(
      { error: "Failed to generate demo data" },
      { status: 500 },
    );
  }
}
