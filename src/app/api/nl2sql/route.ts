import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAllDatasets, getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { executeSQL } from "@/lib/sqlite-engine";

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/** Try Groq first, then Gemini, then template fallback */
async function generateSQLWithAI(systemPrompt: string, question: string): Promise<string> {
  // 1. Try Groq
  if (groq) {
    try {
      const res = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 512,
      });
      const sql = res.choices[0]?.message?.content?.trim();
      if (sql) return sql;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log("Groq failed, trying Gemini:", msg.slice(0, 100));
    }
  }

  // 2. Try Google Gemini
  if (gemini) {
    try {
      const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
      const res = await model.generateContent(`${systemPrompt}\n\nUser question: ${question}`);
      const text = res.response.text().trim();
      const cleaned = text.replace(/^```sql?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
      if (cleaned) return cleaned;
    } catch (err: unknown) {
      console.log("Gemini failed:", (err instanceof Error ? err.message : "").slice(0, 80));
    }
  }

  // 3. Try Cerebras (OpenAI-compatible, generous free tier)
  if (process.env.CEREBRAS_API_KEY) {
    try {
      const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          temperature: 0.1,
          max_tokens: 512,
        }),
      });
      const data = await res.json();
      const sql = data.choices?.[0]?.message?.content?.trim();
      if (sql) return sql;
    } catch (err: unknown) {
      console.log("Cerebras failed:", (err instanceof Error ? err.message : "").slice(0, 80));
    }
  }

  // 4. Try OpenRouter (free models)
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          temperature: 0.1,
          max_tokens: 512,
        }),
      });
      const data = await res.json();
      const sql = data.choices?.[0]?.message?.content?.trim();
      if (sql) return sql;
    } catch (err: unknown) {
      console.log("OpenRouter failed:", (err instanceof Error ? err.message : "").slice(0, 80));
    }
  }

  // 5. Template fallback (no AI needed — always works)
  return generateSQLFromTemplate(question);
}

/** Pattern-based SQL generator — works without any AI API */
function generateSQLFromTemplate(question: string): string {
  ensureSeedData();
  const datasets = getAllDatasets();
  const q = question.toLowerCase();

  // Find best matching table
  let bestTable = datasets[0]?.id || "sales_transactions";
  for (const ds of datasets) {
    const name = ds.name.toLowerCase();
    const id = ds.id.toLowerCase();
    if (q.includes(name) || q.includes(id) || q.includes(id.replace(/_/g, " "))) {
      bestTable = ds.id;
      break;
    }
  }
  // Guess from keywords
  if (q.includes("sales") || q.includes("umsatz") || q.includes("revenue") || q.includes("transaction")) bestTable = datasets.find(d => d.id.includes("sales_transaction") || d.id.includes("sales-q1"))?.id || bestTable;
  if (q.includes("customer") || q.includes("kunden")) bestTable = datasets.find(d => d.id.includes("customer"))?.id || bestTable;
  if (q.includes("product")) bestTable = datasets.find(d => d.id.includes("product"))?.id || bestTable;
  if (q.includes("p&l") || q.includes("pnl") || q.includes("income")) bestTable = datasets.find(d => d.id.includes("pnl"))?.id || bestTable;
  if (q.includes("budget")) bestTable = datasets.find(d => d.id.includes("budget"))?.id || bestTable;
  if (q.includes("saas") || q.includes("mrr") || q.includes("churn")) bestTable = datasets.find(d => d.id.includes("saas"))?.id || bestTable;

  const safeName = bestTable.includes("-") ? `"${bestTable}"` : bestTable;
  const full = getDataset(bestTable);
  const numericCols = full ? full.headers.filter(h => full.columnTypes[h] === "number") : [];
  const stringCols = full ? full.headers.filter(h => full.columnTypes[h] === "string") : [];
  const firstNum = numericCols[0] || "Revenue";
  const firstStr = stringCols[0] || "Month";

  // Pattern matching
  const topMatch = q.match(/top\s+(\d+)/);
  const topN = topMatch ? parseInt(topMatch[1]) : 10;

  if (q.includes("top") || q.includes("highest") || q.includes("best") || q.includes("größt") || q.includes("höchst")) {
    return `SELECT * FROM ${safeName} ORDER BY ${firstNum} DESC LIMIT ${topN}`;
  }
  if (q.includes("count") || q.includes("anzahl") || q.includes("wie viele")) {
    const groupCol = stringCols.find(c => q.includes(c.toLowerCase())) || firstStr;
    return `SELECT ${groupCol}, COUNT(*) AS count FROM ${safeName} GROUP BY ${groupCol} ORDER BY count DESC`;
  }
  if (q.includes("sum") || q.includes("total") || q.includes("summe") || q.includes("gesamt")) {
    const groupCol = stringCols.find(c => q.includes(c.toLowerCase())) || firstStr;
    return `SELECT ${groupCol}, SUM(${firstNum}) AS total FROM ${safeName} GROUP BY ${groupCol} ORDER BY total DESC`;
  }
  if (q.includes("average") || q.includes("avg") || q.includes("durchschnitt")) {
    return `SELECT AVG(${firstNum}) AS average FROM ${safeName}`;
  }
  if (q.includes("by month") || q.includes("pro monat") || q.includes("monthly") || q.includes("monatlich")) {
    const dateCol = full?.headers.find(h => h.toLowerCase().includes("date") || h === "Month") || "Month";
    return `SELECT ${dateCol}, SUM(${firstNum}) AS total FROM ${safeName} GROUP BY ${dateCol} ORDER BY ${dateCol}`;
  }
  if (q.includes("2025") || q.includes("2024") || q.includes("2026")) {
    const year = q.match(/(202\d)/)?.[1] || "2025";
    const dateCol = full?.headers.find(h => h.toLowerCase().includes("date") || h === "Month") || "Date";
    // Check if column exists
    if (full?.headers.includes(dateCol)) {
      return `SELECT * FROM ${safeName} WHERE "${dateCol}" LIKE '${year}%' LIMIT 50`;
    }
    return `SELECT * FROM ${safeName} LIMIT 50`;
  }

  // Default: show all data
  return `SELECT * FROM ${safeName} LIMIT 50`;
}

function buildTableSchema(meta: { id: string; name: string; rowCount: number }, full: { headers: string[]; columnTypes: Record<string, string>; rows: Record<string, string>[] }): string {
  const lines: string[] = [];
  lines.push(`## Table: ${meta.id} ("${meta.name}", ${meta.rowCount} rows)`);

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

  const idCols = full.headers.filter(h => h.endsWith("_ID") || h.endsWith("_Id"));
  if (idCols.length > 0) {
    lines.push(`Key columns: ${idCols.join(", ")}`);
  }

  lines.push(`Sample: ${JSON.stringify(full.rows[0])}`);

  return lines.join("\n");
}

function buildRichSchema(tableHint?: string): string {
  ensureSeedData();
  const datasets = getAllDatasets();
  const sections: string[] = [];

  if (tableHint) {
    // Focused mode: only include the hinted table + related tables via _ID columns
    const hintedMeta = datasets.find(d => d.id === tableHint);
    if (hintedMeta) {
      const hintedFull = getDataset(hintedMeta.id);
      if (hintedFull && hintedFull.rows.length) {
        sections.push(buildTableSchema(hintedMeta, hintedFull));

        // Find related tables via _ID columns
        const idCols = hintedFull.headers.filter(h => h.endsWith("_ID") || h.endsWith("_Id"));
        for (const meta of datasets) {
          if (meta.id === tableHint) continue;
          const full = getDataset(meta.id);
          if (!full || !full.rows.length) continue;

          // Include if any of the hinted table's _ID columns appear in this table
          const hasRelation = idCols.some(idCol => full.headers.includes(idCol));
          // Also include if this table has _ID columns that match names in the hinted table
          const reverseRelation = full.headers
            .filter(h => h.endsWith("_ID") || h.endsWith("_Id"))
            .some(idCol => hintedFull.headers.includes(idCol));

          if (hasRelation || reverseRelation) {
            sections.push(buildTableSchema(meta, full));
          }
        }
      }
    }
  }

  // Fallback: if no tableHint or hinted table not found, include all tables
  if (sections.length === 0) {
    for (const meta of datasets) {
      const full = getDataset(meta.id);
      if (!full || !full.rows.length) continue;
      sections.push(buildTableSchema(meta, full));
    }
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
    const { question, tableHint } = body as { question?: string; tableHint?: string };

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return Response.json({ error: "question is required" }, { status: 400 });
    }

    const richSchema = buildRichSchema(tableHint);

    const systemPrompt = `You are an expert SQL analyst. Generate a precise SQLite-compatible SQL query to answer the user's question.

DATABASE SCHEMA:
${richSchema}

CRITICAL RULES:
1. Return ONLY the raw SQL query — no markdown, no code blocks, no explanation
2. Use EXACT table names and column names from the schema above
3. Generate standard SQLite SQL. All standard SQLite features are supported: JOINs, CTEs (WITH), window functions, CASE WHEN, subqueries, UNION, HAVING, OFFSET, etc.
4. For date functions, use SQLite date functions: strftime('%Y', Date) for year, strftime('%m', Date) for month, strftime('%d', Date) for day. Or use LIKE patterns: WHERE Date LIKE '2025%'
5. Table names with hyphens must be quoted: "sales-q1-2026". Or use underscore versions: sales_q1_2026 (both work)
6. Column names with special characters must be quoted: "Discount_%"
7. For JOINs, match tables on their _ID columns (e.g., Product_ID, Customer_ID, Region_ID)
8. Always add LIMIT 50 unless user asks for all data or aggregation
9. Use GROUP BY for aggregations, ORDER BY DESC for "top/highest/best"
10. If the question mentions a year, month, or date range — ALWAYS filter by it
11. If unsure which table, pick the most relevant one based on the column names mentioned
12. If the user asks for a chart type (line, bar, pie), add: -- CHART:type at the end`;

    let sql = await generateSQLWithAI(systemPrompt, question);

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

    // Execute the SQL via SQLite — fallback to template if AI SQL fails
    ensureSeedData();
    let result;
    try {
      result = await executeSQL(sql);
    } catch (sqlErr) {
      // AI-generated SQL failed — try template fallback
      console.log("AI SQL failed, falling back to template:", (sqlErr as Error).message);
      const templateSql = generateSQLFromTemplate(question);
      sql = templateSql;
      try {
        result = await executeSQL(templateSql);
      } catch {
        return Response.json({ error: `SQL Error: ${(sqlErr as Error).message}` }, { status: 400 });
      }
    }

    const detected = detectChartType(
      result.columns,
      result.rows as Record<string, string | number>[]
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
    const message = err instanceof Error ? err.message : "Failed to process request";
    return Response.json({ error: message }, { status: 400 });
  }
}
