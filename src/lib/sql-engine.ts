export interface ParsedSQL {
  table: string;
  columns: string[];
  where: WhereCondition[];
  orderBy: OrderByClause[];
  limit: number | null;
  aggregates: AggregateFunc[];
  groupBy: string[];
  selectAll: boolean;
}

export interface WhereCondition {
  column: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE";
  value: string | number;
}

export interface OrderByClause {
  column: string;
  direction: "ASC" | "DESC";
}

export interface AggregateFunc {
  func: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
  column: string; // "*" for COUNT(*)
  alias: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, string | number>[];
  rowCount: number;
  executionTime: number;
}

export class SQLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SQLError";
  }
}

function tokenize(sql: string): string {
  // Normalize whitespace but preserve string literals
  return sql.replace(/\s+/g, " ").trim();
}

function extractStringValue(val: string): string {
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    return val.slice(1, -1);
  }
  return val;
}

export function parseSQL(sql: string): ParsedSQL {
  const normalized = tokenize(sql);

  // Must start with SELECT
  if (!/^SELECT\s/i.test(normalized)) {
    throw new SQLError("Only SELECT statements are supported");
  }

  // Extract main clauses using regex
  const fromMatch = normalized.match(/\bFROM\s+(\S+)/i);
  if (!fromMatch) {
    throw new SQLError("Missing FROM clause");
  }
  const table = fromMatch[1];

  // Extract SELECT columns (between SELECT and FROM)
  const selectMatch = normalized.match(/^SELECT\s+(.*?)\s+FROM\s/i);
  if (!selectMatch) {
    throw new SQLError("Invalid SELECT syntax");
  }
  const selectPart = selectMatch[1].trim();

  // Parse aggregates and columns
  const aggregates: AggregateFunc[] = [];
  const columns: string[] = [];
  let selectAll = false;

  const selectItems = splitSelectItems(selectPart);

  for (const item of selectItems) {
    const trimmed = item.trim();
    const aggMatch = trimmed.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(\*|\w+)\s*\)$/i);
    if (aggMatch) {
      const func = aggMatch[1].toUpperCase() as AggregateFunc["func"];
      const col = aggMatch[2];
      const alias = `${func}(${col})`;
      aggregates.push({ func, column: col, alias });
    } else if (trimmed === "*") {
      selectAll = true;
    } else {
      columns.push(trimmed);
    }
  }

  // Extract WHERE clause
  const where: WhereCondition[] = [];
  const whereMatch = normalized.match(/\bWHERE\s+(.*?)(?:\s+GROUP\s+BY\b|\s+ORDER\s+BY\b|\s+LIMIT\b|$)/i);
  if (whereMatch) {
    const wherePart = whereMatch[1].trim();
    // Split by AND
    const conditions = wherePart.split(/\s+AND\s+/i);
    for (const cond of conditions) {
      const parsed = parseCondition(cond.trim());
      where.push(parsed);
    }
  }

  // Extract GROUP BY
  const groupBy: string[] = [];
  const groupByMatch = normalized.match(/\bGROUP\s+BY\s+(.*?)(?:\s+ORDER\s+BY\b|\s+LIMIT\b|$)/i);
  if (groupByMatch) {
    const parts = groupByMatch[1].split(",").map((s) => s.trim());
    groupBy.push(...parts);
  }

  // Extract ORDER BY
  const orderBy: OrderByClause[] = [];
  const orderByMatch = normalized.match(/\bORDER\s+BY\s+(.*?)(?:\s+LIMIT\b|$)/i);
  if (orderByMatch) {
    const parts = orderByMatch[1].split(",");
    for (const part of parts) {
      const tokens = part.trim().split(/\s+/);
      const column = tokens[0];
      const direction = tokens[1]?.toUpperCase() === "DESC" ? "DESC" : "ASC";
      orderBy.push({ column, direction });
    }
  }

  // Extract LIMIT
  let limit: number | null = null;
  const limitMatch = normalized.match(/\bLIMIT\s+(\d+)/i);
  if (limitMatch) {
    limit = parseInt(limitMatch[1], 10);
  }

  return { table, columns, where, orderBy, limit, aggregates, groupBy, selectAll };
}

function splitSelectItems(selectPart: string): string[] {
  const items: string[] = [];
  let current = "";
  let parenDepth = 0;

  for (let i = 0; i < selectPart.length; i++) {
    const char = selectPart[i];
    if (char === "(") {
      parenDepth++;
      current += char;
    } else if (char === ")") {
      parenDepth--;
      current += char;
    } else if (char === "," && parenDepth === 0) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    items.push(current);
  }
  return items;
}

function parseCondition(cond: string): WhereCondition {
  // Match: column operator value
  const operators = ["!=", ">=", "<=", ">", "<", "=", "LIKE"];
  for (const op of operators) {
    const regex = op === "LIKE"
      ? new RegExp(`^(\\w+)\\s+LIKE\\s+(.+)$`, "i")
      : new RegExp(`^(\\w+)\\s*${escapeRegex(op)}\\s*(.+)$`);
    const match = cond.match(regex);
    if (match) {
      const column = match[1].trim();
      let value: string | number = extractStringValue(match[2].trim());
      // Try to convert to number
      if (!isNaN(Number(value)) && value !== "" && !match[2].trim().startsWith("'") && !match[2].trim().startsWith('"')) {
        value = Number(value);
      }
      return { column, operator: op === "LIKE" ? "LIKE" : op as WhereCondition["operator"], value };
    }
  }
  throw new SQLError(`Invalid WHERE condition: "${cond}"`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function executeQuery(
  parsed: ParsedSQL,
  datasets: Map<string, { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }>
): QueryResult {
  const startTime = performance.now();

  const dataset = datasets.get(parsed.table);
  if (!dataset) {
    const available = Array.from(datasets.keys()).join(", ");
    throw new SQLError(
      `Table '${parsed.table}' not found. Available tables: ${available || "none"}`
    );
  }

  const { rows, headers, columnTypes } = dataset;

  // Validate columns
  const requestedColumns = [
    ...parsed.columns,
    ...parsed.where.map((w) => w.column),
    ...parsed.orderBy.map((o) => o.column),
    ...parsed.groupBy,
    ...parsed.aggregates.filter((a) => a.column !== "*").map((a) => a.column),
  ];

  for (const col of requestedColumns) {
    if (!headers.includes(col)) {
      throw new SQLError(
        `Column '${col}' does not exist in '${parsed.table}'. Available columns: ${headers.join(", ")}`
      );
    }
  }

  // Apply WHERE filters
  let filteredRows = rows.filter((row) => {
    return parsed.where.every((cond) => {
      const cellValue = row[cond.column] ?? "";
      return evaluateCondition(cellValue, cond, columnTypes[cond.column]);
    });
  });

  // GROUP BY + aggregates
  if (parsed.groupBy.length > 0 || parsed.aggregates.length > 0) {
    return executeGroupBy(parsed, filteredRows, headers, columnTypes, startTime);
  }

  // Apply ORDER BY
  if (parsed.orderBy.length > 0) {
    filteredRows = [...filteredRows].sort((a, b) => {
      for (const ob of parsed.orderBy) {
        const aVal = a[ob.column] ?? "";
        const bVal = b[ob.column] ?? "";
        let cmp: number;
        if (columnTypes[ob.column] === "number") {
          cmp = Number(aVal) - Number(bVal);
        } else {
          cmp = aVal.localeCompare(bVal);
        }
        if (cmp !== 0) {
          return ob.direction === "DESC" ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  // Apply LIMIT
  if (parsed.limit !== null) {
    filteredRows = filteredRows.slice(0, parsed.limit);
  }

  // Select columns
  let resultColumns: string[];
  if (parsed.selectAll || parsed.columns.length === 0) {
    resultColumns = headers;
  } else {
    resultColumns = parsed.columns;
  }

  // Handle aggregate-only queries (no GROUP BY)
  if (parsed.aggregates.length > 0 && parsed.groupBy.length === 0) {
    const resultRow: Record<string, string | number> = {};
    for (const agg of parsed.aggregates) {
      resultRow[agg.alias] = computeAggregate(agg, filteredRows);
    }
    for (const col of parsed.columns) {
      resultRow[col] = filteredRows.length > 0 ? (filteredRows[0][col] ?? "") : "";
    }
    return {
      columns: [...parsed.columns, ...parsed.aggregates.map((a) => a.alias)],
      rows: [resultRow],
      rowCount: 1,
      executionTime: Math.round((performance.now() - startTime) * 100) / 100,
    };
  }

  const resultRows = filteredRows.map((row) => {
    const result: Record<string, string | number> = {};
    for (const col of resultColumns) {
      result[col] = row[col] ?? "";
    }
    return result;
  });

  return {
    columns: resultColumns,
    rows: resultRows,
    rowCount: resultRows.length,
    executionTime: Math.round((performance.now() - startTime) * 100) / 100,
  };
}

function executeGroupBy(
  parsed: ParsedSQL,
  rows: Record<string, string>[],
  headers: string[],
  columnTypes: Record<string, string>,
  startTime: number
): QueryResult {
  // Group rows
  const groups = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    const key = parsed.groupBy.map((col) => row[col] ?? "").join("|||");
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  const resultColumns = [...parsed.groupBy, ...parsed.aggregates.map((a) => a.alias)];
  const resultRows: Record<string, string | number>[] = [];

  for (const [, groupRows] of groups) {
    const result: Record<string, string | number> = {};

    // Add group by column values
    for (const col of parsed.groupBy) {
      result[col] = groupRows[0][col] ?? "";
    }

    // Compute aggregates
    for (const agg of parsed.aggregates) {
      result[agg.alias] = computeAggregate(agg, groupRows);
    }

    resultRows.push(result);
  }

  // Apply ORDER BY to grouped results
  if (parsed.orderBy.length > 0) {
    resultRows.sort((a, b) => {
      for (const ob of parsed.orderBy) {
        const aVal = a[ob.column] ?? "";
        const bVal = b[ob.column] ?? "";
        let cmp: number;
        const isNumericCol = columnTypes[ob.column] === "number" || parsed.aggregates.some((ag) => ag.alias === ob.column);
        if (isNumericCol) {
          cmp = Number(aVal) - Number(bVal);
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }
        if (cmp !== 0) {
          return ob.direction === "DESC" ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  // Apply LIMIT
  const limited = parsed.limit !== null ? resultRows.slice(0, parsed.limit) : resultRows;

  return {
    columns: resultColumns,
    rows: limited,
    rowCount: limited.length,
    executionTime: Math.round((performance.now() - startTime) * 100) / 100,
  };
}

function computeAggregate(agg: AggregateFunc, rows: Record<string, string>[]): number {
  if (agg.func === "COUNT") {
    return rows.length;
  }

  const values = rows
    .map((r) => Number(r[agg.column]))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return 0;

  switch (agg.func) {
    case "SUM":
      return Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
    case "AVG":
      return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
    case "MIN":
      return Math.min(...values);
    case "MAX":
      return Math.max(...values);
    default:
      return 0;
  }
}

function evaluateCondition(
  cellValue: string,
  cond: WhereCondition,
  columnType: string | undefined
): boolean {
  const condValue = cond.value;

  if (cond.operator === "LIKE") {
    const pattern = String(condValue)
      .replace(/%/g, ".*")
      .replace(/_/g, ".");
    const regex = new RegExp(`^${pattern}$`, "i");
    return regex.test(cellValue);
  }

  // For numeric comparisons
  if (columnType === "number" || (typeof condValue === "number")) {
    const numCell = Number(cellValue);
    const numCond = Number(condValue);
    if (isNaN(numCell) || isNaN(numCond)) {
      // Fall back to string comparison
      return compareStrings(cellValue, String(condValue), cond.operator);
    }
    switch (cond.operator) {
      case "=": return numCell === numCond;
      case "!=": return numCell !== numCond;
      case ">": return numCell > numCond;
      case "<": return numCell < numCond;
      case ">=": return numCell >= numCond;
      case "<=": return numCell <= numCond;
      default: return false;
    }
  }

  return compareStrings(cellValue, String(condValue), cond.operator);
}

function compareStrings(a: string, b: string, op: WhereCondition["operator"]): boolean {
  switch (op) {
    case "=": return a === b;
    case "!=": return a !== b;
    case ">": return a > b;
    case "<": return a < b;
    case ">=": return a >= b;
    case "<=": return a <= b;
    default: return false;
  }
}
