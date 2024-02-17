import { Database, Statement } from "sqlite";

interface Resource {
  route: string;
  hash: string;
  build: string;
}

export class Resources {
  #db: Database;
  #insertStmt: Statement;

  insertAll: (resources: Resource[]) => void;

  constructor(db?: Database) {
    this.#db = db ?? new Database(":memory");

    // create the contents table
    this.#db.exec(
      `create table if not exists 'resources' (route, hash, build)`,
    );

    // prepare insert statement
    this.#insertStmt = this.#db.prepare(
      `insert into "resources" (route, hash, build) values(:route, :hash, :build)`,
    );

    this.insertAll = this.#db.transaction((resources: Resource[]) => {
      for (const resource of resources) {
        this.#insertStmt.run(resource);
      }
    });
  }

  get(route: string): Resource {
    const stmt = this.#db.prepare(
      `select * from resources where route = ? limit 1`,
    );
    return stmt.get<Resource>(route);
  }
}
