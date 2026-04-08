import type { SavedQuery } from "./saved-queries";
import type { Relationship } from "./relationships";

export interface LineageNode {
  id: string;
  name: string;
  type: "source" | "dataset" | "output";
  details: string;
}

export interface LineageEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DatasetInfo {
  id: string;
  name: string;
  source?: string;
}

/**
 * Build a lineage graph from datasets, saved queries, and relationships.
 * Returns nodes (sources, datasets, outputs) and edges connecting them.
 */
export function buildLineage(
  datasets: DatasetInfo[],
  savedQueries: SavedQuery[],
  relationships: Relationship[]
): { nodes: LineageNode[]; edges: LineageEdge[] } {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  const nodeIds = new Set<string>();

  function addNode(node: LineageNode) {
    if (!nodeIds.has(node.id)) {
      nodes.push(node);
      nodeIds.add(node.id);
    }
  }

  // Create nodes for each dataset and its source
  for (const ds of datasets) {
    const sourceType = ds.source || "Uploaded CSV";
    const sourceId = `source-${ds.id}`;

    addNode({
      id: sourceId,
      name: sourceType,
      type: "source",
      details: `Data source for ${ds.name}`,
    });

    addNode({
      id: ds.id,
      name: ds.name,
      type: "dataset",
      details: `Dataset: ${ds.name}`,
    });

    edges.push({
      from: sourceId,
      to: ds.id,
      label: "ingests",
    });
  }

  // Find which datasets are referenced by saved queries
  for (const query of savedQueries) {
    const queryNodeId = `query-${query.name.replace(/\s+/g, "-").toLowerCase()}`;

    addNode({
      id: queryNodeId,
      name: `SQL: ${query.name}`,
      type: "output",
      details: query.sql,
    });

    // Check which datasets this query references
    const sqlLower = query.sql.toLowerCase();
    for (const ds of datasets) {
      const dsIdLower = ds.id.toLowerCase();
      const dsNameLower = ds.name.toLowerCase().replace(/\s+/g, "_");
      if (sqlLower.includes(dsIdLower) || sqlLower.includes(dsNameLower)) {
        edges.push({
          from: ds.id,
          to: queryNodeId,
          label: "queried by",
        });
      }
    }
  }

  // Add relationship edges between datasets
  for (const rel of relationships) {
    // Only add if both tables exist as dataset nodes
    if (nodeIds.has(rel.fromTable) && nodeIds.has(rel.toTable)) {
      edges.push({
        from: rel.fromTable,
        to: rel.toTable,
        label: `${rel.fromColumn} ${rel.type} ${rel.toColumn}`,
      });
    }
  }

  // Add generic output nodes for dashboard/pivot if datasets exist
  if (datasets.length > 0) {
    addNode({
      id: "output-dashboard",
      name: "Dashboard KPIs",
      type: "output",
      details: "Main dashboard view with KPI cards and charts",
    });

    addNode({
      id: "output-pivot",
      name: "Pivot Tables",
      type: "output",
      details: "Pivot table analysis",
    });

    // Connect all datasets to dashboard and pivot
    for (const ds of datasets) {
      edges.push({ from: ds.id, to: "output-dashboard", label: "feeds" });
      edges.push({ from: ds.id, to: "output-pivot", label: "feeds" });
    }
  }

  return { nodes, edges };
}

/**
 * Count how many outputs (queries, dashboard widgets, etc.) use a given dataset.
 */
export function countDownstreamUsages(
  datasetId: string,
  edges: LineageEdge[]
): number {
  return edges.filter((e) => e.from === datasetId).length;
}
