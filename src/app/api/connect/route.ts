import { parseCSV, detectAllColumnTypes } from "@/lib/csv-parser";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const TIMEOUT_MS = 15000;

function convertSheetsUrl(url: string): string {
  // Handle various Google Sheets URL formats
  // https://docs.google.com/spreadsheets/d/{ID}/edit...
  // https://docs.google.com/spreadsheets/d/{ID}/pub...
  // Convert to CSV export URL
  const match = url.match(
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  );
  if (match) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
  }
  // If already a CSV export URL, return as-is
  if (url.includes("/export?format=csv")) {
    return url;
  }
  return url;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, type } = body as { url: string; type: "api" | "sheets" };

    if (!url || !type) {
      return Response.json(
        { error: "url and type are required" },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return Response.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Only allow http/https
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return Response.json(
        { error: "Only HTTP and HTTPS URLs are supported" },
        { status: 400 }
      );
    }

    const fetchUrl = type === "sheets" ? convertSheetsUrl(url) : url;

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          Accept:
            type === "api" ? "application/json" : "text/csv, text/plain",
        },
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        return Response.json(
          { error: "Request timed out (15s limit)" },
          { status: 408 }
        );
      }
      return Response.json(
        { error: "Failed to fetch the URL. Check the URL and try again." },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return Response.json(
        { error: `Remote server returned ${response.status}` },
        { status: 502 }
      );
    }

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
      return Response.json(
        { error: "Response exceeds 5MB size limit" },
        { status: 413 }
      );
    }

    const text = await response.text();
    if (text.length > MAX_SIZE) {
      return Response.json(
        { error: "Response exceeds 5MB size limit" },
        { status: 413 }
      );
    }

    if (type === "api") {
      // Parse JSON
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return Response.json(
          { error: "Response is not valid JSON" },
          { status: 422 }
        );
      }

      // Accept array of objects
      let items: Record<string, unknown>[];
      if (Array.isArray(json)) {
        items = json;
      } else if (
        typeof json === "object" &&
        json !== null &&
        !Array.isArray(json)
      ) {
        // Try to find an array in the top-level keys
        const obj = json as Record<string, unknown>;
        const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
        if (arrayKey) {
          items = obj[arrayKey] as Record<string, unknown>[];
        } else {
          return Response.json(
            {
              error:
                "JSON response must be an array of objects, or an object containing an array",
            },
            { status: 422 }
          );
        }
      } else {
        return Response.json(
          { error: "JSON response must be an array of objects" },
          { status: 422 }
        );
      }

      if (items.length === 0) {
        return Response.json(
          { error: "JSON array is empty" },
          { status: 422 }
        );
      }

      // Convert to rows format (string values)
      const headers = Object.keys(items[0]);
      const rows = items.map((item) => {
        const row: Record<string, string> = {};
        headers.forEach((h) => {
          const val = item[h];
          row[h] = val === null || val === undefined ? "" : String(val);
        });
        return row;
      });

      const columnTypes = detectAllColumnTypes(headers, rows);

      return Response.json({
        headers,
        rows,
        rowCount: rows.length,
        columnTypes,
      });
    } else {
      // Parse CSV (sheets or plain CSV)
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) {
        return Response.json(
          { error: "Could not parse CSV data. Make sure the sheet is published to the web." },
          { status: 422 }
        );
      }

      const columnTypes = detectAllColumnTypes(parsed.headers, parsed.rows);

      return Response.json({
        headers: parsed.headers,
        rows: parsed.rows,
        rowCount: parsed.rows.length,
        columnTypes,
      });
    }
  } catch {
    return Response.json(
      { error: "Failed to process the request" },
      { status: 500 }
    );
  }
}
