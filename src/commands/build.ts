import { dirname, join } from "std/path/mod.ts";
import { resolve } from "std/path/mod.ts";

import { getConfig } from "../config/config.ts";
import { Contents } from "../lib/contents.ts";
import { Output, Renderer } from "../lib/render.ts";
import { AssetMap } from "../lib/asset_map.ts";
import { normalizeRoutes, routesFromPages } from "../utils/routes.ts";
import { copyPublicFiles } from "../utils/public.ts";
import { writeFile } from "../utils/fs.ts";
import { RenderableDocument } from "../utils/dom.ts";

interface BuildOpts {
  srcPath?: string;
  output?: string;
  config?: string;
}

export async function build(opts: BuildOpts): Promise<boolean> {
  const srcPath = resolve(Deno.cwd(), opts.srcPath ?? "");
  const configPath = resolve(srcPath, opts.config ?? "punch.json");

  // read the punch config
  const config = await getConfig(configPath, opts as any);
  const destPath = resolve(srcPath, config.output ?? "dist");

  // copy public files
  // TODO: run this in a worker
  const publicPath = join(srcPath, config.dirs!.public!);
  await copyPublicFiles(publicPath, destPath);

  // prepare contents
  const contentsPath = join(srcPath, config.dirs!.contents!);
  // TODO: configure path for the DB
  const contents = new Contents();
  await contents.prepare(contentsPath);

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

  const renderedPages: Output[] = [];
  const assetMap = new AssetMap(config, renderer);

  performance.mark("render-started");
  await Promise.all(routes.map(async (route) => {
    const output = await renderer.render(route);
    if (output.errorStatus) {
      console.error(
        `${route} - ${output.errorMessage} (${output.errorStatus})`,
      );
    } else {
      renderedPages.push(output);
      if (output.content instanceof RenderableDocument) {
        assetMap.track(output.content as RenderableDocument);
      }
    }
  }));
  performance.mark("render-finished");

  const renderDuration = performance.measure(
    "render-duration",
    "render-started",
    "render-finished",
  );
  console.log("render duration", renderDuration.duration);

  await assetMap.render(destPath);

  performance.mark("write-started");
  const textEncoder = new TextEncoder();
  await Promise.all(renderedPages.map(async (page) => {
    const path = join(destPath, page.route);

    let encoded: Uint8Array;
    if (page.content instanceof Uint8Array) {
      encoded = page.content;
    } else {
      const contentStr = page.content!.toString();
      encoded = textEncoder.encode(contentStr);
    }
    await writeFile(path, encoded);
  }));
  performance.mark("write-finished");
  const writeDuration = performance.measure(
    "write-duration",
    "write-started",
    "write-finished",
  );
  console.log("write duration", writeDuration.duration);

  return true;
}
