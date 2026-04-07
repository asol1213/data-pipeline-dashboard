import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DATASETS_FILE = path.join(DATA_DIR, "datasets.json");

export interface DatasetMeta {
  id: string;
  name: string;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  columnTypes: Record<string, "number" | "date" | "string">;
}

export interface DatasetFull extends DatasetMeta {
  rows: Record<string, string>[];
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATASETS_FILE)) {
      fs.writeFileSync(DATASETS_FILE, "[]", "utf-8");
    }
  } catch {
    // Vercel serverless: writes don't persist, but that's OK for demo
  }
}

export function getAllDatasets(): DatasetMeta[] {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DATASETS_FILE, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getDataset(id: string): DatasetFull | null {
  const datasets = getAllDatasets();
  const meta = datasets.find((d) => d.id === id);
  if (!meta) return null;

  try {
    const dataFile = path.join(DATA_DIR, `${id}.json`);
    if (!fs.existsSync(dataFile)) return null;
    const rows = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
    return { ...meta, rows };
  } catch {
    return null;
  }
}

export function saveDataset(dataset: DatasetFull): void {
  ensureDataDir();
  const datasets = getAllDatasets();

  const { rows, ...meta } = dataset;
  datasets.push(meta);

  try {
    fs.writeFileSync(DATASETS_FILE, JSON.stringify(datasets, null, 2), "utf-8");
    fs.writeFileSync(
      path.join(DATA_DIR, `${dataset.id}.json`),
      JSON.stringify(rows),
      "utf-8"
    );
  } catch {
    // Vercel serverless: writes don't persist, but that's OK for demo
  }
}

export function deleteDataset(id: string): boolean {
  ensureDataDir();
  const datasets = getAllDatasets();
  const index = datasets.findIndex((d) => d.id === id);
  if (index === -1) return false;

  datasets.splice(index, 1);
  try {
    fs.writeFileSync(DATASETS_FILE, JSON.stringify(datasets, null, 2), "utf-8");

    const dataFile = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(dataFile)) {
      fs.unlinkSync(dataFile);
    }
  } catch {
    // Vercel serverless: writes don't persist, but that's OK for demo
  }

  return true;
}
