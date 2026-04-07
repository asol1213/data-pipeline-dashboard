export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rawRows: string[][];
}

export function parseCSV(text: string): ParsedCSV {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return { headers: [], rows: [], rawRows: [] };
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ",") {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rawRows: string[][] = [];
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    rawRows.push(values);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows, rawRows };
}

export type ColumnType = "number" | "date" | "string";

export function detectColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => v !== "");
  if (nonEmpty.length === 0) return "string";

  const numberCount = nonEmpty.filter((v) => !isNaN(Number(v)) && v !== "").length;
  if (numberCount / nonEmpty.length > 0.8) return "number";

  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
  ];
  const dateCount = nonEmpty.filter((v) =>
    datePatterns.some((p) => p.test(v))
  ).length;
  if (dateCount / nonEmpty.length > 0.8) return "date";

  return "string";
}

export function detectAllColumnTypes(
  headers: string[],
  rows: Record<string, string>[]
): Record<string, ColumnType> {
  const types: Record<string, ColumnType> = {};
  for (const header of headers) {
    const values = rows.map((row) => row[header] ?? "");
    types[header] = detectColumnType(values);
  }
  return types;
}
