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
  // push a message when new build is available
  const watcher = new Worker(import.meta.resolve("../lib/dev_watcher.ts"), {
    type: "module",
  });
  // send srcPath
  watcher.postMessage({ srcPath });
  watcher.onmessage = (e) => {
    const { paths } = e.data;
    dispatchEvent(new CustomEvent("file_changed", { detail: { paths } }));
  };

  Deno.serve(
    { port },
    async (req: Request, info: Deno.ServeHandlerInfo) => {
      const pathname = new URL(req.url).pathname;

      if (pathname === "/_punch/events") {
        const encoder = new TextEncoder();
        const abortController = new AbortController();
        const signal = abortController.signal;

        const body = new ReadableStream({
          start(controller) {
            addEventListener("file_changed", (e) => {
              console.log("file changed");
              const data = JSON.stringify({ paths: e.detail.paths });
              const msg = encoder.encode(`data: ${data}\r\n\r\n`);
              controller.enqueue(msg);
            }, { signal });
          },
          cancel() {
            abortController.abort();
          },
        });
        return new Response(body, {
          headers: {
            "Content-Type": "text/event-stream",
          },
        });
      }

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
