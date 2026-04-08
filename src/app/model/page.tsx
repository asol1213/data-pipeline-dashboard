"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
}

interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: "1:1" | "1:N" | "N:M";
}

type SchemaType = "star" | "snowflake" | "simple";

interface ModelResponse {
  datasets: DatasetMeta[];
  relationships: Relationship[];
  schemaType: SchemaType;
}

interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PreviewData {
  datasetId: string;
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 1500;
const CARD_W = 260;
const ROW_HEADER = 44;
const ROW_HEIGHT = 28;
const DRAG_THRESHOLD = 5;
const LOCAL_STORAGE_KEY = "data-model-layout";

/* ── helpers ── */

function typeIcon(colType: string): string {
  if (colType === "number") return "\uD83D\uDD22";
  if (colType === "date") return "\uD83D\uDCC5";
  return "\uD83D\uDCDD";
}

function isKeyColumn(col: string): boolean {
  return col.endsWith("_ID") || col.endsWith("_id") || col.endsWith("_Id");
}

function schemaLabel(s: SchemaType): string {
  if (s === "star") return "Star Schema detected";
  if (s === "snowflake") return "Snowflake Schema detected";
  return "Simple / no clear schema";
}

function schemaBadgeColor(s: SchemaType): string {
  if (s === "star") return "bg-accent/20 text-accent border-accent/30";
  if (s === "snowflake") return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  return "bg-text-muted/20 text-text-muted border-text-muted/30";
}

/* ── main component ── */

export default function ModelPage() {
  const [data, setData] = useState<ModelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [hoveredRel, setHoveredRel] = useState<number | null>(null);
  const [positions, setPositions] = useState<Record<string, TablePosition>>({});

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  // Preview state
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/model")
      .then((res) => res.json())
      .then((d: ModelResponse) => {
        setData(d);
        if (d.datasets.length <= 5) {
          setExpandedTables(new Set(d.datasets.map((ds) => ds.id)));
        }
        // Try loading saved layout from localStorage
        try {
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved) as Record<string, TablePosition>;
            // Validate that saved positions match current datasets
            const savedIds = new Set(Object.keys(parsed));
            const currentIds = new Set(d.datasets.map((ds) => ds.id));
            const allMatch = d.datasets.every((ds) => savedIds.has(ds.id));
            if (allMatch && savedIds.size === currentIds.size) {
              setPositions(parsed);
              return;
            }
          }
        } catch {
          // Ignore localStorage errors
        }
        // If no saved layout, compute auto-layout
        computeAutoLayout(d, new Set(d.datasets.length <= 5 ? d.datasets.map((ds) => ds.id) : []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── auto-layout: compute positions for each table card ── */
  const computeAutoLayout = useCallback(
    (modelData: ModelResponse | null, expanded: Set<string>) => {
      if (!modelData) return;

      const relCount = new Map<string, number>();
      for (const ds of modelData.datasets) relCount.set(ds.id, 0);
      for (const rel of modelData.relationships) {
        relCount.set(rel.fromTable, (relCount.get(rel.fromTable) ?? 0) + 1);
        relCount.set(rel.toTable, (relCount.get(rel.toTable) ?? 0) + 1);
      }

      // Sort by relationship count: fact tables first
      const sorted = [...modelData.datasets].sort(
        (a, b) => (relCount.get(b.id) ?? 0) - (relCount.get(a.id) ?? 0)
      );

      // Find fact tables (those with 2+ relationships)
      const factTables = sorted.filter((ds) => (relCount.get(ds.id) ?? 0) >= 2);
      const dimTables = sorted.filter((ds) => (relCount.get(ds.id) ?? 0) < 2);

      const newPositions: Record<string, TablePosition> = {};

      if (factTables.length > 0) {
        // Place fact tables in the center
        const centerX = CANVAS_WIDTH / 2 - CARD_W / 2;
        const centerY = CANVAS_HEIGHT / 2 - 100;

        factTables.forEach((ds, idx) => {
          const visibleCols = expanded.has(ds.id)
            ? ds.headers.length
            : Math.min(ds.headers.filter((h) => isKeyColumn(h)).length + 1, 6);
          const cardH = ROW_HEADER + visibleCols * ROW_HEIGHT + 16;

          newPositions[ds.id] = {
            x: centerX + idx * (CARD_W + 80),
            y: centerY,
            width: CARD_W,
            height: cardH,
          };
        });

        // Place dimension tables in a circle around fact tables
        const radius = 350;
        const angleStep = (2 * Math.PI) / Math.max(dimTables.length, 1);
        const factCenterX = centerX + ((factTables.length - 1) * (CARD_W + 80)) / 2;
        const factCenterY = centerY;

        dimTables.forEach((ds, idx) => {
          const angle = angleStep * idx - Math.PI / 2;
          const visibleCols = expanded.has(ds.id)
            ? ds.headers.length
            : Math.min(ds.headers.filter((h) => isKeyColumn(h)).length + 1, 6);
          const cardH = ROW_HEADER + visibleCols * ROW_HEIGHT + 16;

          newPositions[ds.id] = {
            x: factCenterX + Math.cos(angle) * radius,
            y: factCenterY + Math.sin(angle) * radius,
            width: CARD_W,
            height: cardH,
          };
        });
      } else {
        // No fact tables: grid layout
        const CARD_GAP_X = 60;
        const CARD_GAP_Y = 40;
        const PADDING_X = 40;
        const PADDING_Y = 20;
        const cols = Math.max(1, Math.min(sorted.length, Math.floor((CANVAS_WIDTH - PADDING_X * 2 + CARD_GAP_X) / (CARD_W + CARD_GAP_X))));

        sorted.forEach((ds, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const visibleCols = expanded.has(ds.id)
            ? ds.headers.length
            : Math.min(ds.headers.filter((h) => isKeyColumn(h)).length + 1, 6);
          const cardH = ROW_HEADER + visibleCols * ROW_HEIGHT + 16;

          newPositions[ds.id] = {
            x: PADDING_X + col * (CARD_W + CARD_GAP_X),
            y: PADDING_Y + row * (300 + CARD_GAP_Y),
            width: CARD_W,
            height: cardH,
          };
        });
      }

      setPositions(newPositions);
    },
    []
  );

  // Update card heights when expanded tables change
  useEffect(() => {
    if (!data) return;
    setPositions((prev) => {
      const updated = { ...prev };
      for (const ds of data.datasets) {
        if (updated[ds.id]) {
          const visibleCols = expandedTables.has(ds.id)
            ? ds.headers.length
            : Math.min(ds.headers.filter((h) => isKeyColumn(h)).length + 1, 6);
          updated[ds.id] = {
            ...updated[ds.id],
            height: ROW_HEADER + visibleCols * ROW_HEIGHT + 16,
          };
        }
      }
      return updated;
    });
  }, [expandedTables, data]);

  /* ── drag handlers ── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tableId: string) => {
      e.preventDefault();
      const pos = positions[tableId];
      if (!pos) return;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const scrollLeft = canvasRef.current?.scrollLeft ?? 0;
      const scrollTop = canvasRef.current?.scrollTop ?? 0;

      const mouseX = e.clientX - (canvasRect?.left ?? 0) + scrollLeft;
      const mouseY = e.clientY - (canvasRect?.top ?? 0) + scrollTop;

      setDragOffset({ x: mouseX - pos.x, y: mouseY - pos.y });
      setDragging(tableId);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      didDrag.current = false;
    },
    [positions]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const scrollLeft = canvasRef.current?.scrollLeft ?? 0;
      const scrollTop = canvasRef.current?.scrollTop ?? 0;

      const mouseX = e.clientX - (canvasRect?.left ?? 0) + scrollLeft;
      const mouseY = e.clientY - (canvasRect?.top ?? 0) + scrollTop;

      // Check if we've moved past the drag threshold
      if (dragStartPos.current) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
          didDrag.current = true;
        }
      }

      setPositions((prev) => ({
        ...prev,
        [dragging]: {
          ...prev[dragging],
          x: Math.max(0, Math.min(CANVAS_WIDTH - CARD_W, mouseX - dragOffset.x)),
          y: Math.max(0, Math.min(CANVAS_HEIGHT - 100, mouseY - dragOffset.y)),
        },
      }));
    },
    [dragging, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    dragStartPos.current = null;
  }, []);

  /* ── click handler for preview (only if not dragging) ── */
  const handleCardClick = useCallback(
    (tableId: string, ds: DatasetMeta) => {
      if (didDrag.current) return;

      // Toggle expand/collapse
      setExpandedTables((prev) => {
        const next = new Set(prev);
        if (next.has(tableId)) next.delete(tableId);
        else next.add(tableId);
        return next;
      });

      // Fetch preview data
      setPreviewLoading(true);
      setPreviewOpen(true);
      fetch(`/api/datasets/${tableId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then((dataset: { rows: Record<string, string>[]; headers: string[]; rowCount: number }) => {
          setPreview({
            datasetId: tableId,
            name: ds.name || tableId,
            headers: dataset.headers ?? ds.headers,
            rows: (dataset.rows ?? []).slice(0, 20),
            totalRows: dataset.rowCount ?? dataset.rows?.length ?? 0,
          });
        })
        .catch(() => {
          setPreview(null);
        })
        .finally(() => setPreviewLoading(false));
    },
    []
  );

  /* ── save / reset layout ── */
  const handleSaveLayout = useCallback(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(positions));
    } catch {
      // Ignore
    }
  }, [positions]);

  const handleResetLayout = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    if (data) {
      computeAutoLayout(data, expandedTables);
    }
  }, [data, expandedTables, computeAutoLayout]);

  /* ── SVG line helpers ── */
  function getColumnY(
    tableId: string,
    column: string,
    ds: DatasetMeta
  ): number {
    const pos = positions[tableId];
    if (!pos) return 0;
    const expanded = expandedTables.has(tableId);
    const visibleHeaders = expanded
      ? ds.headers
      : ds.headers.filter((h) => isKeyColumn(h)).slice(0, 5);
    const colIdx = visibleHeaders.indexOf(column);
    if (colIdx === -1) return pos.y + ROW_HEADER + 14;
    return pos.y + ROW_HEADER + colIdx * ROW_HEIGHT + 14;
  }

  /* ── rendering ── */

  if (loading) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="dashboard-header rounded-2xl p-6 mb-8">
          <h1 className="text-2xl font-bold text-white">Data Model</h1>
          <p className="text-sm text-blue-200 mt-1">
            Table relationships visualization
          </p>
        </div>
        <div className="text-center py-20 text-text-muted">
          Loading data model...
        </div>
      </div>
    );
  }

  if (!data || data.datasets.length === 0) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="dashboard-header rounded-2xl p-6 mb-8">
          <h1 className="text-2xl font-bold text-white">Data Model</h1>
          <p className="text-sm text-blue-200 mt-1">
            Table relationships visualization
          </p>
        </div>
        <div className="text-center py-20 text-text-muted">
          No datasets loaded. Upload data to see the model.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-white">Data Model</h1>
            <p className="text-sm text-blue-200 mt-1">
              Table relationships &mdash; Power BI-style Model View
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetLayout}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300/30 text-blue-200 hover:bg-blue-500/10 transition-colors"
            >
              Reset Layout
            </button>
            <button
              onClick={handleSaveLayout}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300/30 text-blue-200 hover:bg-blue-500/10 transition-colors"
            >
              Save Layout
            </button>
            <span
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${schemaBadgeColor(data.schemaType)}`}
            >
              {schemaLabel(data.schemaType)}
            </span>
            <span className="text-xs text-blue-200">
              {data.datasets.length} tables &middot;{" "}
              {data.relationships.length} relationships
            </span>
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="px-3 py-1 text-sm bg-bg-card border border-border-subtle rounded-lg hover:bg-border-subtle transition-colors">−</button>
        <span className="text-xs text-text-muted w-16 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="px-3 py-1 text-sm bg-bg-card border border-border-subtle rounded-lg hover:bg-border-subtle transition-colors">+</button>
        <button onClick={() => setZoom(1)} className="px-3 py-1 text-xs text-text-muted hover:text-text-primary transition-colors">Reset</button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-bg-card rounded-xl border border-border-subtle overflow-auto"
        style={{ height: 700 }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(z => Math.max(0.3, Math.min(2, z + (e.deltaY > 0 ? -0.05 : 0.05))));
          }
        }}
      >
        <div
          style={{ width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom, position: "relative", transform: `scale(${zoom})`, transformOrigin: "0 0" }}
        >
          {/* SVG relationship lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ zIndex: 1 }}
          >
            {data.relationships.map((rel, idx) => {
              const fromPos = positions[rel.fromTable];
              const toPos = positions[rel.toTable];
              if (!fromPos || !toPos) return null;

              const fromDs = data.datasets.find((d) => d.id === rel.fromTable);
              const toDs = data.datasets.find((d) => d.id === rel.toTable);
              if (!fromDs || !toDs) return null;

              const fromY = getColumnY(rel.fromTable, rel.fromColumn, fromDs);
              const toY = getColumnY(rel.toTable, rel.toColumn, toDs);

              const fromRight = fromPos.x + fromPos.width;
              const toLeft = toPos.x;
              const toRight = toPos.x + toPos.width;
              const fromLeft = fromPos.x;

              let x1: number, x2: number;
              if (fromRight <= toLeft) {
                x1 = fromRight;
                x2 = toLeft;
              } else if (toRight <= fromLeft) {
                x1 = fromLeft;
                x2 = toRight;
              } else {
                x1 = fromRight;
                x2 = toRight + 30;
              }

              const isHovered = hoveredRel === idx;
              const strokeColor = isHovered ? "#3b82f6" : "#475569";
              const strokeWidth = isHovered ? 2.5 : 1.5;
              const dashArray = rel.type === "N:M" ? "6,4" : undefined;

              const mx = (x1 + x2) / 2;
              const my = (fromY + toY) / 2;

              const cpOffset = Math.min(Math.abs(x2 - x1) * 0.4, 80);

              return (
                <g
                  key={idx}
                  style={{ pointerEvents: "stroke" }}
                  onMouseEnter={() => setHoveredRel(idx)}
                  onMouseLeave={() => setHoveredRel(null)}
                  className="cursor-pointer"
                >
                  <path
                    d={`M ${x1} ${fromY} C ${x1 + cpOffset} ${fromY}, ${x2 - cpOffset} ${toY}, ${x2} ${toY}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    style={{ transition: "stroke 0.2s, stroke-width 0.2s", pointerEvents: "stroke" }}
                  />
                  <path
                    d={`M ${x1} ${fromY} C ${x1 + cpOffset} ${fromY}, ${x2 - cpOffset} ${toY}, ${x2} ${toY}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                    style={{ pointerEvents: "stroke" }}
                    onMouseEnter={() => setHoveredRel(idx)}
                    onMouseLeave={() => setHoveredRel(null)}
                  />
                  <text
                    x={x1 + (x1 < x2 ? 8 : -8)}
                    y={fromY - 8}
                    fill={isHovered ? "#3b82f6" : "#94a3b8"}
                    fontSize="11"
                    fontWeight="600"
                    textAnchor={x1 < x2 ? "start" : "end"}
                  >
                    {rel.type === "1:1" ? "1" : rel.type === "1:N" ? "1" : "N"}
                  </text>
                  <text
                    x={x2 + (x2 > x1 ? -8 : 8)}
                    y={toY - 8}
                    fill={isHovered ? "#3b82f6" : "#94a3b8"}
                    fontSize="11"
                    fontWeight="600"
                    textAnchor={x2 > x1 ? "end" : "start"}
                  >
                    {rel.type === "1:1" ? "1" : rel.type === "1:N" ? "N" : "M"}
                  </text>
                  {isHovered && (
                    <>
                      <rect
                        x={mx - 16}
                        y={my - 10}
                        width={32}
                        height={20}
                        rx={4}
                        fill="#1a2332"
                        stroke="#3b82f6"
                        strokeWidth={1}
                      />
                      <text
                        x={mx}
                        y={my + 4}
                        fill="#3b82f6"
                        fontSize="10"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {rel.type}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Table cards */}
          {data.datasets.map((ds) => {
            const pos = positions[ds.id];
            if (!pos) return null;

            const expanded = expandedTables.has(ds.id);
            const visibleHeaders = expanded
              ? ds.headers
              : ds.headers.filter((h) => isKeyColumn(h)).slice(0, 5);

            const highlightedColumns = new Set<string>();
            if (hoveredRel !== null) {
              const rel = data.relationships[hoveredRel];
              if (rel.fromTable === ds.id) highlightedColumns.add(rel.fromColumn);
              if (rel.toTable === ds.id) highlightedColumns.add(rel.toColumn);
            }

            const fkColumns = new Set<string>();
            const pkColumns = new Set<string>();
            for (const rel of data.relationships) {
              if (rel.fromTable === ds.id) pkColumns.add(rel.fromColumn);
              if (rel.toTable === ds.id) fkColumns.add(rel.toColumn);
            }

            const localPks = ds.headers.filter(
              (h) =>
                h === "Transaction_ID" ||
                h === `${ds.id.replace(/s$/, "")}_ID` ||
                (h.endsWith("_ID") && pkColumns.has(h))
            );
            for (const pk of localPks) pkColumns.add(pk);

            if (pkColumns.size === 0) {
              const firstIdCol = ds.headers.find((h) => h.endsWith("_ID"));
              if (firstIdCol) pkColumns.add(firstIdCol);
            }

            const relCount = data.relationships.filter(
              (r) => r.fromTable === ds.id || r.toTable === ds.id
            ).length;
            const isFact = relCount >= 2;
            const isDragging = dragging === ds.id;

            return (
              <div
                key={ds.id}
                className="absolute rounded-xl border shadow-lg overflow-hidden select-none"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: pos.width,
                  zIndex: isDragging ? 10 : 2,
                  borderColor:
                    hoveredRel !== null && highlightedColumns.size > 0
                      ? "#3b82f6"
                      : isFact
                        ? "var(--accent)"
                        : "var(--border-subtle)",
                  backgroundColor: "var(--bg-card)",
                  cursor: isDragging ? "grabbing" : "grab",
                  opacity: isDragging ? 0.9 : 1,
                  transition: isDragging ? "none" : "box-shadow 0.2s",
                  boxShadow: isDragging
                    ? "0 8px 32px rgba(0,0,0,0.3)"
                    : undefined,
                }}
                onMouseDown={(e) => handleMouseDown(e, ds.id)}
                onMouseUp={() => handleCardClick(ds.id, ds)}
              >
                {/* Card header */}
                <div
                  className={`px-4 py-2.5 flex items-center justify-between ${
                    isFact
                      ? "bg-accent/10 border-b border-accent/20"
                      : "bg-bg-secondary/50 border-b border-border-subtle"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{isFact ? "\uD83D\uDCCA" : "\uD83D\uDCD6"}</span>
                    <span className="text-sm font-bold text-text-primary truncate">
                      {ds.name || ds.id}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted ml-2 flex-shrink-0">
                    {expanded ? "\u25B2" : "\u25BC"}
                  </span>
                </div>

                {/* Columns list */}
                <div className="px-3 py-1.5">
                  {visibleHeaders.map((col) => {
                    const isPk = pkColumns.has(col);
                    const isFk = fkColumns.has(col);
                    const isHighlighted = highlightedColumns.has(col);

                    return (
                      <div
                        key={col}
                        className={`flex items-center gap-2 py-1 px-1.5 rounded text-xs transition-colors ${
                          isHighlighted
                            ? "bg-accent/20 text-accent"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        <span className="w-4 text-center flex-shrink-0">
                          {isPk
                            ? "\uD83D\uDD11"
                            : isFk
                              ? "\uD83D\uDD17"
                              : typeIcon(ds.columnTypes[col] ?? "string")}
                        </span>
                        <span
                          className={`truncate ${
                            isPk ? "font-semibold text-warning" : isFk ? "font-medium text-accent" : ""
                          }`}
                        >
                          {col}
                        </span>
                        <span className="text-text-muted ml-auto text-[10px] flex-shrink-0">
                          {ds.columnTypes[col] ?? "string"}
                        </span>
                      </div>
                    );
                  })}
                  {!expanded && ds.headers.length > visibleHeaders.length && (
                    <div className="text-[10px] text-text-muted text-center py-1">
                      +{ds.headers.length - visibleHeaders.length} more columns
                      (click to expand)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Preview Panel */}
      {previewOpen && (
        <div className="mt-4 bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-secondary/30">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-text-primary">
                {previewLoading
                  ? "Loading preview..."
                  : preview
                    ? `Preview: ${preview.name} (${preview.totalRows} rows)`
                    : "Preview unavailable"}
              </h3>
              {preview && (
                <Link
                  href={`/datasets/${preview.datasetId}`}
                  className="text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  View Full Dataset &rarr;
                </Link>
              )}
            </div>
            <button
              onClick={() => {
                setPreviewOpen(false);
                setPreview(null);
              }}
              className="text-text-muted hover:text-text-primary text-sm transition-colors px-2 py-1 rounded hover:bg-bg-secondary"
            >
              Close
            </button>
          </div>
          {previewLoading ? (
            <div className="p-8 text-center text-text-muted text-sm">
              Loading data...
            </div>
          ) : preview && preview.rows.length > 0 ? (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2 text-text-muted font-medium whitespace-nowrap sticky top-0 bg-bg-card"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="border-b border-border-subtle/50 hover:bg-bg-card-hover"
                    >
                      {preview.headers.map((h) => (
                        <td
                          key={h}
                          className="px-3 py-1.5 text-text-secondary whitespace-nowrap"
                        >
                          {row[h] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-text-muted text-sm">
              No data available for preview.
            </div>
          )}
        </div>
      )}

      {/* Relationship legend */}
      <div className="mt-6 bg-bg-card rounded-xl border border-border-subtle p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Relationships
        </h3>
        {data.relationships.length === 0 ? (
          <p className="text-xs text-text-muted">
            No relationships detected between tables.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.relationships.map((rel, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors cursor-default ${
                  hoveredRel === idx
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-bg-secondary/30 border-border-subtle text-text-secondary"
                }`}
                onMouseEnter={() => setHoveredRel(idx)}
                onMouseLeave={() => setHoveredRel(null)}
              >
                <span className="font-medium text-text-primary">
                  {rel.fromTable}
                </span>
                <span className="text-text-muted">.{rel.fromColumn}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    rel.type === "1:1"
                      ? "bg-success/20 text-success"
                      : rel.type === "1:N"
                        ? "bg-accent/20 text-accent"
                        : "bg-warning/20 text-warning"
                  }`}
                >
                  {rel.type}
                </span>
                <span className="font-medium text-text-primary">
                  {rel.toTable}
                </span>
                <span className="text-text-muted">.{rel.toColumn}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <span>{"\uD83D\uDD11"}</span>
          <span>Primary Key</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>{"\uD83D\uDD17"}</span>
          <span>Foreign Key</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>{"\uD83D\uDD22"}</span>
          <span>Number</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>{"\uD83D\uDCDD"}</span>
          <span>String</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>{"\uD83D\uDCC5"}</span>
          <span>Date</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="30" height="2">
            <line
              x1="0"
              y1="1"
              x2="30"
              y2="1"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
          </svg>
          <span>1:N (solid)</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="30" height="2">
            <line
              x1="0"
              y1="1"
              x2="30"
              y2="1"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="6,4"
            />
          </svg>
          <span>N:M (dashed)</span>
        </div>
      </div>
    </div>
  );
}
