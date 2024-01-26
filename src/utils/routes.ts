import {
  basename,
  common,
  dirname,
  extname,
  join,
  relative,
  SEP,
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
  IMAGE,
  HTML,
  XML,
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

  if (route.startsWith("/css") || ext === ".css") {
    resourceDir = config.dirs!.css!;
    resourceType = ResourceType.CSS;
  } else if (
    route.startsWith("/js") || [".js", ".jsx", ".ts", ".tsx"].includes(ext)
  ) {
    resourceDir = config.dirs!.js!;
    resourceType = ResourceType.JS;
  } else if (route.startsWith("/images")) {
    resourceDir = config.dirs!.images!;
    resourceType = ResourceType.IMAGE;
  } else if (route.startsWith("/feeds") && ext === ".xml") {
    resourceDir = config.dirs!.feeds!;
    resourceType = ResourceType.XML;
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

  let fullPath = join(resourceDirPath, route);
  // TODO: add a test
  if (route.match(new RegExp(`^(\/*)${resourceDir}`))) {
    fullPath = join(srcPath, route);
  }

  // check if there's an explicit match
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
  return p.replace(new RegExp(`[${SEP}]+$`), "");
}

function withLeadingSlash(p: string): string {
  return join("/", p);
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

// TODO: refactor
export function getRouteParams(
  route: string,
  tmplPath: string,
): unknown {
  const segments = route.split("/").filter((t) => t);
  const tmplPathWithSlash = join("/", tmplPath);
  const tmplName = basename(tmplPathWithSlash).match(/^_(.+)_.*$/);
  // deno-lint-ignore prefer-const
  let tmplVar: { [key: string]: string } = {};
  if (tmplName) {
    tmplVar[tmplName[1]] = relative(common([tmplPathWithSlash, route]), route);
  }

  return { path: route, segments, ...tmplVar };
}

export function normalizeRoutes(routes: string[]): string[] {
  return routes.map((r) => withoutTrailingSlash(withLeadingSlash(r)));
}
