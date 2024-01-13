import { join, resolve } from "std/path/mod.ts";

import { build } from "./build.ts";
import { getConfig } from "../config/config.ts";
import { MiddlewareChain } from "../lib/middleware.ts";

import {
  addCacheHeaders,
  addMetaHeaders,
  logRequest,
  notFound,
  redirect,
  serveFile,
} from "../middleware/index.ts";

interface ServeOpts {
  srcPath?: string;
  destPath?: string;
  configPath?: string;
  port: number;
  hostname: string;
}

// TODO: support TLS options
export async function serve(opts: ServeOpts): Deno.HttpServer {
  const srcPath = resolve(Deno.cwd(), opts.srcPath ?? "");

  // read config file, and get options from it
  const configPath = opts.config
    ? resolve(Deno.cwd(), opts.config)
    : join(srcPath, "punch.json");

  // read the punch config
  let config = await getConfig(configPath, opts);

  let middleware = [];
  if (config.modifiers?.middleware) {
    const { default: middlewareFn } = await import(
      join(srcPath, config.modifiers?.middleware)
    );
    middleware = middlewareFn();
  } else {
    middleware = [
      redirect,
      serveFile,
      notFound,
      addCacheHeaders,
      addMetaHeaders,
      logRequest,
    ];
  }

  const { port, hostname } = opts;

  Deno.serve(
    { port, hostname },
    async (req: Request, info: Deno.ServeHandlerInfo) => {
      const { pathname } = new URL(req.url);

      const middlewareChain = new MiddlewareChain(...middleware);
      const res = await middlewareChain.run(req, config, info.remoteAddr);

      return res;
    },
  );
}
