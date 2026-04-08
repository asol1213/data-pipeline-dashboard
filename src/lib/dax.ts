// DAX-like formula engine with time intelligence

export interface DAXContext {
  data: Record<string, string>[];
  headers: string[];
  columnTypes: Record<string, string>;
  allDatasets?: Map<string, { data: Record<string, string>[]; headers: string[] }>;
}

export class DAXError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DAXError";
  }
}

// ── Tokenizer ──

interface DAXToken {
  type: "number" | "string" | "identifier" | "operator" | "paren" | "comma" | "equals";
  value: string;
}

function tokenizeDAX(expr: string): DAXToken[] {
  const tokens: DAXToken[] = [];
  let i = 0;

  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue; }

    // Numbers
    if (/\d/.test(expr[i]) || (expr[i] === "." && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let num = "";
      if (expr[i] === "-") { num += expr[i]; i++; }
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === ".")) {
        num += expr[i]; i++;
      }
      tokens.push({ type: "number", value: num });
      continue;
    }

    // Negative numbers: if we see a '-' that follows '(' or ',' or start or '='
    if (expr[i] === "-") {
      const prev = tokens[tokens.length - 1];
      if (!prev || prev.type === "paren" && prev.value === "(" || prev.type === "comma" || prev.type === "equals" || prev.type === "operator") {
        let num = "-";
        i++;
        while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === ".")) {
          num += expr[i]; i++;
        }
        if (num.length > 1) {
          tokens.push({ type: "number", value: num });
          continue;
        }
        // Not a number, treat as operator
        tokens.push({ type: "operator", value: "-" });
        continue;
      }
    }

    // String literals
    if (expr[i] === '"' || expr[i] === "'") {
      const quote = expr[i];
      i++;
      let str = "";
      while (i < expr.length && expr[i] !== quote) {
        str += expr[i]; i++;
      }
      if (i < expr.length) i++;
      tokens.push({ type: "string", value: str });
      continue;
    }

    // Operators
    if ("+-*/".includes(expr[i])) {
      tokens.push({ type: "operator", value: expr[i] });
      i++;
      continue;
    }

    if (expr[i] === "=") {
      tokens.push({ type: "equals", value: "=" });
      i++;
      continue;
    }

    if ("><".includes(expr[i])) {
      if (i + 1 < expr.length && expr[i + 1] === "=") {
        tokens.push({ type: "operator", value: expr[i] + "=" });
        i += 2;
      } else {
        tokens.push({ type: "operator", value: expr[i] });
        i++;
      }
      continue;
    }

    if ("()".includes(expr[i])) {
      tokens.push({ type: "paren", value: expr[i] });
      i++;
      continue;
    }

    if (expr[i] === ",") {
      tokens.push({ type: "comma", value: "," });
      i++;
      continue;
    }

    // Identifiers (column names, function names, keywords)
    if (/[a-zA-Z_]/.test(expr[i])) {
      let id = "";
      while (i < expr.length && /[a-zA-Z0-9_%]/.test(expr[i])) {
        id += expr[i]; i++;
      }
      tokens.push({ type: "identifier", value: id });
      continue;
    }

    throw new DAXError(`Unexpected character: '${expr[i]}'`);
  }

  return tokens;
}

// ── Parser ──

interface DAXNode {
  type: "call" | "column" | "number" | "string" | "binary" | "filter";
  name?: string;
  args?: DAXNode[];
  value?: number | string;
  left?: DAXNode;
  right?: DAXNode;
  operator?: string;
  filterColumn?: string;
  filterValue?: string;
}

class DAXParser {
  private tokens: DAXToken[];
  private pos: number;

  constructor(tokens: DAXToken[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  private peek(): DAXToken | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private consume(): DAXToken {
    if (this.pos >= this.tokens.length) {
      throw new DAXError("Unexpected end of expression");
    }
    return this.tokens[this.pos++];
  }

  parse(): DAXNode {
    const node = this.parseExpr();
    if (this.pos < this.tokens.length) {
      throw new DAXError(`Unexpected token: '${this.tokens[this.pos].value}'`);
    }
    return node;
  }

  private parseExpr(): DAXNode {
    let left = this.parseTerm();

    while (this.peek()?.type === "operator" && (this.peek()!.value === "+" || this.peek()!.value === "-")) {
      const op = this.consume().value;
      const right = this.parseTerm();
      left = { type: "binary", operator: op, left, right };
    }
    return left;
  }

  private parseTerm(): DAXNode {
    let left = this.parsePrimary();

    while (this.peek()?.type === "operator" && (this.peek()!.value === "*" || this.peek()!.value === "/")) {
      const op = this.consume().value;
      const right = this.parsePrimary();
      left = { type: "binary", operator: op, left, right };
    }
    return left;
  }

  private parsePrimary(): DAXNode {
    const token = this.peek();
    if (!token) throw new DAXError("Unexpected end of expression");

    // Number
    if (token.type === "number") {
      this.consume();
      return { type: "number", value: parseFloat(token.value) };
    }

    // String
    if (token.type === "string") {
      this.consume();
      return { type: "string", value: token.value };
    }

    // Parenthesized expression
    if (token.type === "paren" && token.value === "(") {
      this.consume();
      const inner = this.parseExpr();
      if (this.peek()?.type !== "paren" || this.peek()?.value !== ")") {
        throw new DAXError("Expected ')'");
      }
      this.consume();
      return inner;
    }

    // Identifier: function call or column reference
    if (token.type === "identifier") {
      const name = token.value;

      // Check if next is '(' => function call
      if (this.pos + 1 < this.tokens.length && this.tokens[this.pos + 1].type === "paren" && this.tokens[this.pos + 1].value === "(") {
        this.consume(); // name
        this.consume(); // (
        const args: DAXNode[] = [];

        // Parse arguments
        if (!(this.peek()?.type === "paren" && this.peek()?.value === ")")) {
          args.push(this.parseArgument());
          while (this.peek()?.type === "comma") {
            this.consume();
            args.push(this.parseArgument());
          }
        }

        if (this.peek()?.type !== "paren" || this.peek()?.value !== ")") {
          throw new DAXError(`Expected ')' after arguments to ${name}`);
        }
        this.consume(); // )

        return { type: "call", name: name.toUpperCase(), args };
      }

      // Plain column reference
      this.consume();
      return { type: "column", name };
    }

    throw new DAXError(`Unexpected token: '${token.value}'`);
  }

  private parseArgument(): DAXNode {
    // Check for filter-style argument: Column = "Value"
    if (this.peek()?.type === "identifier") {
      const nextIdx = this.pos + 1;
      if (nextIdx < this.tokens.length && this.tokens[nextIdx].type === "equals") {
        const colToken = this.consume();
        this.consume(); // =
        const valToken = this.consume();
        const filterValue = valToken.type === "string" ? valToken.value : valToken.value;
        return { type: "filter", filterColumn: colToken.value, filterValue: String(filterValue) };
      }
    }
    return this.parseExpr();
  }
}

// ── Date helpers ──

function parseDate(dateStr: string): Date | null {
  // Support YYYY-MM-DD format
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  return null;
}

function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

function findDateRange(data: Record<string, string>[], dateColumn: string): { min: Date; max: Date } | null {
  let min: Date | null = null;
  let max: Date | null = null;
  for (const row of data) {
    const d = parseDate(row[dateColumn]);
    if (!d) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  if (!min || !max) return null;
  return { min, max };
}

// ── Aggregation helpers ──

function getColumnValues(data: Record<string, string>[], column: string): number[] {
  return data
    .map((r) => parseFloat(r[column]))
    .filter((v) => !isNaN(v));
}

function sumValues(values: number[]): number {
  return Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
}

function applyAggregation(funcName: string, data: Record<string, string>[], column: string): number {
  const values = getColumnValues(data, column);
  if (values.length === 0) return 0;

  switch (funcName) {
    case "SUM": return sumValues(values);
    case "AVERAGE": return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
    case "MIN": return Math.min(...values);
    case "MAX": return Math.max(...values);
    case "COUNT": return values.length;
    default: return 0;
  }
}

// ── Evaluator ──

function evalNode(node: DAXNode, ctx: DAXContext): number | string {
  switch (node.type) {
    case "number":
      return node.value as number;

    case "string":
      return node.value as string;

    case "column": {
      // For column in aggregation context, this shouldn't happen at the top level
      throw new DAXError(`Column reference '${node.name}' cannot be evaluated without an aggregation function`);
    }

    case "binary": {
      const left = evalNode(node.left!, ctx);
      const right = evalNode(node.right!, ctx);
      const l = typeof left === "number" ? left : parseFloat(left as string);
      const r = typeof right === "number" ? right : parseFloat(right as string);
      if (isNaN(l) || isNaN(r)) {
        throw new DAXError(`Cannot perform arithmetic on non-numeric values`);
      }
      switch (node.operator) {
        case "+": return Math.round((l + r) * 100) / 100;
        case "-": return Math.round((l - r) * 100) / 100;
        case "*": return Math.round((l * r) * 100) / 100;
        case "/":
          if (r === 0) throw new DAXError("Division by zero");
          return Math.round((l / r) * 100) / 100;
        default:
          throw new DAXError(`Unknown operator: ${node.operator}`);
      }
    }

    case "call":
      return evalCall(node, ctx);

    default:
      throw new DAXError(`Unknown node type: ${node.type}`);
  }
}

function resolveAggColumn(node: DAXNode): string {
  if (node.type === "column") return node.name!;
  throw new DAXError("Expected a column reference");
}

function resolveInnerAgg(node: DAXNode, data: Record<string, string>[]): number {
  // If node is a call to an aggregation function, evaluate it inline
  if (node.type === "call") {
    const name = node.name!;
    if (["SUM", "AVERAGE", "COUNT", "MIN", "MAX"].includes(name)) {
      if (!node.args || node.args.length === 0) {
        throw new DAXError(`${name} requires a column argument`);
      }
      const col = resolveAggColumn(node.args[0]);
      return applyAggregation(name, data, col);
    }
  }
  throw new DAXError("Expected an aggregation function like SUM(column)");
}

function evalCall(node: DAXNode, ctx: DAXContext): number | string {
  const name = node.name!;
  const args = node.args || [];

  switch (name) {
    // ── Basic Aggregations ──
    case "SUM": {
      if (args.length !== 1) throw new DAXError("SUM requires exactly 1 argument");
      const col = resolveAggColumn(args[0]);
      return applyAggregation("SUM", ctx.data, col);
    }

    case "AVERAGE": {
      if (args.length !== 1) throw new DAXError("AVERAGE requires exactly 1 argument");
      const col = resolveAggColumn(args[0]);
      return applyAggregation("AVERAGE", ctx.data, col);
    }

    case "COUNT": {
      if (args.length !== 1) throw new DAXError("COUNT requires exactly 1 argument");
      const col = resolveAggColumn(args[0]);
      const count = ctx.data.filter((r) => r[col] !== undefined && r[col] !== null && r[col] !== "").length;
      return count;
    }

    case "COUNTROWS": {
      return ctx.data.length;
    }

    case "MIN": {
      if (args.length !== 1) throw new DAXError("MIN requires exactly 1 argument");
      const col = resolveAggColumn(args[0]);
      return applyAggregation("MIN", ctx.data, col);
    }

    case "MAX": {
      if (args.length !== 1) throw new DAXError("MAX requires exactly 1 argument");
      const col = resolveAggColumn(args[0]);
      return applyAggregation("MAX", ctx.data, col);
    }

    case "DISTINCTCOUNT": {
      if (args.length !== 1) throw new DAXError("DISTINCTCOUNT requires exactly 1 argument");
      const col = resolveAggColumn(args[0]);
      const unique = new Set(ctx.data.map((r) => r[col]).filter((v) => v !== undefined && v !== null && v !== ""));
      return unique.size;
    }

    // ── Time Intelligence ──
    case "TOTALYTD": {
      if (args.length < 2) throw new DAXError("TOTALYTD requires an aggregation and a date column");
      const dateCol = resolveAggColumn(args[1]);
      const range = findDateRange(ctx.data, dateCol);
      if (!range) return 0;
      const yearEnd = range.max.getFullYear();
      const filtered = ctx.data.filter((r) => {
        const d = parseDate(r[dateCol]);
        if (!d) return false;
        return d.getFullYear() === yearEnd && d <= range.max;
      });
      const innerCtx = { ...ctx, data: filtered };
      return resolveInnerAgg(args[0], innerCtx.data);
    }

    case "TOTALQTD": {
      if (args.length < 2) throw new DAXError("TOTALQTD requires an aggregation and a date column");
      const dateCol = resolveAggColumn(args[1]);
      const range = findDateRange(ctx.data, dateCol);
      if (!range) return 0;
      const maxQ = getQuarter(range.max);
      const maxYear = range.max.getFullYear();
      const filtered = ctx.data.filter((r) => {
        const d = parseDate(r[dateCol]);
        if (!d) return false;
        return d.getFullYear() === maxYear && getQuarter(d) === maxQ && d <= range.max;
      });
      return resolveInnerAgg(args[0], filtered);
    }

    case "TOTALMTD": {
      if (args.length < 2) throw new DAXError("TOTALMTD requires an aggregation and a date column");
      const dateCol = resolveAggColumn(args[1]);
      const range = findDateRange(ctx.data, dateCol);
      if (!range) return 0;
      const maxMonth = range.max.getMonth();
      const maxYear = range.max.getFullYear();
      const filtered = ctx.data.filter((r) => {
        const d = parseDate(r[dateCol]);
        if (!d) return false;
        return d.getFullYear() === maxYear && d.getMonth() === maxMonth && d <= range.max;
      });
      return resolveInnerAgg(args[0], filtered);
    }

    case "SAMEPERIODLASTYEAR": {
      if (args.length < 2) throw new DAXError("SAMEPERIODLASTYEAR requires an aggregation and a date column");
      const dateCol = resolveAggColumn(args[1]);
      const range = findDateRange(ctx.data, dateCol);
      if (!range) return 0;
      const targetYear = range.max.getFullYear() - 1;
      const filtered = ctx.data.filter((r) => {
        const d = parseDate(r[dateCol]);
        if (!d) return false;
        return d.getFullYear() === targetYear;
      });
      return resolveInnerAgg(args[0], filtered);
    }

    case "DATEADD": {
      // DATEADD(SUM(Revenue), Date, -1, MONTH)
      if (args.length < 4) throw new DAXError("DATEADD requires: aggregation, date column, offset, interval");
      const dateCol = resolveAggColumn(args[1]);
      const offset = args[2].type === "number" ? (args[2].value as number) : parseInt(String(args[2].value));
      const intervalNode = args[3];
      const interval = intervalNode.type === "column" ? intervalNode.name! : String(intervalNode.value);

      const range = findDateRange(ctx.data, dateCol);
      if (!range) return 0;

      const filtered = ctx.data.filter((r) => {
        const d = parseDate(r[dateCol]);
        if (!d) return false;
        const shifted = new Date(d);
        switch (interval.toUpperCase()) {
          case "MONTH":
            shifted.setMonth(shifted.getMonth() - offset);
            break;
          case "YEAR":
            shifted.setFullYear(shifted.getFullYear() - offset);
            break;
          case "QUARTER":
            shifted.setMonth(shifted.getMonth() - offset * 3);
            break;
          default:
            shifted.setDate(shifted.getDate() - offset);
        }
        return shifted >= range.min && shifted <= range.max;
      });
      return resolveInnerAgg(args[0], filtered);
    }

    // ── CALCULATE ──
    case "CALCULATE": {
      if (args.length < 2) throw new DAXError("CALCULATE requires an aggregation and at least one filter");
      // Apply all filter arguments
      let filteredData = [...ctx.data];
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.type === "filter") {
          const col = arg.filterColumn!;
          const val = arg.filterValue!;
          filteredData = filteredData.filter((r) => r[col] === val);
        } else {
          throw new DAXError("CALCULATE filter arguments must be in the form: Column = \"Value\"");
        }
      }
      return resolveInnerAgg(args[0], filteredData);
    }

    // ── Logical ──
    case "IF": {
      if (args.length !== 3) throw new DAXError("IF requires exactly 3 arguments");
      const condition = evalNode(args[0], ctx);
      const isTruthy = typeof condition === "number" ? condition !== 0 : condition !== "";
      return isTruthy ? evalNode(args[1], ctx) : evalNode(args[2], ctx);
    }

    case "SWITCH": {
      if (args.length < 3) throw new DAXError("SWITCH requires at least 3 arguments");
      const switchVal = evalNode(args[0], ctx);
      // pairs of (match, result), optional default at end
      for (let i = 1; i < args.length - 1; i += 2) {
        const matchVal = evalNode(args[i], ctx);
        if (String(switchVal) === String(matchVal)) {
          return evalNode(args[i + 1], ctx);
        }
      }
      // If odd number of remaining args after value, last is default
      if ((args.length - 1) % 2 === 1) {
        return evalNode(args[args.length - 1], ctx);
      }
      return "";
    }

    // ── Math ──
    case "DIVIDE": {
      if (args.length < 2 || args.length > 3) throw new DAXError("DIVIDE requires 2 or 3 arguments");
      const numerator = evalNode(args[0], ctx);
      const denominator = evalNode(args[1], ctx);
      const num = typeof numerator === "number" ? numerator : parseFloat(numerator as string);
      const den = typeof denominator === "number" ? denominator : parseFloat(denominator as string);
      if (den === 0 || isNaN(den)) {
        if (args.length === 3) return evalNode(args[2], ctx);
        return 0;
      }
      return Math.round((num / den) * 100) / 100;
    }

    case "ABS": {
      if (args.length !== 1) throw new DAXError("ABS requires exactly 1 argument");
      const val = evalNode(args[0], ctx);
      const num = typeof val === "number" ? val : parseFloat(val as string);
      if (isNaN(num)) throw new DAXError("ABS requires a numeric argument");
      return Math.abs(num);
    }

    case "ROUND": {
      if (args.length < 1 || args.length > 2) throw new DAXError("ROUND requires 1 or 2 arguments");
      const val = evalNode(args[0], ctx);
      const num = typeof val === "number" ? val : parseFloat(val as string);
      if (isNaN(num)) throw new DAXError("ROUND requires a numeric argument");
      const decimals = args.length > 1 ? Number(evalNode(args[1], ctx)) : 0;
      const factor = Math.pow(10, decimals);
      return Math.round(num * factor) / factor;
    }

    default:
      throw new DAXError(`Unknown DAX function: ${name}`);
  }
}

// ── Public API ──

export function evaluateDAX(expression: string, context: DAXContext): number | string {
  if (!expression || !expression.trim()) {
    throw new DAXError("Expression cannot be empty");
  }

  const tokens = tokenizeDAX(expression.trim());
  if (tokens.length === 0) {
    throw new DAXError("Expression cannot be empty");
  }

  const parser = new DAXParser(tokens);
  const ast = parser.parse();
  return evalNode(ast, context);
}
