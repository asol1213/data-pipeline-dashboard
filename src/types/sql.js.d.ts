declare module "sql.js" {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface QueryExecResult {
    columns: string[];
    values: (string | number | null | Uint8Array)[][];
  }

  interface Statement {
    bind(params?: (string | number | null | Uint8Array)[]): boolean;
    step(): boolean;
    reset(): void;
    free(): boolean;
    getAsObject(): Record<string, string | number | null | Uint8Array>;
  }

  interface Database {
    run(sql: string, params?: (string | number | null | Uint8Array)[]): Database;
    exec(sql: string, params?: (string | number | null | Uint8Array)[]): QueryExecResult[];
    prepare(sql: string): Statement;
    close(): void;
  }

  interface SqlJsConfig {
    locateFile?: (filename: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
  export type { Database, SqlJsStatic, QueryExecResult, Statement };
}
