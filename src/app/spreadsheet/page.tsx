"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SpreadsheetTable from "@/components/SpreadsheetTable";
import { exportToExcel } from "@/lib/excel-export";
import { parseCSV, detectAllColumnTypes } from "@/lib/csv-parser";
import { saveVersion } from "@/lib/audit";
import AutoFillButton from "./AutoFillButton";
import QuickChart from "./QuickChart";
import * as XLSX from "xlsx";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
}

interface DatasetFull extends DatasetMeta {
  rows: Record<string, string>[];
}

type NewSheetTab = "blank" | "csv" | "xlsx";

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

  // New Spreadsheet Modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSheetTab, setNewSheetTab] = useState<NewSheetTab>("blank");
  const [newSheetName, setNewSheetName] = useState("");
  const [blankColumns, setBlankColumns] = useState<string[]>(["Column_A", "Column_B", "Column_C", "Column_D", "Column_E"]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const csvInputRef = useRef<HTMLInputElement>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-save version every 10 edits
  const lastVersionAtRef = useRef(0);
  useEffect(() => {
    if (unsavedChanges > 0 && unsavedChanges - lastVersionAtRef.current >= 10) {
      lastVersionAtRef.current = unsavedChanges;
      if (selectedDatasetId && data.length > 0) {
        saveVersion(selectedDatasetId, data, `Auto-saved after ${unsavedChanges} edits`);
      }
    }
  }, [unsavedChanges, selectedDatasetId, data]);

  const handleSave = async () => {
    if (!selectedDatasetId || saving) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      // Save a version snapshot on manual save
      if (data.length > 0) {
        saveVersion(selectedDatasetId, data, "Manual save");
      }

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
        lastVersionAtRef.current = 0;
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

  // --- New Spreadsheet Modal helpers ---

  const resetNewModal = () => {
    setNewSheetTab("blank");
    setNewSheetName("");
    setBlankColumns(["Column_A", "Column_B", "Column_C", "Column_D", "Column_E"]);
    setImportHeaders([]);
    setImportRows([]);
    setImportFileName("");
  };

  const openNewModal = () => {
    resetNewModal();
    setShowNewModal(true);
  };

  const handleBlankColumnChange = (index: number, value: string) => {
    setBlankColumns((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleAddBlankColumn = () => {
    setBlankColumns((prev) => [...prev, `Column_${String.fromCharCode(65 + prev.length)}`]);
  };

  const handleRemoveBlankColumn = (index: number) => {
    if (blankColumns.length <= 1) return;
    setBlankColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    if (!newSheetName) {
      setNewSheetName(file.name.replace(/\.[^/.]+$/, ""));
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const parsed = parseCSV(text);
      setImportHeaders(parsed.headers);
      setImportRows(parsed.rows);
    };
    reader.readAsText(file);
  };

  const handleXLSXFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    if (!newSheetName) {
      setNewSheetName(file.name.replace(/\.[^/.]+$/, ""));
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const arrayBuffer = ev.target?.result;
      if (!arrayBuffer) return;
      try {
        const wb = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) return;
        const ws = wb.Sheets[firstSheetName];
        if (!ws) return;
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (jsonData.length === 0) {
          // Try to at least get headers
          const headerRow = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
          if (headerRow.length > 0) {
            const hdrs = (headerRow[0] as string[]).map((h) => String(h || "").trim()).filter(Boolean);
            setImportHeaders(hdrs);
            setImportRows([]);
          }
          return;
        }
        const hdrs = Object.keys(jsonData[0]).filter((h) => h !== "__rowNum__");
        const rows: Record<string, string>[] = jsonData.map((row) => {
          const r: Record<string, string> = {};
          for (const h of hdrs) {
            r[h] = String(row[h] ?? "");
          }
          return r;
        });
        setImportHeaders(hdrs);
        setImportRows(rows);
      } catch {
        // Excel parse error
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCreateSpreadsheet = async () => {
    const name = newSheetName.trim();
    if (!name) return;

    let csvContent: string;

    if (newSheetTab === "blank") {
      // Validate column names
      const cols = blankColumns.map((c) => c.trim()).filter(Boolean);
      if (cols.length === 0) return;
      csvContent = cols.join(",") + "\n";
    } else {
      // CSV or XLSX import
      if (importHeaders.length === 0) return;
      const headerLine = importHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(",");
      const rowLines = importRows.map((row) =>
        importHeaders.map((h) => {
          const val = row[h] ?? "";
          return `"${val.replace(/"/g, '""')}"`;
        }).join(",")
      );
      csvContent = [headerLine, ...rowLines].join("\n");
    }

    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          fileName: `${name.replace(/\s+/g, "_").toLowerCase()}.csv`,
          csvContent,
        }),
      });
      const meta: DatasetMeta = await res.json();
      if (meta.id) {
        setDatasets((prev) => [...prev, meta]);
        setSelectedDatasetId(meta.id);
        setShowNewModal(false);
      }
    } catch {
      // Error creating spreadsheet
    }
  };

  const previewRows = importRows.slice(0, 5);

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
            onClick={openNewModal}
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
              datasetId={selectedDatasetId}
              datasetName={datasets.find((d) => d.id === selectedDatasetId)?.name ?? ""}
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

      {/* New Spreadsheet Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-border-subtle">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">
                  Create New Spreadsheet
                </h2>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Spreadsheet Name */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Spreadsheet Name
                </label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="My Spreadsheet"
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>

              {/* Tab Selector */}
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "blank" as NewSheetTab, label: "Blank Spreadsheet" },
                    { key: "csv" as NewSheetTab, label: "Import CSV" },
                    { key: "xlsx" as NewSheetTab, label: "Import Excel (.xlsx)" },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setNewSheetTab(tab.key);
                        setImportHeaders([]);
                        setImportRows([]);
                        setImportFileName("");
                      }}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                        newSheetTab === tab.key
                          ? "bg-accent text-white border-accent"
                          : "bg-bg-secondary text-text-secondary border-border-subtle hover:border-accent/50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blank Spreadsheet Tab */}
              {newSheetTab === "blank" && (
                <div className="space-y-3">
                  <label className="block text-sm text-text-secondary">
                    Column Names ({blankColumns.length})
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {blankColumns.map((col, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-text-muted w-6 text-right">{i + 1}.</span>
                        <input
                          type="text"
                          value={col}
                          onChange={(e) => handleBlankColumnChange(i, e.target.value)}
                          className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                          placeholder={`Column ${i + 1}`}
                        />
                        <button
                          onClick={() => handleRemoveBlankColumn(i)}
                          disabled={blankColumns.length <= 1}
                          className="p-1.5 text-text-muted hover:text-danger transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove column"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleAddBlankColumn}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  >
                    + Add Column
                  </button>
                </div>
              )}

              {/* Import CSV Tab */}
              {newSheetTab === "csv" && (
                <div className="space-y-3">
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVFile}
                    className="hidden"
                  />
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-border-color rounded-xl flex flex-col items-center justify-center gap-2 hover:border-accent/50 hover:bg-accent-subtle transition-all"
                  >
                    <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm text-text-secondary">
                      {importFileName ? importFileName : "Click to select a .csv file"}
                    </span>
                  </button>

                  {/* Preview */}
                  {importHeaders.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted mb-2">
                        Preview: {importHeaders.length} columns, {importRows.length} rows
                        {importRows.length > 5 && " (showing first 5)"}
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-border-subtle">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-bg-secondary border-b border-border-subtle">
                              {importHeaders.map((h) => (
                                <th key={h} className="text-left px-2 py-1.5 text-text-muted font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, i) => (
                              <tr key={i} className="border-b border-border-subtle/50">
                                {importHeaders.map((h) => (
                                  <td key={h} className="px-2 py-1 text-text-primary">{row[h]}</td>
                                ))}
                              </tr>
                            ))}
                            {importRows.length === 0 && (
                              <tr>
                                <td colSpan={importHeaders.length} className="px-2 py-2 text-center text-text-muted">
                                  (No data rows -- headers only)
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Import Excel Tab */}
              {newSheetTab === "xlsx" && (
                <div className="space-y-3">
                  <input
                    ref={xlsxInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleXLSXFile}
                    className="hidden"
                  />
                  <button
                    onClick={() => xlsxInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-border-color rounded-xl flex flex-col items-center justify-center gap-2 hover:border-accent/50 hover:bg-accent-subtle transition-all"
                  >
                    <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm text-text-secondary">
                      {importFileName ? importFileName : "Click to select a .xlsx file"}
                    </span>
                  </button>

                  {/* Preview */}
                  {importHeaders.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted mb-2">
                        Preview: {importHeaders.length} columns, {importRows.length} rows
                        {importRows.length > 5 && " (showing first 5)"}
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-border-subtle">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-bg-secondary border-b border-border-subtle">
                              {importHeaders.map((h) => (
                                <th key={h} className="text-left px-2 py-1.5 text-text-muted font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, i) => (
                              <tr key={i} className="border-b border-border-subtle/50">
                                {importHeaders.map((h) => (
                                  <td key={h} className="px-2 py-1 text-text-primary">{row[h]}</td>
                                ))}
                              </tr>
                            ))}
                            {importRows.length === 0 && (
                              <tr>
                                <td colSpan={importHeaders.length} className="px-2 py-2 text-center text-text-muted">
                                  (No data rows -- headers only)
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border-subtle flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSpreadsheet}
                disabled={
                  !newSheetName.trim() ||
                  (newSheetTab === "blank" && blankColumns.filter((c) => c.trim()).length === 0) ||
                  (newSheetTab !== "blank" && importHeaders.length === 0)
                }
                className="px-6 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {newSheetTab === "blank" ? "Create" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
