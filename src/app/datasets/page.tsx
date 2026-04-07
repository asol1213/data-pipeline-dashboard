import Link from "next/link";
import { getAllDatasets } from "@/lib/store";
import { ensureSeedData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default function DatasetsPage() {
  ensureSeedData();
  const datasets = getAllDatasets();

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Datasets</h1>
          <p className="text-sm text-text-muted mt-1">
            {datasets.length} dataset{datasets.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm transition-colors"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Upload New
        </Link>
      </div>

      {datasets.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-text-muted mb-4">No datasets uploaded yet.</p>
          <Link
            href="/upload"
            className="text-accent hover:text-accent-hover transition-colors"
          >
            Upload your first CSV
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {datasets.map((ds) => (
            <Link
              key={ds.id}
              href={`/datasets/${ds.id}`}
              className="block bg-bg-card rounded-xl border border-border-subtle p-6 hover:border-border-color hover:bg-bg-card-hover transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary mb-1">
                    {ds.name}
                  </h2>
                  <p className="text-sm text-text-muted">{ds.fileName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-secondary">
                    {ds.rowCount.toLocaleString()} rows &middot;{" "}
                    {ds.columnCount} columns
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(ds.uploadedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {ds.headers.map((h) => {
                  const type = ds.columnTypes[h];
                  const colors: Record<string, string> = {
                    number: "bg-blue-900/20 text-blue-400",
                    date: "bg-purple-900/20 text-purple-400",
                    string: "bg-emerald-900/20 text-emerald-400",
                  };
                  return (
                    <span
                      key={h}
                      className={`text-xs px-2 py-1 rounded-md ${colors[type] ?? "bg-bg-secondary text-text-muted"}`}
                    >
                      {h}
                    </span>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
