import { extname, join, relative, resolve } from "std/path/mod.ts";
import { walk } from "std/fs/mod.ts";

import { getConfig } from "../config/config.ts";
import { Contents } from "../lib/contents.ts";
import { routesFromPages } from "../utils/routes.ts";
import { commonSkipPaths } from "../utils/paths.ts";

async function copyPublicFiles(
  publicPath: string,
  dest: string,
): Promise<void> {
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

  // generate pages
  const pagesPath = join(srcPath, config.dirs!.pages!);
  const pageRoutes = await routesFromPages(pagesPath, [".html"]);
  const routes = [...pageRoutes, config.routes];

  // run generate modifier
  routes.forEach(async (route) => {
    //await runBuild(route);
  });

  return true;
}
