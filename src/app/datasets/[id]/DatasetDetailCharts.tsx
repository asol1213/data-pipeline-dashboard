"use client";

import { useState, useCallback, useMemo } from "react";
import ChartCard from "@/components/ChartCard";
import DrillDownPanel from "@/components/DrillDownPanel";

interface DatasetDetailChartsProps {
  chartData: Record<string, string | number>[];
  labelCol: string;
  numericCols: string[];
  chartColors: string[];
  datasetId?: string;
  allRows?: Record<string, string>[];
  allHeaders?: string[];
  columnTypes?: Record<string, string>;
}

function EmbedModal({ datasetId, col, onClose }: { datasetId: string; col: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const embedUrl = `https://data-pipeline-dashboard-omega.vercel.app/embed/${datasetId}?col=${encodeURIComponent(col)}&type=bar`;
  const iframeCode = `<iframe src="${embedUrl}" width="600" height="400" frameborder="0"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(iframeCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Embed Chart</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl">&times;</button>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Embed URL
          </label>
          <input
            readOnly
            value={embedUrl}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary font-mono"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Iframe Code
          </label>
          <textarea
            readOnly
            value={iframeCode}
            rows={3}
            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary font-mono resize-none"
          />
        </div>
        <button
          onClick={handleCopy}
          className="w-full px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        >
          {copied ? "Copied!" : "Copy Iframe Code"}
        </button>
      </div>
    </div>
  );
}

interface DrillDownState {
  chartCol: string;
  label: string;
  filterColumn: string;
}

export default function DatasetDetailCharts({
  chartData,
  labelCol,
  numericCols,
  chartColors,
  datasetId,
  allRows,
  allHeaders,
  columnTypes,
}: DatasetDetailChartsProps) {
  const [embedCol, setEmbedCol] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);

  const handleDrillDown = useCallback(
    (chartCol: string) => (label: string, filterColumn: string) => {
      setDrillDown({ chartCol, label, filterColumn });
    },
    []
  );

  const handleCloseDrillDown = useCallback(() => {
    setDrillDown(null);
  }, []);

  const drillDownRows = useMemo(() => {
    if (!drillDown || !allRows) return [];
    return allRows.filter(
      (row) => row[drillDown.filterColumn] === drillDown.label
    );
  }, [drillDown, allRows]);

  const headers = allHeaders ?? [];
  const colTypes = columnTypes ?? {};

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {numericCols.map((col, i) => (
          <div key={col} className="relative">
            <ChartCard
              title={col.replace(/_/g, " ")}
              data={chartData}
              xKey={labelCol}
              yKey={col}
              color={chartColors[i % chartColors.length]}
              onDrillDown={allRows ? handleDrillDown(col) : undefined}
              chartData={chartData.map((row) => ({
                label: String(row[labelCol]),
                value: Number(row[col]) || 0,
              }))}
              columnName={col}
            />
            {datasetId && (
              <button
                onClick={() => setEmbedCol(col)}
                className="absolute top-4 right-4 px-2 py-1 text-[10px] font-medium rounded-md bg-bg-secondary border border-border-subtle text-text-muted hover:text-accent hover:border-accent/30 transition-all z-10"
                title="Embed this chart"
              >
                Embed
              </button>
            )}
            {drillDown && drillDown.chartCol === col && allRows && (
              <DrillDownPanel
                label={drillDown.label}
                column={drillDown.filterColumn}
                rows={drillDownRows}
                headers={headers}
                columnTypes={colTypes}
                onClose={handleCloseDrillDown}
              />
            )}
          </div>
        ))}
      </div>
      {embedCol && datasetId && (
        <EmbedModal
          datasetId={datasetId}
          col={embedCol}
          onClose={() => setEmbedCol(null)}
        />
      )}
    </>
  );
}
