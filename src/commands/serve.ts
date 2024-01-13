import { extname, join, resolve } from "std/path/mod.ts";
import { exists } from "std/fs/mod.ts";
import { contentType } from "std/media_types/mod.ts";
import { calculate as calculateEtag } from "std/http/mod.ts";

import { build } from "./build.ts";
import { getConfig } from "../config/config.ts";
import { MiddlewareChain } from "../lib/middleware.ts";

interface ServeOpts {
  srcPath?: string;
  destPath?: string;
  configPath?: string;
  port: number;
  hostname: string;
  noBuild?: boolean;
  noRequestLogs?: boolean;
  useUtc?: boolean;
}

function logRequest(
  req: Request,
  res: Response,
  useUtc: boolean,
  remoteAddr: Deno.NetAddr,
) {
  const date = useUtc ? new Date().toUTCString() : new Date();
  const ip = `${remoteAddr.hostname}:${remoteAddr.port}`;
  console.info(
    '[%s] %s "%s %s" "%s"',
    date,
    ip,
    req.method,
    req.url,
    req.headers.get("user-agent"),
    res.status,
    res.headers.get("content-length"),
  );
}

function isAssetPath(pathname) {
  const assetPaths = ["/js", "/css"];
  return assetPaths.some((p) => pathname.startsWith(p));
}

async function getContents(filePath: string): Promise<Uint8Array> {
  try {
    return await Deno.readFile(filePath);
  } catch (e) {
    if (e.code === "EISDIR") { // instanceof Deno.errors.IsADirectory doesn't work
      // try reading the index.html
      return await getContents(join(filePath, "index.html"));
    } else if (e instanceof Deno.errors.NotFound && extname(filePath) === "") {
      // try adding an explicit .html as extension
      return await getContents(filePath + ".html");
    }
  }
}

const defaultPageNotFound =
  `<html><head><title>Page Not Found</title></head><body><h1>Page Not Found</h1></body></html>`;

async function getPageNotFound(filePath: string): Promise<Uint8Array> {
  try {
    return await Deno.readFile(filePath);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      const enc = new TextEncoder();
      return enc.encode(defaultPageNotFound);
    }
  }
}

// TODO: support TLS options
export async function serve(opts: ServeOpts): Deno.HttpServer {
  const srcPath = resolve(Deno.cwd(), opts.srcPath ?? "");
  const destPath = resolve(Deno.cwd(), opts.output ?? "dist");

  // read config file, and get options from it
  const configPath = opts.config
    ? resolve(Deno.cwd(), opts.config)
    : join(srcPath, "punch.json");

  // read the punch config
  const config = await getConfig(configPath);

  if (!opts.noBuild) {
    build(opts);
  }

  const defaultMiddleware = [
    function redirect(ctx, next) {
      const { config, request } = ctx;
      const { pathname } = new URL(request.url);
      const redirect = config.redirects[pathname];
      if (redirect) {
        return Response.redirect(
          new URL(redirect.destination, request.url),
          redirect.permanent ? 301 : 302,
        );
      } else {
        return next()(ctx, next);
      }
    },
    async function serveFile(ctx, next) {
      const { config, request } = ctx;
      const { pathname } = new URL(request.url);
      const filePath = join(destPath, pathname);
      const ext = extname(pathname);
      const contents = await getContents(filePath);

      const newCtx = { config, request };
      if (contents) {
        newCtx.response = new Response(contents, {
          status: 200,
          headers: {
            "content-type": contentType(ext) || "text/html; charset=UTF-8",
          },
        });
      }

      return next()(newCtx, next);
    },
    async function addCacheHeaders(ctx, next) {
      if (!ctx.response) {
        return next()(ctx, next);
      }

      const { request, response } = ctx;
      const { pathname } = new URL(request.url);

      let cacheHeaderValue = "public,max-age=0,must-revalidate";
      if (isAssetPath(pathname)) {
        cacheHeaderValue = "public,max-age=31536000,immutable";
      }
      response.headers.set("Cache-Control", cacheHeaderValue);

      // set etag
      const clonedRes = response.clone();
      const bodyReader = clonedRes.body.getReader();
      const { value } = await bodyReader.read();
      const etag = await calculateEtag(value);
      response.headers.set("Etag", etag);

      const newCtx = { config, request, response };
      return next()(newCtx, next);
    },
    async function notFound(ctx, next) {
      if (ctx.response) {
        return ctx.response;
      }

      return new Response(await getPageNotFound(join(destPath, "404.html")), {
        status: 404,
        headers: {
          "content-type": "text/html; charset=UTF-8",
        },
      });
    },
  ];

  const { port, hostname, useUtc } = opts;

  Deno.serve(
    { port, hostname },
    async (req: Request, info: Deno.ServeHandlerInfo) => {
      // set cache headers for files (based on config)
      const { pathname } = new URL(req.url);

      // TODO: make the middleware configurable
      const middleware = new MiddlewareChain(...defaultMiddleware);
      const res = await middleware.run(req, config);

      // log request
      // TODO: do in a worker
      if (!opts.noRequestLogs) {
        logRequest(req, res, useUtc, info.remoteAddr);
      }

      return res;
    },
  );
}
