import { DB, PreparedQuery } from "sqlite";

import { ResourceType } from "../utils/routes.ts";

export type Resource = {
  route: string;
  type: ResourceType;
  hash: string;
  lastmod: string;
};

export class Resources {
  #db: DB;

  constructor(db?: DB) {
    this.#db = db ?? new DB(":memory:");

    // create the contents table
    this.#db.execute(
      `create table if not exists 'punch_resources' (route, type, hash, lastmod)`,
    );
  }

  insertAll(resources: Resource[]) {
    // prepare insert statement
    const stmt = this.#db.prepareQuery(
      `insert into "punch_resources" (route, type, hash, lastmod) values (:route, :type, :hash, :lastmod)`,
    );

    this.#db.execute("begin");
    for (const resource of resources) {
      stmt.execute(resource);
    }
    this.#db.execute("commit");
  }

  get(route: string) {
    return this.#db.queryEntries(
      `select * from punch_resources where route = ? limit 1`,
      [route],
    ).shift();
  }

  all(type: ResourceType) {
    return this.#db.queryEntries(
      `select * from punch_resources where type = ?`,
      [type],
    );
  }

  clear() {
    this.#db.execute(
      `delete from 'punch_resources'`,
    );
  }
}
