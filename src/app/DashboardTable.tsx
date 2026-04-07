"use client";

import DataTable from "@/components/DataTable";

interface DashboardTableProps {
  headers: string[];
  rows: Record<string, string>[];
  columnTypes: Record<string, string>;
  anomalyIndices: Record<string, number[]>;
}

export default function DashboardTable({
  headers,
  rows,
  columnTypes,
  anomalyIndices,
}: DashboardTableProps) {
  return (
    <DataTable
      headers={headers}
      rows={rows}
      columnTypes={columnTypes}
      anomalyIndices={anomalyIndices}
    />
  );
}
