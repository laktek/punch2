import { join, resolve } from "std/path/mod.ts";
import { Database } from "sqlite";

import {
  Config,
  getConfig,
  getSitesConfig,
  SiteConfig,
} from "../config/config.ts";
import { Middleware, MiddlewareChain } from "../lib/middleware.ts";
import { Contents } from "../lib/contents.ts";
import { Resources } from "../lib/resources.ts";

import {
  addCacheHeaders,
  addMetaHeaders,
  logRequest,
  notFound,
  onDemandRender,
  redirect,
  serveFile,
} from "../middleware/index.ts";

interface ServeOpts {
  sites?: string;
  port: number;
  hostname: string;
  certPath: string;
  keyPath: string;
}

interface Site {
  srcPath: string;
  config: Config;
  contents: Contents;
  resources: Resources;
  middleware: Middleware[];
}

async function prepareSite(siteConfig: SiteConfig): Promise<Site> {
  const srcPath = resolve(Deno.cwd(), siteConfig.srcPath ?? "");

  // read config file, and get options from it
  const configPath = resolve(srcPath, siteConfig.configPath ?? "punch.json");

  // read the punch config
  const config = await getConfig(
    configPath,
  );

  // prepare contents
  const contentsPath = join(srcPath, config.dirs!.contents!);

  const db = new Database(resolve(srcPath, config.db ?? "punch.db"));

  const contents = new Contents(db);
  // TODO: if the `contents` table already exists, skip prepare
  await contents.prepare(contentsPath);

  const resources = new Resources(db);

  let middleware: Middleware[] = [];
  if (config.modifiers?.middleware) {
    const { default: middlewareFn } = await import(
      join(srcPath, config.modifiers?.middleware)
    );
    middleware = middlewareFn();
  } else {
    middleware = [
      redirect,
      serveFile,
      onDemandRender,
      notFound,
      addCacheHeaders,
      addMetaHeaders,
      logRequest,
    ];
  }

  return { srcPath, config, contents, resources, middleware };
}

export async function serve(opts: ServeOpts): Promise<void> {
  const sitesConfigPath = resolve(Deno.cwd(), opts.sites || "");

  const sitesConfig = await getSitesConfig(sitesConfigPath);
  if (!sitesConfig) {
    throw new Error("could not find a valid sites config");
  }

  const sites = new Map<string, Site>();
  for (const [hostname, config] of Object.entries(sitesConfig)) {
    const site = await prepareSite(config);
    sites.set(hostname, site);
  }

  const { port, hostname, certPath, keyPath } = opts;

  let cert, key;
  if (certPath && keyPath) {
    cert = await Deno.readTextFile(
      resolve(Deno.cwd(), certPath),
    );
    key = await Deno.readTextFile(
      resolve(Deno.cwd(), keyPath),
    );
  }

  Deno.serve(
    { port, hostname, cert, key },
    async (req: Request, info: Deno.ServeHandlerInfo) => {
      const { hostname } = new URL(req.url);
      const site = sites.get(hostname) || sites.get("*");
      if (!site) {
        console.error("no site configured for the domain");
        return new Response("no site configured for the domain", {
          status: 500,
        });
      }
      const { config, srcPath, contents, resources, middleware } = site;

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
    },
  );
}
