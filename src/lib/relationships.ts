import type { DatasetMeta } from "./store";

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: "1:1" | "1:N" | "N:M";
}

export type SchemaType = "star" | "snowflake" | "simple";

/**
 * Determine cardinality between two columns given row data.
 * - If both columns have all unique values → 1:1
 * - If the "from" column has unique values (but "to" doesn't) → 1:N
 * - If neither has all unique values → N:M
 */
export function determineCardinality(
  fromValues: string[],
  toValues: string[]
): "1:1" | "1:N" | "N:M" {
  const fromUnique = new Set(fromValues).size === fromValues.length;
  const toUnique = new Set(toValues).size === toValues.length;

  if (fromUnique && toUnique) return "1:1";
  if (fromUnique) return "1:N";
  if (toUnique) return "1:N"; // flip perspective — "to" is the "1" side
  return "N:M";
}

/**
 * Check if two column names represent the same logical key.
 * Matches:
 *  - Exact name match (e.g., "Product_ID" in both tables)
 *  - {TableName}_ID pattern (e.g., column "products_ID" matches table "products")
 */
function columnsMatch(
  colA: string,
  colB: string,
  _tableAName: string,
  _tableBName: string
): boolean {
  // Exact match
  if (colA === colB) return true;
  return false;
}

/**
 * Check if a column looks like a foreign key referencing a given table.
 * E.g., "Product_ID" references a table whose id column starts with "Product_ID"
 * or whose name (normalized) matches the prefix.
 */
function isForeignKeyPattern(column: string, tableName: string): boolean {
  // Normalize: lower-case, remove underscores/spaces
  const norm = (s: string) => s.toLowerCase().replace(/[_\s-]/g, "");

  // Check {TableName}_ID pattern — e.g., column "Customer_ID" references table "customers"
  const colNorm = norm(column);
  const tableNorm = norm(tableName);

  // "customer_id" → prefix "customer", table "customers" → "customers"
  if (column.endsWith("_ID") || column.endsWith("_id") || column.endsWith("_Id")) {
    const prefix = norm(column.replace(/_[Ii][Dd]$/, ""));
    // Table name might be plural
    if (
      tableNorm === prefix ||
      tableNorm === prefix + "s" ||
      tableNorm === prefix + "es" ||
      prefix === tableNorm + "s" ||
      prefix === tableNorm
    ) {
      return true;
    }
  }

  // Also check the reverse: table name prefix in column
  if (colNorm.startsWith(tableNorm) && colNorm.endsWith("id")) return true;

  return false;
}

/**
 * Auto-detect relationships between datasets by matching column names
 * and inferring cardinality from data uniqueness.
 */
export function detectRelationships(
  datasets: DatasetMeta[],
  allRows?: Map<string, Record<string, string>[]>
): Relationship[] {
  const relationships: Relationship[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < datasets.length; i++) {
    for (let j = 0; j < datasets.length; j++) {
      if (i === j) continue;

      const dsA = datasets[i];
      const dsB = datasets[j];

      for (const colA of dsA.headers) {
        for (const colB of dsB.headers) {
          const matched =
            columnsMatch(colA, colB, dsA.id, dsB.id) ||
            (isForeignKeyPattern(colA, dsB.id) && colA === colB);

          if (!matched) continue;

          // Avoid duplicate pairs (A→B same as B→A)
          const pairKey = [
            [dsA.id, colA].join("."),
            [dsB.id, colB].join("."),
          ]
            .sort()
            .join("↔");

          if (seen.has(pairKey)) continue;
          seen.add(pairKey);

          // Determine cardinality using row data if available
          let cardinality: "1:1" | "1:N" | "N:M" = "1:N";
          if (allRows) {
            const rowsA = allRows.get(dsA.id) ?? [];
            const rowsB = allRows.get(dsB.id) ?? [];
            const valsA = rowsA.map((r) => r[colA]).filter(Boolean);
            const valsB = rowsB.map((r) => r[colB]).filter(Boolean);

            if (valsA.length > 0 && valsB.length > 0) {
              cardinality = determineCardinality(valsA, valsB);
            }
          }

          // Orient: the side with unique values is "from" (the "1" side)
          let fromTable = dsA.id;
          let fromColumn = colA;
          let toTable = dsB.id;
          let toColumn = colB;

          if (allRows && cardinality === "1:N") {
            const rowsA = allRows.get(dsA.id) ?? [];
            const rowsB = allRows.get(dsB.id) ?? [];
            const valsA = rowsA.map((r) => r[colA]).filter(Boolean);
            const valsB = rowsB.map((r) => r[colB]).filter(Boolean);
            const aUnique = new Set(valsA).size === valsA.length;
            if (!aUnique) {
              // Flip so "from" is the unique side
              fromTable = dsB.id;
              fromColumn = colB;
              toTable = dsA.id;
              toColumn = colA;
            }
          }

          relationships.push({
            fromTable,
            fromColumn,
            toTable,
            toColumn,
            type: cardinality,
          });
        }
      }
    }
  }

  return relationships;
}

/**
 * Detect schema type based on relationship patterns.
 * - Star: one central fact table connects to multiple dimension tables, no dimension-to-dimension links
 * - Snowflake: dimensions connect to sub-dimensions
 * - Simple: no clear pattern or fewer than 2 relationships
 */
export function detectSchemaType(
  datasets: DatasetMeta[],
  relationships: Relationship[]
): SchemaType {
  if (relationships.length < 2) return "simple";

  // Count how many relationships each table participates in
  const connectionCount = new Map<string, number>();
  for (const ds of datasets) {
    connectionCount.set(ds.id, 0);
  }
  for (const rel of relationships) {
    connectionCount.set(
      rel.fromTable,
      (connectionCount.get(rel.fromTable) ?? 0) + 1
    );
    connectionCount.set(
      rel.toTable,
      (connectionCount.get(rel.toTable) ?? 0) + 1
    );
  }

  // Find the table with the most relationships — the candidate fact table
  let maxConnections = 0;
  let factCandidate = "";
  for (const [table, count] of connectionCount) {
    if (count > maxConnections) {
      maxConnections = count;
      factCandidate = table;
    }
  }

  if (maxConnections < 2) return "simple";

  // Check if all relationships involve the fact table (star schema)
  const allThroughFact = relationships.every(
    (r) => r.fromTable === factCandidate || r.toTable === factCandidate
  );

  if (allThroughFact) return "star";

  // If some relationships are between non-fact tables → snowflake
  const hasDimensionLinks = relationships.some(
    (r) => r.fromTable !== factCandidate && r.toTable !== factCandidate
  );

  if (hasDimensionLinks) return "snowflake";

  return "star";
}
