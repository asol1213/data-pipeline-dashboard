import Groq from "groq-sdk";
import { getAllDatasets, getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { parseSQL, executeQuery, SQLError } from "@/lib/sql-engine";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function buildRichSchema(): string {
  ensureSeedData();
  const datasets = getAllDatasets();
  const sections: string[] = [];

  for (const meta of datasets) {
    const full = getDataset(meta.id);
    if (!full || !full.rows.length) continue;

    // Table info
    const lines: string[] = [];
    lines.push(`## Table: ${meta.id} ("${meta.name}", ${meta.rowCount} rows)`);

    // Columns with types
    lines.push(`Columns:`);
    for (const h of full.headers) {
      const type = full.columnTypes[h];
      const values = full.rows.slice(0, 50).map(r => r[h]).filter(Boolean);

      if (type === "number") {
        const nums = values.map(Number).filter(n => !isNaN(n));
        if (nums.length > 0) {
          lines.push(`  - ${h} (number): ${Math.min(...nums)} to ${Math.max(...nums)}`);
        } else {
          lines.push(`  - ${h} (number)`);
        }
      } else {
        const unique = [...new Set(values)];
        if (unique.length <= 8) {
          lines.push(`  - ${h} (string): [${unique.map(v => `"${v}"`).join(", ")}]`);
        } else if (h.toLowerCase().includes("date") || h === "Month") {
          const sorted = unique.sort();
          lines.push(`  - ${h} (string/date): "${sorted[0]}" to "${sorted[sorted.length - 1]}"`);
        } else {
          lines.push(`  - ${h} (string): ${unique.length} unique, e.g. "${unique[0]}"`);
        }
      }
    }

    // Key relationships
    const idCols = full.headers.filter(h => h.endsWith("_ID") || h.endsWith("_Id"));
    if (idCols.length > 0) {
      lines.push(`Key columns: ${idCols.join(", ")}`);
    }

    // Only 1 sample row to keep prompt small
    lines.push(`Sample: ${JSON.stringify(full.rows[0])}`);

    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n");
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

    const richSchema = buildRichSchema();

    const systemPrompt = `You are an expert SQL analyst. Generate a precise SQL query to answer the user's question.

DATABASE SCHEMA:
${richSchema}

CRITICAL RULES:
1. Return ONLY the raw SQL query — no markdown, no code blocks, no explanation
2. Use EXACT table names and column names from the schema above
3. When filtering by date/year/month, use the Date or Month column with YEAR(), MONTH() functions or string matching (e.g., WHERE Date LIKE '2025%' or WHERE YEAR(Date) = 2025)
4. For "sales data 2025" → filter WHERE YEAR(Date) = 2025 or WHERE Date LIKE '2025%'
5. For JOINs, match tables on their _ID columns (e.g., Product_ID, Customer_ID, Region_ID)
6. Always add LIMIT 50 unless user asks for all data or aggregation
7. Use GROUP BY for aggregations, ORDER BY DESC for "top/highest/best"
8. Column names with special characters like % or & must be used as-is
9. If the question mentions a year, month, or date range — ALWAYS filter by it
10. If unsure which table, pick the most relevant one based on the column names mentioned
11. If the user asks for a chart type (line, bar, pie), add: -- CHART:type at the end`;

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

    // Parse chart type hint from SQL comment (e.g., -- CHART:line)
    let chartHint: string | null = null;
    const chartHintMatch = sql.match(/--\s*CHART:\s*(line|bar|pie|area)\s*$/i);
    if (chartHintMatch) {
      chartHint = chartHintMatch[1].toLowerCase();
      // Remove the comment from SQL before execution
      sql = sql.replace(/--\s*CHART:\s*(line|bar|pie|area)\s*$/i, "").trim();
    }

    // Also detect chart-first keywords from the original question
    const chartFirstKeywords = /\b(chart|graph|visualize|show\s+me|plot|pie\s+chart|bar\s+chart|line\s+chart|area\s+chart)\b/i;
    const isChartFirst = chartFirstKeywords.test(question);

    // Detect specific chart type from question
    if (!chartHint) {
      if (/\bline\s+(chart|graph)\b/i.test(question)) chartHint = "line";
      else if (/\bpie\s+(chart|graph)\b/i.test(question)) chartHint = "pie";
      else if (/\bbar\s+(chart|graph)\b/i.test(question) || /\bas\s+bars\b/i.test(question)) chartHint = "bar";
      else if (/\barea\s+(chart|graph)\b/i.test(question)) chartHint = "area";
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

    const detected = detectChartType(
      result.columns,
      result.rows
    );

    // Override chart type if hint was provided
    const finalChartType = chartHint
      ? (chartHint as "bar" | "line" | "pie" | "kpi" | "none")
      : detected.chartType;

    return Response.json({
      sql,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
      chartType: finalChartType,
      labelColumn: detected.labelColumn,
      valueColumns: detected.valueColumns,
      chartHint,
      isChartFirst,
    });
  } catch (err) {
    if (err instanceof SQLError) {
      return Response.json({ error: `SQL Error: ${err.message}` }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to process request";
    return Response.json({ error: message }, { status: 500 });
  }
}
