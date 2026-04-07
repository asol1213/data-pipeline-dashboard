"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { parseCSV, detectAllColumnTypes } from "@/lib/csv-parser";

export default function UploadPage() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState("");
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: Record<string, string>[];
    types: Record<string, string>;
  } | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const processFile = useCallback((f: File) => {
    setFile(f);
    setName(f.name.replace(/\.csv$/i, "").replace(/[_-]/g, " "));
    setError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) {
        setError("CSV appears to be empty or invalid.");
        return;
      }
      const types = detectAllColumnTypes(parsed.headers, parsed.rows);
      setPreview({
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 10),
        types,
      });
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".csv")) {
        processFile(f);
      } else {
        setError("Please upload a .csv file");
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  const handleUpload = async () => {
    if (!csvContent || !name) return;
    setUploading(true);
    setError("");

    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          fileName: file?.name ?? "upload.csv",
          csvContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        return;
      }

      const data = await res.json();
      router.push(`/datasets/${data.id}`);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Upload Dataset</h1>
        <p className="text-sm text-text-muted mt-1">
          Upload a CSV file to analyze. Column types are auto-detected.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragActive
            ? "border-accent bg-accent-subtle"
            : "border-border-color hover:border-accent/50"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-accent-subtle mx-auto flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <p className="text-text-secondary mb-2">
          {file ? file.name : "Drag & drop your CSV file here"}
        </p>
        <p className="text-sm text-text-muted mb-4">or</p>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors cursor-pointer">
          Browse Files
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-8 space-y-6">
          {/* Dataset name */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Dataset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Column detection */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              Detected Columns ({preview.headers.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {preview.headers.map((h) => {
                const type = preview.types[h];
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
                  {preview.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border-subtle/50 hover:bg-bg-card-hover"
                    >
                      {preview.headers.map((h) => (
                        <td key={h} className="px-4 py-2 text-text-primary">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !name}
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload & Analyze"}
          </button>
        </div>
      )}
    </div>
  );
}
