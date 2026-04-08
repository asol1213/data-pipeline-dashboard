"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import EditableCell from "./EditableCell";
import { evaluateCellFormula } from "@/lib/cell-formulas";
import { logAudit } from "@/lib/audit";

export interface HistoryEntry {
  action: "edit" | "addRow" | "deleteRow" | "addColumn";
  row: number;
  col: string;
  oldValue: string;
  newValue: string;
  // For row operations, store the full row data
  rowData?: Record<string, string>;
}

interface SpreadsheetTableProps {
  data: Record<string, string>[];
  headers: string[];
  columnTypes: Record<string, string>;
  onCellEdit: (row: number, col: string, value: string) => void;
  onAddRow: () => void;
  onDeleteRow: (rowIndex: number) => void;
  onAddColumn: (name: string, type: string) => void;
  onBulkEdit?: (edits: { row: number; col: string; value: string }[]) => void;
  datasetId?: string;
  datasetName?: string;
}

const MAX_HISTORY = 50;

export default function SpreadsheetTable({
  data,
  headers,
  columnTypes,
  onCellEdit,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onBulkEdit,
  datasetId = "",
  datasetName = "",
}: SpreadsheetTableProps) {
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("string");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    rowIndex: number;
  } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Find & Replace state
  const [showFindBar, setShowFindBar] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [findTerm, setFindTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Compute matches for find
  const findMatches = useMemo(() => {
    if (!findTerm) return [];
    const matches: { row: number; col: string }[] = [];
    const term = findTerm.toLowerCase();
    for (let ri = 0; ri < data.length; ri++) {
      for (const h of headers) {
        const val = data[ri]?.[h] ?? "";
        if (val.toLowerCase().includes(term)) {
          matches.push({ row: ri, col: h });
        }
      }
    }
    return matches;
  }, [findTerm, data, headers]);

  // Build 2D data array for formula evaluation
  const dataGrid = useMemo(() => {
    return data.map(row => headers.map(h => row[h] ?? ""));
  }, [data, headers]);

  // Evaluate a cell value - if it starts with "=", compute the formula
  const getCellDisplayValue = useCallback((rowIndex: number, col: string): string => {
    const raw = data[rowIndex]?.[col] ?? "";
    if (raw.startsWith("=")) {
      try {
        const result = evaluateCellFormula(raw.substring(1), dataGrid, headers);
        return String(result);
      } catch {
        return "#ERROR";
      }
    }
    return raw;
  }, [data, dataGrid, headers]);

  // Compute sorted indices
  const sortedIndices = (() => {
    const indices = data.map((_, i) => i);
    if (!sortColumn) return indices;
    return indices.sort((a, b) => {
      const aVal = data[a][sortColumn] ?? "";
      const bVal = data[b][sortColumn] ?? "";
      if (columnTypes[sortColumn] === "number") {
        const diff = Number(aVal) - Number(bVal);
        return sortDir === "asc" ? diff : -diff;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  })();

  const pushHistory = useCallback(
    (entry: HistoryEntry) => {
      setHistory((prev) => {
        // If we're not at the end of history, truncate
        const base = prev.slice(0, historyIndex + 1);
        const updated = [...base, entry];
        // Limit to MAX_HISTORY
        if (updated.length > MAX_HISTORY) {
          return updated.slice(updated.length - MAX_HISTORY);
        }
        return updated;
      });
      setHistoryIndex((prev) => {
        const newIdx = Math.min(prev + 1, MAX_HISTORY - 1);
        return newIdx;
      });
    },
    [historyIndex]
  );

  const handleCellSave = useCallback(
    (rowIndex: number, col: string, newValue: string) => {
      const oldValue = data[rowIndex]?.[col] ?? "";
      if (oldValue === newValue) {
        setEditingCell(null);
        return;
      }
      pushHistory({
        action: "edit",
        row: rowIndex,
        col,
        oldValue,
        newValue,
      });
      onCellEdit(rowIndex, col, newValue);
      setEditingCell(null);

      // Audit log
      if (datasetId) {
        logAudit({
          action: "cell_edit",
          datasetId,
          datasetName,
          details: {
            row: rowIndex,
            column: col,
            oldValue,
            newValue,
            description: `Row ${rowIndex + 1}, Column "${col}": "${oldValue}" → "${newValue}"`,
          },
          user: "Andrew Arbo",
        });
      }
    },
    [data, onCellEdit, pushHistory, datasetId, datasetName]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex < 0 || history.length === 0) return;
    const entry = history[historyIndex];
    if (entry.action === "edit") {
      onCellEdit(entry.row, entry.col, entry.oldValue);
    } else if (entry.action === "addRow" && entry.rowData) {
      onDeleteRow(entry.row);
    } else if (entry.action === "deleteRow" && entry.rowData) {
      // Re-insert row - we'd need an insertRow callback, but for simplicity
      // we just notify about the undo. The parent handles actual data.
      onCellEdit(entry.row, entry.col, entry.oldValue);
    }
    setHistoryIndex((prev) => prev - 1);
  }, [history, historyIndex, onCellEdit, onDeleteRow]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const entry = history[historyIndex + 1];
    if (entry.action === "edit") {
      onCellEdit(entry.row, entry.col, entry.newValue);
    }
    setHistoryIndex((prev) => prev + 1);
  }, [history, historyIndex, onCellEdit]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDir("asc");
    }
  };

  const handleNavigate = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!selectedCell) return;
      const colIdx = headers.indexOf(selectedCell.col);
      const rowIdx = sortedIndices.indexOf(selectedCell.row);
      let newRow = rowIdx;
      let newCol = colIdx;

      switch (direction) {
        case "up":
          newRow = Math.max(0, rowIdx - 1);
          break;
        case "down":
          newRow = Math.min(sortedIndices.length - 1, rowIdx + 1);
          break;
        case "left":
          newCol = Math.max(0, colIdx - 1);
          break;
        case "right":
          newCol = Math.min(headers.length - 1, colIdx + 1);
          break;
      }

      const actualRowIndex = sortedIndices[newRow];
      setSelectedCell({ row: actualRowIndex, col: headers[newCol] });
      setSelectionEnd(null);
      setEditingCell(null);
    },
    [selectedCell, headers, sortedIndices]
  );

  // Get selected range
  const getSelectedRange = useCallback((): {
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
  } | null => {
    if (!selectedCell) return null;
    const end = selectionEnd || selectedCell;
    const r1 = sortedIndices.indexOf(selectedCell.row);
    const r2 = sortedIndices.indexOf(end.row);
    const c1 = headers.indexOf(selectedCell.col);
    const c2 = headers.indexOf(end.col);
    return {
      minRow: Math.min(r1, r2),
      maxRow: Math.max(r1, r2),
      minCol: Math.min(c1, c2),
      maxCol: Math.max(c1, c2),
    };
  }, [selectedCell, selectionEnd, sortedIndices, headers]);

  const isCellInSelection = useCallback(
    (rowIndex: number, col: string): boolean => {
      const range = getSelectedRange();
      if (!range) return false;
      const ri = sortedIndices.indexOf(rowIndex);
      const ci = headers.indexOf(col);
      return (
        ri >= range.minRow &&
        ri <= range.maxRow &&
        ci >= range.minCol &&
        ci <= range.maxCol
      );
    },
    [getSelectedRange, sortedIndices, headers]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Find & Replace shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowFindBar(true);
        setShowReplace(false);
        setTimeout(() => findInputRef.current?.focus(), 50);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        setShowFindBar(true);
        setShowReplace(true);
        setTimeout(() => findInputRef.current?.focus(), 50);
        return;
      }
      if (e.key === "Escape" && showFindBar) {
        e.preventDefault();
        setShowFindBar(false);
        setShowReplace(false);
        setFindTerm("");
        setReplaceTerm("");
        setCurrentMatchIndex(0);
        return;
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !editingCell) {
        e.preventDefault();
        const range = getSelectedRange();
        if (!range) return;
        const lines: string[] = [];
        for (let ri = range.minRow; ri <= range.maxRow; ri++) {
          const rowIdx = sortedIndices[ri];
          const cells: string[] = [];
          for (let ci = range.minCol; ci <= range.maxCol; ci++) {
            cells.push(data[rowIdx]?.[headers[ci]] ?? "");
          }
          lines.push(cells.join("\t"));
        }
        navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
        return;
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && !editingCell) {
        e.preventDefault();
        if (!selectedCell) return;
        navigator.clipboard
          .readText()
          .then((text) => {
            const lines = text.split("\n").filter((l) => l.length > 0);
            const edits: { row: number; col: string; value: string }[] = [];
            const startRowSorted = sortedIndices.indexOf(selectedCell.row);
            const startCol = headers.indexOf(selectedCell.col);

            for (let li = 0; li < lines.length; li++) {
              const cells = lines[li].split("\t");
              for (let ci = 0; ci < cells.length; ci++) {
                const targetRowSorted = startRowSorted + li;
                const targetCol = startCol + ci;
                if (
                  targetRowSorted < sortedIndices.length &&
                  targetCol < headers.length
                ) {
                  const actualRow = sortedIndices[targetRowSorted];
                  const col = headers[targetCol];
                  edits.push({ row: actualRow, col, value: cells[ci] });
                }
              }
            }

            if (edits.length > 0 && onBulkEdit) {
              onBulkEdit(edits);
            } else {
              for (const edit of edits) {
                onCellEdit(edit.row, edit.col, edit.value);
              }
            }
          })
          .catch(() => {});
        return;
      }

      // Arrow key navigation when not editing
      if (!editingCell && selectedCell) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          handleNavigate("up");
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          handleNavigate("down");
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          handleNavigate("left");
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          handleNavigate("right");
        } else if (e.key === "Enter" && selectedCell) {
          e.preventDefault();
          setEditingCell(selectedCell);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          if (selectedCell && !editingCell) {
            e.preventDefault();
            handleCellSave(selectedCell.row, selectedCell.col, "");
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    editingCell,
    selectedCell,
    handleUndo,
    handleRedo,
    handleNavigate,
    handleCellSave,
    getSelectedRange,
    sortedIndices,
    headers,
    data,
    onCellEdit,
    onBulkEdit,
    showFindBar,
  ]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowIndex });
  };

  const handleShiftClick = (rowIndex: number, col: string) => {
    setSelectionEnd({ row: rowIndex, col });
  };

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    onAddColumn(newColName.trim(), newColType);
    if (datasetId) {
      logAudit({
        action: "column_add",
        datasetId,
        datasetName,
        details: {
          column: newColName.trim(),
          description: `Column "${newColName.trim()}" (${newColType}) added`,
        },
        user: "Andrew Arbo",
      });
    }
    setShowAddColumnModal(false);
    setNewColName("");
    setNewColType("string");
  };

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  // Find & Replace handlers
  const handleFindNext = useCallback(() => {
    if (findMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % findMatches.length;
    setCurrentMatchIndex(nextIndex);
    const match = findMatches[nextIndex];
    setSelectedCell({ row: match.row, col: match.col });
    setSelectionEnd(null);
  }, [findMatches, currentMatchIndex]);

  const handleFindPrev = useCallback(() => {
    if (findMatches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + findMatches.length) % findMatches.length;
    setCurrentMatchIndex(prevIndex);
    const match = findMatches[prevIndex];
    setSelectedCell({ row: match.row, col: match.col });
    setSelectionEnd(null);
  }, [findMatches, currentMatchIndex]);

  const handleReplace = useCallback(() => {
    if (findMatches.length === 0) return;
    const match = findMatches[currentMatchIndex];
    if (!match) return;
    const oldVal = data[match.row]?.[match.col] ?? "";
    const newVal = oldVal.replace(new RegExp(findTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), replaceTerm);
    onCellEdit(match.row, match.col, newVal);
  }, [findMatches, currentMatchIndex, data, findTerm, replaceTerm, onCellEdit]);

  const handleReplaceAll = useCallback(() => {
    if (findMatches.length === 0) return;
    const regex = new RegExp(findTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const edits: { row: number; col: string; value: string }[] = [];
    for (const match of findMatches) {
      const oldVal = data[match.row]?.[match.col] ?? "";
      const newVal = oldVal.replace(regex, replaceTerm);
      edits.push({ row: match.row, col: match.col, value: newVal });
    }
    if (edits.length > 0 && onBulkEdit) {
      onBulkEdit(edits);
    } else {
      for (const edit of edits) {
        onCellEdit(edit.row, edit.col, edit.value);
      }
    }
  }, [findMatches, data, findTerm, replaceTerm, onCellEdit, onBulkEdit]);

  const isFindMatch = useCallback((rowIndex: number, col: string): boolean => {
    if (!findTerm || findMatches.length === 0) return false;
    return findMatches.some(m => m.row === rowIndex && m.col === col);
  }, [findTerm, findMatches]);

  const isCurrentFindMatch = useCallback((rowIndex: number, col: string): boolean => {
    if (!findTerm || findMatches.length === 0) return false;
    const current = findMatches[currentMatchIndex];
    return current?.row === rowIndex && current?.col === col;
  }, [findTerm, findMatches, currentMatchIndex]);

  return (
    <div className="flex flex-col h-full" ref={tableRef}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border-subtle bg-bg-secondary/50">
        <button
          onClick={() => {
            onAddRow();
            if (datasetId) {
              logAudit({
                action: "row_add",
                datasetId,
                datasetName,
                details: {
                  row: data.length,
                  description: `New row #${data.length + 1} added`,
                },
                user: "Andrew Arbo",
              });
            }
          }}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        >
          + Add Row
        </button>
        <button
          onClick={() => setShowAddColumnModal(true)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        >
          + Add Column
        </button>
        <div className="flex-1" />
        <span className="text-xs text-text-muted">
          {data.length} row{data.length !== 1 ? "s" : ""} x {headers.length}{" "}
          col{headers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Find & Replace Bar */}
      {showFindBar && (
        <div className="flex items-center gap-2 p-2 border-b border-border-subtle bg-bg-secondary/80 flex-wrap">
          <div className="flex items-center gap-2">
            <input
              ref={findInputRef}
              type="text"
              value={findTerm}
              onChange={(e) => { setFindTerm(e.target.value); setCurrentMatchIndex(0); }}
              placeholder="Find..."
              className="bg-bg-input border border-border-subtle rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent w-48"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleFindNext();
                }
                if (e.key === "Escape") {
                  setShowFindBar(false);
                  setShowReplace(false);
                  setFindTerm("");
                  setReplaceTerm("");
                  setCurrentMatchIndex(0);
                }
              }}
            />
            <button
              onClick={handleFindPrev}
              disabled={findMatches.length === 0}
              className="px-2 py-1 text-xs rounded bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={handleFindNext}
              disabled={findMatches.length === 0}
              className="px-2 py-1 text-xs rounded bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <span className="text-xs text-text-muted">
              {findMatches.length > 0
                ? `${currentMatchIndex + 1} of ${findMatches.length} matches`
                : findTerm ? "0 matches" : ""}
            </span>
          </div>
          {showReplace && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Replace with..."
                className="bg-bg-input border border-border-subtle rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent w-48"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowFindBar(false);
                    setShowReplace(false);
                    setFindTerm("");
                    setReplaceTerm("");
                    setCurrentMatchIndex(0);
                  }
                }}
              />
              <button
                onClick={handleReplace}
                disabled={findMatches.length === 0}
                className="px-2 py-1 text-xs rounded bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Replace
              </button>
              <button
                onClick={handleReplaceAll}
                disabled={findMatches.length === 0}
                className="px-2 py-1 text-xs rounded bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Replace All
              </button>
            </div>
          )}
          {!showReplace && (
            <button
              onClick={() => setShowReplace(true)}
              className="px-2 py-1 text-xs rounded bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary"
            >
              Replace...
            </button>
          )}
          <button
            onClick={() => {
              setShowFindBar(false);
              setShowReplace(false);
              setFindTerm("");
              setReplaceTerm("");
              setCurrentMatchIndex(0);
            }}
            className="px-2 py-1 text-xs text-text-muted hover:text-text-primary"
          >
            ESC
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-bg-secondary border-b border-border-subtle">
              <th className="px-3 py-2.5 text-center text-text-muted font-medium w-12 border-r border-border-subtle">
                #
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  onClick={() => handleSort(h)}
                  className="text-left px-3 py-2.5 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none border-r border-border-subtle"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{h}</span>
                    <span
                      className={`text-[10px] px-1 py-0.5 rounded-full ${
                        columnTypes[h] === "number"
                          ? "bg-blue-900/30 text-blue-400"
                          : "bg-emerald-900/30 text-emerald-400"
                      }`}
                    >
                      {columnTypes[h] || "string"}
                    </span>
                    {sortColumn === h && (
                      <span className="text-accent text-xs">
                        {sortDir === "asc" ? "\u2191" : "\u2193"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedIndices.map((rowIndex, displayIndex) => (
              <tr
                key={rowIndex}
                onContextMenu={(e) => handleContextMenu(e, rowIndex)}
                className="border-b border-border-subtle/50 hover:bg-bg-card-hover/50 transition-colors"
              >
                <td className="px-3 py-2 text-center text-xs text-text-muted font-mono border-r border-border-subtle bg-bg-secondary/30">
                  {displayIndex + 1}
                </td>
                {headers.map((h) => {
                  const isEditing =
                    editingCell?.row === rowIndex && editingCell?.col === h;
                  const isSelected = isCellInSelection(rowIndex, h);
                  const rawValue = data[rowIndex]?.[h] ?? "";
                  const displayValue = isEditing ? rawValue : getCellDisplayValue(rowIndex, h);
                  const matchHighlight = isFindMatch(rowIndex, h);
                  const currentMatch = isCurrentFindMatch(rowIndex, h);
                  return (
                    <EditableCell
                      key={`${rowIndex}-${h}`}
                      value={isEditing ? rawValue : displayValue}
                      isEditing={isEditing}
                      isSelected={isSelected || currentMatch}
                      columnType={columnTypes[h] || "string"}
                      onStartEdit={() => {
                        setSelectedCell({ row: rowIndex, col: h });
                        setSelectionEnd(null);
                        setEditingCell({ row: rowIndex, col: h });
                      }}
                      onSave={(val) => handleCellSave(rowIndex, h, val)}
                      onCancel={() => setEditingCell(null)}
                      onNavigate={handleNavigate}
                      highlight={matchHighlight ? (currentMatch ? "current" : "match") : undefined}
                      headers={headers}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between p-3 border-t border-border-subtle bg-bg-secondary/50">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>
            {data.length} row{data.length !== 1 ? "s" : ""}
          </span>
          {selectedCell && (
            <span>
              Cell: R{sortedIndices.indexOf(selectedCell.row) + 1}C
              {headers.indexOf(selectedCell.col) + 1} ({selectedCell.col})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="px-3 py-1 text-xs rounded-md bg-bg-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="px-3 py-1 text-xs rounded-md bg-bg-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Y)"
          >
            Redo
          </button>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-bg-card border border-border-subtle rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              onDeleteRow(contextMenu.rowIndex);
              pushHistory({
                action: "deleteRow",
                row: contextMenu.rowIndex,
                col: "",
                oldValue: "",
                newValue: "",
                rowData: data[contextMenu.rowIndex],
              });
              if (datasetId) {
                logAudit({
                  action: "row_delete",
                  datasetId,
                  datasetName,
                  details: {
                    row: contextMenu.rowIndex,
                    description: `Row #${contextMenu.rowIndex + 1} deleted`,
                  },
                  user: "Andrew Arbo",
                });
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
          >
            Delete Row
          </button>
        </div>
      )}

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Add Column
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
                  Column Name
                </label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. Total"
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumn();
                    if (e.key === "Escape") setShowAddColumnModal(false);
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
                  Type
                </label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddColumnModal(false)}
                  className="px-4 py-2 text-sm rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddColumn}
                  disabled={!newColName.trim()}
                  className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
