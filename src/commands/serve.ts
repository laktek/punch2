import { join, resolve } from "@std/path";
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
import { AssetMap } from "../lib/asset_map.ts";
import { Renderer } from "../lib/render.ts";

import {
  addCacheHeaders,
  addMetaHeaders,
  contentAPI,
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
  assetMap: AssetMap;
  renderer: Renderer;
  middleware: Middleware[];
}

// TODO: rename srcPath to sitePath
// TODO: auto-redirect www to host
async function prepareSite(siteConfig: SiteConfig): Promise<Site> {
  const srcPath = resolve(Deno.cwd(), siteConfig.srcPath ?? "");

  // read config file, and get options from it
  const configPath = resolve(srcPath, siteConfig.configPath ?? "punch.jsonc");

  // read the punch config
  const config = await getConfig(
    configPath,
  );

  // prepare contents
  const contentsPath = join(srcPath, config.dirs!.contents!);

  const db = new Database(resolve(srcPath, config.db?.path ?? "punch.db"), {
    unsafeConcurrency: true,
  });

  const contents = new Contents(db);
  // TODO: if the `contents` table already exists, skip prepare
  await contents.prepare(contentsPath);

  const resources = new Resources(db);

  // setup renderer
  const renderCtx = {
    srcPath,
    config,
    contents,
    devMode: false,
  };
  let renderer: Renderer;
  if (config.modifiers?.renderer) {
    const { renderer: customRenderer } = await import(
      join(srcPath, config.modifiers?.renderer)
    );
    renderer = await customRenderer.init(renderCtx);
  } else {
    renderer = await Renderer.init(renderCtx);
  }

  const assetMap = new AssetMap(config, renderer);

  let middleware: Middleware[] = [];
  if (config.modifiers?.middleware) {
    const { default: middlewareFn } = await import(
      join(srcPath, config.modifiers?.middleware)
    );
    middleware = middlewareFn();
  } else {
    middleware = [
      redirect,
      contentAPI,
      serveFile,
      config.serve?.ondemandRender?.disabled ? undefined : onDemandRender,
      notFound,
      addCacheHeaders,
      addMetaHeaders,
      logRequest,
    ].filter(Boolean) as Middleware[];
  }

  return {
    srcPath,
    config,
    contents,
    resources,
    renderer,
    assetMap,
    middleware,
  };
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
    {
      port,
      hostname,
      cert,
      key,
      onListen: ({ hostname, port }) => {
        console.info(`Punch server running on ${hostname}:${port}`);
      },
    },
    async (request: Request, info: Deno.ServeHandlerInfo) => {
      const { hostname } = new URL(request.url);
      const site = sites.get(hostname) || sites.get("*");
      if (!site) {
        console.error("no site configured for the domain");
        return new Response("no site configured for the domain", {
          status: 500,
        });
      }
      const {
        config,
        srcPath,
        contents,
        resources,
        renderer,
        assetMap,
        middleware,
      } = site;

      const middlewareChain = new MiddlewareChain(...middleware);
      const res = await middlewareChain.run(
        {
          request,
          srcPath,
          config,
          contents,
          resources,
          renderer,
          assetMap,
          remoteAddr: info.remoteAddr,
        },
      );

      return res;
    },
  );
}
