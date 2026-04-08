"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PreviewData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  columnTypes: Record<string, string>;
}

type ConnectorType = "api" | "sheets";

export default function ConnectPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ConnectorType>("api");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [importing, setImporting] = useState(false);
  const [datasetName, setDatasetName] = useState("");

  const handleFetch = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setError("");
    setPreview(null);

    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), type: activeTab }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch data");
        return;
      }

      setPreview(data);
      // Auto-generate a dataset name from the URL
      if (!datasetName) {
        try {
          const parsed = new URL(url.trim());
          const pathName = parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname;
          setDatasetName(
            pathName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ")
          );
        } catch {
          setDatasetName(activeTab === "sheets" ? "Google Sheet Import" : "API Import");
        }
      }
    } catch {
      setError("Network error. Please check the URL and try again.");
    } finally {
      setFetching(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !datasetName.trim()) return;
    setImporting(true);
    setError("");

    try {
      // Convert rows to CSV content for the datasets API
      const csvLines = [preview.headers.join(",")];
      for (const row of preview.rows) {
        const values = preview.headers.map((h) => {
          const val = row[h] ?? "";
          // Escape values that contain commas or quotes
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        });
        csvLines.push(values.join(","));
      }
      const csvContent = csvLines.join("\n");

      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: datasetName.trim(),
          fileName: `${activeTab}-import.csv`,
          csvContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Import failed");
        return;
      }

      const data = await res.json();
      router.push(`/datasets/${data.id}`);
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setPreview(null);
    setError("");
    setDatasetName("");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Data Connectors</h1>
            <p className="text-sm text-blue-200 mt-1">
              Import data from APIs and Google Sheets
            </p>
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setActiveTab("api");
            handleReset();
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border ${
            activeTab === "api"
              ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
              : "bg-bg-card text-text-secondary border-border-subtle hover:border-accent/50"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          JSON API
        </button>
        <button
          onClick={() => {
            setActiveTab("sheets");
            handleReset();
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border ${
            activeTab === "sheets"
              ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
              : "bg-bg-card text-text-secondary border-border-subtle hover:border-accent/50"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
            />
          </svg>
          Google Sheets
        </button>
      </div>

      {/* Connector form */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-1">
            {activeTab === "api" ? "JSON API Endpoint" : "Google Sheets URL"}
          </h2>
          <p className="text-xs text-text-muted">
            {activeTab === "api"
              ? "Enter a URL that returns a JSON array of objects (e.g., a REST API endpoint)"
              : "Paste the URL of a Google Sheet published to the web. We will auto-convert it to the CSV export format."}
          </p>
        </div>

        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={
              activeTab === "api"
                ? "https://api.example.com/data.json"
                : "https://docs.google.com/spreadsheets/d/..."
            }
            className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFetch();
            }}
          />
          <button
            onClick={handleFetch}
            disabled={fetching || !url.trim()}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {fetching ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Fetching...
              </>
            ) : (
              "Fetch"
            )}
          </button>
        </div>

        {activeTab === "sheets" && (
          <div className="mt-3 p-3 rounded-lg bg-bg-secondary border border-border-subtle">
            <p className="text-xs text-text-muted">
              <strong className="text-text-secondary">Tip:</strong> In Google
              Sheets, go to File &rarr; Share &rarr; Publish to web &rarr;
              select CSV format. Or just paste the regular sheet URL and we will
              convert it automatically.
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-6">
          {/* Stats bar */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <span className="text-sm text-text-secondary font-medium">
                    {preview.rowCount} rows fetched
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#8b5cf6]"></div>
                  <span className="text-sm text-text-secondary font-medium">
                    {preview.headers.length} columns
                  </span>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Clear &amp; start over
              </button>
            </div>
          </div>

          {/* Column types */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              Detected Columns
            </h3>
            <div className="flex flex-wrap gap-2">
              {preview.headers.map((h) => {
                const type = preview.columnTypes[h];
                const colors: Record<string, string> = {
                  number: "bg-blue-900/30 text-blue-400 border-blue-800/50",
                  date: "bg-purple-900/30 text-purple-400 border-purple-800/50",
                  string:
                    "bg-emerald-900/30 text-emerald-400 border-emerald-800/50",
                };
                return (
                  <span
                    key={h}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${colors[type] ?? "bg-bg-card text-text-secondary border-border-subtle"}`}
                  >
                    {h}{" "}
                    <span className="text-xs opacity-70">({type})</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Preview table */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              Preview (first 10 rows)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-secondary">
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-text-muted font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 10).map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border-subtle/50 hover:bg-bg-card-hover"
                    >
                      {preview.headers.map((h) => (
                        <td
                          key={h}
                          className="px-4 py-2 text-text-primary"
                        >
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rowCount > 10 && (
              <p className="text-xs text-text-muted mt-2">
                ... and {preview.rowCount - 10} more rows
              </p>
            )}
          </div>

          {/* Import */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              Import as Dataset
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Dataset name"
                className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleImport}
                disabled={importing || !datasetName.trim()}
                className="px-6 py-2.5 rounded-lg bg-success hover:opacity-90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? "Importing..." : "Import as Dataset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
