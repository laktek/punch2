import { join, resolve } from "std/path/mod.ts";
import { Database } from "sqlite";

import { Config, getConfig } from "../config/config.ts";
import { Middleware, MiddlewareChain } from "../lib/middleware.ts";
import { Contents } from "../lib/contents.ts";
import { Resources } from "../lib/resources.ts";

import {
  addMetaHeaders,
  logRequest,
  notFound,
  onDemandRender,
  redirect,
} from "../middleware/index.ts";

interface DevOpts {
  srcPath: string;
  port: number;
  config?: string;
}

export async function dev(opts: DevOpts): Promise<void> {
  const { port, srcPath } = opts;
  // read config file, and get options from it
  const configPath = resolve(srcPath, opts.config ?? "punch.json");

  // read the punch config
  const config = await getConfig(
    configPath,
  );

  let middleware: Middleware[] = [];
  // TODO: pass dev mode to middlewareFn as an arg
  if (config.modifiers?.middleware) {
    const { default: middlewareFn } = await import(
      join(srcPath, config.modifiers?.middleware)
    );
    middleware = middlewareFn();
  } else {
    middleware = [
      redirect,
      onDemandRender,
      notFound,
      addMetaHeaders,
      logRequest,
    ];
  }

  // prepare contents
  const contentsPath = join(srcPath, config.dirs!.contents!);
  // setup an in-memory DB
  const db = new Database(":memory:");
  const contents = new Contents(db);
  // TODO: if the `contents` table already exists, skip prepare
  await contents.prepare(contentsPath);

  const resources = new Resources(db);

  // in a worker:
  // start watching files
  // on changes run build
  //push a message when new build is available

  Deno.serve(
    { port },
    async (req: Request, info: Deno.ServeHandlerInfo) => {
      const middlewareChain = new MiddlewareChain(...middleware);
      const res = await middlewareChain.run(
        req,
        srcPath,
        config,
        contents,
        resources,
        info.remoteAddr,
      );

      return res;

      //start server
      // on-demand render requested pages
      //
      //inject a SSE script
      //reload on new build
    },
  );
}
