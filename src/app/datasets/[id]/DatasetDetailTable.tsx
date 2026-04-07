"use client";

import DataTable from "@/components/DataTable";

interface DatasetDetailTableProps {
  headers: string[];
  rows: Record<string, string>[];
  columnTypes: Record<string, string>;
  anomalyIndices: Record<string, number[]>;
}

export default function DatasetDetailTable({
  headers,
  rows,
  columnTypes,
  anomalyIndices,
}: DatasetDetailTableProps) {
  return (
    <DataTable
      headers={headers}
      rows={rows}
      columnTypes={columnTypes}
      anomalyIndices={anomalyIndices}
    />
  );
}
