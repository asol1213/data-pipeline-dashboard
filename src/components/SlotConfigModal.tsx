"use client";

import { useState, useEffect } from "react";

export type SlotType = "kpi" | "chart" | "table";
export type AggregationType = "sum" | "avg" | "min" | "max" | "latest";
export type ChartVariant = "bar" | "line" | "area" | "pie";

export interface SlotConfig {
  type: SlotType;
  datasetId: string;
  datasetName: string;
  column?: string;
  columns?: string[];
  aggregation?: AggregationType;
  chartType?: ChartVariant;
  rowLimit?: number;
}

interface DatasetOption {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
}

interface SlotConfigModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (config: SlotConfig) => void;
  existing?: SlotConfig | null;
}

export default function SlotConfigModal({
  open,
  onClose,
  onApply,
  existing,
}: SlotConfigModalProps) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<SlotType>(existing?.type ?? "kpi");
  const [datasetId, setDatasetId] = useState(existing?.datasetId ?? "");
  const [column, setColumn] = useState(existing?.column ?? "");
  const [columns, setColumns] = useState<string[]>(existing?.columns ?? []);
  const [aggregation, setAggregation] = useState<AggregationType>(
    existing?.aggregation ?? "sum"
  );
  const [chartType, setChartType] = useState<ChartVariant>(
    existing?.chartType ?? "bar"
  );
  const [rowLimit, setRowLimit] = useState(existing?.rowLimit ?? 10);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((data: DatasetOption[]) => {
        setDatasets(data);
        if (!datasetId && data.length > 0) {
          setDatasetId(data[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, datasetId]);

  useEffect(() => {
    if (existing) {
      setType(existing.type);
      setDatasetId(existing.datasetId);
      setColumn(existing.column ?? "");
      setColumns(existing.columns ?? []);
      setAggregation(existing.aggregation ?? "sum");
      setChartType(existing.chartType ?? "bar");
      setRowLimit(existing.rowLimit ?? 10);
    }
  }, [existing]);

  const selectedDataset = datasets.find((d) => d.id === datasetId);
  const numericHeaders =
    selectedDataset?.headers.filter(
      (h) => selectedDataset.columnTypes[h] === "number"
    ) ?? [];
  const allHeaders = selectedDataset?.headers ?? [];

  // When dataset changes, reset column selections
  useEffect(() => {
    if (selectedDataset) {
      if (type === "kpi" || type === "chart") {
        if (numericHeaders.length > 0 && !numericHeaders.includes(column)) {
          setColumn(numericHeaders[0]);
        }
      }
      if (type === "table" && columns.length === 0) {
        setColumns(allHeaders.slice(0, 4));
      }
    }
  }, [datasetId, selectedDataset, type, numericHeaders, allHeaders, column, columns.length]);

  const handleApply = () => {
    if (!selectedDataset) return;
    const config: SlotConfig = {
      type,
      datasetId,
      datasetName: selectedDataset.name,
      column: type !== "table" ? column : undefined,
      columns: type === "table" ? columns : undefined,
      aggregation: type === "kpi" ? aggregation : undefined,
      chartType: type === "chart" ? chartType : undefined,
      rowLimit: type === "table" ? rowLimit : undefined,
    };
    onApply(config);
  };

  const toggleColumn = (h: string) => {
    setColumns((prev) =>
      prev.includes(h) ? prev.filter((c) => c !== h) : [...prev, h]
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border-subtle">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Configure Slot
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <p className="text-text-muted text-sm">Loading datasets...</p>
          ) : datasets.length === 0 ? (
            <p className="text-text-muted text-sm">
              No datasets available. Upload a CSV first.
            </p>
          ) : (
            <>
              {/* Type selector */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Widget Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["kpi", "chart", "table"] as SlotType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                        type === t
                          ? "bg-accent text-white border-accent"
                          : "bg-bg-secondary text-text-secondary border-border-subtle hover:border-accent/50"
                      }`}
                    >
                      {t === "kpi" ? "KPI Card" : t === "chart" ? "Chart" : "Data Table"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dataset selector */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Dataset
                </label>
                <select
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* KPI config */}
              {type === "kpi" && (
                <>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Column (numeric)
                    </label>
                    <select
                      value={column}
                      onChange={(e) => setColumn(e.target.value)}
                      className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                    >
                      {numericHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Aggregation
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {(
                        ["sum", "avg", "min", "max", "latest"] as AggregationType[]
                      ).map((a) => (
                        <button
                          key={a}
                          onClick={() => setAggregation(a)}
                          className={`py-2 px-2 rounded-lg text-xs font-medium transition-all border ${
                            aggregation === a
                              ? "bg-accent text-white border-accent"
                              : "bg-bg-secondary text-text-secondary border-border-subtle hover:border-accent/50"
                          }`}
                        >
                          {a.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Chart config */}
              {type === "chart" && (
                <>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Column (numeric)
                    </label>
                    <select
                      value={column}
                      onChange={(e) => setColumn(e.target.value)}
                      className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                    >
                      {numericHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Chart Type
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        ["bar", "line", "area", "pie"] as ChartVariant[]
                      ).map((ct) => (
                        <button
                          key={ct}
                          onClick={() => setChartType(ct)}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border capitalize ${
                            chartType === ct
                              ? "bg-accent text-white border-accent"
                              : "bg-bg-secondary text-text-secondary border-border-subtle hover:border-accent/50"
                          }`}
                        >
                          {ct}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Table config */}
              {type === "table" && (
                <>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Columns to show
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allHeaders.map((h) => (
                        <button
                          key={h}
                          onClick={() => toggleColumn(h)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            columns.includes(h)
                              ? "bg-accent text-white border-accent"
                              : "bg-bg-secondary text-text-secondary border-border-subtle hover:border-accent/50"
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Row Limit
                    </label>
                    <input
                      type="number"
                      value={rowLimit}
                      onChange={(e) =>
                        setRowLimit(Math.max(1, Math.min(100, Number(e.target.value) || 10)))
                      }
                      min={1}
                      max={100}
                      className="w-32 bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-border-subtle flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={
              datasets.length === 0 ||
              (type !== "table" && !column) ||
              (type === "table" && columns.length === 0)
            }
            className="px-6 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
