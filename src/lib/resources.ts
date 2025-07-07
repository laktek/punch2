import { DatabaseSync } from "node:sqlite";

import { ResourceType } from "../utils/routes.ts";

export type Resource = {
  route: string;
  type: ResourceType;
  hash: string;
  lastmod: string;
};

export class Resources {
  #db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.#db = db ?? new DatabaseSync(":memory:");

    // create the contents table
    this.#db.exec(
      `create table if not exists 'punch_resources' (route, type, hash, lastmod)`,
    );
  }

  insertAll(resources: Resource[]) {
    // prepare insert statement
    const stmt = this.#db.prepare(
      `insert into "punch_resources" (route, type, hash, lastmod) values (?, ?, ?, ?)`,
    );

    this.#db.exec("begin");
    for (const resource of resources) {
      stmt.run(resource.route, resource.type, resource.hash, resource.lastmod);
    }
    this.#db.exec("commit");
  }

  get(route: string) {
    const stmt = this.#db.prepare(
      `select * from punch_resources where route = ? limit 1`,
    );
    return stmt.get(route);
  }

  all(type: ResourceType) {
    const stmt = this.#db.prepare(
      `select * from punch_resources where type = ?`,
    );
    return stmt.all(type);
  }

  clear() {
    this.#db.exec(
      `delete from 'punch_resources'`,
    );
  }
}
