import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
} from "std/path/mod.ts";
import { exists, expandGlob, walk } from "std/fs/mod.ts";

import { Config } from "../config/config.ts";

import { commonSkipPaths } from "./paths.ts";

const dynamicPageTmplExp = /\/_.+_\.html$/;

export async function routesFromPages(
  pagesPath: string,
  pageExts: string[],
): Promise<string[]> {
  const routes: string[] = [];
  try {
    for await (
      const entry of walk(pagesPath, {
        skip: [...commonSkipPaths, dynamicPageTmplExp],
      })
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
    // if route has no extension, treat it as a page
    resourceDir = config.dirs!.pages!;
    resourceType = ResourceType.HTML;
  }

  if (resourceDir === null || resourceType === null) {
    return null;
  }

  const resourceDirPath = join(srcPath, resourceDir);
  const dirPath = join(resourceDirPath, dirname(route));
  const base = basename(route, ext);

  const matches = [];

  // check for directory index matches
  if (ext === "") {
    const dirIndex = join(resourceDirPath, route, "index.html");
    if (await exists(dirIndex, { isFile: true, isReadable: true })) {
      return { path: dirIndex, resourceType };
    }
  }

  for await (
    const f of expandGlob(
      join(`{${base},_*_}${ext || ".html"}`),
      {
        root: dirPath,
      },
    )
  ) {
    matches.push(f.path);
  }
  if (matches.length) {
    // if multiple matches, return the  absolute path match
    const absMatch = matches.find((m) => m === join(resourceDirPath, route));
    return { path: absMatch || matches[0], resourceType };
  }

  return null;
}
