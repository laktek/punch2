import { dirname, extname, join, relative, resolve } from "std/path/mod.ts";
import { walk } from "std/fs/mod.ts";

import { getConfig } from "../config/config.ts";
import { Contents } from "../lib/contents.ts";
import { Renderer } from "../lib/render.ts";
import { AssetMap } from "../lib/assets.ts";
import { normalizeRoutes, routesFromPages } from "../utils/routes.ts";
import { commonSkipPaths } from "../utils/paths.ts";

async function copyPublicFiles(
  publicPath: string,
  dest: string,
): Promise<void> {
  try {
    for await (const entry of walk(publicPath, { skip: commonSkipPaths })) {
      const relPath = relative(publicPath, entry.path);

      if (entry.isFile) {
        await Deno.copyFile(entry.path, join(dest, relPath));
      } else if (entry.isDirectory) {
        await Deno.mkdir(join(dest, relPath), { recursive: true });
      } else if (entry.isSymlink) {
        const originalPath = resolve(
          entry.path,
          "../",
          Deno.readLinkSync(entry.path),
        );
        await Deno.copyFile(originalPath, join(dest, relPath));
      }
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return;
    }
    throw e;
  }
}

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

  // TODO: refactor below
  await Deno.mkdir(destPath, { recursive: true });

  const renderedPages = [];
  const assetMap = new AssetMap(config);

  routes.forEach(async (route) => {
    const output = await renderer.render(route);
    if (output.errorStatus) {
      console.error(`${output.errorMessage} (${output.errorStatus})`);
    } else {
      const outputPath = join(destPath, output.route);
      renderedPages.push(output);

      assetMap.track(output.route, output.content?.assets);

      await Deno.mkdir(dirname(outputPath), { recursive: true });
      await Deno.writeTextFile(
        join(destPath, output.route),
        output.content!.toString(),
      );
    }
  });

  await assetMap.render();

  // update rendered pages with rendered asset paths

  // write rendered pages and assets to the disk

  return true;
}
