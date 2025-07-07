import { exists, walk } from "@std/fs";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "@std/path";

import { commonSkipPaths } from "../utils/paths.ts";
import { parseDir, parseFile } from "../utils/content_parsers.ts";

type SqlQuery = [string, string[] | Record<string, any>];

interface QueryOpts {
  count?: boolean;
  where?: [string, any][];
  limit?: number;
  offset?: number;
  order_by?: string;
  sql?: SqlQuery;
}

function parseRecords(records: any[]): unknown[] {
  return records.map((record) => {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string") {
        if (value.match(/^(\[|\{)(.*)(\]|\})$/)) {
          try {
            record[key] = JSON.parse(value);
          } catch (e) {
            record[key] = value;
          }
        }
      }
    }
    return record;
  });
}

export class Contents {
  #db: DatabaseSync;
  #indexes?: Record<string, string[]>;
  #prepared: boolean;

  constructor(db?: DatabaseSync, indexes?: Record<string, string[]>) {
    this.#db = db ?? new DatabaseSync(":memory:");
    this.#indexes = indexes;
    this.#prepared = false;
  }

  async prepare(contentsPath: string): Promise<void> {
    if (!(await exists(contentsPath))) {
      return;
    }

    const tables = new Map();

    // walk content directory
    for await (
      const entry of walk(contentsPath, { maxDepth: 1, skip: commonSkipPaths })
    ) {
      // skip the root entry
      if (entry.path === contentsPath) {
        continue;
      }
      if (entry.isFile) {
        const result = await parseFile(entry.path);
        if (result) {
          tables.set(result.key, result.records);
        }
      } else if (entry.isDirectory) {
        const result = await parseDir(entry.path);
        if (result) {
          tables.set(result.key, result.records);
        }
      } else if (entry.isSymlink) {
        const originalPath = resolve(
          entry.path,
          "../",
          Deno.readLinkSync(entry.path),
        );

        const result = await parseFile(originalPath);
        if (result) {
          tables.set(result.key, result.records);
        }
      }
    }

    for (const [name, records] of tables) {
      this.insertAll(name, records);
    }
    this.#prepared = true;
  }

  insertAll(
    table: string,
    records: any[],
  ): void {
    const columns = Array.from(
      records.reduce((cols: Set<string>, record): Set<string> => {
        Object.keys(record as Object).map((k) => cols.add(k));
        return cols;
      }, new Set()),
    );

    if (!columns.length || (columns.length === 1 && columns[0] === "0")) {
      throw new Error("failed to insert content - invalid records provided.");
    }

    // drop existing table before creating a new one
    // TODO: make dropping table configurable
    this.#db.exec(`drop table if exists '${table}'`);

    this.#db.exec(
      `create table if not exists '${table}' (${columns.join(",")})`,
    );

    if (this.#indexes && this.#indexes[table]) {
      const index_columns = this.#indexes[table].join(",");
      this.#db.exec(
        `create index if not exists index_${table} on ${table} (${index_columns})`,
      );
    }

    const stmt = this.#db.prepare(
      `insert into "${table}" (${columns.join(",")}) values(${
        columns.map(() => "?").join(",")
      })`,
    );

    this.#db.exec("begin");
    for (const record of records) {
      for (const [key, value] of Object.entries(record)) {
        if (typeof value !== "string" && typeof value !== "number") {
          record[key] = JSON.stringify(value);
        }
      }

      const values = columns.map(col => {
        const value = record[col as keyof typeof record];
        if (value === undefined) return null;
        // Convert boolean values to 0/1 for SQLite compatibility
        if (typeof value === "boolean") return value ? 1 : 0;
        return value;
      });
      stmt.run(...values);
    }
    this.#db.exec("commit");
  }

  #runSql(sql: SqlQuery) {
    if (typeof sql[0] !== "string") {
      throw new Error("first argument to sql option must be a string");
    }
    
    let query = sql[0];
    let params: any[] = [];
    
    if (sql[1]) {
      if (Array.isArray(sql[1])) {
        params = sql[1];
      } else {
        // Convert named parameters to positional parameters
        const namedParams = sql[1] as Record<string, any>;
        for (const [key, value] of Object.entries(namedParams)) {
          query = query.replace(new RegExp(`:${key}`, 'g'), '?');
          params.push(value);
        }
      }
    }
    
    const stmt = this.#db.prepare(query);
    const records = stmt.all(...params);
    return parseRecords(records);
  }

  query(table: string, opts?: QueryOpts): unknown[] {
    if (opts?.sql) {
      return this.#runSql(opts?.sql);
    }

    let select = "*";
    if (opts?.count) {
      select = "count(*)";
    }

    let limit = Number.MAX_SAFE_INTEGER;
    if (opts?.limit) {
      limit = opts!.limit!;
    }

    let offset = 0;
    if (opts?.offset) {
      offset = opts!.offset;
    }

    let order_by = opts?.order_by ? `order by ${opts.order_by}` : "";

    let where_exprs: string[] = [];
    const where_params: any = [];
    if (opts?.where && opts?.where.length) {
      opts.where.forEach((expr) => {
        if (expr[1] === null) {
          if (expr[0].endsWith("_not")) {
            where_exprs.push(`"${expr[0].replace(/\_not$/, "")}" IS NOT NULL`);
          } else {
            where_exprs.push(`"${expr[0]}" IS NULL`);
          }
        } else {
          if (expr[0].endsWith("_gt")) {
            where_exprs.push(`"${expr[0].replace(/\_gt$/, "")}" > ?`);
          } else if (expr[0].endsWith("_gte")) {
            where_exprs.push(`"${expr[0].replace(/\_gte$/, "")}" >= ?`);
          } else if (expr[0].endsWith("_lt")) {
            where_exprs.push(`"${expr[0].replace(/\_lt$/, "")}" < ?`);
          } else if (expr[0].endsWith("_lte")) {
            where_exprs.push(`"${expr[0].replace(/\_lte$/, "")}" <= ?`);
          } else if (expr[0].endsWith("_not")) {
            where_exprs.push(`"${expr[0].replace(/\_not$/, "")}" != ?`);
          } else if (expr[0].endsWith("_like")) {
            where_exprs.push(`"${expr[0].replace(/\_like$/, "")}" like ?`);
          } else if (expr[0].endsWith("_ilike")) {
            where_exprs.push(
              `"${expr[0].replace(/\_ilike$/, "")}" like ? collate nocase`,
            );
          } else {
            where_exprs.push(`"${expr[0]}" = ?`);
          }
          // Convert boolean values to 0/1 for SQLite compatibility
          const value = typeof expr[1] === "boolean" ? (expr[1] ? 1 : 0) : expr[1];
          where_params.push(value);
        }
      });
    }
    let where = "";
    if (where_exprs.length) {
      where = `where ${where_exprs.join(" and ")}`;
    }

    const stmt = this.#db.prepare(
      `select ${select} from ${table} ${where} ${order_by} limit ? offset ?`,
    );
    if (opts?.count) {
      const result = stmt.all(...where_params, limit, offset);
      // Extract the count value from the result object
      return result.map((row: any) => Object.values(row)[0]);
    }
    const records = stmt.all(...where_params, limit, offset);
    return parseRecords(records);
  }

  proxy(temp?: { [key: string]: unknown }) {
    const query = (prop: string) => this.query(prop);

    return new Proxy({}, {
      getOwnPropertyDescriptor(_target: unknown, prop: string) {
        // check if the property available in temp
        const tempValue = temp && temp[prop];
        if (tempValue) {
          return { configurable: true, enumerable: true, value: tempValue };
        }

        const results = query(prop);
        if (results.length === 1) {
          return { configurable: true, enumerable: true, value: results[0] };
        } else {
          return { configurable: true, enumerable: true, value: results };
        }
      },

      get(_target: unknown, prop: string) {
        // check if the property available in temp
        const tempValue = temp && temp[prop];
        if (tempValue) {
          return tempValue;
        }

        const results = query(prop);
        if (results.length === 1) {
          return results[0];
        } else {
          return results;
        }
      },
    });
  }

  serialize() {
    // TODO: node:sqlite doesn't support serialize yet
    // Skip serialize functionality for now
    // if (this.#prepared) {
    //   return this.#db.serialize();
    // } else {
    //   // return an empty buffer
    //   return new Uint8Array();
    // }
    return new Uint8Array();
  }
}
