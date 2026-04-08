import Groq from "groq-sdk";
import { getAllDatasets, getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { computeDatasetStats } from "@/lib/stats";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function buildAllDatasetsPrompt(): string {
  ensureSeedData();
  const datasets = getAllDatasets();
  const sections: string[] = [];

  for (const meta of datasets) {
    const full = getDataset(meta.id);
    if (!full) continue;

    const stats = computeDatasetStats(full.rows, full.headers, full.columnTypes);
    const statsLines = stats.columns
      .filter((c) => c.type === "number" && c.mean !== undefined)
      .map((c) => `    ${c.column}: mean=${c.mean}, min=${c.min}, max=${c.max}`)
      .join("\n");

    const sample = JSON.stringify(full.rows.slice(0, 5), null, 2);

    sections.push(`
## Dataset: "${meta.name}" (ID: ${meta.id})
- ${meta.rowCount} rows, ${meta.columnCount} columns
- Columns: ${full.headers.map((h) => `${h} (${full.columnTypes[h]})`).join(", ")}
- Statistics:
${statsLines || "    No numeric columns"}
- Sample data (first 5 rows):
${sample}
`);
  }

  return `You are a powerful data analyst assistant. You have access to ALL of the following datasets:

${sections.join("\n---\n")}

Rules:
- You know ALL datasets above. Answer questions about ANY of them.
- When the user asks a question, figure out which dataset(s) are relevant and analyze them.
- If a question spans multiple datasets, compare and cross-reference them.
- Reference specific numbers, rows, and dataset names when answering.
- Use Markdown formatting: **bold** for emphasis, bullet lists, tables, \`code\` for column names.
- Use headers (##) to organize longer responses.
- If asked to calculate something, show the calculation step by step.
- Support questions in any language (German, English, Turkish, etc.)
- Be concise but thorough. Keep answers under 300 words unless the user asks for more detail.
- If the user asks "which dataset has X", search across all datasets.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, datasetId } = body as { message?: string; datasetId?: string };

    if (!message) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    let systemPrompt: string;

    if (datasetId) {
      // Single dataset mode (backward compatible)
      ensureSeedData();
      const dataset = getDataset(datasetId);
      if (!dataset) return Response.json({ error: "Dataset not found" }, { status: 404 });

      const stats = computeDatasetStats(dataset.rows, dataset.headers, dataset.columnTypes);
      const statsLines = stats.columns
        .filter((c) => c.type === "number" && c.mean !== undefined)
        .map((c) => `  ${c.column}: mean=${c.mean}, min=${c.min}, max=${c.max}, stddev=${c.stddev}`)
        .join("\n");

      systemPrompt = `You are a data analyst assistant analyzing "${dataset.name}" (${dataset.rowCount} rows).
Columns: ${dataset.headers.map((h) => `${h} (${dataset.columnTypes[h]})`).join(", ")}

Statistics:
${statsLines || "  No numeric columns"}

Sample data (first 10 rows):
${JSON.stringify(dataset.rows.slice(0, 10), null, 2)}

Rules:
- Answer accurately based on the data
- Use Markdown: **bold**, bullet lists, tables
- Support any language
- Be concise`;
    } else {
      // ALL datasets mode (global assistant)
      systemPrompt = buildAllDatasetsPrompt();
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 2048,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
    });
  } catch {
    return Response.json({ error: "Failed to process chat request" }, { status: 500 });
  }
}
