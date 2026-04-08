import Groq from "groq-sdk";
import { getDataset } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";
import { computeDatasetStats } from "@/lib/stats";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function buildSystemPrompt(
  name: string,
  rowCount: number,
  headers: string[],
  columnTypes: Record<string, string>,
  sampleRows: Record<string, string>[],
  statsText: string
): string {
  const headersWithTypes = headers
    .map((h) => `  - ${h} (${columnTypes[h]})`)
    .join("\n");

  const sampleJson = JSON.stringify(sampleRows.slice(0, 10), null, 2);

  return `You are a data analyst assistant. You have access to a dataset called "${name}" with ${rowCount} rows and these columns:
${headersWithTypes}

Here is a sample of the data (first 10 rows):
${sampleJson}

Column statistics:
${statsText}

Rules:
- Answer questions about this data accurately
- Reference specific numbers and rows when possible
- Use Markdown formatting: **bold**, bullet lists, tables
- If asked to calculate something, show the calculation
- If the answer requires data you don't have, say so
- Support questions in any language (German, English, etc.)
- Be concise but thorough`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { datasetId, message } = body as {
      datasetId?: string;
      message?: string;
    };

    if (!datasetId || !message) {
      return Response.json(
        { error: "datasetId and message are required" },
        { status: 400 }
      );
    }

    ensureSeedData();
    const dataset = getDataset(datasetId);

    if (!dataset) {
      return Response.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    const stats = computeDatasetStats(
      dataset.rows,
      dataset.headers,
      dataset.columnTypes
    );

    // Build column statistics text
    const statsLines: string[] = [];
    for (const col of stats.columns) {
      if (col.type === "number" && col.mean !== undefined) {
        statsLines.push(
          `  ${col.column}: mean=${col.mean}, min=${col.min}, max=${col.max}, stddev=${col.stddev}`
        );
      }
    }
    const statsText =
      statsLines.length > 0 ? statsLines.join("\n") : "  No numeric columns";

    const systemPrompt = buildSystemPrompt(
      dataset.name,
      dataset.rowCount,
      dataset.headers,
      dataset.columnTypes,
      dataset.rows,
      statsText
    );

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

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch {
    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
