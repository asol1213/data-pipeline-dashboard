import { describe, it, expect } from "vitest";
import { buildLineage, countDownstreamUsages } from "../lib/lineage";
import type { DatasetInfo, LineageEdge } from "../lib/lineage";
import type { SavedQuery } from "../lib/saved-queries";
import type { Relationship } from "../lib/relationships";

describe("buildLineage", () => {
  const datasets: DatasetInfo[] = [
    { id: "sales", name: "Sales Data", source: "API" },
    { id: "customers", name: "Customer Data", source: "Uploaded CSV" },
  ];

  const savedQueries: SavedQuery[] = [
    { name: "Top Sales", sql: "SELECT * FROM sales ORDER BY revenue DESC", createdAt: 1000 },
  ];

  const relationships: Relationship[] = [
    { fromTable: "sales", fromColumn: "customer_id", toTable: "customers", toColumn: "id", type: "1:N" },
  ];

  it("returns nodes and edges", () => {
    const result = buildLineage(datasets, savedQueries, relationships);
    expect(result).toHaveProperty("nodes");
    expect(result).toHaveProperty("edges");
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it("creates source nodes for each dataset", () => {
    const result = buildLineage(datasets, [], []);
    const sourceNodes = result.nodes.filter((n) => n.type === "source");
    expect(sourceNodes.length).toBe(datasets.length);
    expect(sourceNodes[0].name).toBe("API");
    expect(sourceNodes[1].name).toBe("Uploaded CSV");
  });

  it("creates dataset nodes for each dataset", () => {
    const result = buildLineage(datasets, [], []);
    const datasetNodes = result.nodes.filter((n) => n.type === "dataset");
    expect(datasetNodes.length).toBe(datasets.length);
    expect(datasetNodes[0].name).toBe("Sales Data");
    expect(datasetNodes[1].name).toBe("Customer Data");
  });

  it("creates output nodes from saved queries", () => {
    const result = buildLineage(datasets, savedQueries, []);
    const outputNodes = result.nodes.filter((n) => n.type === "output" && n.id.startsWith("query-"));
    expect(outputNodes.length).toBe(1);
    expect(outputNodes[0].name).toContain("Top Sales");
  });

  it("creates dashboard and pivot output nodes when datasets exist", () => {
    const result = buildLineage(datasets, [], []);
    const dashNode = result.nodes.find((n) => n.id === "output-dashboard");
    const pivotNode = result.nodes.find((n) => n.id === "output-pivot");
    expect(dashNode).toBeDefined();
    expect(pivotNode).toBeDefined();
  });

  it("adds relationship edges between datasets", () => {
    const result = buildLineage(datasets, [], relationships);
    const relEdge = result.edges.find(
      (e) => e.from === "sales" && e.to === "customers"
    );
    expect(relEdge).toBeDefined();
    expect(relEdge!.label).toContain("customer_id");
  });

  it("returns empty nodes and edges for empty datasets", () => {
    const result = buildLineage([], [], []);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("handles no relationships gracefully", () => {
    const result = buildLineage(datasets, savedQueries, []);
    // Should still have source, dataset, and output nodes, just no relationship edges
    expect(result.nodes.length).toBeGreaterThan(0);
    const relEdges = result.edges.filter((e) => e.label && e.label.includes("1:N"));
    expect(relEdges).toHaveLength(0);
  });

  it("does not duplicate nodes", () => {
    const result = buildLineage(datasets, savedQueries, relationships);
    const ids = result.nodes.map((n) => n.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it("connects datasets to query output when SQL references the table", () => {
    const result = buildLineage(datasets, savedQueries, []);
    const queryEdge = result.edges.find(
      (e) => e.from === "sales" && e.label === "queried by"
    );
    expect(queryEdge).toBeDefined();
  });

  it("default source is 'Uploaded CSV' when source is not provided", () => {
    const ds: DatasetInfo[] = [{ id: "test", name: "Test" }];
    const result = buildLineage(ds, [], []);
    const sourceNode = result.nodes.find((n) => n.type === "source");
    expect(sourceNode!.name).toBe("Uploaded CSV");
  });
});

describe("countDownstreamUsages", () => {
  const edges: LineageEdge[] = [
    { from: "sales", to: "output-dashboard", label: "feeds" },
    { from: "sales", to: "output-pivot", label: "feeds" },
    { from: "customers", to: "output-dashboard", label: "feeds" },
  ];

  it("counts correct number of downstream usages", () => {
    expect(countDownstreamUsages("sales", edges)).toBe(2);
    expect(countDownstreamUsages("customers", edges)).toBe(1);
  });

  it("returns 0 for unknown dataset", () => {
    expect(countDownstreamUsages("unknown", edges)).toBe(0);
  });
});
