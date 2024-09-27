import { join, resolve } from "@std/path";
import { Database } from "sqlite";

import { Config, getConfig } from "../config/config.ts";
import { Contents } from "../lib/contents.ts";
import { Resource, Resources } from "../lib/resources.ts";
import { Output, Renderer } from "../lib/render.ts";
import { AssetMap } from "../lib/asset_map.ts";
import { prepareExplicitRoutes, routesFromPages } from "../utils/routes.ts";
import { copyPublicFiles } from "../utils/public.ts";
import { writeFile } from "../utils/fs.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { hashContent } from "../utils/content_hash.ts";
import { generateSitemap } from "../lib/sitemap.ts";

interface BuildOpts {
  srcPath: string;
  output?: string;
  config?: string;
  baseUrl?: string;
  quiet?: boolean;
}

interface BatchedRenderResult {
  pages: Output[];
  assetMap: AssetMap;
}

declare global {
  var isQuiet: undefined | boolean;
}
globalThis.isQuiet = false;
function withQuiet(fn: () => void) {
  if (globalThis.isQuiet) {
    return;
  }
  fn();
}

async function batchedRender(
  config: Config,
  renderer: Renderer,
  routes: string[],
): Promise<BatchedRenderResult> {
  const pages: Output[] = [];
  const assetMap = new AssetMap(config, renderer);
  const batchSize = config.build?.batchSize || 100;

  const renderRoute = async (route: string) => {
    const output = await renderer.render(route);
    if (output.errorStatus) {
      console.error(
        `${route} - ${output.errorMessage} (${output.errorStatus})`,
      );
    } else {
      pages.push(output);
      if (output.content instanceof RenderableDocument) {
        assetMap.track(output.content as RenderableDocument);
      }
    }
  };

  withQuiet(() => console.info("- rendering pages..."));
  withQuiet(() => console.time("- rendered pages"));
  for (let i = 0; i < routes.length; i += batchSize) {
    withQuiet(() =>
      console.time(`-- rendered pages (batch: ${i} - ${i + batchSize})`)
    );
    const batch = routes.slice(i, i + batchSize);
    await Promise.all(batch.map(renderRoute));
    withQuiet(() =>
      console.timeEnd(`-- rendered pages (batch: ${i} - ${i + batchSize})`)
    );
  }
  withQuiet(() =>
    console.timeLog("- rendered pages", `(${pages.length} pages)`)
  );

  return { pages, assetMap };
}

async function batchedWrite(
  config: Config,
  destPath: string,
  resources: Resources,
  pages: Output[],
): Promise<void> {
  const batchSize = config.build?.batchSize || 100;
  withQuiet(() => console.time("- wrote files to disk"));
  const textEncoder = new TextEncoder();

  const writePage = async (page: Output) => {
    const path = join(destPath, page.route);

    let encoded: Uint8Array;
    if (page.content instanceof Uint8Array) {
      encoded = page.content;
    } else {
      const contentStr = page.content!.toString();
      encoded = textEncoder.encode(contentStr);
    }
    await writeFile(path, encoded);
  };

  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    await Promise.all(batch.map(writePage));
  }

  // write resources to DB
  const lastmod = new Date().toJSON();
  const resourcesArr: Resource[] = [];
  pages.forEach((page) =>
    resourcesArr.push({
      route: page.route,
      type: page.resourceType!,
      hash: "",
      lastmod,
    })
  );
  resources.insertAll(resourcesArr);

  withQuiet(() =>
    console.timeLog("- wrote files to disk", `(${pages.length} pages)`)
  );
}

export async function build(opts: BuildOpts): Promise<boolean> {
  globalThis.isQuiet = opts.quiet;
  withQuiet(() => console.info("Build started..."));
  const srcPath = resolve(Deno.cwd(), opts.srcPath ?? "");
  const configPath = resolve(srcPath, opts.config ?? "punch.jsonc");

  // read the punch config
  const config = await getConfig(configPath, opts as any);
  const destPath = resolve(srcPath, config.output ?? "dist");

  // copy public files
  const publicPath = join(srcPath, config.dirs!.public!);
  await copyPublicFiles(publicPath, destPath);

  // prepare contents
  const contentsPath = join(srcPath, config.dirs!.contents!);
  const db = new Database(resolve(srcPath, config.db?.path ?? "punch.db"), {
    unsafeConcurrency: true,
  });
  db.exec("pragma temp_store = memory");
  db.exec(`pragma threads = ${globalThis.navigator.hardwareConcurrency}`);

  const contents = new Contents(db, config.db?.indexes);
  withQuiet(() => console.time("- indexed content"));
  await contents.prepare(contentsPath);
  withQuiet(() => console.timeLog("- indexed content"));

  const resources = new Resources(db);
  // clear resources from previous build
  await resources.clear();

  const context = {
    srcPath,
    config,
    contents,
    devMode: false,
  };

  // setup renderer
  let renderer: Renderer;
  if (config.modifiers?.renderer) {
    const { renderer: customRenderer } = await import(
      join(srcPath, config.modifiers?.renderer)
    );
    renderer = await customRenderer.init(context);
  } else {
    renderer = await Renderer.init(context);
  }

  // generate pages
  const pagesPath = join(srcPath, config.dirs!.pages!);
  const pageRoutes = await routesFromPages(pagesPath, [".html"]);
  const explicitRoutes = await prepareExplicitRoutes(config.routes!, contents);
  const routes = [...pageRoutes, ...explicitRoutes];

  const { pages, assetMap } = await batchedRender(config, renderer, routes);

  withQuiet(() => console.time("- built assets"));
  await assetMap.render(destPath);
  const resourcesArr: Resource[] = [];
  // write resources to DB
  const lastmod = new Date().toJSON();
  assetMap.assets.forEach((asset, route) =>
    resourcesArr.push({
      route,
      type: asset.resourceType,
      hash: asset.hash || "",
      lastmod,
    })
  );
  resources.insertAll(resourcesArr);
  withQuiet(() =>
    console.timeLog(
      "- built assets",
      `(${assetMap.assets.size} assets)`,
    )
  );

  await batchedWrite(config, destPath, resources, pages);

  // add sitemap
  if (config.build?.sitemap) {
    withQuiet(() => console.time("- built sitemap"));
    await generateSitemap(config, destPath, resources, opts.baseUrl);
    withQuiet(() => console.timeEnd("- built sitemap"));
  }

  db.close();

  withQuiet(() => console.info(`Built site in ${destPath}`));
  return true;
}
