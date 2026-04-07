"use client";

interface CsvDownloadButtonProps {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
}

function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export default function CsvDownloadButton({
  headers,
  rows,
  fileName,
}: CsvDownloadButtonProps) {
  const handleDownload = () => {
    const headerLine = headers.map(escapeCSVField).join(",");
    const dataLines = rows.map((row) =>
      headers.map((h) => escapeCSVField(row[h] ?? "")).join(",")
    );
    const csv = [headerLine, ...dataLines].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-card border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-border-color transition-colors"
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
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Download CSV
    </button>
  );
}
