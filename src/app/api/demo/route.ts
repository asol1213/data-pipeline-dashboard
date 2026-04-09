import { getAllDatasets, saveDataset, deleteDataset } from "@/lib/store";
import { generateRevolutData, generateSiemensData, generateDeloitteData } from "@/lib/demo-data";
import type { DemoCompany } from "@/lib/demo-data";
import type { DatasetFull } from "@/lib/store";
import { refreshAllTables } from "@/lib/sqlite-engine";

const generators: Record<string, () => DemoCompany> = {
  revolut: generateRevolutData,
  siemens: generateSiemensData,
  deloitte: generateDeloitteData,
};

const DEMO_PREFIXES: Record<string, string> = {
  revolut: "rev_",
  siemens: "si_",
  deloitte: "dl_",
};

const companyMeta = [
  { id: "revolut", name: "Revolut", industry: "FinTech", datasetCount: 7, description: "Digital banking: payments, trading, insurance. ~€50M revenue, 7 interconnected tables, 1500+ rows." },
  { id: "siemens", name: "Siemens", industry: "Industrial Conglomerate", datasetCount: 7, description: "Industrial technology division: automation, infrastructure, mobility. ~€500M revenue, 7 tables, 1000+ rows." },
  { id: "deloitte", name: "Deloitte DACH", industry: "Professional Services", datasetCount: 8, description: "Regional practice: 5 service lines, 250 employees, 100 clients. Engagements, utilization, pipeline, P&L, training, expenses. 1500+ rows." },
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

    // Refresh SQLite tables to include new demo data
    await refreshAllTables();

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
