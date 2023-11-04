import {
  basename,
  common,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
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
  const base = basename(route, ext);

  // check if there's an explicit match
  const fullPath = join(resourceDirPath, route);
  if (await exists(fullPath, { isFile: true, isReadable: true })) {
    return { path: fullPath, resourceType };
  }

  // check for directory index matches
  if (ext === "") {
    const dirIndex = join(resourceDirPath, route, "index.html");
    if (await exists(dirIndex, { isFile: true, isReadable: true })) {
      return { path: dirIndex, resourceType };
    }

    const tmplPath = await findClosestTemplate(
      join(resourceDirPath, dirname(route)),
      resourceDirPath,
    );

    if (tmplPath) {
      return { path: tmplPath, resourceType };
    } else {
      return null;
    }
  }

  return null;
}

function withoutTrailingSlash(p: string): string {
  return p.replace(new RegExp(`${sep}$`), "");
}

async function findClosestTemplate(
  dirPath: string,
  rootPath: string,
): Promise<string | null> {
  const matches = [];
  for await (
    const f of expandGlob(
      join(`_*_\.html`),
      {
        root: dirPath,
      },
    )
  ) {
    matches.push(f.path);
  }
  if (matches.length) {
    return matches[0];
  } else {
    // check the parent directory for a template
    if (withoutTrailingSlash(dirPath) !== withoutTrailingSlash(rootPath)) {
      return await findClosestTemplate(dirname(dirPath), rootPath);
    } else {
      return null;
    }
  }
}

export function getRouteParams(
  route: string,
  tmplPath: string,
): unknown {
  const segments = route.split("/").filter((t) => t);
  const tmplName = basename(tmplPath).match(/^_(.+)_.*$/);
  let tmplVar: { [key: string]: string } = {};
  if (tmplName) {
    tmplVar[tmplName[1]] = relative(common([tmplPath, route]), route);
  }

  return { path: route, segments, ...tmplVar };
}
