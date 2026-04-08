export interface JoinClause {
  joinType: "INNER" | "LEFT" | "RIGHT" | "FULL";
  joinTable: string;
  joinAlias: string;
  onLeft: string;
  onRight: string;
}

export interface CaseWhen {
  conditions: { when: string; then: string }[];
  elseValue: string | null;
  alias: string;
}

export interface WindowFunction {
  func: "ROW_NUMBER" | "RANK" | "LAG" | "LEAD" | "SUM" | "AVG";
  column: string; // column argument (empty for ROW_NUMBER/RANK)
  offset: number; // for LAG/LEAD
  orderByCol: string;
  orderByDir: "ASC" | "DESC";
  partitionBy: string | null;
  alias: string;
}

export interface ColumnAlias {
  expression: string;
  alias: string;
}

export interface ExistsCondition {
  negated: boolean;
  subSQL: string;
}

export interface ParsedSQL {
  table: string;
  tableAlias: string;
  columns: string[];
  where: WhereCondition[];
  orderBy: OrderByClause[];
  limit: number | null;
  aggregates: AggregateFunc[];
  groupBy: string[];
  selectAll: boolean;
  distinct: boolean;
  join: JoinClause | null;
  joins: JoinClause[];
  having: HavingCondition[];
  caseWhens: CaseWhen[];
  columnAliases: ColumnAlias[];
  windowFunctions: WindowFunction[];
  union: UnionClause | null;
  subqueries: SubqueryCondition[];
  existsConditions: ExistsCondition[];
}

export interface HavingCondition {
  expression: string; // e.g. "SUM(Revenue)"
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=";
  value: number;
}

export interface SubqueryCondition {
  column: string;
  negated: boolean;
  subSQL: string;
}

export interface UnionClause {
  type: "UNION" | "UNION ALL";
  secondSQL: string;
}

export interface WhereCondition {
  column: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN" | "BETWEEN" | "IS NULL" | "IS NOT NULL";
  value: string | number | string[] | [number, number];
  negated?: boolean;
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

// ----- Helpers for parsing complex expressions -----

/** Split a string by a delimiter, but only at top-level (outside parentheses and quotes) */
function splitTopLevel(input: string, delimiter: RegExp): string[] {
  const parts: string[] = [];
  let current = "";
  let parenDepth = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }
    if (inSingle || inDouble) { current += ch; continue; }
    if (ch === "(") { parenDepth++; current += ch; continue; }
    if (ch === ")") { parenDepth--; current += ch; continue; }
    if (parenDepth === 0) {
      // Try to match delimiter at current position
      const remaining = input.slice(i);
      const m = remaining.match(delimiter);
      if (m && m.index === 0) {
        parts.push(current);
        current = "";
        i += m[0].length - 1;
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** Split WHERE clause by AND, but respect BETWEEN...AND as a single token */
function splitWhereByAnd(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let parenDepth = 0;
  let inSingle = false;
  let inDouble = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; i++; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; i++; continue; }
    if (inSingle || inDouble) { current += ch; i++; continue; }
    if (ch === "(") { parenDepth++; current += ch; i++; continue; }
    if (ch === ")") { parenDepth--; current += ch; i++; continue; }

    if (parenDepth === 0) {
      // Check for " AND " at this position (case-insensitive)
      const remaining = input.slice(i);
      const andMatch = remaining.match(/^\s+AND\s+/i);
      if (andMatch) {
        // Check if this AND is part of a BETWEEN ... AND
        const currentTrimmed = current.trim();
        if (/\bBETWEEN\s+\S+$/i.test(currentTrimmed) || /\bNOT\s+BETWEEN\s+\S+$/i.test(currentTrimmed)) {
          // This AND is part of BETWEEN, include it
          current += andMatch[0];
          i += andMatch[0].length;
          continue;
        }
        // Normal AND - split here
        parts.push(current.trim());
        current = "";
        i += andMatch[0].length;
        continue;
      }
    }

    current += ch;
    i++;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// ----- Parse functions for individual expressions -----

/** Check if a string is a CASE WHEN expression */
function parseCaseWhen(expr: string): CaseWhen | null {
  const caseMatch = expr.match(/^CASE\s+([\s\S]*)\s+END(?:\s+AS\s+(\w+))?$/i);
  if (!caseMatch) return null;
  const body = caseMatch[1].trim();
  const alias = caseMatch[2] || "CASE";

  const conditions: { when: string; then: string }[] = [];
  let elseValue: string | null = null;

  // Extract WHEN ... THEN ... pairs
  const whenRegex = /WHEN\s+(.*?)\s+THEN\s+([^\s]+|'[^']*')/gi;
  let m;
  while ((m = whenRegex.exec(body)) !== null) {
    conditions.push({ when: m[1].trim(), then: extractStringValue(m[2].trim()) });
  }

  // Extract ELSE
  const elseMatch = body.match(/ELSE\s+([^\s]+|'[^']*')\s*$/i);
  if (elseMatch) {
    elseValue = extractStringValue(elseMatch[1].trim());
  }

  if (conditions.length === 0) return null;
  return { conditions, elseValue, alias };
}

/** Parse a window function expression like ROW_NUMBER() OVER (...) */
function parseWindowFunc(expr: string): WindowFunction | null {
  // Pattern: FUNC(...) OVER (PARTITION BY col ORDER BY col DIR) AS alias
  const wfMatch = expr.match(
    /^(ROW_NUMBER|RANK|LAG|LEAD|SUM|AVG)\s*\(\s*([\w.]*?)(?:\s*,\s*(\d+))?\s*\)\s+OVER\s*\(\s*(.*?)\s*\)(?:\s+AS\s+(\w+))?$/i
  );
  if (!wfMatch) return null;

  const func = wfMatch[1].toUpperCase() as WindowFunction["func"];
  const column = wfMatch[2] || "";
  const offset = wfMatch[3] ? parseInt(wfMatch[3], 10) : 1;
  const overClause = wfMatch[4];
  const alias = wfMatch[5] || `${func}(${column || ""})`;

  let partitionBy: string | null = null;
  const partMatch = overClause.match(/PARTITION\s+BY\s+([\w.]+)/i);
  if (partMatch) partitionBy = partMatch[1];

  let orderByCol = "";
  let orderByDir: "ASC" | "DESC" = "ASC";
  const orderMatch = overClause.match(/ORDER\s+BY\s+([\w.]+)(?:\s+(ASC|DESC))?/i);
  if (orderMatch) {
    orderByCol = orderMatch[1];
    if (orderMatch[2]?.toUpperCase() === "DESC") orderByDir = "DESC";
  }

  return { func, column, offset, orderByCol, orderByDir, partitionBy, alias };
}

/** Check if a string is a function call like YEAR(col), UPPER(col), ROUND(col, n), etc. */
function parseFunctionCall(expr: string): { funcName: string; args: string[] } | null {
  const m = expr.match(/^(\w+)\s*\(([\s\S]*)\)$/);
  if (!m) return null;
  const funcName = m[1].toUpperCase();
  // Split args by comma at top level
  const argsStr = m[2].trim();
  if (argsStr === "" || argsStr === "*") return { funcName, args: [argsStr] };
  const args = splitTopLevel(argsStr, /\s*,\s*/);
  return { funcName, args: args.map(a => a.trim()) };
}

/** Check if expression is an aggregate: COUNT, SUM, AVG, MIN, MAX */
function isAggregateFunc(name: string): name is AggregateFunc["func"] {
  return ["COUNT", "SUM", "AVG", "MIN", "MAX"].includes(name);
}

// Functions supported in SELECT expressions (non-aggregate)
const SCALAR_FUNCTIONS = new Set([
  "YEAR", "MONTH", "DAY", "QUARTER", "DATEPART",
  "UPPER", "LOWER", "CONCAT", "TRIM", "LTRIM", "RTRIM", "SUBSTRING", "LENGTH",
  "ROUND", "CEIL", "CEILING", "FLOOR", "ABS", "POWER",
  "COALESCE",
]);

function isScalarFunction(name: string): boolean {
  return SCALAR_FUNCTIONS.has(name.toUpperCase());
}

/** Evaluate a scalar function on a row */
function evalScalarExpr(
  expr: string,
  row: Record<string, string | number>,
  columnTypes: Record<string, string>
): string | number {
  const trimmed = expr.trim();

  // String literal
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }

  // Numeric literal
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  // Arithmetic: a / b, a * b, a + b, a - b (simple binary)
  const arithMatch = trimmed.match(/^(.+?)\s*([\/*+\-])\s*(.+)$/);
  if (arithMatch) {
    // Check it's not inside a function call
    const left = arithMatch[1].trim();
    const op = arithMatch[2];
    const right = arithMatch[3].trim();
    // Only process if left is a simple column or number and right is a simple column or number
    const leftIsSimple = /^[\w.]+$/.test(left) || /^-?\d+(\.\d+)?$/.test(left);
    const rightIsSimple = /^[\w.]+$/.test(right) || /^-?\d+(\.\d+)?$/.test(right);
    if (leftIsSimple && rightIsSimple) {
      const l = Number(evalScalarExpr(left, row, columnTypes));
      const r = Number(evalScalarExpr(right, row, columnTypes));
      switch (op) {
        case "/": return r === 0 ? 0 : l / r;
        case "*": return l * r;
        case "+": return l + r;
        case "-": return l - r;
      }
    }
  }

  // Function call
  const fc = parseFunctionCall(trimmed);
  if (fc && isScalarFunction(fc.funcName)) {
    const { funcName, args } = fc;
    switch (funcName) {
      case "YEAR": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.getFullYear();
      }
      case "MONTH": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.getMonth() + 1;
      }
      case "DAY": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.getDate();
      }
      case "QUARTER": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : Math.ceil((d.getMonth() + 1) / 3);
      }
      case "DATEPART": {
        const part = extractStringValue(args[0]).toLowerCase();
        const val = String(evalScalarExpr(args[1], row, columnTypes));
        const d = new Date(val);
        if (isNaN(d.getTime())) return val;
        switch (part) {
          case "year": return d.getFullYear();
          case "month": return d.getMonth() + 1;
          case "day": return d.getDate();
          case "quarter": return Math.ceil((d.getMonth() + 1) / 3);
          default: return val;
        }
      }
      case "UPPER": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        return val.toUpperCase();
      }
      case "LOWER": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        return val.toLowerCase();
      }
      case "CONCAT": {
        return args.map(a => String(evalScalarExpr(a, row, columnTypes))).join("");
      }
      case "TRIM": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        return val.trim();
      }
      case "LTRIM": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        return val.replace(/^\s+/, "");
      }
      case "RTRIM": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        return val.replace(/\s+$/, "");
      }
      case "SUBSTRING": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        const start = Number(evalScalarExpr(args[1], row, columnTypes));
        const len = args[2] ? Number(evalScalarExpr(args[2], row, columnTypes)) : undefined;
        // SQL SUBSTRING is 1-based
        return val.substring(start - 1, len !== undefined ? start - 1 + len : undefined);
      }
      case "LENGTH": {
        const val = String(evalScalarExpr(args[0], row, columnTypes));
        return val.length;
      }
      case "ROUND": {
        const val = Number(evalScalarExpr(args[0], row, columnTypes));
        const decimals = args[1] ? Number(evalScalarExpr(args[1], row, columnTypes)) : 0;
        const factor = Math.pow(10, decimals);
        return Math.round(val * factor) / factor;
      }
      case "CEIL":
      case "CEILING": {
        const val = Number(evalScalarExpr(args[0], row, columnTypes));
        return Math.ceil(val);
      }
      case "FLOOR": {
        const val = Number(evalScalarExpr(args[0], row, columnTypes));
        return Math.floor(val);
      }
      case "ABS": {
        const val = Number(evalScalarExpr(args[0], row, columnTypes));
        return Math.abs(val);
      }
      case "POWER": {
        const base = Number(evalScalarExpr(args[0], row, columnTypes));
        const exp = Number(evalScalarExpr(args[1], row, columnTypes));
        return Math.pow(base, exp);
      }
      case "COALESCE": {
        for (const arg of args) {
          const val = evalScalarExpr(arg, row, columnTypes);
          const strVal = String(val);
          if (strVal !== "" && strVal !== "null" && strVal !== "NULL" && strVal !== "undefined") {
            return val;
          }
        }
        return "";
      }
    }
  }

  // Simple column reference
  if (row[trimmed] !== undefined) {
    return row[trimmed];
  }

  // Return as-is (might be a literal we don't recognize)
  return trimmed;
}

/** Create a display name for a select expression, using alias if present */
function exprDisplayName(expr: string, alias?: string): string {
  if (alias) return alias;
  return expr;
}

export function parseSQL(sql: string): ParsedSQL {
  let normalized = tokenize(sql);

  // Must start with SELECT (but handle UNION first by checking for it)
  if (!/^SELECT\s/i.test(normalized)) {
    throw new SQLError("Only SELECT statements are supported");
  }

  // Check for UNION / UNION ALL - split at top level
  let union: UnionClause | null = null;
  const unionAllIdx = findTopLevelKeyword(normalized, /\bUNION\s+ALL\b/i);
  const unionIdx = unionAllIdx === -1 ? findTopLevelKeyword(normalized, /\bUNION\b/i) : -1;

  if (unionAllIdx !== -1) {
    const firstPart = normalized.substring(0, unionAllIdx).trim();
    const match = normalized.substring(unionAllIdx).match(/^UNION\s+ALL\s+/i);
    const secondPart = normalized.substring(unionAllIdx + (match ? match[0].length : 10)).trim();
    union = { type: "UNION ALL", secondSQL: secondPart };
    normalized = firstPart;
  } else if (unionIdx !== -1) {
    const firstPart = normalized.substring(0, unionIdx).trim();
    const match = normalized.substring(unionIdx).match(/^UNION\s+/i);
    const secondPart = normalized.substring(unionIdx + (match ? match[0].length : 6)).trim();
    union = { type: "UNION", secondSQL: secondPart };
    normalized = firstPart;
  }

  // Extract main clauses using regex
  const fromMatch = normalized.match(/\bFROM\s+(\S+)/i);
  if (!fromMatch) {
    throw new SQLError("Missing FROM clause");
  }
  const tableRaw = fromMatch[1];

  // Check for table alias: FROM table alias (where alias is NOT a keyword)
  let table = tableRaw;
  let tableAlias = "";
  const afterFrom = normalized.match(/\bFROM\s+(\S+)\s+(\S+)/i);
  if (afterFrom) {
    const possibleAlias = afterFrom[2];
    const keywords = ["WHERE", "ORDER", "GROUP", "LIMIT", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON", "HAVING", "UNION"];
    if (!keywords.includes(possibleAlias.toUpperCase())) {
      tableAlias = possibleAlias;
    }
  }

  // Detect JOIN clauses (supports multiple JOINs)
  let join: JoinClause | null = null;
  const joins: JoinClause[] = [];
  const joinRegex = /\b(FULL\s+OUTER\s+JOIN|RIGHT\s+JOIN|LEFT\s+JOIN|INNER\s+JOIN|JOIN)\s+(\S+)(?:\s+(\S+))?\s+ON\s+(\S+)\s*=\s*(\S+)/gi;
  let jm;
  while ((jm = joinRegex.exec(normalized)) !== null) {
    const joinTypeRaw = jm[1].toUpperCase().trim();
    let joinType: "INNER" | "LEFT" | "RIGHT" | "FULL";
    if (joinTypeRaw.startsWith("LEFT")) joinType = "LEFT";
    else if (joinTypeRaw.startsWith("RIGHT")) joinType = "RIGHT";
    else if (joinTypeRaw.startsWith("FULL")) joinType = "FULL";
    else joinType = "INNER";
    const joinTable = jm[2];
    let joinAlias = "";
    if (jm[3]) {
      const possibleAlias = jm[3];
      if (possibleAlias.toUpperCase() !== "ON") {
        joinAlias = possibleAlias;
      }
    }
    const onLeft = jm[4];
    const onRight = jm[5];
    joins.push({ joinType, joinTable, joinAlias, onLeft, onRight });
  }
  if (joins.length > 0) {
    join = joins[0]; // backward compat: first join
  } else {
    const joinWithoutOn = normalized.match(/\b(FULL\s+OUTER\s+JOIN|RIGHT\s+JOIN|LEFT\s+JOIN|INNER\s+JOIN|JOIN)\s+(\S+)/i);
    if (joinWithoutOn) {
      throw new SQLError("JOIN requires an ON clause");
    }
  }

  // Extract SELECT columns (between SELECT and FROM), handling DISTINCT
  const selectMatch = normalized.match(/^SELECT\s+(.*?)\s+FROM\s/i);
  if (!selectMatch) {
    throw new SQLError("Invalid SELECT syntax");
  }
  let selectPart = selectMatch[1].trim();
  let distinct = false;
  if (/^DISTINCT\s+/i.test(selectPart)) {
    distinct = true;
    selectPart = selectPart.replace(/^DISTINCT\s+/i, "").trim();
  }

  // Parse aggregates, columns, CASE WHEN, window functions, aliases
  const aggregates: AggregateFunc[] = [];
  const columns: string[] = [];
  const caseWhens: CaseWhen[] = [];
  const windowFunctions: WindowFunction[] = [];
  const columnAliases: ColumnAlias[] = [];
  let selectAll = false;

  const selectItems = splitSelectItems(selectPart);

  for (const item of selectItems) {
    const trimmed = item.trim();

    // CASE WHEN ... END [AS alias]
    if (/^CASE\s/i.test(trimmed)) {
      const cw = parseCaseWhen(trimmed);
      if (cw) {
        caseWhens.push(cw);
        continue;
      }
    }

    // Window function: FUNC(...) OVER (...) [AS alias]
    if (/OVER\s*\(/i.test(trimmed)) {
      const wf = parseWindowFunc(trimmed);
      if (wf) {
        windowFunctions.push(wf);
        continue;
      }
    }

    // Check for AS alias: expression AS alias
    const asMatch = trimmed.match(/^(.+?)\s+AS\s+(\w+)$/i);
    if (asMatch) {
      const expression = asMatch[1].trim();
      const alias = asMatch[2].trim();

      // Check if expression is an aggregate: SUM(col) AS alias
      const aggMatch = expression.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(\*|[\w.]+)\s*\)$/i);
      if (aggMatch) {
        const func = aggMatch[1].toUpperCase() as AggregateFunc["func"];
        const col = aggMatch[2];
        aggregates.push({ func, column: col, alias });
        continue;
      }

      // It's a column or expression alias
      columnAliases.push({ expression, alias });
      columns.push(expression);
      continue;
    }

    // Standard aggregate without alias
    const aggMatch = trimmed.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(\*|[\w.]+)\s*\)$/i);
    if (aggMatch) {
      const func = aggMatch[1].toUpperCase() as AggregateFunc["func"];
      const col = aggMatch[2];
      const alias = `${func}(${col})`;
      aggregates.push({ func, column: col, alias });
      continue;
    }

    if (trimmed === "*") {
      selectAll = true;
      continue;
    }

    columns.push(trimmed);
  }

  // Extract WHERE clause
  const where: WhereCondition[] = [];
  const subqueries: SubqueryCondition[] = [];
  const existsConditions: ExistsCondition[] = [];
  const whereMatch = normalized.match(/\bWHERE\s+(.*?)(?:\s+GROUP\s+BY\b|\s+HAVING\b|\s+ORDER\s+BY\b|\s+LIMIT\b|\s+UNION\b|$)/i);
  if (whereMatch) {
    const wherePart = whereMatch[1].trim();
    // Split by AND at top level (not inside parens), but skip AND inside BETWEEN...AND
    const conditions = splitWhereByAnd(wherePart);
    for (const cond of conditions) {
      const trimmedCond = cond.trim();

      // Check for EXISTS (SELECT ...) / NOT EXISTS (SELECT ...)
      const existsMatch = trimmedCond.match(/^(NOT\s+)?EXISTS\s*\(\s*(SELECT\s+.*)\s*\)$/i);
      if (existsMatch) {
        existsConditions.push({
          negated: !!existsMatch[1],
          subSQL: existsMatch[2].trim(),
        });
        continue;
      }

      // Check for subquery: column [NOT] IN (SELECT ...)
      const subqMatch = trimmedCond.match(/^([\w.]+)\s+(NOT\s+)?IN\s*\(\s*(SELECT\s+.*)\s*\)$/i);
      if (subqMatch) {
        subqueries.push({
          column: subqMatch[1],
          negated: !!subqMatch[2],
          subSQL: subqMatch[3].trim(),
        });
        continue;
      }

      const parsed = parseCondition(trimmedCond);
      where.push(parsed);
    }
  }

  // Extract GROUP BY
  const groupBy: string[] = [];
  const groupByMatch = normalized.match(/\bGROUP\s+BY\s+(.*?)(?:\s+HAVING\b|\s+ORDER\s+BY\b|\s+LIMIT\b|\s+UNION\b|$)/i);
  if (groupByMatch) {
    const parts = groupByMatch[1].split(",").map((s) => s.trim());
    groupBy.push(...parts);
  }

  // Extract HAVING
  const having: HavingCondition[] = [];
  const havingMatch = normalized.match(/\bHAVING\s+(.*?)(?:\s+ORDER\s+BY\b|\s+LIMIT\b|\s+UNION\b|$)/i);
  if (havingMatch) {
    const havingPart = havingMatch[1].trim();
    const havingConds = splitTopLevel(havingPart, /\s+AND\s+/i);
    for (const hc of havingConds) {
      const hm = hc.trim().match(/^(.+?)\s*(!=|>=|<=|>|<|=)\s*(.+)$/);
      if (hm) {
        having.push({
          expression: hm[1].trim(),
          operator: hm[2] as HavingCondition["operator"],
          value: Number(hm[3].trim()),
        });
      }
    }
  }

  // Extract ORDER BY
  const orderBy: OrderByClause[] = [];
  const orderByMatch = normalized.match(/\bORDER\s+BY\s+(.*?)(?:\s+LIMIT\b|\s+UNION\b|$)/i);
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

  return {
    table, tableAlias, columns, where, orderBy, limit, aggregates, groupBy,
    selectAll, distinct, join, joins, having, caseWhens, columnAliases, windowFunctions,
    union, subqueries, existsConditions,
  };
}

/** Find the position of a keyword at top-level (not inside parens or quotes) */
function findTopLevelKeyword(sql: string, keyword: RegExp): number {
  let parenDepth = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (inSingle || inDouble) continue;
    if (ch === "(") { parenDepth++; continue; }
    if (ch === ")") { parenDepth--; continue; }
    if (parenDepth === 0) {
      const remaining = sql.slice(i);
      const m = remaining.match(keyword);
      if (m && m.index === 0) return i;
    }
  }
  return -1;
}

function splitSelectItems(selectPart: string): string[] {
  const items: string[] = [];
  let current = "";
  let parenDepth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < selectPart.length; i++) {
    const char = selectPart[i];
    if (char === "'" && !inDouble) { inSingle = !inSingle; current += char; continue; }
    if (char === '"' && !inSingle) { inDouble = !inDouble; current += char; continue; }
    if (inSingle || inDouble) { current += char; continue; }
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
  const trimmedCond = cond.trim();

  // NOT prefix: NOT column = value
  const notMatch = trimmedCond.match(/^NOT\s+(.+)$/i);
  if (notMatch) {
    const inner = parseCondition(notMatch[1].trim());
    inner.negated = true;
    return inner;
  }

  // IS NOT NULL
  const isNotNullMatch = trimmedCond.match(/^([\w.]+)\s+IS\s+NOT\s+NULL$/i);
  if (isNotNullMatch) {
    return { column: isNotNullMatch[1].trim(), operator: "IS NOT NULL", value: "" };
  }

  // IS NULL
  const isNullMatch = trimmedCond.match(/^([\w.]+)\s+IS\s+NULL$/i);
  if (isNullMatch) {
    return { column: isNullMatch[1].trim(), operator: "IS NULL", value: "" };
  }

  // NOT IN: column NOT IN ('a', 'b', 'c')
  const notInMatch = trimmedCond.match(/^([\w.]+)\s+NOT\s+IN\s*\(\s*(.*?)\s*\)$/i);
  if (notInMatch) {
    const column = notInMatch[1].trim();
    const vals = notInMatch[2].split(",").map(v => extractStringValue(v.trim()));
    return { column, operator: "IN", value: vals, negated: true };
  }

  // IN: column IN ('a', 'b', 'c')
  const inMatch = trimmedCond.match(/^([\w.]+)\s+IN\s*\(\s*(.*?)\s*\)$/i);
  if (inMatch) {
    const column = inMatch[1].trim();
    const vals = inMatch[2].split(",").map(v => extractStringValue(v.trim()));
    return { column, operator: "IN", value: vals };
  }

  // NOT BETWEEN: column NOT BETWEEN a AND b
  const notBetweenMatch = trimmedCond.match(/^([\w.]+)\s+NOT\s+BETWEEN\s+(\S+)\s+AND\s+(\S+)$/i);
  if (notBetweenMatch) {
    const column = notBetweenMatch[1].trim();
    const low = Number(notBetweenMatch[2]);
    const high = Number(notBetweenMatch[3]);
    return { column, operator: "BETWEEN", value: [low, high] as [number, number], negated: true };
  }

  // BETWEEN: column BETWEEN a AND b
  const betweenMatch = trimmedCond.match(/^([\w.]+)\s+BETWEEN\s+(\S+)\s+AND\s+(\S+)$/i);
  if (betweenMatch) {
    const column = betweenMatch[1].trim();
    const low = Number(betweenMatch[2]);
    const high = Number(betweenMatch[3]);
    return { column, operator: "BETWEEN", value: [low, high] as [number, number] };
  }

  // Match: column operator value (column can be alias.column format)
  const operators = ["!=", ">=", "<=", ">", "<", "=", "LIKE"];
  for (const op of operators) {
    const regex = op === "LIKE"
      ? new RegExp(`^([\\w.]+)\\s+LIKE\\s+(.+)$`, "i")
      : new RegExp(`^([\\w.]+)\\s*${escapeRegex(op)}\\s*(.+)$`);
    const match = trimmedCond.match(regex);
    if (match) {
      const column = match[1].trim();
      let value: string | number = extractStringValue(match[2].trim());
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

/**
 * Resolve a possibly-qualified column name (alias.col) to a bare column name,
 * identifying which table it belongs to.
 */
function resolveColumn(
  col: string,
  leftAlias: string,
  rightAlias: string,
  leftHeaders: string[],
  rightHeaders: string[],
): { bare: string; source: "left" | "right" | "any" } {
  if (col.includes(".")) {
    const [alias, bare] = col.split(".", 2);
    if (alias === leftAlias) return { bare, source: "left" };
    if (alias === rightAlias) return { bare, source: "right" };
    return { bare: col, source: "any" };
  }
  if (leftHeaders.includes(col) && !rightHeaders.includes(col)) return { bare: col, source: "left" };
  if (rightHeaders.includes(col) && !leftHeaders.includes(col)) return { bare: col, source: "right" };
  return { bare: col, source: "any" };
}

// ---- Execution entry point ----

export function executeQuery(
  parsed: ParsedSQL,
  datasets: Map<string, { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }>
): QueryResult {
  const startTime = performance.now();

  // Execute first query
  const firstResult = executeSingleQuery(parsed, datasets, startTime);

  // Handle UNION
  if (parsed.union) {
    const secondParsed = parseSQL(parsed.union.secondSQL);
    const secondResult = executeSingleQuery(secondParsed, datasets, startTime);

    // Combine results
    const combinedColumns = firstResult.columns; // Use first query's columns
    let combinedRows = [...firstResult.rows, ...secondResult.rows];

    // UNION (not ALL) = deduplicate
    if (parsed.union.type === "UNION") {
      const seen = new Set<string>();
      combinedRows = combinedRows.filter(row => {
        const key = combinedColumns.map(c => String(row[c] ?? "")).join("|||");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return {
      columns: combinedColumns,
      rows: combinedRows,
      rowCount: combinedRows.length,
      executionTime: Math.round((performance.now() - startTime) * 100) / 100,
    };
  }

  return firstResult;
}

function executeSingleQuery(
  parsed: ParsedSQL,
  datasets: Map<string, { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }>,
  startTime: number
): QueryResult {
  const dataset = datasets.get(parsed.table);
  if (!dataset) {
    const available = Array.from(datasets.keys()).join(", ");
    throw new SQLError(
      `Table '${parsed.table}' not found. Available tables: ${available || "none"}`
    );
  }

  // If there is a JOIN, execute the join path
  if (parsed.joins.length > 0) {
    return executeJoinQuery(parsed, datasets, startTime);
  }

  const { rows, headers, columnTypes } = dataset;

  // Determine which columns are "real" vs computed expressions
  const realColumns: string[] = [];
  const exprColumns: string[] = [];
  for (const col of parsed.columns) {
    if (headers.includes(col)) {
      realColumns.push(col);
    } else {
      // Check if it's a valid expression (function call, arithmetic, etc.)
      // A simple identifier with no parens, no dots, no operators is just a plain column name
      const isPlainIdent = /^[\w]+$/.test(col) && !isScalarFunction(col);
      const isNumericLiteral = /^-?\d+(\.\d+)?$/.test(col);
      if (isPlainIdent && !isNumericLiteral) {
        // It's a plain column name that doesn't exist
        throw new SQLError(
          `Column '${col}' does not exist in '${parsed.table}'. Available columns: ${headers.join(", ")}`
        );
      }
      exprColumns.push(col);
    }
  }

  // Helper: resolve alias-qualified column names for this table
  const localAlias = parsed.tableAlias || parsed.table;
  const resolveLocalCol = (col: string): string => {
    if (col.includes(".")) {
      const [prefix, bare] = col.split(".", 2);
      if (prefix === localAlias && headers.includes(bare)) return bare;
    }
    return col;
  };

  // Resolve alias-prefixed WHERE columns
  for (const cond of parsed.where) {
    cond.column = resolveLocalCol(cond.column);
  }

  // Validate real columns used in WHERE, ORDER BY, GROUP BY, aggregates
  const requestedColumns = [
    ...realColumns,
    ...parsed.where.filter(w => w.operator !== "IN" || !Array.isArray(w.value)).map((w) => w.column),
    ...parsed.where.filter(w => w.operator === "IN" && Array.isArray(w.value)).map((w) => w.column),
    ...parsed.orderBy.map((o) => o.column).filter(c => headers.includes(c)),
    ...parsed.groupBy.filter(g => headers.includes(g)),
    ...parsed.aggregates.filter((a) => a.column !== "*").map((a) => a.column).filter(c => headers.includes(c)),
    ...parsed.subqueries.map(s => s.column),
  ];

  for (const col of requestedColumns) {
    if (!headers.includes(col)) {
      throw new SQLError(
        `Column '${col}' does not exist in '${parsed.table}'. Available columns: ${headers.join(", ")}`
      );
    }
  }

  // Resolve subqueries
  const subqueryResults = new Map<string, Set<string>>();
  for (const sq of parsed.subqueries) {
    const subParsed = parseSQL(sq.subSQL);
    const subResult = executeSingleQuery(subParsed, datasets, startTime);
    const values = new Set<string>();
    for (const row of subResult.rows) {
      const firstCol = subResult.columns[0];
      values.add(String(row[firstCol] ?? ""));
    }
    subqueryResults.set(sq.column, values);
  }

  // Apply WHERE filters
  let filteredRows = rows.filter((row) => {
    // Standard WHERE conditions
    const whereOk = parsed.where.every((cond) => {
      const cellValue = row[cond.column] ?? "";
      return evaluateCondition(cellValue, cond, columnTypes[cond.column]);
    });
    if (!whereOk) return false;

    // Subquery conditions
    for (const sq of parsed.subqueries) {
      const values = subqueryResults.get(sq.column)!;
      const cellValue = String(row[sq.column] ?? "");
      const inSet = values.has(cellValue);
      if (sq.negated ? inSet : !inSet) return false;
    }

    // EXISTS / NOT EXISTS conditions
    for (const ec of parsed.existsConditions) {
      // Replace correlated column references (e.g., t.Customer_ID = c.Customer_ID)
      // by injecting a WHERE condition that matches the current row's values
      let subSQL = ec.subSQL;
      // Find correlated references: detect pattern WHERE alias.col = outerAlias.col
      // We substitute outer table references with the current row's actual values
      const outerAlias = parsed.tableAlias || parsed.table;
      // Replace references like outerAlias.column = ... with the actual value
      const outerRefRegex = new RegExp(`([\\w.]+)\\s*(=|!=|>|<|>=|<=)\\s*${escapeRegex(outerAlias)}\\.(\\w+)`, "gi");
      subSQL = subSQL.replace(outerRefRegex, (_match, left, op, outerCol) => {
        const val = row[outerCol] ?? "";
        const quoted = isNaN(Number(val)) || val === "" ? `'${val}'` : val;
        return `${left} ${op} ${quoted}`;
      });
      // Also handle the reverse: outerAlias.col = innerExpr
      const outerRefRegex2 = new RegExp(`${escapeRegex(outerAlias)}\\.(\\w+)\\s*(=|!=|>|<|>=|<=)\\s*([\\w.]+)`, "gi");
      subSQL = subSQL.replace(outerRefRegex2, (_match, outerCol, op, right) => {
        const val = row[outerCol] ?? "";
        const quoted = isNaN(Number(val)) || val === "" ? `'${val}'` : val;
        return `${quoted} ${op} ${right}`;
      });

      try {
        const subParsed = parseSQL(subSQL);
        const subResult = executeSingleQuery(subParsed, datasets, startTime);
        const hasRows = subResult.rows.length > 0;
        if (ec.negated ? hasRows : !hasRows) return false;
      } catch {
        // If subquery fails, treat as no rows
        if (!ec.negated) return false;
      }
    }

    return true;
  });

  // Check if we have any computed expressions (functions, CASE WHEN, etc.)
  const hasComputedExpr = exprColumns.length > 0 || parsed.caseWhens.length > 0 ||
    parsed.windowFunctions.length > 0 || parsed.columnAliases.length > 0;

  // GROUP BY + aggregates
  if (parsed.groupBy.length > 0 || parsed.aggregates.length > 0) {
    return executeGroupBy(parsed, filteredRows, headers, columnTypes, startTime);
  }

  // Build alias-to-expression map for ORDER BY alias resolution
  const aliasToExpr = new Map<string, string>();
  for (const a of parsed.columnAliases) {
    aliasToExpr.set(a.alias, a.expression);
  }
  for (const agg of parsed.aggregates) {
    aliasToExpr.set(agg.alias, `__agg__${agg.func}(${agg.column})`);
  }

  // Apply ORDER BY (resolve aliases to actual column names)
  if (parsed.orderBy.length > 0) {
    filteredRows = [...filteredRows].sort((a, b) => {
      for (const ob of parsed.orderBy) {
        // Resolve alias: if ob.column is an alias, use the original expression
        let resolvedCol = ob.column;
        if (aliasToExpr.has(ob.column)) {
          const expr = aliasToExpr.get(ob.column)!;
          if (!expr.startsWith("__agg__")) {
            resolvedCol = expr;
          }
        }
        const aVal = a[resolvedCol] ?? a[ob.column] ?? "";
        const bVal = b[resolvedCol] ?? b[ob.column] ?? "";
        let cmp: number;
        if (columnTypes[resolvedCol] === "number" || columnTypes[ob.column] === "number") {
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
  if (parsed.selectAll || (parsed.columns.length === 0 && parsed.aggregates.length === 0 && parsed.caseWhens.length === 0 && parsed.windowFunctions.length === 0)) {
    resultColumns = headers;
  } else {
    resultColumns = [];
    for (const col of parsed.columns) {
      // Check if this column has an alias
      const aliasEntry = parsed.columnAliases.find(a => a.expression === col);
      resultColumns.push(aliasEntry ? aliasEntry.alias : col);
    }
  }

  // Handle aggregate-only queries (no GROUP BY)
  if (parsed.aggregates.length > 0 && parsed.groupBy.length === 0) {
    const resultRow: Record<string, string | number> = {};
    for (const agg of parsed.aggregates) {
      resultRow[agg.alias] = computeAggregate(agg, filteredRows);
    }
    for (const col of parsed.columns) {
      const aliasEntry = parsed.columnAliases.find(a => a.expression === col);
      const key = aliasEntry ? aliasEntry.alias : col;
      resultRow[key] = filteredRows.length > 0 ? (filteredRows[0][col] ?? "") : "";
    }
    const allCols = [...resultColumns, ...parsed.aggregates.map((a) => a.alias)];
    return {
      columns: allCols,
      rows: [resultRow],
      rowCount: 1,
      executionTime: Math.round((performance.now() - startTime) * 100) / 100,
    };
  }

  // Add CASE WHEN columns
  for (const cw of parsed.caseWhens) {
    resultColumns.push(cw.alias);
  }

  // Build result rows
  let resultRows = filteredRows.map((row) => {
    const result: Record<string, string | number> = {};

    if (parsed.selectAll || (parsed.columns.length === 0 && parsed.caseWhens.length === 0 && parsed.windowFunctions.length === 0)) {
      for (const col of headers) {
        result[col] = row[col] ?? "";
      }
    } else {
      for (const col of parsed.columns) {
        const aliasEntry = parsed.columnAliases.find(a => a.expression === col);
        const key = aliasEntry ? aliasEntry.alias : col;
        // Check if it's a scalar function expression
        if (!headers.includes(col)) {
          result[key] = evalScalarExpr(col, row, columnTypes);
        } else {
          result[key] = row[col] ?? "";
        }
      }
    }

    // Evaluate CASE WHEN
    for (const cw of parsed.caseWhens) {
      result[cw.alias] = evaluateCaseWhen(cw, row, columnTypes);
    }

    return result;
  });

  // Process window functions
  if (parsed.windowFunctions.length > 0) {
    resultRows = applyWindowFunctions(parsed.windowFunctions, resultRows, filteredRows, columnTypes);
    for (const wf of parsed.windowFunctions) {
      if (!resultColumns.includes(wf.alias)) resultColumns.push(wf.alias);
    }
  }

  // Apply DISTINCT
  if (parsed.distinct) {
    const seen = new Set<string>();
    resultRows = resultRows.filter(row => {
      const key = resultColumns.map(c => String(row[c] ?? "")).join("|||");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return {
    columns: resultColumns,
    rows: resultRows,
    rowCount: resultRows.length,
    executionTime: Math.round((performance.now() - startTime) * 100) / 100,
  };
}

/** Perform a single two-table join and return the merged rows, headers, and columnTypes */
function performSingleJoin(
  leftRows: Record<string, string>[],
  leftHeaders: string[],
  leftColumnTypes: Record<string, string>,
  leftAlias: string,
  rightDataset: { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> },
  rightAlias: string,
  join: JoinClause,
): {
  rows: Record<string, string>[];
  headers: string[];
  columnTypes: Record<string, string>;
} {
  const onLeftResolved = resolveColumn(join.onLeft, leftAlias, rightAlias, leftHeaders, rightDataset.headers);
  const onRightResolved = resolveColumn(join.onRight, leftAlias, rightAlias, leftHeaders, rightDataset.headers);

  let leftOnCol: string;
  let rightOnCol: string;
  if (onLeftResolved.source === "left" || onLeftResolved.source === "any") {
    leftOnCol = onLeftResolved.bare;
    rightOnCol = onRightResolved.bare;
  } else {
    leftOnCol = onRightResolved.bare;
    rightOnCol = onLeftResolved.bare;
  }

  const mergedColumnTypes: Record<string, string> = { ...leftColumnTypes, ...rightDataset.columnTypes };
  for (const h of leftHeaders) {
    if (!mergedColumnTypes[`${leftAlias}.${h}`]) {
      mergedColumnTypes[`${leftAlias}.${h}`] = leftColumnTypes[h] || leftColumnTypes[`${leftAlias}.${h}`] || "string";
    }
  }
  for (const h of rightDataset.headers) {
    mergedColumnTypes[`${rightAlias}.${h}`] = rightDataset.columnTypes[h];
  }

  const joinedRows: Record<string, string>[] = [];
  const rightMatched = new Set<number>();

  for (const leftRow of leftRows) {
    let matched = false;
    // Resolve left key: try aliased name, then bare name
    const leftKeyVal = leftRow[`${leftAlias}.${leftOnCol}`] ?? leftRow[leftOnCol] ?? "";
    for (let ri = 0; ri < rightDataset.rows.length; ri++) {
      const rightRow = rightDataset.rows[ri];
      if (leftKeyVal === (rightRow[rightOnCol] ?? "")) {
        matched = true;
        rightMatched.add(ri);
        const merged: Record<string, string> = {};
        // Copy all existing left columns (including previous alias prefixes)
        for (const key of Object.keys(leftRow)) {
          merged[key] = leftRow[key] ?? "";
        }
        for (const h of leftHeaders) {
          if (!merged[`${leftAlias}.${h}`]) {
            merged[`${leftAlias}.${h}`] = leftRow[h] ?? leftRow[`${leftAlias}.${h}`] ?? "";
          }
        }
        for (const h of rightDataset.headers) {
          if (!leftHeaders.includes(h)) {
            merged[h] = rightRow[h] ?? "";
          }
          merged[`${rightAlias}.${h}`] = rightRow[h] ?? "";
        }
        joinedRows.push(merged);
      }
    }
    if (!matched && (join.joinType === "LEFT" || join.joinType === "FULL")) {
      const merged: Record<string, string> = {};
      for (const key of Object.keys(leftRow)) {
        merged[key] = leftRow[key] ?? "";
      }
      for (const h of leftHeaders) {
        if (!merged[`${leftAlias}.${h}`]) {
          merged[`${leftAlias}.${h}`] = leftRow[h] ?? leftRow[`${leftAlias}.${h}`] ?? "";
        }
      }
      for (const h of rightDataset.headers) {
        if (!leftHeaders.includes(h)) {
          merged[h] = "";
        }
        merged[`${rightAlias}.${h}`] = "";
      }
      joinedRows.push(merged);
    }
  }

  // RIGHT JOIN or FULL OUTER JOIN: add unmatched right rows
  if (join.joinType === "RIGHT" || join.joinType === "FULL") {
    for (let ri = 0; ri < rightDataset.rows.length; ri++) {
      if (!rightMatched.has(ri)) {
        const rightRow = rightDataset.rows[ri];
        const merged: Record<string, string> = {};
        // Left side columns are empty
        for (const h of leftHeaders) {
          merged[h] = "";
          merged[`${leftAlias}.${h}`] = "";
        }
        for (const h of rightDataset.headers) {
          if (!leftHeaders.includes(h)) {
            merged[h] = rightRow[h] ?? "";
          }
          merged[`${rightAlias}.${h}`] = rightRow[h] ?? "";
        }
        joinedRows.push(merged);
      }
    }
  }

  const allHeaders: string[] = [];
  for (const h of leftHeaders) {
    allHeaders.push(h);
  }
  for (const h of rightDataset.headers) {
    if (!leftHeaders.includes(h)) {
      allHeaders.push(h);
    }
  }

  return { rows: joinedRows, headers: allHeaders, columnTypes: mergedColumnTypes };
}

function executeJoinQuery(
  parsed: ParsedSQL,
  datasets: Map<string, { rows: Record<string, string>[]; headers: string[]; columnTypes: Record<string, string> }>,
  startTime: number
): QueryResult {
  const allJoins = parsed.joins;

  const leftDataset = datasets.get(parsed.table);
  if (!leftDataset) {
    const available = Array.from(datasets.keys()).join(", ");
    throw new SQLError(
      `Table '${parsed.table}' not found. Available tables: ${available || "none"}`
    );
  }

  // Start with the left dataset
  let currentRows = leftDataset.rows;
  let currentHeaders = leftDataset.headers;
  let currentColumnTypes = leftDataset.columnTypes;
  let currentAlias = parsed.tableAlias || parsed.table;

  // Sequentially join each table
  for (const join of allJoins) {
    const rightDataset = datasets.get(join.joinTable);
    if (!rightDataset) {
      const available = Array.from(datasets.keys()).join(", ");
      throw new SQLError(
        `Table '${join.joinTable}' not found. Available tables: ${available || "none"}`
      );
    }

    const rightAlias = join.joinAlias || join.joinTable;
    const result = performSingleJoin(
      currentRows, currentHeaders, currentColumnTypes, currentAlias,
      rightDataset, rightAlias, join,
    );
    currentRows = result.rows;
    currentHeaders = result.headers;
    currentColumnTypes = result.columnTypes;
    // After first join, the "left alias" concept changes since we're now working with merged rows
    // Keep the original leftAlias for column resolution
  }

  const mergedColumnTypes = currentColumnTypes;
  let joinedRows = currentRows;
  const allHeaders = currentHeaders;

  // Apply WHERE filters
  joinedRows = joinedRows.filter((row) => {
    return parsed.where.every((cond) => {
      const colName = cond.column;
      const cellValue = row[colName] ?? "";
      const colType = mergedColumnTypes[colName];
      return evaluateCondition(cellValue, cond, colType);
    });
  });

  // GROUP BY + aggregates on joined data
  if (parsed.groupBy.length > 0 || parsed.aggregates.length > 0) {
    return executeGroupBy(parsed, joinedRows, allHeaders, mergedColumnTypes, startTime);
  }

  // Apply ORDER BY
  if (parsed.orderBy.length > 0) {
    joinedRows = [...joinedRows].sort((a, b) => {
      for (const ob of parsed.orderBy) {
        const aVal = a[ob.column] ?? "";
        const bVal = b[ob.column] ?? "";
        let cmp: number;
        const colType = mergedColumnTypes[ob.column];
        if (colType === "number") {
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
    joinedRows = joinedRows.slice(0, parsed.limit);
  }

  // Select columns
  let resultColumns: string[];
  if (parsed.selectAll || (parsed.columns.length === 0 && parsed.aggregates.length === 0)) {
    resultColumns = allHeaders;
  } else {
    resultColumns = parsed.columns;
  }

  // Handle aggregate-only queries (no GROUP BY)
  if (parsed.aggregates.length > 0 && parsed.groupBy.length === 0) {
    const resultRow: Record<string, string | number> = {};
    for (const agg of parsed.aggregates) {
      const aggCol = agg.column;
      if (agg.func === "COUNT") {
        resultRow[agg.alias] = joinedRows.length;
      } else {
        const values = joinedRows
          .map((r) => Number(r[aggCol]))
          .filter((v) => !isNaN(v));
        if (values.length === 0) {
          resultRow[agg.alias] = 0;
        } else {
          switch (agg.func) {
            case "SUM": resultRow[agg.alias] = Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100; break;
            case "AVG": resultRow[agg.alias] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100; break;
            case "MIN": resultRow[agg.alias] = Math.min(...values); break;
            case "MAX": resultRow[agg.alias] = Math.max(...values); break;
          }
        }
      }
    }
    for (const col of parsed.columns) {
      resultRow[col] = joinedRows.length > 0 ? (joinedRows[0][col] ?? "") : "";
    }
    return {
      columns: [...parsed.columns, ...parsed.aggregates.map((a) => a.alias)],
      rows: [resultRow],
      rowCount: 1,
      executionTime: Math.round((performance.now() - startTime) * 100) / 100,
    };
  }

  // Add CASE WHEN columns
  for (const cw of parsed.caseWhens) {
    if (!resultColumns.includes(cw.alias)) resultColumns.push(cw.alias);
  }

  let resultRows = joinedRows.map((row) => {
    const result: Record<string, string | number> = {};
    for (const col of resultColumns) {
      result[col] = row[col] ?? "";
    }
    // Evaluate CASE WHEN
    for (const cw of parsed.caseWhens) {
      result[cw.alias] = evaluateCaseWhen(cw, row, mergedColumnTypes);
    }
    return result;
  });

  // Apply DISTINCT
  if (parsed.distinct) {
    const seen = new Set<string>();
    resultRows = resultRows.filter(row => {
      const key = resultColumns.map(c => String(row[c] ?? "")).join("|||");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

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
  // Determine group key: may include function expressions like YEAR(Date)
  const groupKeyExprs = parsed.groupBy;

  // Group rows
  const groups = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    const keyParts: string[] = [];
    for (const expr of groupKeyExprs) {
      if (headers.includes(expr)) {
        keyParts.push(row[expr] ?? "");
      } else {
        // Evaluate expression (e.g. YEAR(Date))
        keyParts.push(String(evalScalarExpr(expr, row, columnTypes)));
      }
    }
    const key = keyParts.join("|||");
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  // Build result column aliases
  const aggAliases = parsed.aggregates.map(a => a.alias);

  // Group by column display names
  const groupColNames: string[] = groupKeyExprs.map(expr => {
    // Check if there's a column alias for this expression
    const aliasEntry = parsed.columnAliases.find(a => a.expression === expr);
    if (aliasEntry) return aliasEntry.alias;
    return expr;
  });

  const resultColumns = [...groupColNames, ...aggAliases];

  // Add CASE WHEN columns
  for (const cw of parsed.caseWhens) {
    resultColumns.push(cw.alias);
  }

  const resultRows: Record<string, string | number>[] = [];

  for (const [, groupRows] of groups) {
    const result: Record<string, string | number> = {};

    // Add group by column values
    for (let i = 0; i < groupKeyExprs.length; i++) {
      const expr = groupKeyExprs[i];
      const displayName = groupColNames[i];
      if (headers.includes(expr)) {
        result[displayName] = groupRows[0][expr] ?? "";
      } else {
        result[displayName] = evalScalarExpr(expr, groupRows[0], columnTypes);
      }
    }

    // Compute aggregates
    for (const agg of parsed.aggregates) {
      result[agg.alias] = computeAggregate(agg, groupRows);
    }

    // Evaluate CASE WHEN
    for (const cw of parsed.caseWhens) {
      result[cw.alias] = evaluateCaseWhen(cw, groupRows[0], columnTypes);
    }

    resultRows.push(result);
  }

  // Apply HAVING filters
  let filteredResults = resultRows;
  if (parsed.having.length > 0) {
    filteredResults = resultRows.filter(row => {
      return parsed.having.every(hc => {
        // Evaluate the HAVING expression
        let val: number | undefined;

        // Direct match on row key (e.g. the alias or bare column)
        if (row[hc.expression] !== undefined) {
          val = Number(row[hc.expression]);
        }

        // Try to match as aggregate expression like SUM(Revenue)
        if (val === undefined) {
          const aggMatch = hc.expression.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(\*|[\w.]+)\s*\)$/i);
          if (aggMatch) {
            // Default alias form: SUM(Revenue)
            const defaultAlias = `${aggMatch[1].toUpperCase()}(${aggMatch[2]})`;
            if (row[defaultAlias] !== undefined) {
              val = Number(row[defaultAlias]);
            } else {
              // Check if any aggregate with this func+col was stored under a custom alias
              const func = aggMatch[1].toUpperCase();
              const col = aggMatch[2];
              const matchedAgg = parsed.aggregates.find(
                a => a.func === func && a.column === col
              );
              if (matchedAgg && row[matchedAgg.alias] !== undefined) {
                val = Number(row[matchedAgg.alias]);
              }
            }
          }
        }

        if (val === undefined) {
          val = Number(row[hc.expression] ?? 0);
        }

        return compareNumbers(val, hc.value, hc.operator);
      });
    });
  }

  // Apply ORDER BY to grouped results (resolve aliases)
  if (parsed.orderBy.length > 0) {
    // Build alias map for resolution
    const grpAliasMap = new Map<string, string>();
    for (const a of parsed.columnAliases) {
      grpAliasMap.set(a.alias, a.expression);
    }
    for (const agg of parsed.aggregates) {
      grpAliasMap.set(agg.alias, agg.alias); // aggregate aliases resolve to themselves
    }
    filteredResults.sort((a, b) => {
      for (const ob of parsed.orderBy) {
        // Check if ob.column is an alias for an aggregate or column
        let resolvedCol = ob.column;
        // Try direct match first on result keys
        const aVal = a[ob.column] ?? a[resolvedCol] ?? "";
        const bVal = b[ob.column] ?? b[resolvedCol] ?? "";
        let cmp: number;
        const isNumericCol = columnTypes[ob.column] === "number" ||
          parsed.aggregates.some((ag) => ag.alias === ob.column) ||
          grpAliasMap.has(ob.column);
        if (isNumericCol || (!isNaN(Number(aVal)) && !isNaN(Number(bVal)) && String(aVal) !== "" && String(bVal) !== "")) {
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
  const limited = parsed.limit !== null ? filteredResults.slice(0, parsed.limit) : filteredResults;

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
  let result: boolean;

  // IS NULL
  if (cond.operator === "IS NULL") {
    return cellValue === "" || cellValue === "null" || cellValue === "NULL" || cellValue === undefined || cellValue === null;
  }

  // IS NOT NULL
  if (cond.operator === "IS NOT NULL") {
    return cellValue !== "" && cellValue !== "null" && cellValue !== "NULL" && cellValue !== undefined && cellValue !== null;
  }

  // IN
  if (cond.operator === "IN") {
    const vals = cond.value as string[];
    result = vals.some(v => {
      if (!isNaN(Number(v)) && !isNaN(Number(cellValue))) {
        return Number(cellValue) === Number(v);
      }
      return cellValue === v;
    });
    return cond.negated ? !result : result;
  }

  // BETWEEN
  if (cond.operator === "BETWEEN") {
    const [low, high] = cond.value as [number, number];
    const numCell = Number(cellValue);
    result = numCell >= low && numCell <= high;
    return cond.negated ? !result : result;
  }

  if (cond.operator === "LIKE") {
    const condValue = cond.value;
    const pattern = String(condValue)
      .replace(/%/g, ".*")
      .replace(/_/g, ".");
    const regex = new RegExp(`^${pattern}$`, "i");
    result = regex.test(cellValue);
    return cond.negated ? !result : result;
  }

  const condValue = cond.value;

  // For numeric comparisons
  if (columnType === "number" || (typeof condValue === "number")) {
    const numCell = Number(cellValue);
    const numCond = Number(condValue);
    if (isNaN(numCell) || isNaN(numCond)) {
      result = compareStrings(cellValue, String(condValue), cond.operator as "=" | "!=" | ">" | "<" | ">=" | "<=");
    } else {
      switch (cond.operator) {
        case "=": result = numCell === numCond; break;
        case "!=": result = numCell !== numCond; break;
        case ">": result = numCell > numCond; break;
        case "<": result = numCell < numCond; break;
        case ">=": result = numCell >= numCond; break;
        case "<=": result = numCell <= numCond; break;
        default: result = false;
      }
    }
    return cond.negated ? !result : result;
  }

  result = compareStrings(cellValue, String(condValue), cond.operator as "=" | "!=" | ">" | "<" | ">=" | "<=");
  return cond.negated ? !result : result;
}

function compareStrings(a: string, b: string, op: "=" | "!=" | ">" | "<" | ">=" | "<="): boolean {
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

function compareNumbers(a: number, b: number, op: string): boolean {
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

/** Evaluate a CASE WHEN expression against a single row */
function evaluateCaseWhen(
  cw: CaseWhen,
  row: Record<string, string>,
  columnTypes: Record<string, string>
): string | number {
  for (const c of cw.conditions) {
    // Parse the WHEN condition
    // Support: column > value, column = value, etc.
    if (evaluateSimpleCondition(c.when, row, columnTypes)) {
      // Try numeric
      if (!isNaN(Number(c.then)) && c.then !== "") return Number(c.then);
      return c.then;
    }
  }
  if (cw.elseValue !== null) {
    if (!isNaN(Number(cw.elseValue)) && cw.elseValue !== "") return Number(cw.elseValue);
    return cw.elseValue;
  }
  return "";
}

/** Evaluate a simple condition string like "Revenue > 200000" against a row */
function evaluateSimpleCondition(
  condStr: string,
  row: Record<string, string>,
  columnTypes: Record<string, string>
): boolean {
  const operators = ["!=", ">=", "<=", ">", "<", "=", "LIKE"];
  for (const op of operators) {
    const regex = op === "LIKE"
      ? new RegExp(`^([\\w.]+)\\s+LIKE\\s+(.+)$`, "i")
      : new RegExp(`^([\\w.]+)\\s*${escapeRegex(op)}\\s*(.+)$`);
    const match = condStr.match(regex);
    if (match) {
      const col = match[1].trim();
      let val: string | number = extractStringValue(match[2].trim());
      if (!isNaN(Number(val)) && val !== "") val = Number(val);
      const cellValue = row[col] ?? "";
      const cond: WhereCondition = { column: col, operator: op as WhereCondition["operator"], value: val };
      return evaluateCondition(cellValue, cond, columnTypes[col]);
    }
  }
  return false;
}

/** Apply window functions to result rows */
function applyWindowFunctions(
  windowFuncs: WindowFunction[],
  resultRows: Record<string, string | number>[],
  sourceRows: Record<string, string>[],
  columnTypes: Record<string, string>
): Record<string, string | number>[] {
  for (const wf of windowFuncs) {
    // Partition the rows
    const partitions = new Map<string, number[]>();
    for (let i = 0; i < resultRows.length; i++) {
      const key = wf.partitionBy ? String(resultRows[i][wf.partitionBy] ?? sourceRows[i]?.[wf.partitionBy] ?? "") : "__all__";
      if (!partitions.has(key)) partitions.set(key, []);
      partitions.get(key)!.push(i);
    }

    for (const [, indices] of partitions) {
      // Sort indices by the ORDER BY column
      const sorted = [...indices].sort((a, b) => {
        const aRow = resultRows[a];
        const bRow = resultRows[b];
        const aVal = aRow[wf.orderByCol] ?? sourceRows[a]?.[wf.orderByCol] ?? "";
        const bVal = bRow[wf.orderByCol] ?? sourceRows[b]?.[wf.orderByCol] ?? "";
        let cmp: number;
        if (columnTypes[wf.orderByCol] === "number" || (!isNaN(Number(aVal)) && !isNaN(Number(bVal)) && aVal !== "" && bVal !== "")) {
          cmp = Number(aVal) - Number(bVal);
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }
        return wf.orderByDir === "DESC" ? -cmp : cmp;
      });

      switch (wf.func) {
        case "ROW_NUMBER": {
          for (let rank = 0; rank < sorted.length; rank++) {
            resultRows[sorted[rank]][wf.alias] = rank + 1;
          }
          break;
        }
        case "RANK": {
          let currentRank = 1;
          for (let j = 0; j < sorted.length; j++) {
            if (j > 0) {
              const prevVal = resultRows[sorted[j - 1]][wf.orderByCol] ?? sourceRows[sorted[j - 1]]?.[wf.orderByCol] ?? "";
              const curVal = resultRows[sorted[j]][wf.orderByCol] ?? sourceRows[sorted[j]]?.[wf.orderByCol] ?? "";
              if (String(prevVal) !== String(curVal)) {
                currentRank = j + 1;
              }
            }
            resultRows[sorted[j]][wf.alias] = currentRank;
          }
          break;
        }
        case "LAG": {
          for (let j = 0; j < sorted.length; j++) {
            if (j < wf.offset) {
              resultRows[sorted[j]][wf.alias] = "";
            } else {
              const prevIdx = sorted[j - wf.offset];
              const val = resultRows[prevIdx][wf.column] ?? sourceRows[prevIdx]?.[wf.column] ?? "";
              resultRows[sorted[j]][wf.alias] = val;
            }
          }
          break;
        }
        case "LEAD": {
          for (let j = 0; j < sorted.length; j++) {
            if (j + wf.offset >= sorted.length) {
              resultRows[sorted[j]][wf.alias] = "";
            } else {
              const nextIdx = sorted[j + wf.offset];
              const val = resultRows[nextIdx][wf.column] ?? sourceRows[nextIdx]?.[wf.column] ?? "";
              resultRows[sorted[j]][wf.alias] = val;
            }
          }
          break;
        }
        case "SUM": {
          let runningSum = 0;
          for (let j = 0; j < sorted.length; j++) {
            const val = Number(resultRows[sorted[j]][wf.column] ?? sourceRows[sorted[j]]?.[wf.column] ?? 0);
            runningSum += isNaN(val) ? 0 : val;
            resultRows[sorted[j]][wf.alias] = Math.round(runningSum * 100) / 100;
          }
          break;
        }
        case "AVG": {
          let runningSum = 0;
          for (let j = 0; j < sorted.length; j++) {
            const val = Number(resultRows[sorted[j]][wf.column] ?? sourceRows[sorted[j]]?.[wf.column] ?? 0);
            runningSum += isNaN(val) ? 0 : val;
            resultRows[sorted[j]][wf.alias] = Math.round((runningSum / (j + 1)) * 100) / 100;
          }
          break;
        }
      }
    }
  }
  return resultRows;
}
