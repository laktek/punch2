import { extname, join, resolve } from "std/path/mod.ts";
import { exists } from "std/fs/mod.ts";
import { contentType } from "std/media_types/mod.ts";

import { build } from "./build.ts";
import { getConfig } from "../config/config.ts";

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

  const { port, hostname, useUtc } = opts;

  Deno.serve(
    { port, hostname },
    async (req: Request, info: Deno.ServeHandlerInfo) => {
      // set cache headers for files (based on config)
      // set cookies
      const { pathname } = new URL(req.url);
      let res;

      const redirect = config.redirects[pathname];
      if (redirect) {
        res = Response.redirect(
          new URL(redirect.destination, req.url),
          redirect.permanent ? 301 : 302,
        );
      } else {
        const filePath = join(destPath, pathname);
        const ext = extname(pathname);
        const contents = await getContents(filePath);

        res = (contents === undefined)
          ? new Response(await getPageNotFound(join(destPath, "404.html")), {
            status: 404,
            headers: {
              "content-type": "text/html; charset=UTF-8",
            },
          })
          : new Response(contents, {
            status: 200,
            headers: {
              "content-type": contentType(ext) || "text/html; charset=UTF-8",
            },
          });
      }

      // log request
      // TODO: do in a worker
      if (!opts.noRequestLogs) {
        logRequest(req, res, useUtc, info.remoteAddr);
      }

      return res;
    },
  );
}
