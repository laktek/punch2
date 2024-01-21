import { exists, walk } from "std/fs/mod.ts";
import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
import { resolve } from "std/path/mod.ts";

import { commonSkipPaths } from "../utils/paths.ts";
import { parseDir, parseFile } from "../utils/content_parsers.ts";

export interface ContentOpts {
  dbPath?: string;
}

interface QueryOpts {
  count?: boolean;
  where?: [string, any][];
  limit?: number;
  offset?: number;
  order_by?: string;
}

export class Contents {
  #db: Database;

  constructor(opts?: ContentOpts) {
    const dbPath = opts?.dbPath ?? ":memory:";
    this.#db = new Database(dbPath);

    // create the contents table
    this.#db.exec(`create table if not exists 'contents' (key, records)`);
  }

  close() {
    this.#db.close();
  }

  async prepare(contentsPath: string): Promise<void> {
    if (!(await exists(contentsPath))) {
      return;
    }

    // walk content directory
    for await (
      const entry of walk(contentsPath, { maxDepth: 1, skip: commonSkipPaths })
    ) {
      if (entry.isFile) {
        const result = await parseFile(entry.path);
        if (result) {
          this.insert(result.key, result.records);
        }
      } else if (entry.isDirectory) {
        const result = await parseDir(entry.path);
        if (result) {
          this.insert(result.key, result.records);
        }
      } else if (entry.isSymlink) {
        const originalPath = resolve(
          entry.path,
          "../",
          Deno.readLinkSync(entry.path),
        );

        const result = await parseFile(originalPath);
        if (result) {
          this.insert(result.key, result.records);
        }
      }
    }
  }

  insert(key: string, records: unknown[]): void {
    this.#db.exec(
      `insert into "contents" (key, records) VALUES (:key, :records)`,
      { key, records: JSON.stringify(records) },
    );
  }

  query(key: string, opts?: QueryOpts): unknown[] {
    let select = "records.value";
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

    let order_by = "";
    if (opts?.order_by) {
      const order_by_parts = opts.order_by.toLowerCase().split(/\s|,/).filter(
        (p) => p,
      );
      order_by_parts.forEach((part) => {
        if (["asc", "desc", "nulls", "first", "last"].includes(part)) {
          order_by = `${order_by} ${part}`;
        } else {
          if (order_by.length) {
            order_by = `${order_by},`;
          }
          order_by = `${order_by} records.value ->> '${part}'`;
        }
      });
      if (order_by.length) {
        order_by = `order by${order_by}`;
      }
    }

    let where = "";
    const where_params: any = [];
    if (opts?.where) {
      opts.where.forEach((expr) => {
        if (expr[0].endsWith("_gt")) {
          where = `${where} and records.value ->> '${
            expr[0].replace(/\_gt$/, "")
          }' > ?`;
        } else if (expr[0].endsWith("_gte")) {
          where = `${where} and records.value ->> '${
            expr[0].replace(/\_gte$/, "")
          }' >= ?`;
        } else if (expr[0].endsWith("_lt")) {
          where = `${where} and records.value ->> '${
            expr[0].replace(/\_lt$/, "")
          }' < ?`;
        } else if (expr[0].endsWith("_lte")) {
          where = `${where} and records.value ->> '${
            expr[0].replace(/\_lte$/, "")
          }' <= ?`;
        } else if (expr[0].endsWith("_not")) {
          where = `${where} and records.value ->> '${
            expr[0].replace(/\_not$/, "")
          }' != ?`;
        } else if (expr[0].endsWith("_like")) {
          where = `${where} and records.value ->> '${
            expr[0].replace(/\_like$/, "")
          }' like ?`;
        } else if (expr[0].endsWith("_ilike")) {
          where = `${where} and records.value ->> '${
            expr[0].replace(/\_ilike$/, "")
          }' like ? collate nocase`;
        } else {
          where = `${where} and records.value ->> '${expr[0]}' = ?`;
        }
        where_params.push(expr[1]);
      });
    }
    const stmt = this.#db.prepare(
      `select ${select} from contents, json_each(contents.records) as records where contents.key = ? ${where} ${order_by} limit ? offset ?`,
    );
    return stmt.values([key, ...where_params, limit, offset]).map((r) =>
      JSON.parse(r[0])
    );
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
