"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAuditLog, type AuditEntry } from "@/lib/audit";

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function actionLabel(entry: AuditEntry): string {
  switch (entry.action) {
    case "query_run":
      return "SQL Query";
    case "cell_edit":
      return `Spreadsheet Edit: ${entry.datasetName}`;
    case "row_add":
      return `Row Added: ${entry.datasetName}`;
    case "row_delete":
      return `Row Deleted: ${entry.datasetName}`;
    case "column_add":
      return `Column Added: ${entry.datasetName}`;
    case "dataset_upload":
      return `Uploaded: ${entry.datasetName}`;
    case "dataset_delete":
      return `Deleted: ${entry.datasetName}`;
    case "formula_eval":
      return `Formula: ${entry.datasetName}`;
    default:
      return entry.details.description;
  }
}

function actionHref(entry: AuditEntry): string {
  switch (entry.action) {
    case "query_run":
      return "/query";
    case "cell_edit":
    case "row_add":
    case "row_delete":
    case "column_add":
      return "/spreadsheet";
    case "dataset_upload":
    case "dataset_delete":
      return "/datasets";
    case "formula_eval":
      return "/dax";
    default:
      return "/audit";
  }
}

function actionIcon(action: string): string {
  switch (action) {
    case "query_run":
      return "\uD83D\uDCCA";
    case "cell_edit":
    case "row_add":
    case "row_delete":
    case "column_add":
      return "\uD83D\uDCDD";
    case "dataset_upload":
      return "\uD83D\uDCC1";
    case "dataset_delete":
      return "\uD83D\uDDD1\uFE0F";
    case "formula_eval":
      return "\uD83E\uDDEE";
    default:
      return "\uD83D\uDD39";
  }
}

export default function RecentActivity() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    setEntries(getAuditLog(undefined, 5));
  }, []);

  if (entries.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-1">
          Recent Activity
        </h2>
        <p className="text-sm text-text-muted">
          Your latest actions across the platform
        </p>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl divide-y divide-border-subtle overflow-hidden">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={actionHref(entry)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-bg-card-hover transition-colors group"
          >
            <span className="text-lg shrink-0">{actionIcon(entry.action)}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                {actionLabel(entry)}
              </div>
              <div className="text-xs text-text-muted truncate">
                {entry.details.description}
              </div>
            </div>
            <span className="text-xs text-text-muted shrink-0">
              {relativeTime(entry.timestamp)}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-3 text-center">
        <Link
          href="/audit"
          className="text-xs text-text-muted hover:text-accent transition-colors"
        >
          View full audit trail &rarr;
        </Link>
      </div>
    </section>
  );
}
