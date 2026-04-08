// Formula engine for calculated columns

export interface ParsedExpression {
  type: "number" | "column" | "binary" | "function" | "string" | "comparison";
  value?: number | string;
  column?: string;
  operator?: string;
  left?: ParsedExpression;
  right?: ParsedExpression;
  func?: string;
  args?: ParsedExpression[];
}

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

// Tokenizer
interface Token {
  type: "number" | "string" | "identifier" | "operator" | "paren" | "comma";
  value: string;
}

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formula.length) {
    // Skip whitespace
    if (/\s/.test(formula[i])) {
      i++;
      continue;
    }

    // Numbers (including decimals)
    if (/\d/.test(formula[i]) || (formula[i] === "." && i + 1 < formula.length && /\d/.test(formula[i + 1]))) {
      let num = "";
      while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === ".")) {
        num += formula[i];
        i++;
      }
      tokens.push({ type: "number", value: num });
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

    // Operators
    if (formula[i] === ">" && i + 1 < formula.length && formula[i + 1] === "=") {
      tokens.push({ type: "operator", value: ">=" });
      i += 2;
      continue;
    }
    if (formula[i] === "<" && i + 1 < formula.length && formula[i + 1] === "=") {
      tokens.push({ type: "operator", value: "<=" });
      i += 2;
      continue;
    }
    if (formula[i] === "!" && i + 1 < formula.length && formula[i + 1] === "=") {
      tokens.push({ type: "operator", value: "!=" });
      i += 2;
      continue;
    }
    if ("+-*/".includes(formula[i])) {
      tokens.push({ type: "operator", value: formula[i] });
      i++;
      continue;
    }
    if ("><".includes(formula[i])) {
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

    // Identifiers (column names or function names)
    // Allow letters, digits, underscores, %, &
    if (/[a-zA-Z_]/.test(formula[i])) {
      let id = "";
      while (i < formula.length && /[a-zA-Z0-9_%&]/.test(formula[i])) {
        id += formula[i];
        i++;
      }
      tokens.push({ type: "identifier", value: id });
      continue;
    }

    throw new FormulaError(`Unexpected character: '${formula[i]}' at position ${i}`);
  }

  return tokens;
}

// Parser - recursive descent
class Parser {
  private tokens: Token[];
  private pos: number;
  private headers: string[];

  constructor(tokens: Token[], headers: string[]) {
    this.tokens = tokens;
    this.pos = 0;
    this.headers = headers;
  }

  private peek(): Token | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private consume(): Token {
    if (this.pos >= this.tokens.length) {
      throw new FormulaError("Unexpected end of formula");
    }
    return this.tokens[this.pos++];
  }

  private expect(type: string, value?: string): Token {
    const token = this.consume();
    if (token.type !== type || (value !== undefined && token.value !== value)) {
      throw new FormulaError(
        `Expected ${value ?? type} but got '${token.value}'`
      );
    }
    return token;
  }

  parse(): ParsedExpression {
    const expr = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new FormulaError(
        `Unexpected token '${this.tokens[this.pos].value}' after expression`
      );
    }
    return expr;
  }

  private parseExpression(): ParsedExpression {
    return this.parseComparison();
  }

  private parseComparison(): ParsedExpression {
    let left = this.parseAddSub();

    const token = this.peek();
    if (
      token &&
      token.type === "operator" &&
      [">", "<", ">=", "<=", "!=", "="].includes(token.value)
    ) {
      this.consume();
      const right = this.parseAddSub();
      return {
        type: "comparison",
        operator: token.value,
        left,
        right,
      };
    }

    return left;
  }

  private parseAddSub(): ParsedExpression {
    let left = this.parseMulDiv();

    while (true) {
      const token = this.peek();
      if (token && token.type === "operator" && (token.value === "+" || token.value === "-")) {
        this.consume();
        const right = this.parseMulDiv();
        left = {
          type: "binary",
          operator: token.value,
          left,
          right,
        };
      } else {
        break;
      }
    }

    return left;
  }

  private parseMulDiv(): ParsedExpression {
    let left = this.parseUnary();

    while (true) {
      const token = this.peek();
      if (token && token.type === "operator" && (token.value === "*" || token.value === "/")) {
        this.consume();
        const right = this.parseUnary();
        left = {
          type: "binary",
          operator: token.value,
          left,
          right,
        };
      } else {
        break;
      }
    }

    return left;
  }

  private parseUnary(): ParsedExpression {
    const token = this.peek();
    if (token && token.type === "operator" && token.value === "-") {
      this.consume();
      const operand = this.parsePrimary();
      return {
        type: "binary",
        operator: "*",
        left: { type: "number", value: -1 },
        right: operand,
      };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ParsedExpression {
    const token = this.peek();
    if (!token) {
      throw new FormulaError("Unexpected end of formula");
    }

    // Number
    if (token.type === "number") {
      this.consume();
      return { type: "number", value: parseFloat(token.value) };
    }

    // String literal
    if (token.type === "string") {
      this.consume();
      return { type: "string", value: token.value };
    }

    // Parenthesized expression
    if (token.type === "paren" && token.value === "(") {
      this.consume();
      const expr = this.parseExpression();
      this.expect("paren", ")");
      return expr;
    }

    // Identifier: function call or column reference
    if (token.type === "identifier") {
      const name = token.value.toUpperCase();
      const supportedFunctions = ["ABS", "ROUND", "IF", "MAX", "MIN"];

      // Check if it's a function call
      if (
        supportedFunctions.includes(name) &&
        this.pos + 1 < this.tokens.length &&
        this.tokens[this.pos + 1].type === "paren" &&
        this.tokens[this.pos + 1].value === "("
      ) {
        this.consume(); // consume function name
        this.consume(); // consume (
        const args: ParsedExpression[] = [];

        // Parse arguments
        if (!(this.peek()?.type === "paren" && this.peek()?.value === ")")) {
          args.push(this.parseExpression());
          while (this.peek()?.type === "comma") {
            this.consume(); // comma
            args.push(this.parseExpression());
          }
        }

        this.expect("paren", ")");

        // Validate argument counts
        if (name === "ABS" && args.length !== 1) {
          throw new FormulaError("ABS() requires exactly 1 argument");
        }
        if (name === "ROUND" && (args.length < 1 || args.length > 2)) {
          throw new FormulaError("ROUND() requires 1 or 2 arguments");
        }
        if (name === "IF" && args.length !== 3) {
          throw new FormulaError("IF() requires exactly 3 arguments (condition, then, else)");
        }
        if ((name === "MAX" || name === "MIN") && args.length < 1) {
          throw new FormulaError(`${name}() requires at least 1 argument`);
        }

        return {
          type: "function",
          func: name,
          args,
        };
      }

      // Column reference
      this.consume();
      const colName = token.value;
      if (!this.headers.includes(colName)) {
        throw new FormulaError(
          `Unknown column: '${colName}'. Available columns: ${this.headers.join(", ")}`
        );
      }
      return { type: "column", column: colName };
    }

    throw new FormulaError(`Unexpected token: '${token.value}'`);
  }
}

export function parseFormula(
  formula: string,
  headers: string[]
): ParsedExpression {
  if (!formula || !formula.trim()) {
    throw new FormulaError("Formula cannot be empty");
  }
  const tokens = tokenize(formula.trim());
  if (tokens.length === 0) {
    throw new FormulaError("Formula cannot be empty");
  }
  const parser = new Parser(tokens, headers);
  return parser.parse();
}

function evaluateExpr(
  expr: ParsedExpression,
  row: Record<string, string>
): number | string {
  switch (expr.type) {
    case "number":
      return expr.value as number;

    case "string":
      return expr.value as string;

    case "column": {
      const val = row[expr.column!];
      if (val === undefined || val === null) {
        throw new FormulaError(`Missing value for column '${expr.column}'`);
      }
      const num = Number(val);
      if (!isNaN(num) && val !== "") {
        return num;
      }
      return val;
    }

    case "binary": {
      const left = evaluateExpr(expr.left!, row);
      const right = evaluateExpr(expr.right!, row);
      const lNum = typeof left === "number" ? left : Number(left);
      const rNum = typeof right === "number" ? right : Number(right);

      if (isNaN(lNum) || isNaN(rNum)) {
        throw new FormulaError(
          `Cannot perform arithmetic on non-numeric values: '${left}' ${expr.operator} '${right}'`
        );
      }

      switch (expr.operator) {
        case "+":
          return lNum + rNum;
        case "-":
          return lNum - rNum;
        case "*":
          return lNum * rNum;
        case "/":
          if (rNum === 0) {
            throw new FormulaError("Division by zero");
          }
          return lNum / rNum;
        default:
          throw new FormulaError(`Unknown operator: ${expr.operator}`);
      }
    }

    case "comparison": {
      const left = evaluateExpr(expr.left!, row);
      const right = evaluateExpr(expr.right!, row);
      const lNum = typeof left === "number" ? left : Number(left);
      const rNum = typeof right === "number" ? right : Number(right);

      // Try numeric comparison if both are numeric
      if (!isNaN(lNum) && !isNaN(rNum)) {
        switch (expr.operator) {
          case ">":
            return lNum > rNum ? 1 : 0;
          case "<":
            return lNum < rNum ? 1 : 0;
          case ">=":
            return lNum >= rNum ? 1 : 0;
          case "<=":
            return lNum <= rNum ? 1 : 0;
          case "=":
            return lNum === rNum ? 1 : 0;
          case "!=":
            return lNum !== rNum ? 1 : 0;
          default:
            throw new FormulaError(`Unknown comparison operator: ${expr.operator}`);
        }
      }

      // Fall back to string comparison
      const lStr = String(left);
      const rStr = String(right);
      switch (expr.operator) {
        case "=":
          return lStr === rStr ? 1 : 0;
        case "!=":
          return lStr !== rStr ? 1 : 0;
        case ">":
          return lStr > rStr ? 1 : 0;
        case "<":
          return lStr < rStr ? 1 : 0;
        case ">=":
          return lStr >= rStr ? 1 : 0;
        case "<=":
          return lStr <= rStr ? 1 : 0;
        default:
          throw new FormulaError(`Unknown comparison operator: ${expr.operator}`);
      }
    }

    case "function": {
      const funcName = expr.func!;
      const args = expr.args!;

      switch (funcName) {
        case "ABS": {
          const val = evaluateExpr(args[0], row);
          const num = typeof val === "number" ? val : Number(val);
          if (isNaN(num)) {
            throw new FormulaError(`ABS() requires a numeric argument, got '${val}'`);
          }
          return Math.abs(num);
        }

        case "ROUND": {
          const val = evaluateExpr(args[0], row);
          const num = typeof val === "number" ? val : Number(val);
          if (isNaN(num)) {
            throw new FormulaError(`ROUND() requires a numeric first argument, got '${val}'`);
          }
          const decimals = args.length > 1 ? Number(evaluateExpr(args[1], row)) : 0;
          if (isNaN(decimals)) {
            throw new FormulaError("ROUND() requires a numeric second argument");
          }
          const factor = Math.pow(10, decimals);
          return Math.round(num * factor) / factor;
        }

        case "IF": {
          const condition = evaluateExpr(args[0], row);
          const isTruthy =
            typeof condition === "number" ? condition !== 0 : condition !== "";
          return isTruthy
            ? evaluateExpr(args[1], row)
            : evaluateExpr(args[2], row);
        }

        case "MAX": {
          const values = args.map((a) => {
            const v = evaluateExpr(a, row);
            const n = typeof v === "number" ? v : Number(v);
            if (isNaN(n)) throw new FormulaError(`MAX() requires numeric arguments, got '${v}'`);
            return n;
          });
          return Math.max(...values);
        }

        case "MIN": {
          const values = args.map((a) => {
            const v = evaluateExpr(a, row);
            const n = typeof v === "number" ? v : Number(v);
            if (isNaN(n)) throw new FormulaError(`MIN() requires numeric arguments, got '${v}'`);
            return n;
          });
          return Math.min(...values);
        }

        default:
          throw new FormulaError(`Unknown function: ${funcName}`);
      }
    }

    default:
      throw new FormulaError(`Unknown expression type: ${expr.type}`);
  }
}

export function evaluateFormula(
  formula: string,
  row: Record<string, string>,
  headers: string[]
): number | string {
  const parsed = parseFormula(formula, headers);
  return evaluateExpr(parsed, row);
}
