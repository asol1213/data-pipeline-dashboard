// Cell formula engine for spreadsheet cells
// Supports: =A1+B1, =SUM(C1:C10), =AVERAGE(D1:D5), =IF(E1>100,"High","Low"), etc.

export interface CellRef {
  col: number;
  row: number;
}

export interface CellRange {
  start: CellRef;
  end: CellRef;
}

export class CellFormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CellFormulaError";
  }
}

/** Parse a cell reference like "A1" → {col:0, row:0} */
export function parseCellRef(ref: string): CellRef {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) {
    throw new CellFormulaError(`Invalid cell reference: '${ref}'`);
  }
  const colStr = match[1].toUpperCase();
  const rowStr = match[2];

  // Convert column letters to 0-based index (A=0, B=1, ..., Z=25)
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col -= 1; // 0-based

  const row = parseInt(rowStr, 10) - 1; // 0-based
  if (row < 0) {
    throw new CellFormulaError(`Invalid row in cell reference: '${ref}'`);
  }

  return { col, row };
}

/** Parse a cell range like "A1:A10" */
export function parseCellRange(range: string): CellRange {
  const parts = range.split(":");
  if (parts.length !== 2) {
    throw new CellFormulaError(`Invalid cell range: '${range}'`);
  }
  return {
    start: parseCellRef(parts[0].trim()),
    end: parseCellRef(parts[1].trim()),
  };
}

/** Get the value at a cell reference from the data grid */
function getCellValue(ref: CellRef, data: string[][], headers: string[]): number | string {
  if (ref.col < 0 || ref.col >= headers.length) {
    throw new CellFormulaError(`Column index ${ref.col} out of range (0-${headers.length - 1})`);
  }
  if (ref.row < 0 || ref.row >= data.length) {
    throw new CellFormulaError(`Row index ${ref.row} out of range (0-${data.length - 1})`);
  }
  const val = data[ref.row][ref.col];
  if (val === undefined || val === null || val === "") return 0;
  const num = Number(val);
  return isNaN(num) ? val : num;
}

/** Get all values in a range */
function getRangeValues(range: CellRange, data: string[][], headers: string[]): (number | string)[] {
  const values: (number | string)[] = [];
  const minRow = Math.min(range.start.row, range.end.row);
  const maxRow = Math.max(range.start.row, range.end.row);
  const minCol = Math.min(range.start.col, range.end.col);
  const maxCol = Math.max(range.start.col, range.end.col);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      values.push(getCellValue({ col: c, row: r }, data, headers));
    }
  }
  return values;
}

/** Get numeric values from a range, filtering out strings */
function getNumericRangeValues(range: CellRange, data: string[][], headers: string[]): number[] {
  return getRangeValues(range, data, headers)
    .map(v => typeof v === "number" ? v : Number(v))
    .filter(v => !isNaN(v));
}

// Token types for the formula tokenizer
interface FormulaToken {
  type: "number" | "string" | "cellref" | "range" | "function" | "operator" | "paren" | "comma" | "comparison";
  value: string;
}

function tokenizeFormula(formula: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let i = 0;

  while (i < formula.length) {
    // Skip whitespace
    if (/\s/.test(formula[i])) {
      i++;
      continue;
    }

    // String literals in double quotes
    if (formula[i] === '"') {
      i++;
      let str = "";
      while (i < formula.length && formula[i] !== '"') {
        str += formula[i];
        i++;
      }
      if (i < formula.length) i++; // skip closing quote
      tokens.push({ type: "string", value: str });
      continue;
    }

    // Comparison operators (must come before single-char operators)
    if (formula[i] === ">" && i + 1 < formula.length && formula[i + 1] === "=") {
      tokens.push({ type: "comparison", value: ">=" });
      i += 2;
      continue;
    }
    if (formula[i] === "<" && i + 1 < formula.length && formula[i + 1] === "=") {
      tokens.push({ type: "comparison", value: "<=" });
      i += 2;
      continue;
    }
    if (formula[i] === "!" && i + 1 < formula.length && formula[i + 1] === "=") {
      tokens.push({ type: "comparison", value: "!=" });
      i += 2;
      continue;
    }
    if (formula[i] === ">" || formula[i] === "<") {
      tokens.push({ type: "comparison", value: formula[i] });
      i++;
      continue;
    }

    // Arithmetic operators
    if ("+-*/".includes(formula[i])) {
      tokens.push({ type: "operator", value: formula[i] });
      i++;
      continue;
    }

    // Parentheses
    if ("()".includes(formula[i])) {
      tokens.push({ type: "paren", value: formula[i] });
      i++;
      continue;
    }

    // Comma
    if (formula[i] === ",") {
      tokens.push({ type: "comma", value: "," });
      i++;
      continue;
    }

    // Numbers
    if (/\d/.test(formula[i]) || (formula[i] === "." && i + 1 < formula.length && /\d/.test(formula[i + 1]))) {
      let num = "";
      while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === ".")) {
        num += formula[i];
        i++;
      }
      tokens.push({ type: "number", value: num });
      continue;
    }

    // Identifiers: cell refs (A1, B2), ranges (A1:A10), or function names (SUM, AVERAGE)
    if (/[a-zA-Z]/i.test(formula[i])) {
      let id = "";
      while (i < formula.length && /[a-zA-Z0-9_]/i.test(formula[i])) {
        id += formula[i];
        i++;
      }

      // Check if this is a range (A1:A10)
      if (i < formula.length && formula[i] === ":") {
        i++; // skip :
        let end = "";
        while (i < formula.length && /[a-zA-Z0-9]/i.test(formula[i])) {
          end += formula[i];
          i++;
        }
        tokens.push({ type: "range", value: `${id}:${end}` });
        continue;
      }

      // Check if this is a function name (followed by open paren)
      const FUNCTIONS = ["SUM", "AVERAGE", "COUNT", "MIN", "MAX", "IF", "ROUND", "ABS"];
      if (FUNCTIONS.includes(id.toUpperCase())) {
        tokens.push({ type: "function", value: id.toUpperCase() });
        continue;
      }

      // Otherwise it's a cell reference
      if (/^[A-Z]+\d+$/i.test(id)) {
        tokens.push({ type: "cellref", value: id.toUpperCase() });
        continue;
      }

      throw new CellFormulaError(`Unknown identifier: '${id}'`);
    }

    throw new CellFormulaError(`Unexpected character: '${formula[i]}'`);
  }

  return tokens;
}

// AST node types
type ASTNode =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "cellref"; ref: CellRef }
  | { type: "range"; range: CellRange }
  | { type: "binary"; op: string; left: ASTNode; right: ASTNode }
  | { type: "comparison"; op: string; left: ASTNode; right: ASTNode }
  | { type: "unary"; op: string; operand: ASTNode }
  | { type: "function"; name: string; args: ASTNode[] };

class FormulaParser {
  private tokens: FormulaToken[];
  private pos: number;

  constructor(tokens: FormulaToken[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  private peek(): FormulaToken | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private consume(): FormulaToken {
    if (this.pos >= this.tokens.length) {
      throw new CellFormulaError("Unexpected end of formula");
    }
    return this.tokens[this.pos++];
  }

  parse(): ASTNode {
    const node = this.parseComparison();
    if (this.pos < this.tokens.length) {
      throw new CellFormulaError(`Unexpected token: '${this.tokens[this.pos].value}'`);
    }
    return node;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddSub();
    const t = this.peek();
    if (t && t.type === "comparison") {
      this.consume();
      const right = this.parseAddSub();
      return { type: "comparison", op: t.value, left, right };
    }
    return left;
  }

  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();
    while (true) {
      const t = this.peek();
      if (t && t.type === "operator" && (t.value === "+" || t.value === "-")) {
        this.consume();
        const right = this.parseMulDiv();
        left = { type: "binary", op: t.value, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseMulDiv(): ASTNode {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t && t.type === "operator" && (t.value === "*" || t.value === "/")) {
        this.consume();
        const right = this.parseUnary();
        left = { type: "binary", op: t.value, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): ASTNode {
    const t = this.peek();
    if (t && t.type === "operator" && t.value === "-") {
      this.consume();
      const operand = this.parsePrimary();
      return { type: "unary", op: "-", operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const t = this.peek();
    if (!t) {
      throw new CellFormulaError("Unexpected end of formula");
    }

    if (t.type === "number") {
      this.consume();
      return { type: "number", value: parseFloat(t.value) };
    }

    if (t.type === "string") {
      this.consume();
      return { type: "string", value: t.value };
    }

    if (t.type === "cellref") {
      this.consume();
      return { type: "cellref", ref: parseCellRef(t.value) };
    }

    if (t.type === "range") {
      this.consume();
      return { type: "range", range: parseCellRange(t.value) };
    }

    if (t.type === "function") {
      this.consume();
      const name = t.value;
      // Expect open paren
      const openParen = this.consume();
      if (openParen.type !== "paren" || openParen.value !== "(") {
        throw new CellFormulaError(`Expected '(' after function ${name}`);
      }
      const args: ASTNode[] = [];
      // Parse arguments
      if (!(this.peek()?.type === "paren" && this.peek()?.value === ")")) {
        args.push(this.parseComparison());
        while (this.peek()?.type === "comma") {
          this.consume(); // skip comma
          args.push(this.parseComparison());
        }
      }
      const closeParen = this.consume();
      if (closeParen.type !== "paren" || closeParen.value !== ")") {
        throw new CellFormulaError(`Expected ')' after function arguments`);
      }
      return { type: "function", name, args };
    }

    if (t.type === "paren" && t.value === "(") {
      this.consume();
      const inner = this.parseComparison();
      const close = this.consume();
      if (close.type !== "paren" || close.value !== ")") {
        throw new CellFormulaError("Expected ')'");
      }
      return inner;
    }

    throw new CellFormulaError(`Unexpected token: '${t.value}'`);
  }
}

/** Evaluate an AST node */
function evalNode(
  node: ASTNode,
  data: string[][],
  headers: string[],
  evaluating: Set<string>
): number | string {
  switch (node.type) {
    case "number":
      return node.value;

    case "string":
      return node.value;

    case "cellref": {
      const key = `${node.ref.col},${node.ref.row}`;
      if (evaluating.has(key)) {
        throw new CellFormulaError("Circular reference detected");
      }
      // Check if the cell itself contains a formula
      if (node.ref.row >= 0 && node.ref.row < data.length &&
          node.ref.col >= 0 && node.ref.col < (data[node.ref.row]?.length ?? 0)) {
        const cellVal = data[node.ref.row][node.ref.col];
        if (typeof cellVal === "string" && cellVal.startsWith("=")) {
          // Recursively evaluate the formula
          evaluating.add(key);
          const result = evaluateFormulaInternal(cellVal.substring(1), data, headers, evaluating);
          evaluating.delete(key);
          return result;
        }
      }
      return getCellValue(node.ref, data, headers);
    }

    case "range":
      throw new CellFormulaError("Cell range can only be used as a function argument");

    case "unary": {
      const val = evalNode(node.operand, data, headers, evaluating);
      const num = typeof val === "number" ? val : Number(val);
      if (isNaN(num)) throw new CellFormulaError(`Cannot negate non-numeric value: '${val}'`);
      return -num;
    }

    case "binary": {
      const left = evalNode(node.left, data, headers, evaluating);
      const right = evalNode(node.right, data, headers, evaluating);
      const lNum = typeof left === "number" ? left : Number(left);
      const rNum = typeof right === "number" ? right : Number(right);
      if (isNaN(lNum) || isNaN(rNum)) {
        throw new CellFormulaError(`Cannot perform arithmetic on non-numeric values: '${left}' ${node.op} '${right}'`);
      }
      switch (node.op) {
        case "+": return lNum + rNum;
        case "-": return lNum - rNum;
        case "*": return lNum * rNum;
        case "/":
          if (rNum === 0) throw new CellFormulaError("Division by zero");
          return lNum / rNum;
        default:
          throw new CellFormulaError(`Unknown operator: ${node.op}`);
      }
    }

    case "comparison": {
      const left = evalNode(node.left, data, headers, evaluating);
      const right = evalNode(node.right, data, headers, evaluating);
      const lNum = typeof left === "number" ? left : Number(left);
      const rNum = typeof right === "number" ? right : Number(right);
      if (!isNaN(lNum) && !isNaN(rNum)) {
        switch (node.op) {
          case ">": return lNum > rNum ? 1 : 0;
          case "<": return lNum < rNum ? 1 : 0;
          case ">=": return lNum >= rNum ? 1 : 0;
          case "<=": return lNum <= rNum ? 1 : 0;
          case "!=": return lNum !== rNum ? 1 : 0;
          case "=": return lNum === rNum ? 1 : 0;
        }
      }
      // String comparison
      const lStr = String(left);
      const rStr = String(right);
      switch (node.op) {
        case ">": return lStr > rStr ? 1 : 0;
        case "<": return lStr < rStr ? 1 : 0;
        case ">=": return lStr >= rStr ? 1 : 0;
        case "<=": return lStr <= rStr ? 1 : 0;
        case "!=": return lStr !== rStr ? 1 : 0;
        case "=": return lStr === rStr ? 1 : 0;
        default: return 0;
      }
    }

    case "function": {
      return evalFunction(node.name, node.args, data, headers, evaluating);
    }

    default:
      throw new CellFormulaError("Unknown AST node type");
  }
}

/** Evaluate a function node */
function evalFunction(
  name: string,
  args: ASTNode[],
  data: string[][],
  headers: string[],
  evaluating: Set<string>
): number | string {
  switch (name) {
    case "SUM": {
      let total = 0;
      for (const arg of args) {
        if (arg.type === "range") {
          const values = getNumericRangeValues(arg.range, data, headers);
          total += values.reduce((a, b) => a + b, 0);
        } else {
          const val = evalNode(arg, data, headers, evaluating);
          const num = typeof val === "number" ? val : Number(val);
          if (!isNaN(num)) total += num;
        }
      }
      return total;
    }

    case "AVERAGE": {
      const allValues: number[] = [];
      for (const arg of args) {
        if (arg.type === "range") {
          allValues.push(...getNumericRangeValues(arg.range, data, headers));
        } else {
          const val = evalNode(arg, data, headers, evaluating);
          const num = typeof val === "number" ? val : Number(val);
          if (!isNaN(num)) allValues.push(num);
        }
      }
      if (allValues.length === 0) return 0;
      return allValues.reduce((a, b) => a + b, 0) / allValues.length;
    }

    case "COUNT": {
      let count = 0;
      for (const arg of args) {
        if (arg.type === "range") {
          count += getNumericRangeValues(arg.range, data, headers).length;
        } else {
          count++;
        }
      }
      return count;
    }

    case "MIN": {
      const allValues: number[] = [];
      for (const arg of args) {
        if (arg.type === "range") {
          allValues.push(...getNumericRangeValues(arg.range, data, headers));
        } else {
          const val = evalNode(arg, data, headers, evaluating);
          const num = typeof val === "number" ? val : Number(val);
          if (!isNaN(num)) allValues.push(num);
        }
      }
      if (allValues.length === 0) return 0;
      return Math.min(...allValues);
    }

    case "MAX": {
      const allValues: number[] = [];
      for (const arg of args) {
        if (arg.type === "range") {
          allValues.push(...getNumericRangeValues(arg.range, data, headers));
        } else {
          const val = evalNode(arg, data, headers, evaluating);
          const num = typeof val === "number" ? val : Number(val);
          if (!isNaN(num)) allValues.push(num);
        }
      }
      if (allValues.length === 0) return 0;
      return Math.max(...allValues);
    }

    case "IF": {
      if (args.length !== 3) {
        throw new CellFormulaError("IF() requires exactly 3 arguments (condition, then, else)");
      }
      const condition = evalNode(args[0], data, headers, evaluating);
      const isTruthy = typeof condition === "number" ? condition !== 0 : condition !== "";
      return isTruthy
        ? evalNode(args[1], data, headers, evaluating)
        : evalNode(args[2], data, headers, evaluating);
    }

    case "ROUND": {
      if (args.length < 1 || args.length > 2) {
        throw new CellFormulaError("ROUND() requires 1 or 2 arguments");
      }
      const val = evalNode(args[0], data, headers, evaluating);
      const num = typeof val === "number" ? val : Number(val);
      if (isNaN(num)) throw new CellFormulaError(`ROUND() requires a numeric argument, got '${val}'`);
      const decimals = args.length > 1 ? Number(evalNode(args[1], data, headers, evaluating)) : 0;
      const factor = Math.pow(10, decimals);
      return Math.round(num * factor) / factor;
    }

    case "ABS": {
      if (args.length !== 1) {
        throw new CellFormulaError("ABS() requires exactly 1 argument");
      }
      const val = evalNode(args[0], data, headers, evaluating);
      const num = typeof val === "number" ? val : Number(val);
      if (isNaN(num)) throw new CellFormulaError(`ABS() requires a numeric argument, got '${val}'`);
      return Math.abs(num);
    }

    default:
      throw new CellFormulaError(`Unknown function: ${name}`);
  }
}

/** Internal evaluation function that tracks circular references */
function evaluateFormulaInternal(
  formula: string,
  data: string[][],
  headers: string[],
  evaluating: Set<string>
): number | string {
  const tokens = tokenizeFormula(formula.trim());
  if (tokens.length === 0) {
    throw new CellFormulaError("Empty formula");
  }
  const parser = new FormulaParser(tokens);
  const ast = parser.parse();
  return evalNode(ast, data, headers, evaluating);
}

/**
 * Evaluate a cell formula.
 * The formula string should NOT include the leading "=".
 * data is a 2D array where data[row][col] = cell value string.
 * headers is the list of column names (used for bounds checking).
 */
export function evaluateCellFormula(
  formula: string,
  data: string[][],
  headers: string[]
): string | number {
  return evaluateFormulaInternal(formula, data, headers, new Set());
}
