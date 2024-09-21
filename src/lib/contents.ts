import { exists, walk } from "@std/fs";
import { Database } from "sqlite";
import { resolve } from "@std/path";

import { commonSkipPaths } from "../utils/paths.ts";
import { parseDir, parseFile } from "../utils/content_parsers.ts";

interface QueryOpts {
  count?: boolean;
  where?: [string, any][];
  limit?: number;
  offset?: number;
  order_by?: string;
}

export class Contents {
  #db: Database;

  constructor(db?: Database) {
    this.#db = db ?? new Database(":memory:");
  }

  async prepare(contentsPath: string): Promise<void> {
    if (!(await exists(contentsPath))) {
      return;
    }

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
          this.insertAll(result.key, result.records);
        }
      } else if (entry.isDirectory) {
        const result = await parseDir(entry.path);
        if (result) {
          this.insertAll(result.key, result.records);
        }
      } else if (entry.isSymlink) {
        const originalPath = resolve(
          entry.path,
          "../",
          Deno.readLinkSync(entry.path),
        );

        const result = await parseFile(originalPath);
        if (result) {
          this.insertAll(result.key, result.records);
        }
      }
    }
  }

  insertAll(table: string, records: any[]): void {
    const columns = Array.from(
      records.reduce((cols: Set<string>, record): Set<string> => {
        Object.keys(record as Object).map((k) => cols.add(k));
        return cols;
      }, new Set()),
    );

    if (!columns.length || (columns.length === 1 && columns[0] === "0")) {
      throw new Error("failed to insert content - invalid records provided.");
    }

    this.#db.exec(
      `create table if not exists '${table}' (${columns.join(",")})`,
    );

    // clear table before adding new entries
    // TODO: clearing existing records should be configurable
    this.#db.exec(`delete from '${table}'`);

    // TODO: support adding indexes
    // if (table === "blog") {
    //   this.#db.exec(`create index if not exists slug_index on ${table} (slug)`);
    // }

    const stmt = this.#db.prepare(
      `insert into "${table}" (${columns.join(",")}) values(${
        columns.map((col) => `:${col}`).join(",")
      })`,
    );

    const insertRecords = this.#db.transaction((records: any[]) => {
      for (const record of records) {
        stmt.run(record);
      }
    });

    insertRecords(records);
  }

  query(table: string, opts?: QueryOpts): unknown[] {
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
        where_params.push(expr[1]);
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
      return stmt.values([...where_params, limit, offset]).flat();
    }
    const records = stmt.all([...where_params, limit, offset]);
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
}
