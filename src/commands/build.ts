import { join } from "std/path/mod.ts";
import { resolve } from "std/path/mod.ts";
import { Database } from "sqlite";

import { Config, getConfig } from "../config/config.ts";
import { Contents } from "../lib/contents.ts";
import { Resource, Resources } from "../lib/resources.ts";
import { Output, Renderer } from "../lib/render.ts";
import { AssetMap } from "../lib/asset_map.ts";
import { normalizeRoutes, routesFromPages } from "../utils/routes.ts";
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
}

interface BatchedRenderResult {
  pages: Output[];
  assetMap: AssetMap;
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

  performance.mark("render-started");
  for (let i = 0; i < routes.length; i += batchSize) {
    const batch = routes.slice(i, i + batchSize);
    await Promise.all(batch.map(renderRoute));
  }
  performance.mark("render-finished");

  const renderDuration = performance.measure(
    "render-duration",
    "render-started",
    "render-finished",
  );
  console.info(
    `- rendered pages (${pages.length} pages in ${
      Math.round(renderDuration.duration * 100) / 100
    }ms)`,
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
  performance.mark("write-started");
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

  performance.mark("write-finished");
  const writeDuration = performance.measure(
    "write-duration",
    "write-started",
    "write-finished",
  );
  console.info(
    `- wrote files to disk (${pages.length} pages in ${
      Math.round(writeDuration.duration * 100) / 100
    }ms)`,
  );
}

export async function build(opts: BuildOpts): Promise<boolean> {
  const srcPath = resolve(Deno.cwd(), opts.srcPath ?? "");
  const configPath = resolve(srcPath, opts.config ?? "punch.json");

  // read the punch config
  const config = await getConfig(configPath, opts as any);
  const destPath = resolve(srcPath, config.output ?? "dist");

  // copy public files
  const publicPath = join(srcPath, config.dirs!.public!);
  await copyPublicFiles(publicPath, destPath);

  // prepare contents
  const contentsPath = join(srcPath, config.dirs!.contents!);
  const db = new Database(resolve(srcPath, config.db ?? "punch.db"));

  const contents = new Contents(db);
  await contents.prepare(contentsPath);

  const resources = new Resources(db);
  // clear resources from previous build
  await resources.clear();

  const context = {
    srcPath,
    config,
    contents,
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
  const explicitRoutes = await normalizeRoutes(config.routes!);
  const routes = [...pageRoutes, ...explicitRoutes];

  const { pages, assetMap } = await batchedRender(config, renderer, routes);

  performance.mark("assets-started");
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
  performance.mark("assets-finished");
  const assetsDuration = performance.measure(
    "assets-duration",
    "assets-started",
    "assets-finished",
  );
  console.info(
    `- built assets (${assetMap.assets.size} assets in ${
      Math.round(assetsDuration.duration / 100) * 100
    }ms)`,
  );

  await batchedWrite(config, destPath, resources, pages);

  // add sitemap
  if (config.build?.sitemap) {
    await generateSitemap(config, destPath, resources, opts.baseUrl);
  }

  db.close();

  console.log(`Built site in ${destPath}`);
  return true;
}
