import Groq from "groq-sdk";
import { getAllDatasets, getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { parseSQL, executeQuery, SQLError } from "@/lib/sql-engine";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function buildTableSchema(): string {
  ensureSeedData();
  const datasets = getAllDatasets();
  const lines: string[] = [];

  for (const meta of datasets) {
    const full = getDataset(meta.id);
    if (!full) continue;

    const cols = full.headers
      .map((h) => `${h} (${full.columnTypes[h]})`)
      .join(", ");
    lines.push(`- ${meta.id}: ${cols}`);

    // Also show name alias
    const nameKey = meta.name.toLowerCase().replace(/\s+/g, "_");
    if (nameKey !== meta.id) {
      lines.push(`  (also accessible as: ${nameKey})`);
    }
  }

  return lines.join("\n");
}

function getSampleRows(): string {
  const datasets = getAllDatasets();
  const samples: string[] = [];
  for (const meta of datasets) {
    const full = getDataset(meta.id);
    if (!full) continue;
    samples.push(
      `${meta.id} sample: ${JSON.stringify(full.rows.slice(0, 2))}`
    );
  }
  return samples.join("\n");
}

function detectChartType(
  columns: string[],
  rows: Record<string, string | number>[]
): {
  chartType: "bar" | "line" | "pie" | "kpi" | "none";
  labelColumn: string;
  valueColumns: string[];
} {
  if (columns.length === 0 || rows.length === 0) {
    return { chartType: "none", labelColumn: "", valueColumns: [] };
  }

  // Single row aggregate -> KPI card
  if (rows.length === 1 && columns.length <= 3) {
    const numCols = columns.filter((c) => {
      const v = rows[0][c];
      return typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)) && v !== "");
    });
    if (numCols.length > 0) {
      return { chartType: "kpi", labelColumn: "", valueColumns: numCols };
    }
  }

  // Detect label (first string-like column) and value (numeric) columns
  let labelCol = "";
  const valueCols: string[] = [];

  for (const col of columns) {
    const sampleVal = rows[0][col];
    const isNumeric =
      typeof sampleVal === "number" ||
      (typeof sampleVal === "string" && !isNaN(Number(sampleVal)) && sampleVal !== "");

    if (!labelCol && !isNumeric) {
      labelCol = col;
    } else if (isNumeric) {
      valueCols.push(col);
    }
  }

  if (!labelCol && valueCols.length > 0) {
    // All numeric, use first column as label
    labelCol = columns[0];
    const idx = valueCols.indexOf(labelCol);
    if (idx !== -1) valueCols.splice(idx, 1);
  }

  if (!labelCol || valueCols.length === 0) {
    return { chartType: "none", labelColumn: labelCol, valueColumns: valueCols };
  }

  // Check if label column looks like dates/months
  const datePatterns = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}[-/]\d{2})/i;
  const isTimeSeries = rows.some((r) => {
    const val = String(r[labelCol]);
    return datePatterns.test(val);
  });

  if (isTimeSeries) {
    return { chartType: "line", labelColumn: labelCol, valueColumns: valueCols };
  }

  // Small number of groups -> offer pie
  if (rows.length <= 8 && valueCols.length === 1) {
    return { chartType: "pie", labelColumn: labelCol, valueColumns: valueCols };
  }

  return { chartType: "bar", labelColumn: labelCol, valueColumns: valueCols };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question } = body as { question?: string };

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return Response.json({ error: "question is required" }, { status: 400 });
    }

    const tableSchema = buildTableSchema();
    const sampleData = getSampleRows();

    const systemPrompt = `You are a SQL expert. Generate a SQL query to answer the user's question.

Available tables:
${tableSchema}

Sample data:
${sampleData}

Rules:
- Return ONLY the SQL query, nothing else
- No markdown code blocks, no explanation, just the raw SQL
- Use the exact table names and column names shown above
- For JOINs, use the correct ID columns
- Always add LIMIT 20 unless the user asks for all data
- Use GROUP BY for aggregations
- Use ORDER BY DESC for "top/highest/best" questions
- Use ORDER BY ASC for "bottom/lowest/worst" questions
- Column names with special characters like % must be used as-is (e.g. Discount_%)`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 512,
    });

    let sql = chatCompletion.choices[0]?.message?.content?.trim() || "";

    // Clean up: remove markdown code blocks if present
    sql = sql.replace(/^```sql\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();

    if (!sql) {
      return Response.json({ error: "AI did not return a SQL query" }, { status: 500 });
    }

    // Execute the SQL
    ensureSeedData();
    const allMeta = getAllDatasets();
    const datasetsMap = new Map<
      string,
      { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }
    >();

    for (const meta of allMeta) {
      const full = getDataset(meta.id);
      if (full) {
        datasetsMap.set(meta.id, {
          rows: full.rows,
          headers: full.headers,
          columnTypes: full.columnTypes,
        });
        const nameKey = meta.name.toLowerCase().replace(/\s+/g, "_");
        datasetsMap.set(nameKey, {
          rows: full.rows,
          headers: full.headers,
          columnTypes: full.columnTypes,
        });
      }
    }

    const parsed = parseSQL(sql);
    const result = executeQuery(parsed, datasetsMap);

    const { chartType, labelColumn, valueColumns } = detectChartType(
      result.columns,
      result.rows
    );

    return Response.json({
      sql,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
      chartType,
      labelColumn,
      valueColumns,
    });
  } catch (err) {
    if (err instanceof SQLError) {
      return Response.json({ error: `SQL Error: ${err.message}` }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to process request";
    return Response.json({ error: message }, { status: 500 });
  }
}
