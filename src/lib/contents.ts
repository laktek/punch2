import { exists, walk } from "std/fs/mod.ts";
import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
import { join, resolve } from "std/path/mod.ts";

import { commonSkipPaths } from "../utils/paths.ts";
import { parseDir, parseFile } from "../utils/content_parsers.ts";

export interface ContentOpts {
  dbPath?: string;
}

interface QueryOpts {
  count?: boolean;
  where?: string;
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
      let path = null;
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

    const stmt = this.#db.prepare(
      `select ${select} from contents, json_each(contents.records) as records where contents.key = :key limit :limit offset :offset`,
    );
    return stmt.values({ key, limit, offset }).map((r) => JSON.parse(r[0]));
  }

  proxy() {
    const query = (prop: string) => this.query(prop);
    return new Proxy({}, {
      getOwnPropertyDescriptor(target: unknown, prop: string) {
        const results = query(prop);
        if (results.length === 1) {
          return { configurable: true, enumerable: true, value: results[0] };
        } else {
          return { configurable: true, enumerable: true, value: results };
        }
      },

      get(target: unknown, prop: string) {
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
