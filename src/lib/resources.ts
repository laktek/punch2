import { Database, Statement } from "sqlite";

import { ResourceType } from "../utils/routes.ts";

export type Resource = {
  route: string;
  type: ResourceType;
  hash: string;
  lastmod: string;
};

export class Resources {
  #db: Database;
  #insertStmt: Statement;

  insertAll: (resources: Resource[]) => void;

  constructor(db?: Database) {
    this.#db = db ?? new Database(":memory:");

    // create the contents table
    this.#db.exec(
      `create table if not exists 'resources' (route, type, hash, lastmod)`,
    );

    // prepare insert statement
    this.#insertStmt = this.#db.prepare(
      `insert into "resources" (route, type, hash, lastmod) values(:route, :type, :hash, :lastmod)`,
    );

    this.insertAll = this.#db.transaction(
      (resources: Resource[]) => {
        for (const resource of resources) {
          this.#insertStmt.run(resource);
        }
      },
    );
  }

  get(route: string): Resource | undefined {
    const stmt = this.#db.prepare(
      `select * from resources where route = ? limit 1`,
    );
    return stmt.get<Resource>(route);
  }
}
