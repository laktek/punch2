import { join, relative } from "std/path/mod.ts";

import { Contents } from "./contents.ts";
import { Config } from "../config/config.ts";
import { findResource, ResourceType } from "../utils/routes.ts";
import { renderHTML } from "../utils/renderers/html.ts";

export interface Context {
  srcPath: string;
  config: Config;
  route: string;
  contents: Contents;
}

export interface Asset {
  path: string;
  contentType: string;
}

export interface Output {
  route: string;
  contentType?: string;
  content?: string;
  assets?: Asset[];
  errorStatus?: number;
  errorMessage?: string;
}

export async function render(context: Context): Output {
  const { srcPath, config, route, contents } = context;
  const resource = await findResource(srcPath, config, route);
  if (!resource) {
    return {
      route: route,
      errorStatus: 404,
      errorMessage: "not found",
    };
  }

  const { path, resourceType } = resource;
  if (resourceType === ResourceType.HTML) {
    const content = await renderHTML(path, contents);
    return {
      route: relative(join(srcPath, config.dirs!.pages!), path),
      contentType: "text/html",
      content,
      assets: [],
    };
  } else {
    return {
      route: route,
      errorStatus: 400,
      errorMessage: "not supported yet",
    };
  }
}
