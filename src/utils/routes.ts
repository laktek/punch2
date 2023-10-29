import { extname, join, relative, resolve } from "std/path/mod.ts";
import { exists, walk } from "std/fs/mod.ts";

import { Config } from "../config/config.ts";

import { commonSkipPaths } from "./paths.ts";

export async function routesFromPages(
  pagesPath: string,
  pageExts: string[],
): Promise<string[]> {
  const routes: string[] = [];
  try {
    for await (
      const entry of walk(pagesPath, { skip: commonSkipPaths })
    ) {
      // only files and symlinks are parsed
      if (entry.isFile || entry.isSymlink) {
        if (pageExts.includes(extname(entry.path))) {
          const relPath = relative(pagesPath, entry.path);
          routes.push(relPath);
        }
      }
    }

    return routes;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return [];
    }
    throw e;
  }
}

export enum ResourceType {
  CSS = 1,
  JS,
  SVG,
  HTML,
}

interface Resource {
  path: string;
  resourceType: ResourceType;
}

export async function findResource(
  srcPath: string,
  config: Config,
  route: string,
): Promise<Resource | null> {
  // check the extension
  const ext = extname(route);

  let resourceDir = null;
  let resourceType = null;

  if (ext === ".css") {
    resourceDir = config.dirs!.css!;
    resourceType = ResourceType.CSS;
  } else if (ext === ".js") {
    resourceDir = config.dirs!.js!;
    resourceType = ResourceType.JS;
  } else if (ext === ".svg") {
    resourceDir = config.dirs!.images!;
    resourceType = ResourceType.SVG;
  } else if (ext === ".html") {
    // match HTML resource (routes without an extensions are treated as HTML)
    resourceDir = config.dirs!.pages!;
    resourceType = ResourceType.HTML;
  } else if (ext === "") {
    resourceDir = config.dirs!.pages!;
    // check if route.html exists
    let resourcePath = join(srcPath, resourceDir, `${route}.html`);
    if (await exists(resourcePath, { isFile: true, isReadable: true })) {
      return { path: resourcePath, resourceType: ResourceType.HTML };
    }

    // check if route/index.html exists
    resourcePath = join(srcPath, resourceDir, route, "index.html");
    if (await exists(resourcePath, { isFile: true, isReadable: true })) {
      return { path: resourcePath, resourceType: ResourceType.HTML };
    }
  }

  if (resourceDir === null || resourceType === null) {
    return null;
  }

  const resourcePath = join(srcPath, resourceDir, route);
  if (await exists(resourcePath, { isFile: true, isReadable: true })) {
    return { path: resourcePath, resourceType };
  }
  return null;
}
