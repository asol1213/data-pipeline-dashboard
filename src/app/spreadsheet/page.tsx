"use client";

import { useState, useEffect, useCallback } from "react";
import SpreadsheetTable from "@/components/SpreadsheetTable";
import { exportToExcel } from "@/lib/excel-export";
import AutoFillButton from "./AutoFillButton";
import QuickChart from "./QuickChart";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
}

interface DatasetFull extends DatasetMeta {
  rows: Record<string, string>[];
}

export default function SpreadsheetPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "unsaved" | "saving" | "error"
  >("saved");

  // Fetch datasets list
  useEffect(() => {
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((list: DatasetMeta[]) => {
        if (Array.isArray(list) && list.length > 0) {
          setDatasets(list);
          setSelectedDatasetId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch selected dataset
  useEffect(() => {
    if (!selectedDatasetId) return;
    setLoading(true);
    setUnsavedChanges(0);
    setSaveStatus("saved");
    fetch(`/api/datasets/${selectedDatasetId}`)
      .then((res) => res.json())
      .then((ds: DatasetFull) => {
        if (ds.rows) {
          setData(ds.rows);
          setHeaders(ds.headers);
          setColumnTypes(ds.columnTypes);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDatasetId]);

  const markUnsaved = useCallback(() => {
    setUnsavedChanges((prev) => prev + 1);
    setSaveStatus("unsaved");
  }, []);

  const handleCellEdit = useCallback(
    (row: number, col: string, value: string) => {
      setData((prev) => {
        const updated = [...prev];
        updated[row] = { ...updated[row], [col]: value };
        return updated;
      });
      markUnsaved();
    },
    [markUnsaved]
  );

  const handleBulkEdit = useCallback(
    (edits: { row: number; col: string; value: string }[]) => {
      setData((prev) => {
        const updated = [...prev];
        for (const edit of edits) {
          updated[edit.row] = { ...updated[edit.row], [edit.col]: edit.value };
        }
        return updated;
      });
      setUnsavedChanges((prev) => prev + edits.length);
      setSaveStatus("unsaved");
    },
    []
  );

  const handleAddRow = useCallback(() => {
    setData((prev) => {
      const emptyRow: Record<string, string> = {};
      for (const h of headers) {
        emptyRow[h] = "";
      }
      return [...prev, emptyRow];
    });
    markUnsaved();
  }, [headers, markUnsaved]);

  const handleDeleteRow = useCallback(
    (rowIndex: number) => {
      setData((prev) => prev.filter((_, i) => i !== rowIndex));
      markUnsaved();
    },
    [markUnsaved]
  );

  const handleAddColumn = useCallback(
    (name: string, type: string) => {
      setHeaders((prev) => [...prev, name]);
      setColumnTypes((prev) => ({ ...prev, [name]: type }));
      setData((prev) => prev.map((row) => ({ ...row, [name]: "" })));
      markUnsaved();
    },
    [markUnsaved]
  );

  const handleSave = async () => {
    if (!selectedDatasetId || saving) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      const res = await fetch(
        `/api/datasets/${selectedDatasetId}/update`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: data }),
        }
      );
      if (res.ok) {
        setUnsavedChanges(0);
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleNewSpreadsheet = () => {
    const name = prompt("Enter spreadsheet name:");
    if (!name) return;

    const csvContent = "Column_A,Column_B,Column_C\n,,";
    fetch("/api/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        fileName: `${name.replace(/\s+/g, "_").toLowerCase()}.csv`,
        csvContent,
      }),
    })
      .then((res) => res.json())
      .then((meta: DatasetMeta) => {
        if (meta.id) {
          setDatasets((prev) => [...prev, meta]);
          setSelectedDatasetId(meta.id);
        }
      })
      .catch(() => {});
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col" style={{ height: "calc(100vh - 10rem)" }}>
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-6">
        <h1 className="text-2xl font-bold text-white">Spreadsheet Editor</h1>
        <p className="text-sm text-blue-200 mt-1">
          Edit data directly in your datasets with full spreadsheet controls
        </p>
      </div>

      {/* Top bar: dataset selector + new + save */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider whitespace-nowrap">
            Dataset
          </label>
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent min-w-[200px]"
          >
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleNewSpreadsheet}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-color transition-colors whitespace-nowrap"
          >
            + New Spreadsheet
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          <span
            className={`text-xs font-medium ${
              saveStatus === "saved"
                ? "text-success"
                : saveStatus === "saving"
                  ? "text-warning"
                  : saveStatus === "error"
                    ? "text-danger"
                    : "text-warning"
            }`}
          >
            {saveStatus === "saved" && "All changes saved"}
            {saveStatus === "unsaved" &&
              `${unsavedChanges} unsaved change${unsavedChanges !== 1 ? "s" : ""}`}
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "error" && "Save failed"}
          </span>

          <button
            onClick={() => {
              if (data.length > 0 && headers.length > 0) {
                const dsName = datasets.find((d) => d.id === selectedDatasetId)?.name ?? "spreadsheet";
                exportToExcel(data, headers, dsName);
              }
            }}
            disabled={data.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-color transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
            </svg>
            Export Excel
          </button>

          <button
            onClick={handleSave}
            disabled={saving || unsavedChanges === 0}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Spreadsheet */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          Loading dataset...
        </div>
      ) : data.length === 0 && headers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          Select a dataset to start editing
        </div>
      ) : (
        <>
          <div className="flex-1 bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
            <SpreadsheetTable
              data={data}
              headers={headers}
              columnTypes={columnTypes}
              onCellEdit={handleCellEdit}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              onAddColumn={handleAddColumn}
              onBulkEdit={handleBulkEdit}
            />
          </div>
          {/* Auto-fill & Quick Chart tools */}
          <div className="flex items-center gap-3 mt-3">
            <AutoFillButton
              data={data}
              headers={headers}
              onBulkEdit={handleBulkEdit}
            />
            <QuickChart data={data} headers={headers} columnTypes={columnTypes} />
          </div>
        </>
      )}
    </div>
  );
}
