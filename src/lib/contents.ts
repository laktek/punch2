import { exists, walk } from "std/fs/mod.ts";
import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
import { join, resolve } from "std/path/mod.ts";

import { commonSkipPaths } from "../utils/paths.ts";
import { parseFile } from "../utils/content_parsers.ts";

export interface ContentOpts {
  dbPath?: string;
}

interface QueryOpts {
  count: boolean;
  where?: string;
  limit?: number;
  order_by?: string;
}

export class Contents {
  db: Database;

  constructor(opts?: ContentOpts) {
    const dbPath = opts?.dbPath ?? ":memory:";
    this.db = new Database(dbPath);

    // create the contents table
    this.db.exec(`create table if not exists 'contents' (key, records)`);
  }

  close() {
    this.db.close();
  }

  async prepare(contentsPath: string): Promise<void> {
    if (!(await exists(contentsPath))) {
      return;
    }

    const insertResult = async (path: string) => {
      const result = await parseFile(path);
      if (result) {
        this.insert(result.key, result.records);
      }
    };

    // walk content directory
    for await (
      const entry of walk(contentsPath, { maxDepth: 1, skip: commonSkipPaths })
    ) {
      if (entry.isFile) {
        await insertResult(entry.path);
      } else if (entry.isDirectory) {
        // TODO: handle directories
      } else if (entry.isSymlink) {
        const originalPath = resolve(
          entry.path,
          "../",
          Deno.readLinkSync(entry.path),
        );
        await insertResult(originalPath);
      }
    }
  }

  insert(key: string, records: unknown[]): void {
    this.db.exec(
      `insert into "contents" (key, records) VALUES (:key, :records)`,
      { key, records: JSON.stringify(records) },
    );
  }

  query(key: string, opts: QueryOpts): unknown[][] {
    let select = "records.value";
    if (opts.count) {
      select = "count(*)";
    }

    let limit = Number.MAX_SAFE_INTEGER;
    if (opts.limit) {
      limit = opts.limit;
    }

    const stmt = this.db.prepare(
      `select ${select} from contents, json_each(contents.records) as records where contents.key = :key limit :limit`,
    );
    return stmt.values({ key, limit });
  }
}
