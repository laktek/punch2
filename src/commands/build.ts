import { dirname, join } from "std/path/mod.ts";

import { getConfig } from "../config/config.ts";
import { Contents } from "../lib/contents.ts";
import { Renderer } from "../lib/render.ts";
import { AssetMap } from "../lib/asset_map.ts";
import { normalizeRoutes, routesFromPages } from "../utils/routes.ts";
import { copyPublicFiles } from "../utils/public.ts";
import { writeFile } from "../utils/fs.ts";

interface BuildOpts {
  srcPath: string;
  destPath: string;
  configPath?: string;
}

export async function build(opts: BuildOpts): Promise<boolean> {
  const { srcPath, destPath, configPath } = opts;

  // read the punch config
  const config = await getConfig(configPath ?? join(srcPath, "punch.json"));

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

  const renderedPages = [];
  const assetMap = new AssetMap(config, renderer);

  await Promise.all(routes.map(async (route) => {
    const output = await renderer.render(route);
    if (output.errorStatus) {
      console.error(`${output.errorMessage} (${output.errorStatus})`);
    } else {
      renderedPages.push(output);

      assetMap.track(output.content);
    }
  }));

  await assetMap.render(destPath);

  await Promise.all(renderedPages.map(async (page) => {
    const path = join(destPath, page.route);
    await writeFile(path, page.content!.toString());
  }));

  return true;
}
