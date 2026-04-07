"use client";

import DataTable from "@/components/DataTable";

interface DashboardTableProps {
  headers: string[];
  rows: Record<string, string>[];
  columnTypes: Record<string, string>;
  anomalyIndices: Record<string, number[]>;
  columnStats?: Record<string, { mean: number; stddev: number }>;
}

export default function DashboardTable({
  headers,
  rows,
  columnTypes,
  anomalyIndices,
  columnStats = {},
}: DashboardTableProps) {
  return (
    <DataTable
      headers={headers}
      rows={rows}
      columnTypes={columnTypes}
      anomalyIndices={anomalyIndices}
      columnStats={columnStats}
    />
  );
}
