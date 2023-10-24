import { exists, walk } from "std/fs/mod.ts";
import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
import { join, resolve } from "std/path/mod.ts";

import { commonSkipPaths } from "../utils/paths.ts";
import { parseFile } from "../utils/content_parsers.ts";

export interface ContentOpts {
  dbPath?: string;
}

export class Contents {
  db: Database;

  constructor(opts: ContentOpts) {
    const dbPath = opts.dbPath ?? ":memory:";
    this.db = new Database(dbPath);
  }

  async prepare(contentsPath: string): Promise<void> {
    if (!(await exists(contentsPath))) {
      return;
    }

    const insertResult = async (path: string) => {
      const result = await parseFile(path);
      if (result) {
        this.insert(result.table, result.records);
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

  async insert(table: string, records: unknown[]): Promise<void> {
    this.db.transaction(() => {
      // create table if it doesn't exist
      // db.run(`create table if not exists ${table}(data)`);
      // insert into table
    });
    return;
  }

  async query(specifier: string): Promise<unknown> {
    return {};
  }
}
