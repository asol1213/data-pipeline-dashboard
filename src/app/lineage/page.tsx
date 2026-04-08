"use client";

import { useState, useEffect, useMemo } from "react";
import { buildLineage, countDownstreamUsages } from "@/lib/lineage";
import { getSavedQueries } from "@/lib/saved-queries";
import type { LineageNode, LineageEdge } from "@/lib/lineage";
import type { Relationship } from "@/lib/relationships";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
  rowCount: number;
}

const typeColors: Record<string, string> = {
  source:
    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  dataset: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  output:
    "bg-purple-500/10 border-purple-500/30 text-purple-400",
};

const typeIcons: Record<string, string> = {
  source: "\uD83D\uDCE5",
  dataset: "\uD83D\uDDC3\uFE0F",
  output: "\uD83D\uDCCA",
};

export default function LineagePage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    // Fetch datasets
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((data: DatasetMeta[]) => {
        if (Array.isArray(data)) setDatasets(data);
      })
      .catch(() => {});

    // Fetch relationships from the model endpoint
    fetch("/api/datasets")
      .then((res) => res.json())
      .then(async (data: DatasetMeta[]) => {
        if (!Array.isArray(data) || data.length < 2) return;
        // Try to detect relationships by checking column overlaps
        const rels: Relationship[] = [];
        const seen = new Set<string>();
        for (let i = 0; i < data.length; i++) {
          for (let j = i + 1; j < data.length; j++) {
            const shared = data[i].headers.filter((h) =>
              data[j].headers.includes(h)
            );
            for (const col of shared) {
              const key = `${data[i].id}.${col}-${data[j].id}.${col}`;
              if (!seen.has(key)) {
                seen.add(key);
                rels.push({
                  fromTable: data[i].id,
                  fromColumn: col,
                  toTable: data[j].id,
                  toColumn: col,
                  type: "1:N",
                });
              }
            }
          }
        }
        setRelationships(rels);
      })
      .catch(() => {});
  }, []);

  const savedQueries = useMemo(() => {
    if (typeof window === "undefined") return [];
    return getSavedQueries();
  }, []);

  const lineage = useMemo(() => {
    const dsInfo = datasets.map((d) => ({
      id: d.id,
      name: d.name,
      source: "Uploaded CSV",
    }));
    return buildLineage(dsInfo, savedQueries, relationships);
  }, [datasets, savedQueries, relationships]);

  // Group nodes by type for the flow layout
  const sourceNodes = lineage.nodes.filter((n) => n.type === "source");
  const datasetNodes = lineage.nodes.filter((n) => n.type === "dataset");
  const outputNodes = lineage.nodes.filter((n) => n.type === "output");

  // Edges for a selected node
  const selectedEdges = selectedNode
    ? lineage.edges.filter(
        (e) => e.from === selectedNode || e.to === selectedNode
      )
    : [];

  const connectedNodeIds = new Set(
    selectedEdges.flatMap((e) => [e.from, e.to])
  );

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="dashboard-header rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="text-3xl">&#128279;</div>
          <div>
            <h1 className="text-2xl font-bold text-white">Data Lineage</h1>
            <p className="text-sm text-blue-200 mt-1">
              Track where your data comes from and what depends on it
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4 text-center">
          <p className="text-xs text-text-muted mb-1">Sources</p>
          <p className="text-2xl font-bold text-emerald-400">
            {sourceNodes.length}
          </p>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4 text-center">
          <p className="text-xs text-text-muted mb-1">Datasets</p>
          <p className="text-2xl font-bold text-blue-400">
            {datasetNodes.length}
          </p>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4 text-center">
          <p className="text-xs text-text-muted mb-1">Outputs</p>
          <p className="text-2xl font-bold text-purple-400">
            {outputNodes.length}
          </p>
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-6">
          Data Flow
        </h2>

        {datasets.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            No datasets found. Upload data or load a demo to see lineage.
          </div>
        ) : (
          <div className="flex items-start gap-4 overflow-x-auto pb-4">
            {/* Sources Column */}
            <div className="flex flex-col gap-3 min-w-[200px]">
              <div className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                Sources
              </div>
              {sourceNodes.map((node) => (
                <LineageCard
                  key={node.id}
                  node={node}
                  selected={selectedNode === node.id}
                  highlighted={
                    selectedNode
                      ? connectedNodeIds.has(node.id)
                      : false
                  }
                  onClick={() =>
                    setSelectedNode(
                      selectedNode === node.id ? null : node.id
                    )
                  }
                  downstreamCount={countDownstreamUsages(
                    node.id,
                    lineage.edges
                  )}
                />
              ))}
            </div>

            {/* Arrow */}
            <div className="flex items-center self-center text-text-muted text-2xl pt-8">
              &#8594;
            </div>

            {/* Datasets Column */}
            <div className="flex flex-col gap-3 min-w-[200px]">
              <div className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                Datasets
              </div>
              {datasetNodes.map((node) => (
                <LineageCard
                  key={node.id}
                  node={node}
                  selected={selectedNode === node.id}
                  highlighted={
                    selectedNode
                      ? connectedNodeIds.has(node.id)
                      : false
                  }
                  onClick={() =>
                    setSelectedNode(
                      selectedNode === node.id ? null : node.id
                    )
                  }
                  downstreamCount={countDownstreamUsages(
                    node.id,
                    lineage.edges
                  )}
                />
              ))}
            </div>

            {/* Arrow */}
            <div className="flex items-center self-center text-text-muted text-2xl pt-8">
              &#8594;
            </div>

            {/* Outputs Column */}
            <div className="flex flex-col gap-3 min-w-[200px]">
              <div className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                Outputs
              </div>
              {outputNodes.map((node) => (
                <LineageCard
                  key={node.id}
                  node={node}
                  selected={selectedNode === node.id}
                  highlighted={
                    selectedNode
                      ? connectedNodeIds.has(node.id)
                      : false
                  }
                  onClick={() =>
                    setSelectedNode(
                      selectedNode === node.id ? null : node.id
                    )
                  }
                  downstreamCount={countDownstreamUsages(
                    node.id,
                    lineage.edges
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Node Detail */}
      {selectedNode && (
        <div className="bg-bg-card rounded-xl border border-accent/30 p-6 mb-8">
          <h3 className="text-sm font-semibold text-accent mb-4">
            Connections for:{" "}
            {lineage.nodes.find((n) => n.id === selectedNode)?.name}
          </h3>
          {selectedEdges.length === 0 ? (
            <p className="text-text-muted text-sm">No connections found.</p>
          ) : (
            <div className="space-y-2">
              {selectedEdges.map((edge, i) => {
                const fromNode = lineage.nodes.find(
                  (n) => n.id === edge.from
                );
                const toNode = lineage.nodes.find(
                  (n) => n.id === edge.to
                );
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm bg-bg-secondary rounded-lg px-4 py-2"
                  >
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        typeColors[fromNode?.type ?? "dataset"]
                      }`}
                    >
                      {fromNode?.name ?? edge.from}
                    </span>
                    <span className="text-text-muted">
                      &#8594;{" "}
                      {edge.label && (
                        <span className="text-[10px] italic">
                          {edge.label}
                        </span>
                      )}{" "}
                      &#8594;
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        typeColors[toNode?.type ?? "dataset"]
                      }`}
                    >
                      {toNode?.name ?? edge.to}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Full Edge List */}
      <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            All Connections ({lineage.edges.length})
          </span>
        </div>
        {lineage.edges.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No connections detected yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-4 py-2 text-text-muted font-medium">
                    From
                  </th>
                  <th className="text-left px-4 py-2 text-text-muted font-medium">
                    Relationship
                  </th>
                  <th className="text-left px-4 py-2 text-text-muted font-medium">
                    To
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineage.edges.map((edge, i) => {
                  const fromNode = lineage.nodes.find(
                    (n) => n.id === edge.from
                  );
                  const toNode = lineage.nodes.find(
                    (n) => n.id === edge.to
                  );
                  return (
                    <tr
                      key={i}
                      className="border-b border-border-subtle/50 hover:bg-bg-card-hover transition-colors"
                    >
                      <td className="px-4 py-2 text-text-primary">
                        {fromNode?.name ?? edge.from}
                      </td>
                      <td className="px-4 py-2 text-text-muted text-xs">
                        {edge.label ?? "-->"}
                      </td>
                      <td className="px-4 py-2 text-text-primary">
                        {toNode?.name ?? edge.to}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LineageCard({
  node,
  selected,
  highlighted,
  onClick,
  downstreamCount,
}: {
  node: LineageNode;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
  downstreamCount: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-3 transition-all ${
        selected
          ? "border-accent bg-accent/5 ring-1 ring-accent/30"
          : highlighted
            ? "border-accent/40 bg-accent/5"
            : `${typeColors[node.type]} hover:border-accent/30`
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{typeIcons[node.type]}</span>
        <span className="text-sm font-medium text-text-primary truncate">
          {node.name}
        </span>
      </div>
      <p className="text-[10px] text-text-muted mt-1 truncate">
        {node.details}
      </p>
      {downstreamCount > 0 && (
        <p className="text-[10px] text-accent mt-1">
          {downstreamCount} connection{downstreamCount !== 1 ? "s" : ""}
        </p>
      )}
    </button>
  );
}
